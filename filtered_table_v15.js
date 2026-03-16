/**
 * Filtered Table — Looker Custom Visualization
 * Developed by Martin Velez
 *
 * A Looker-style data table with interactive client-side filter bar.
 *
 * Features:
 * - Click-to-sort all columns
 * - Drag-to-resize column widths + per-column config (Series tab)
 * - Filter field and Total field selectable from dropdown (all query fields)
 * - Row count badge + Total KPI with multi-threshold color coding
 * - Header: preset bg (white / light gray / custom) + font color
 * - Drill support on all cells with links
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
    element.style.overflow  = "hidden";
    element.style.background = "white";
    element.style.boxSizing = "border-box";
    element.style.padding   = "0";
    element.style.margin    = "0";
  },

  // --------------------------------------------------
  // UPDATE
  // --------------------------------------------------
  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    this.clearErrors();
    element.innerHTML = "";

    // Kill scrollbars on Looker wrapper elements
    var p = element.parentElement;
    while (p && p !== document.body) { p.style.overflow = "hidden"; p = p.parentElement; }

    // ------------------------------------------------
    // Fields
    // ------------------------------------------------
    var dimensions = queryResponse.fields.dimension_like || queryResponse.fields.dimensions || [];
    var measures   = queryResponse.fields.measure_like   || [];
    if (measures.length === 0) {
      measures = (queryResponse.fields.measures || []).concat(queryResponse.fields.table_calculations || []);
    }
    var allFields = dimensions.concat(measures);

    if (allFields.length === 0 || !data || data.length === 0) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:24px;font-size:13px;">No data</p>';
      doneRendering(); return;
    }

    // ------------------------------------------------
    // Register dynamic options once per field set
    // (includes field dropdowns + per-column Series tab)
    // ------------------------------------------------
    var fieldKey = allFields.map(function (f) { return f.name; }).join("|");
    if (this._registeredFields !== fieldKey) {
      this._registeredFields = fieldKey;
      this.trigger("registerOptions", _buildOptions(allFields, dimensions));
    }

    // ------------------------------------------------
    // Config
    // ------------------------------------------------
    var fontFamily       = config.font_family      || "'Inter','Helvetica Neue',Arial,sans-serif";
    var fontSize         = Number(config.font_size) || 14;

    // Header style
    var hbPreset         = config.header_bg_preset  || "#F9FAFB";
    var headerBg         = hbPreset === "custom"
                           ? (config.header_bg_color || "#F9FAFB")
                           : hbPreset;
    var headerTextColor  = config.header_text_color || "#6B7280";
    var borderColor      = config.border_color      || "#E5E7EB";
    var linkColor        = config.link_color        || "#3B82F6";

    // Filter bar
    var showFilterBar    = config.show_filter_bar   !== "false";
    var filterLabel      = config.filter_label      || "Filter";
    var filterField      = (config.filter_field     || "").trim();
    var filterOp         = config.filter_operator   || "<";
    var filterDefault    = config.filter_default    != null ? String(config.filter_default) : "";
    var filterIsPercent  = config.filter_is_percent === "true";
    var rowLabel         = config.row_label         || "rows";

    // Total KPI
    var showTotal        = config.show_total        !== "false";
    var totalField       = (config.total_field      || "").trim();
    var totalLabel       = config.total_label       || "Total";
    var totalFromFiltered = config.total_from_filtered !== "false";
    var threshLow        = _parseNum(config.threshold_low);
    var threshHigh       = _parseNum(config.threshold_high);
    var colorDefault     = config.color_default     || "#111827";
    var colorLow         = config.color_low         || "#22C55E";
    var colorMid         = config.color_mid         || "#F59E0B";
    var colorHigh        = config.color_high        || "#EF4444";

    // Resolve field objects
    var filterFieldObj = _findField(allFields, filterField);
    var totalFieldObj  = _findField(allFields, totalField);

    // Visible columns (respecting Series tab "Show" toggle)
    var self = this;
    var visibleFields = allFields.filter(function (f) {
      return config["col_" + _safeKey(f.name) + "_show"] !== "false";
    });

    // ------------------------------------------------
    // Persistent state
    // ------------------------------------------------
    if (self._sortField  === undefined) self._sortField = null;
    if (self._sortDir    === undefined) self._sortDir   = "asc";
    if (!self._colWidths) self._colWidths = {};

    // Reset filter value when config changes
    var filterStateKey = filterField + "|" + filterDefault;
    if (self._lastFilterKey !== filterStateKey) {
      self._filterValue   = filterDefault;
      self._lastFilterKey = filterStateKey;
    }

    // ------------------------------------------------
    // Core helpers
    // ------------------------------------------------
    function _applyFilter(rows) {
      if (!filterField || self._filterValue === "" || self._filterValue == null) return rows;
      var numVal = parseFloat(String(self._filterValue).replace(/[^0-9.\-]/g, ""));
      if (isNaN(numVal)) return rows;
      var cmp = filterIsPercent ? numVal / 100 : numVal;
      return rows.filter(function (row) {
        var cell = row[filterField];
        if (!cell || cell.value == null) return false;
        var rv = Number(cell.value);
        if (isNaN(rv)) return false;
        switch (filterOp) {
          case "<":  return rv <  cmp;
          case "<=": return rv <= cmp;
          case ">":  return rv >  cmp;
          case ">=": return rv >= cmp;
          case "=":  return rv === cmp;
          case "!=": return rv !== cmp;
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
        if (typeof av === "number" && typeof bv === "number") return sd === "asc" ? av - bv : bv - av;
        var as = String(av).toLowerCase(), bs = String(bv).toLowerCase();
        return sd === "asc" ? (as < bs ? -1 : as > bs ? 1 : 0)
                            : (as > bs ? -1 : as < bs ? 1 : 0);
      });
    }

    function _computeTotal(filteredRows) {
      if (!totalField) return null;
      // Always prefer server-side totals_data when available.
      // Summing ratio/percentage fields row-by-row produces nonsense
      // (e.g. 500 rows × 100% coverage = 50000%). The server total is authoritative.
      var td = queryResponse.totals_data;
      if (td && td[totalField] != null) return Number(td[totalField].value) || 0;
      // Fallback: sum filtered rows (only when Totals row is disabled in the data panel)
      var sum = 0;
      filteredRows.forEach(function (row) {
        var cell = row[totalField];
        if (cell && cell.value != null) sum += Number(cell.value) || 0;
      });
      return sum;
    }

    function _totalColor(val) {
      if (threshHigh != null && val >= threshHigh) return colorHigh;
      if (threshLow  != null && val >= threshLow)  return colorMid;
      if (threshLow  != null || threshHigh != null) return colorLow;
      return colorDefault;
    }

    function _cellText(cell, field) {
      if (!cell || cell.value == null) return "—";
      if (cell.rendered != null && cell.rendered !== "") return cell.rendered;
      var n = Number(cell.value);
      if (!isNaN(n) && field && field.value_format) return _fmt(n, field.value_format);
      return String(cell.value);
    }

    function _totalText(val) {
      if (totalFieldObj && totalFieldObj.value_format) return _fmt(val, totalFieldObj.value_format);
      return _compactFmt(Math.abs(val), 0, "$", val < 0 ? "-" : "", true) ||
             "$" + Math.round(val).toLocaleString();
    }

    function _effectiveWidth(field) {
      // Drag-resized width takes priority over config
      if (self._colWidths[field.name] > 0) return self._colWidths[field.name];
      var cw = Number(config["col_" + _safeKey(field.name) + "_width"]) || 0;
      return cw > 0 ? cw : 0;
    }

    function _effectiveAlign(field) {
      var cfgAlign = config["col_" + _safeKey(field.name) + "_align"];
      if (cfgAlign) return cfgAlign;
      return dimensions.indexOf(field) !== -1 ? "left" : "right";
    }

    function _effectiveLabel(field) {
      var cfgLabel = (config["col_" + _safeKey(field.name) + "_label"] || "").trim();
      return cfgLabel || field.label_short || field.label || field.name;
    }

    // ------------------------------------------------
    // DOM: Container
    // ------------------------------------------------
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

    // ------------------------------------------------
    // DOM: Filter bar
    // ------------------------------------------------
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
        barEl.appendChild(_span(filterLabel + ":", "font-size:13px;color:#6B7280;font-weight:500;white-space:nowrap;"));

        // Operator + value badge (input inside styled box)
        var opBadge = document.createElement("div");
        opBadge.style.cssText = [
          "display:inline-flex",
          "align-items:center",
          "gap:2px",
          "background:white",
          "border:1px solid " + borderColor,
          "border-radius:6px",
          "padding:3px 10px",
          "font-size:13px"
        ].join(";");

        opBadge.appendChild(_span(filterOp + " ", "color:#6B7280;"));

        filterInput = document.createElement("input");
        filterInput.type = "text";
        filterInput.value = self._filterValue;
        filterInput.style.cssText = [
          "width:46px",
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

        if (filterIsPercent) opBadge.appendChild(_span("%", "color:#6B7280;"));
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
        totalWrap.style.cssText = "display:flex;align-items:baseline;gap:5px;white-space:nowrap;";
        totalWrap.appendChild(_span(totalLabel + ":", "font-size:13px;color:#6B7280;font-weight:500;"));
        totalValEl = document.createElement("span");
        totalValEl.style.cssText = "font-size:16px;font-weight:700;color:" + colorDefault + ";";
        totalWrap.appendChild(totalValEl);
        barEl.appendChild(totalWrap);
      }

      container.appendChild(barEl);
    }

    // ------------------------------------------------
    // DOM: Table wrapper (scrollable)
    // ------------------------------------------------
    var tableWrap = document.createElement("div");
    tableWrap.style.cssText = "flex:1;overflow:auto;min-height:0;";
    container.appendChild(tableWrap);

    // ------------------------------------------------
    // renderTable
    // ------------------------------------------------
    function renderTable() {
      tableWrap.innerHTML = "";

      var filtered = _applyFilter(data);
      var sorted   = _sortRows(filtered, self._sortField, self._sortDir);

      // Update filter bar elements
      if (countEl) {
        countEl.textContent = "Showing " + filtered.length + " " + rowLabel;
      }
      if (totalValEl && totalField) {
        var tv = _computeTotal(filtered);
        if (tv !== null) {
          totalValEl.textContent = _totalText(tv);
          totalValEl.style.color = _totalColor(tv);
        }
      }

      // ---- TABLE ----
      var table = document.createElement("table");

      // Use fixed layout when ANY field has an explicit width (drag or config).
      // Fixed layout is required to enforce exact widths (including shrinking).
      // Without it, table-layout:auto ignores col widths and respects min-content only.
      var hasExplicit = visibleFields.some(function (f) {
        return self._colWidths[f.name] > 0 ||
               Number(config["col_" + _safeKey(f.name) + "_width"]) > 0;
      });

      table.style.cssText = [
        "width:"      + (hasExplicit ? "max-content" : "100%"),
        "min-width:100%",
        "border-collapse:collapse",
        "font-size:"  + fontSize + "px",
        "font-family:" + fontFamily,
        "table-layout:" + (hasExplicit ? "fixed" : "auto")
      ].join(";");

      // Pre-compute effective column width for each visible field.
      // Priority: drag width > config width > 0 (auto).
      // When hasExplicit=true, 0 falls back to 150px so fixed layout has all widths set.
      var colWidthMap = {};
      visibleFields.forEach(function (f) {
        var dw = self._colWidths[f.name] > 0 ? self._colWidths[f.name] : 0;
        var cw = Number(config["col_" + _safeKey(f.name) + "_width"]) || 0;
        colWidthMap[f.name] = dw > 0 ? dw : cw; // 0 means "auto"
      });

      // Colgroup — IDs always set; widths only when in fixed-layout mode.
      var cg = document.createElement("colgroup");
      visibleFields.forEach(function (field) {
        var col = document.createElement("col");
        col.id = "_ft_col_" + _safeKey(field.name);
        if (hasExplicit) {
          col.style.width = (colWidthMap[field.name] > 0 ? colWidthMap[field.name] : 150) + "px";
        }
        cg.appendChild(col);
      });
      table.appendChild(cg);

      // ---- THEAD ----
      var thead = document.createElement("thead");
      var hRow  = document.createElement("tr");
      hRow.style.cssText = "position:sticky;top:0;z-index:3;";

      visibleFields.forEach(function (field) {
        var th = document.createElement("th");
        var isActive = self._sortField === field.name;
        var align = _effectiveAlign(field);

        // Explicit width applied directly on <th> — sticky headers do NOT always
        // reflow when only <col> changes, so we set width+max-width on the element itself.
        var thW = hasExplicit ? (colWidthMap[field.name] > 0 ? colWidthMap[field.name] : 150) : 0;

        th.style.cssText = [
          "padding:9px 24px 9px 12px",
          "font-size:12px",
          "font-weight:600",
          "color:" + (isActive ? "#111827" : headerTextColor),
          "background:" + headerBg,
          "border-bottom:2px solid " + borderColor,
          "border-right:1px solid " + borderColor,
          "white-space:nowrap",
          "cursor:pointer",
          "user-select:none",
          "text-align:" + align,
          "position:relative",
          "overflow:hidden",
          thW > 0 ? "width:" + thW + "px" : "",
          thW > 0 ? "max-width:" + thW + "px" : ""
        ].filter(Boolean).join(";");

        // Label + sort icon
        var lbl = _effectiveLabel(field);
        var icon = isActive ? (self._sortDir === "asc" ? " ↑" : " ↓") : " ↑↓";
        th.appendChild(_span(lbl + icon, ""));

        // Sort click (not on resize handle)
        th.addEventListener("click", function () {
          if (self._sortField === field.name) {
            self._sortDir = self._sortDir === "asc" ? "desc" : "asc";
          } else {
            self._sortField = field.name;
            self._sortDir = "asc";
          }
          renderTable();
        });

        // ---- Drag-resize handle ----
        var handle = document.createElement("div");
        handle.style.cssText = [
          "position:absolute", "right:0", "top:0",
          "width:6px", "height:100%",
          "cursor:col-resize", "background:transparent", "z-index:4"
        ].join(";");

        handle.addEventListener("mousedown", (function (f, thEl) {
          return function (e) {
            e.preventDefault();
            e.stopPropagation();

            // ── Step 1: freeze ALL columns at their current rendered width ──
            // Snapshot BEFORE switching to fixed so shrinking works correctly.
            var allThEls = table.querySelectorAll("thead > tr > th");
            var allColEls = table.querySelectorAll("colgroup > col");
            for (var ci = 0; ci < allThEls.length; ci++) {
              var cw = allThEls[ci].getBoundingClientRect().width || 150;
              if (allColEls[ci]) allColEls[ci].style.width = cw + "px";
              // Also freeze on the <th> itself — sticky headers ignore <col> live changes
              allThEls[ci].style.width    = cw + "px";
              allThEls[ci].style.maxWidth = cw + "px";
              if (visibleFields[ci]) self._colWidths[visibleFields[ci].name] = cw;
            }

            // ── Step 2: switch to fixed layout ──
            table.style.tableLayout = "fixed";
            table.style.width       = "max-content";

            // ── Step 3: track this column's drag ──
            var myColEl = document.getElementById("_ft_col_" + _safeKey(f.name));
            var startX  = e.clientX;
            var startW  = parseFloat(thEl.style.width) || 150;

            handle.style.background = "#3B82F6";

            function onMove(ev) {
              var newW = Math.max(40, startW + ev.clientX - startX);
              self._colWidths[f.name] = newW;
              if (myColEl) myColEl.style.width = newW + "px";
              // Update header directly — <col> change alone won't move a sticky <th>
              thEl.style.width    = newW + "px";
              thEl.style.maxWidth = newW + "px";
            }
            function onUp() {
              handle.style.background = "transparent";
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", onUp);
            }
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          };
        })(field, th));

        th.appendChild(handle);
        th.classList.add("_ft_th_" + _safeKey(field.name));
        hRow.appendChild(th);
      });

      thead.appendChild(hRow);
      table.appendChild(thead);

      // ---- TBODY ----
      var tbody = document.createElement("tbody");

      if (sorted.length === 0) {
        var emptyTr = document.createElement("tr");
        var emptyTd = document.createElement("td");
        emptyTd.setAttribute("colspan", String(visibleFields.length));
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

        visibleFields.forEach(function (field) {
          var td = document.createElement("td");
          var align = _effectiveAlign(field);
          var wrapText = config["col_" + _safeKey(field.name) + "_wrap"] === "true";

          td.style.cssText = [
            "padding:9px 12px",
            "border-bottom:1px solid " + borderColor,
            "border-right:1px solid " + borderColor,
            "color:#111827",
            "vertical-align:middle",
            "text-align:" + align,
            // max-width:0 is the key trick for table-layout:fixed — it tells the browser
            // the cell has no intrinsic min-content width so overflow:hidden can actually
            // clip the content below its natural size.
            "max-width:0",
            wrapText ? "white-space:normal;word-break:break-word"
                     : "white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
          ].join(";");

          var cell       = row[field.name];
          var displayVal = _cellText(cell, field);
          var links      = cell ? cell.links : null;

          if (links && links.length > 0) {
            var a = document.createElement("a");
            a.href = "#";
            a.style.cssText = "color:" + linkColor + ";text-decoration:none;";
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

    // Initial render
    renderTable();

    // Bind filter input
    if (filterInput) {
      filterInput.addEventListener("input", function () {
        self._filterValue = filterInput.value;
        renderTable();
      });
    }

    doneRendering();
  }
});


// ====================================================
// Helpers (module scope — no external dependencies)
// ====================================================

function _safeKey(key) {
  return String(key).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}

function _span(text, css) {
  var el = document.createElement("span");
  if (css) el.style.cssText = css;
  el.textContent = text;
  return el;
}

function _findField(allFields, name) {
  if (!name) return null;
  for (var i = 0; i < allFields.length; i++) {
    if (allFields[i].name === name) return allFields[i];
  }
  return null;
}

function _parseNum(v) {
  if (v == null || v === "") return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function _fmt(val, fmt) {
  if (!fmt) return String(val);
  // Percentage
  if (fmt.indexOf("%") !== -1) {
    var pm = fmt.match(/\.(0+)%/);
    return (val * 100).toFixed(pm ? pm[1].length : 0) + "%";
  }
  var prefix = fmt.charAt(0) === "$" ? "$" : "";
  var dm = fmt.match(/\.(0+)/);
  var dec = dm ? dm[1].length : 0;
  var abs = Math.abs(val), sign = val < 0 ? "-" : "";
  var compact = _compactFmt(abs, dec, prefix, sign, fmt.indexOf(",") !== -1);
  if (compact) return compact;
  var fixed = abs.toFixed(dec);
  if (fmt.indexOf(",") !== -1) {
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    fixed = parts.join(".");
  }
  return sign + prefix + fixed;
}

function _compactFmt(abs, dec, prefix, sign, useComma) {
  if (abs < 1000) return null;
  var n, suffix;
  if      (abs >= 1e9) { n = abs / 1e9; suffix = "B"; }
  else if (abs >= 1e6) { n = abs / 1e6; suffix = "M"; }
  else                 { n = abs / 1e3; suffix = "K"; }
  return sign + prefix + n.toFixed(n < 10 ? 1 : 0) + suffix;
}

/**
 * Build all viz config options.
 * Receives the full field list so filter/total fields become proper dropdowns.
 * Per-column Series options are generated for every field.
 */
