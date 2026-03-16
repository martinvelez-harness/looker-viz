/**
 * Filtered Table — Looker Custom Visualization
 * Developed by Martin Velez
 *
 * A Looker-style data table with an interactive client-side filter bar.
 *
 * Features:
 * - Click-to-sort column headers (all dims + measures)
 * - Interactive threshold filter on any field (editable input in filter bar)
 * - "Showing N <row_label>" badge
 * - Total KPI with multi-level threshold color coding (green / amber / red)
 * - Full drill support on dimension and measure cells
 * - Horizontal scroll when columns exceed tile width
 *
 * Query: any number of dimensions + measures. No pivot support.
 *
 * Admin → Visualizations:
 *   ID: filtered_table
 *   Label: Filtered Table
 *   Main: https://cdn.jsdelivr.net/gh/martinvelez-harness/looker-viz@main/filtered_table.js
 */

looker.plugins.visualizations.add({

  id: "filtered_table",
  label: "Filtered Table",
  options: {},

  // --------------------------------------------------
  // CREATE
  // --------------------------------------------------
  create: function (element, config) {
    element.innerHTML = "";
    element.style.overflow = "hidden";
    element.style.background = "white";
    element.style.boxSizing = "border-box";
    element.style.padding = "0";
    element.style.margin = "0";
  },

  // --------------------------------------------------
  // UPDATE
  // --------------------------------------------------
  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    this.clearErrors();
    element.innerHTML = "";

    // Kill scrollbars on Looker's wrapper
    var p = element.parentElement;
    while (p && p !== document.body) { p.style.overflow = "hidden"; p = p.parentElement; }

    // -- Fields --
    var dimensions = queryResponse.fields.dimension_like || queryResponse.fields.dimensions || [];
    var measures   = queryResponse.fields.measure_like || [];
    if (measures.length === 0) {
      measures = (queryResponse.fields.measures || []).concat(queryResponse.fields.table_calculations || []);
    }
    var allFields = dimensions.concat(measures);

    if (allFields.length === 0 || !data || data.length === 0) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:24px;font-size:13px;">No data</p>';
      doneRendering(); return;
    }

    // -- Register dynamic options once per field set --
    var fieldKey = allFields.map(function (f) { return f.name; }).join("|");
    if (this._registeredFields !== fieldKey) {
      this._registeredFields = fieldKey;
      this.trigger("registerOptions", _buildOptions());
    }

    // -- Config --
    var fontFamily       = config.font_family     || "'Inter','Helvetica Neue',Arial,sans-serif";
    var fontSize         = Number(config.font_size) || 14;
    var showFilterBar    = config.show_filter_bar  !== "false";
    var filterLabel      = config.filter_label     || "Filter";
    var filterField      = (config.filter_field    || "").trim();
    var filterOp         = config.filter_operator  || "<";
    var filterDefault    = config.filter_default   != null ? String(config.filter_default) : "";
    var filterIsPercent  = config.filter_is_percent === "true";
    var rowLabel         = config.row_label        || "rows";
    var showTotal        = config.show_total       !== "false";
    var totalField       = (config.total_field     || "").trim();
    var totalLabel       = config.total_label      || "Total";
    var totalFromFiltered = config.total_from_filtered !== "false"; // default: sum filtered rows
    var threshLow        = config.threshold_low  != null && config.threshold_low  !== "" ? Number(config.threshold_low)  : null;
    var threshHigh       = config.threshold_high != null && config.threshold_high !== "" ? Number(config.threshold_high) : null;
    var colorDefault     = config.color_default  || "#111827";
    var colorLow         = config.color_low      || "#22C55E";  // green  → below threshLow
    var colorMid         = config.color_mid      || "#F59E0B";  // amber  → between threshLow and threshHigh
    var colorHigh        = config.color_high     || "#EF4444";  // red    → above threshHigh
    var linkColor        = config.link_color     || "#3B82F6";
    var headerBg         = config.header_bg      || "#F9FAFB";
    var borderColor      = config.border_color   || "#E5E7EB";

    // Find field objects
    var filterFieldObj = allFields.filter(function (f) { return f.name === filterField; })[0] || null;
    var totalFieldObj  = allFields.filter(function (f) { return f.name === totalField;  })[0] || null;

    // -- Persistent state across re-renders within this viz instance --
    var self = this;
    if (self._sortField === undefined) self._sortField = null;
    if (self._sortDir === undefined)   self._sortDir   = "asc";
    // Reset filter value when config changes
    if (self._lastFilterKey !== filterField + "|" + filterDefault) {
      self._filterValue    = filterDefault;
      self._lastFilterKey  = filterField + "|" + filterDefault;
    }

    // --------------------------------------------------
    // Helpers
    // --------------------------------------------------
    function _applyFilter(rows) {
      if (!filterField || self._filterValue === "" || self._filterValue == null) return rows;
      var numVal = parseFloat(String(self._filterValue).replace(/[^0-9.\-]/g, ""));
      if (isNaN(numVal)) return rows;
      var compareVal = filterIsPercent ? numVal / 100 : numVal;
      return rows.filter(function (row) {
        var cell = row[filterField];
        if (!cell || cell.value == null) return false;
        var rv = Number(cell.value);
        if (isNaN(rv)) return false;
        switch (filterOp) {
          case "<":  return rv < compareVal;
          case "<=": return rv <= compareVal;
          case ">":  return rv > compareVal;
          case ">=": return rv >= compareVal;
          case "=":  return rv === compareVal;
          case "!=": return rv !== compareVal;
          default:   return true;
        }
      });
    }

    function _sortRows(rows, sf, sd) {
      if (!sf) return rows;
      return rows.slice().sort(function (a, b) {
        var av = a[sf] ? a[sf].value : null;
        var bv = b[sf] ? b[sf].value : null;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return sd === "asc" ? av - bv : bv - av;
        }
        var as = String(av).toLowerCase(), bs = String(bv).toLowerCase();
        return sd === "asc" ? (as < bs ? -1 : as > bs ? 1 : 0)
                            : (as > bs ? -1 : as < bs ? 1 : 0);
      });
    }

    function _computeTotal(filteredRows) {
      // Prefer server totals_data when "total from all rows" is selected
      if (!totalFromFiltered) {
        var td = queryResponse.totals_data;
        if (td && td[totalField] != null) return Number(td[totalField].value) || 0;
      }
      var sum = 0;
      filteredRows.forEach(function (row) {
        var cell = row[totalField];
        if (cell && cell.value != null) sum += Number(cell.value) || 0;
      });
      return sum;
    }

    function _totalColor(val) {
      // Thresholds define color bands from top down: high → mid → low → default
      if (threshHigh != null && val >= threshHigh) return colorHigh;
      if (threshLow  != null && val >= threshLow)  return colorMid;
      // If only one threshold is set and we're below it, use the low (green) color
      if (threshLow  != null && val < threshLow)   return colorLow;
      if (threshHigh != null && val < threshHigh)   return colorLow;
      return colorDefault;
    }

    function _cellDisplay(cell, field) {
      if (!cell || cell.value == null) return "—";
      if (cell.rendered != null && cell.rendered !== "") return cell.rendered;
      if (field && field.value_format) {
        var n = Number(cell.value);
        return isNaN(n) ? String(cell.value) : _fmt(n, field.value_format);
      }
      return String(cell.value);
    }

    function _totalDisplay(val) {
      if (totalFieldObj && totalFieldObj.value_format) return _fmt(val, totalFieldObj.value_format);
      // Compact fallback
      if (Math.abs(val) >= 1e6) return "$" + (val / 1e6).toFixed(1) + "M";
      if (Math.abs(val) >= 1e3) return "$" + (val / 1e3).toFixed(0) + "K";
      return "$" + Math.round(val).toLocaleString();
    }

    // --------------------------------------------------
    // DOM: Container
    // --------------------------------------------------
    var container = document.createElement("div");
    container.style.cssText = [
      "font-family:" + fontFamily,
      "font-size:" + fontSize + "px",
      "width:100%",
      "height:100%",
      "display:flex",
      "flex-direction:column",
      "overflow:hidden",
      "box-sizing:border-box",
      "background:white"
    ].join(";");
    element.appendChild(container);

    // --------------------------------------------------
    // DOM: Filter bar
    // --------------------------------------------------
    var filterInput = null;
    var countEl     = null;
    var totalValEl  = null;

    if (showFilterBar) {
      var barEl = document.createElement("div");
      barEl.style.cssText = [
        "display:flex",
        "align-items:center",
        "gap:10px",
        "padding:8px 16px",
        "background:" + headerBg,
        "border-bottom:1px solid " + borderColor,
        "flex-shrink:0",
        "flex-wrap:wrap"
      ].join(";");

      if (filterField && filterFieldObj) {
        // Label
        var flLbl = _span(filterLabel + ":", "font-size:13px;color:#6B7280;white-space:nowrap;font-weight:500;");
        barEl.appendChild(flLbl);

        // Operator badge
        var opBadge = document.createElement("span");
        opBadge.style.cssText = [
          "display:inline-flex",
          "align-items:center",
          "background:white",
          "border:1px solid " + borderColor,
          "border-radius:6px",
          "padding:3px 8px",
          "font-size:13px",
          "color:#374151",
          "gap:4px"
        ].join(";");

        // Operator text (non-editable)
        var opText = _span(filterOp + " ", "font-size:13px;color:#6B7280;");
        opBadge.appendChild(opText);

        // Input
        filterInput = document.createElement("input");
        filterInput.type = "text";
        filterInput.value = self._filterValue;
        filterInput.style.cssText = [
          "width:50px",
          "border:none",
          "outline:none",
          "font-size:13px",
          "font-family:" + fontFamily,
          "color:#111827",
          "background:transparent",
          "padding:0"
        ].join(";");
        filterInput.placeholder = filterIsPercent ? "40" : "0";
        opBadge.appendChild(filterInput);

        if (filterIsPercent) {
          opBadge.appendChild(_span("%", "font-size:13px;color:#6B7280;"));
        }

        barEl.appendChild(opBadge);
      }

      // Row count
      countEl = document.createElement("span");
      countEl.style.cssText = "font-size:13px;color:#6B7280;white-space:nowrap;";
      barEl.appendChild(countEl);

      // Spacer
      var sp = document.createElement("div"); sp.style.flex = "1";
      barEl.appendChild(sp);

      // Total KPI
      if (showTotal && totalField) {
        var totalWrap = document.createElement("div");
        totalWrap.style.cssText = "display:flex;align-items:baseline;gap:6px;white-space:nowrap;";

        totalWrap.appendChild(_span(totalLabel + ":", "font-size:13px;color:#6B7280;font-weight:500;"));

        totalValEl = document.createElement("span");
        totalValEl.style.cssText = "font-size:16px;font-weight:700;color:" + colorDefault + ";";
        totalWrap.appendChild(totalValEl);

        barEl.appendChild(totalWrap);
      }

      container.appendChild(barEl);
    }

    // --------------------------------------------------
    // DOM: Table wrapper (scrollable)
    // --------------------------------------------------
    var tableWrap = document.createElement("div");
    tableWrap.style.cssText = "flex:1;overflow:auto;min-height:0;";
    container.appendChild(tableWrap);

    // --------------------------------------------------
    // renderTable: applies filter + sort, repaints table body
    // --------------------------------------------------
    function renderTable() {
      tableWrap.innerHTML = "";

      var filtered = _applyFilter(data);
      var sorted   = _sortRows(filtered, self._sortField, self._sortDir);

      // Update count badge
      if (countEl) {
        countEl.textContent = "Showing " + filtered.length + " " + rowLabel;
      }

      // Update total KPI
      if (totalValEl && totalField) {
        var tv = _computeTotal(filtered);
        totalValEl.textContent = _totalDisplay(tv);
        totalValEl.style.color = _totalColor(tv);
      }

      // -- Build table --
      var table = document.createElement("table");
      table.style.cssText = [
        "width:100%",
        "border-collapse:collapse",
        "font-size:" + fontSize + "px",
        "font-family:" + fontFamily,
        "table-layout:auto"
      ].join(";");

      // Header
      var thead = document.createElement("thead");
      var hRow  = document.createElement("tr");
      hRow.style.cssText = "background:" + headerBg + ";position:sticky;top:0;z-index:2;";

      allFields.forEach(function (field) {
        var th = document.createElement("th");
        var isActive = self._sortField === field.name;
        var isDim = dimensions.indexOf(field) !== -1;
        th.style.cssText = [
          "padding:9px 12px",
          "font-size:12px",
          "font-weight:600",
          "color:" + (isActive ? "#111827" : "#6B7280"),
          "border-bottom:2px solid " + borderColor,
          "white-space:nowrap",
          "cursor:pointer",
          "user-select:none",
          "text-align:" + (isDim ? "left" : "right")
        ].join(";");

        var lbl = field.label_short || field.label || field.name;
        var icon = isActive ? (self._sortDir === "asc" ? " ↑" : " ↓") : " ↑↓";
        th.textContent = lbl + icon;

        (function (f) {
          th.addEventListener("click", function () {
            if (self._sortField === f.name) {
              self._sortDir = self._sortDir === "asc" ? "desc" : "asc";
            } else {
              self._sortField = f.name;
              self._sortDir = "asc";
            }
            renderTable();
          });
        })(field);

        hRow.appendChild(th);
      });

      thead.appendChild(hRow);
      table.appendChild(thead);

      // Body
      var tbody = document.createElement("tbody");

      if (sorted.length === 0) {
        var emptyTr = document.createElement("tr");
        var emptyTd = document.createElement("td");
        emptyTd.setAttribute("colspan", String(allFields.length));
        emptyTd.style.cssText = "padding:24px;text-align:center;color:#9CA3AF;font-size:13px;";
        emptyTd.textContent = "No rows match the current filter.";
        emptyTr.appendChild(emptyTd);
        tbody.appendChild(emptyTr);
      }

      sorted.forEach(function (row) {
        var tr = document.createElement("tr");
        tr.style.background = "white";
        tr.addEventListener("mouseenter", function () { this.style.background = "#F8FAFC"; });
        tr.addEventListener("mouseleave", function () { this.style.background = "white"; });

        allFields.forEach(function (field, fi) {
          var td = document.createElement("td");
          var isDim = fi < dimensions.length;
          td.style.cssText = [
            "padding:9px 12px",
            "border-bottom:1px solid " + borderColor,
            "color:#111827",
            "vertical-align:middle",
            "text-align:" + (isDim ? "left" : "right"),
            "white-space:nowrap"
          ].join(";");

          var cell = row[field.name];
          var displayVal = _cellDisplay(cell, field);
          var links = cell ? cell.links : null;

          if (links && links.length > 0) {
            var a = document.createElement("a");
            a.href = "#";
            a.style.cssText = "color:" + linkColor + ";text-decoration:none;cursor:pointer;";
            a.textContent = displayVal;
            (function (ls) {
              a.addEventListener("click", function (e) {
                e.preventDefault();
                LookerCharts.Utils.openDrillMenu({ links: ls, event: e });
              });
            })(links);
            td.appendChild(a);
          } else {
            td.textContent = displayVal;
          }

          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }

    // -- Initial render --
    renderTable();

    // -- Bind filter input --
    if (filterInput) {
      filterInput.addEventListener("input", function () {
        self._filterValue = filterInput.value;
        renderTable();
      });
    }

    doneRendering();
  }
});


// ==================================================
// Helper functions (module-scope, no external deps)
// ==================================================

function _span(text, css) {
  var el = document.createElement("span");
  el.style.cssText = css || "";
  el.textContent = text;
  return el;
}

/**
 * Format a number using a Looker value_format string.
 * Supports: $prefix, % suffix, comma, decimal places.
 */
function _fmt(val, fmt) {
  if (fmt == null || fmt === "") return String(val);

  // Percentage
  if (fmt.indexOf("%") !== -1) {
    var pm = fmt.match(/\.(0+)%/);
    var pd = pm ? pm[1].length : 0;
    return (val * 100).toFixed(pd) + "%";
  }

  var prefix = fmt.charAt(0) === "$" ? "$" : "";
  var dm = fmt.match(/\.(0+)/);
  var dec = dm ? dm[1].length : 0;
  var useComma = fmt.indexOf(",") !== -1;
  var abs = Math.abs(val);
  var sign = val < 0 ? "-" : "";

  // Compact (K/M/B)
  var compact = _compactFmt(abs, dec, prefix, sign, useComma);
  if (compact) return compact;

  // Full number
  var fixed = abs.toFixed(dec);
  if (useComma) {
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    fixed = parts.join(".");
  }
  return sign + prefix + fixed;
}

function _compactFmt(abs, dec, prefix, sign, useComma) {
  // Returns compact string (1.2M etc.) when value is >= 1000, else null
  if (abs < 1000) return null;
  var n, suffix;
  if (abs >= 1e9)      { n = abs / 1e9; suffix = "B"; }
  else if (abs >= 1e6) { n = abs / 1e6; suffix = "M"; }
  else                 { n = abs / 1e3; suffix = "K"; }
  var d = n < 10 ? 1 : 0;
  return sign + prefix + n.toFixed(d) + suffix;
}

/**
 * Build viz config options object.
 * Called once on first render; re-triggered when field set changes.
 */
function _buildOptions() {
  return {

    // -- Filter bar --
    show_filter_bar: {
      type: "string", label: "Show Filter Bar", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Filter", order: 1
    },
    filter_label: {
      type: "string", label: "Filter Label", default: "Coverage Filter",
      section: "Filter", order: 2
    },
    filter_field: {
      type: "string", label: "Filter Field (field key)",
      placeholder: "e.g. commitment_utilization.coverage_rate",
      default: "", section: "Filter", order: 3
    },
    filter_operator: {
      type: "string", label: "Filter Operator", display: "select",
      values: [
        { "< (less than)": "<" }, { "<= (less or equal)": "<=" },
        { "> (greater than)": ">" }, { ">= (greater or equal)": ">=" },
        { "= (equal)": "=" }, { "!= (not equal)": "!=" }
      ],
      default: "<", section: "Filter", order: 4
    },
    filter_default: {
      type: "string", label: "Filter Default Value",
      placeholder: "e.g. 40  (for 40% when is_percent=Yes)",
      default: "", section: "Filter", order: 5
    },
    filter_is_percent: {
      type: "string", label: "Filter Field is Percentage?", display: "select",
      values: [{ "Yes (divide input by 100)": "true" }, { "No (use raw value)": "false" }],
      default: "false", section: "Filter", order: 6
    },
    row_label: {
      type: "string", label: "Row Label (singular or plural)",
      default: "rows", placeholder: "e.g. commitments",
      section: "Filter", order: 7
    },

    // -- Total KPI --
    show_total: {
      type: "string", label: "Show Total KPI", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Total", order: 1
    },
    total_field: {
      type: "string", label: "Total Field (field key)",
      placeholder: "e.g. ootb.total_unused_commitment_cost",
      default: "", section: "Total", order: 2
    },
    total_label: {
      type: "string", label: "Total Label", default: "Total Waste",
      section: "Total", order: 3
    },
    total_from_filtered: {
      type: "string", label: "Total Scope", display: "select",
      values: [
        { "Filtered rows only": "true" },
        { "All rows (server total)": "false" }
      ],
      default: "true", section: "Total", order: 4
    },

    // -- Thresholds --
    threshold_low: {
      type: "string", label: "Threshold Low (raw value)",
      placeholder: "e.g. 100000  → $100K",
      default: "", section: "Total", order: 10
    },
    threshold_high: {
      type: "string", label: "Threshold High (raw value)",
      placeholder: "e.g. 500000  → $500K",
      default: "", section: "Total", order: 11
    },
    color_default: {
      type: "string", label: "Color — below Threshold Low",
      display: "color", default: "#111827", section: "Total", order: 12
    },
    color_low: {
      type: "string", label: "Color — Low band (≥ Threshold Low)",
      display: "color", default: "#22C55E", section: "Total", order: 13
    },
    color_mid: {
      type: "string", label: "Color — Mid band (≥ Threshold Low, < High)",
      display: "color", default: "#F59E0B", section: "Total", order: 14
    },
    color_high: {
      type: "string", label: "Color — High band (≥ Threshold High)",
      display: "color", default: "#EF4444", section: "Total", order: 15
    },

    // -- Table style --
    header_bg: {
      type: "string", label: "Header Background",
      display: "color", default: "#F9FAFB", section: "Format", order: 1
    },
    border_color: {
      type: "string", label: "Border Color",
      display: "color", default: "#E5E7EB", section: "Format", order: 2
    },
    link_color: {
      type: "string", label: "Link Color",
      display: "color", default: "#3B82F6", section: "Format", order: 3
    },
    font_size: {
      type: "number", label: "Font Size (px)", default: 14,
      section: "Format", order: 4
    },
    font_family: {
      type: "string", label: "Font Family",
      default: "'Inter','Helvetica Neue',Arial,sans-serif",
      section: "Format", order: 5
    }
  };
}