function _buildOptions(allFields, dimensions) {
  // Build field select options for dropdowns
  var noneOpt = [{ "(none — disable)": "" }];
  var fieldOpts = noneOpt.concat(allFields.map(function (f) {
    var obj = {};
    obj[f.label_short || f.label || f.name] = f.name;
    return obj;
  }));

  // Total field: only non-list measures (dimensions and list-type fields can't be summed)
  var dimNames = dimensions.map(function (f) { return f.name; });
  var measureOpts = noneOpt.concat(allFields.filter(function (f) {
    return dimNames.indexOf(f.name) === -1 && f.type !== "list";
  }).map(function (f) {
    var obj = {};
    obj[f.label_short || f.label || f.name] = f.name;
    return obj;
  }));

  var opts = {

    // ---- Filter ----
    show_filter_bar: {
      type: "string", label: "Show Filter Bar", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Filter", order: 1
    },
    filter_label: {
      type: "string", label: "Filter Label", default: "Filter",
      placeholder: "e.g. Coverage Filter", section: "Filter", order: 2
    },
    filter_field: {
      type: "string", label: "Filter Field", display: "select",
      values: fieldOpts, default: "",
      section: "Filter", order: 3
    },
    filter_operator: {
      type: "string", label: "Operator", display: "select",
      values: [
        { "< less than": "<" }, { "<= less or equal": "<=" },
        { "> greater than": ">" }, { ">= greater or equal": ">=" },
        { "= equal": "=" }, { "!= not equal": "!=" }
      ],
      default: "<", section: "Filter", order: 4
    },
    filter_default: {
      type: "string", label: "Default Threshold Value",
      placeholder: "e.g. 40  (for 40% when Percent=Yes)",
      default: "", section: "Filter", order: 5
    },
    filter_is_percent: {
      type: "string", label: "Field is Percentage?", display: "select",
      values: [{ "Yes (input ÷ 100 before compare)": "true" }, { "No (raw value)": "false" }],
      default: "false", section: "Filter", order: 6
    },
    row_label: {
      type: "string", label: "Row Label", default: "rows",
      placeholder: "e.g. commitments", section: "Filter", order: 7
    },

    // ---- Total ----
    show_total: {
      type: "string", label: "Show Total KPI", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Total", order: 1
    },
    total_field: {
      type: "string", label: "Total Field", display: "select",
      values: measureOpts, default: "",
      section: "Total", order: 2
    },
    total_label: {
      type: "string", label: "Total Label", default: "Total",
      placeholder: "e.g. Total Waste", section: "Total", order: 3
    },
    total_from_filtered: {
      type: "string", label: "Total Scope", display: "select",
      values: [
        { "Filtered rows only": "true" },
        { "All rows (server Totals row)": "false" }
      ],
      default: "true", section: "Total", order: 4
    },
    threshold_low: {
      type: "string", label: "Threshold Low (raw)",
      placeholder: "e.g. 100000 → $100K",
      default: "", section: "Total", order: 10
    },
    threshold_high: {
      type: "string", label: "Threshold High (raw)",
      placeholder: "e.g. 500000 → $500K",
      default: "", section: "Total", order: 11
    },
    color_default: {
      type: "string", label: "Color — below Low threshold",
      display: "color", default: "#111827", section: "Total", order: 12
    },
    color_low: {
      type: "string", label: "Color — Low band (≥ Low, < High)",
      display: "color", default: "#22C55E", section: "Total", order: 13
    },
    color_mid: {
      type: "string", label: "Color — Mid band (≥ Low threshold only)",
      display: "color", default: "#F59E0B", section: "Total", order: 14
    },
    color_high: {
      type: "string", label: "Color — High band (≥ High threshold)",
      display: "color", default: "#EF4444", section: "Total", order: 15
    },

    // ---- Format (table style) ----
    header_bg_preset: {
      type: "string", label: "Header Background", display: "select",
      values: [
        { "White": "#FFFFFF" },
        { "Light Gray": "#F9FAFB" },
        { "Medium Gray": "#F3F4F6" },
        { "Custom": "custom" }
      ],
      default: "#F9FAFB", section: "Format", order: 1
    },
    header_bg_color: {
      type: "string", label: "Header Background (custom)",
      display: "color", default: "#F9FAFB", section: "Format", order: 2
    },
    header_text_color: {
      type: "string", label: "Header Text Color",
      display: "color", default: "#6B7280", section: "Format", order: 3
    },
    border_color: {
      type: "string", label: "Border Color",
      display: "color", default: "#E5E7EB", section: "Format", order: 4
    },
    link_color: {
      type: "string", label: "Link Color",
      display: "color", default: "#3B82F6", section: "Format", order: 5
    },
    font_size: {
      type: "number", label: "Font Size (px)", default: 14,
      section: "Format", order: 6
    },
    font_family: {
      type: "string", label: "Font Family",
      default: "'Inter','Helvetica Neue',Arial,sans-serif",
      section: "Format", order: 7
    }
  };

  // ---- Columns (Series tab) — one group per field ----
  allFields.forEach(function (field, i) {
    var safe  = _safeKey(field.name);
    var label = field.label_short || field.label || field.name;
    var isDim = dimensions.indexOf(field) !== -1;
    var base  = i * 10;

    opts["col_" + safe + "_show"] = {
      type: "string", label: label + " | Show", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Columns", order: base
    };
    opts["col_" + safe + "_label"] = {
      type: "string", label: label + " | Header Label",
      default: "", placeholder: label,
      section: "Columns", order: base + 1
    };
    opts["col_" + safe + "_width"] = {
      type: "number", label: label + " | Width (px, 0 = auto)",
      default: 0, section: "Columns", order: base + 2
    };
    opts["col_" + safe + "_align"] = {
      type: "string", label: label + " | Alignment", display: "select",
      values: [{ "Left": "left" }, { "Center": "center" }, { "Right": "right" }],
      default: isDim ? "left" : "right",
      section: "Columns", order: base + 3
    };
    opts["col_" + safe + "_wrap"] = {
      type: "string", label: label + " | Wrap Text", display: "select",
      values: [{ "No (truncate)": "false" }, { "Yes (multi-line)": "true" }],
      default: "false", section: "Columns", order: base + 4
    };
  });

  return opts;
}
