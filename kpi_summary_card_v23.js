/**
 * KPI Summary Card -- Looker Custom Visualization
 *
 * Displays a total KPI value at the top with a breakdown below.
 * Three breakdown layouts: Grid, List, Table.
 * Configurable color thresholds for total and breakdown values.
 *
 * Query: 1 dimension + 1..N measures.
 *   - Grid/List: uses first measure
 *   - Table: uses all measures as columns
 *
 * Admin -> Visualizations:
 *   ID: kpi_summary_card
 *   Label: KPI Summary Card
 *   Main: https://cdn.jsdelivr.net/gh/martinvelez-harness/looker-viz@main/kpi_summary_card.js
 */

looker.plugins.visualizations.add({

  id: "kpi_summary_card",
  label: "KPI Summary Card",

  options: {
    // -- Total --
    card_title: {
      type: "string",
      label: "Card Title",
      default: "",
      placeholder: "e.g. Active Commitments",
      section: "Total",
      order: 0
    },
    card_title_color: {
      type: "string",
      label: "Title Color",
      default: "#111827",
      display: "color",
      section: "Total",
      order: 1
    },
    card_title_weight: {
      type: "string",
      label: "Title Font Weight",
      display: "select",
      values: [
        { "Bold": "bold" },
        { "Normal": "normal" }
      ],
      default: "bold",
      section: "Total",
      order: 2
    },
    total_subtitle: {
      type: "string",
      label: "Total Subtitle",
      default: "Total",
      section: "Total",
      order: 3
    },
    total_subtitle_color: {
      type: "string",
      label: "Subtitle Color",
      default: "#9CA3AF",
      display: "color",
      section: "Total",
      order: 4
    },
    total_subtitle_weight: {
      type: "string",
      label: "Subtitle Font Weight",
      display: "select",
      values: [
        { "Bold": "bold" },
        { "Normal": "normal" }
      ],
      default: "normal",
      section: "Total",
      order: 5
    },
    total_font_size: {
      type: "number",
      label: "Value Font Size (px)",
      default: 48,
      section: "Total",
      order: 6
    },
    total_subtitle_size: {
      type: "number",
      label: "Subtitle Font Size (px)",
      default: 14,
      section: "Total",
      order: 7
    },
    total_color: {
      type: "string",
      label: "Value Color",
      default: "#111827",
      display: "color",
      section: "Total",
      order: 8
    },
    total_font_weight: {
      type: "string",
      label: "Value Font Weight",
      display: "select",
      values: [
        { "Bold": "bold" },
        { "Normal": "normal" }
      ],
      default: "bold",
      section: "Total",
      order: 9
    },
    total_use_threshold: {
      type: "string",
      label: "Apply Threshold to Total",
      display: "select",
      values: [
        { "No": "false" },
        { "Yes": "true" }
      ],
      default: "false",
      section: "Total",
      order: 6
    },

    // -- Breakdown --
    breakdown_layout: {
      type: "string",
      label: "Layout",
      display: "select",
      values: [
        { "Grid": "grid" },
        { "List": "list" },
        { "Table": "table" }
      ],
      default: "grid",
      section: "Breakdown",
      order: 1
    },
    breakdown_title: {
      type: "string",
      label: "Section Title",
      default: "Breakdown by type",
      section: "Breakdown",
      order: 2
    },
    breakdown_columns: {
      type: "string",
      label: "Grid Columns",
      display: "select",
      values: [
        { "2": "2" },
        { "3": "3" },
        { "4": "4" }
      ],
      default: "3",
      section: "Breakdown",
      order: 3
    },
    breakdown_label_size: {
      type: "number",
      label: "Label Font Size (px)",
      default: 14,
      section: "Breakdown",
      order: 4
    },
    breakdown_value_size: {
      type: "number",
      label: "Value Font Size (px)",
      default: 28,
      section: "Breakdown",
      order: 5
    },
    breakdown_label_color: {
      type: "string",
      label: "Label Color",
      default: "#9CA3AF",
      display: "color",
      section: "Breakdown",
      order: 6
    },
    breakdown_font_weight: {
      type: "string",
      label: "Value Font Weight",
      display: "select",
      values: [
        { "Bold": "bold" },
        { "Normal": "normal" }
      ],
      default: "bold",
      section: "Breakdown",
      order: 7
    },
    breakdown_value_color: {
      type: "string",
      label: "Value Color",
      default: "#111827",
      display: "color",
      section: "Breakdown",
      order: 7
    },
    show_dot: {
      type: "string",
      label: "Show Color Dot (Table)",
      display: "select",
      values: [
        { "Yes": "true" },
        { "No": "false" }
      ],
      default: "true",
      section: "Breakdown",
      order: 9
    },

    // -- Thresholds --
    threshold_good: {
      type: "number",
      label: "Good >= (value)",
      default: null,
      section: "Thresholds",
      order: 1
    },
    threshold_warning: {
      type: "number",
      label: "Warning >= (value)",
      default: null,
      section: "Thresholds",
      order: 2
    },
    color_good: {
      type: "string",
      label: "Good Color",
      default: "#22C55E",
      display: "color",
      section: "Thresholds",
      order: 3
    },
    color_warning: {
      type: "string",
      label: "Warning Color",
      default: "#F59E0B",
      display: "color",
      section: "Thresholds",
      order: 4
    },
    color_danger: {
      type: "string",
      label: "Danger Color",
      default: "#EF4444",
      display: "color",
      section: "Thresholds",
      order: 5
    },
    threshold_direction: {
      type: "string",
      label: "Direction",
      display: "select",
      values: [
        { "Higher is better": "asc" },
        { "Lower is better": "desc" }
      ],
      default: "asc",
      section: "Thresholds",
      order: 6
    },
    breakdown_use_threshold: {
      type: "string",
      label: "Apply to Breakdown Values",
      display: "select",
      values: [
        { "No": "false" },
        { "Yes": "true" }
      ],
      default: "false",
      section: "Thresholds",
      order: 7
    },

    // -- Format --
    value_format: {
      type: "string",
      label: "Value Format",
      display: "select",
      values: [
        { "Auto (from query)": "auto" },
        { "Decimal (0)": "decimal_0" },
        { "Decimal (1)": "decimal_1" },
        { "Decimal (2)": "decimal_2" },
        { "USD": "usd" },
        { "USD (0)": "usd_0" },
        { "Percent (0)": "percent_0" },
        { "Percent (1)": "percent_1" },
        { "Percent (2)": "percent_2" },
        { "Number": "number" },
        { "Custom": "custom" }
      ],
      default: "auto",
      section: "Format",
      order: 1
    },
    value_format_custom: {
      type: "string",
      label: "Custom Format",
      default: "",
      placeholder: "e.g. $#,##0.00 or #,##0.0%",
      section: "Format",
      order: 2
    },
    divider_color: {
      type: "string",
      label: "Divider Color",
      default: "#E5E7EB",
      display: "color",
      section: "Format",
      order: 3
    },
    font_family: {
      type: "string",
      label: "Font Family",
      default: "'Inter','Helvetica Neue',Arial,sans-serif",
      section: "Format",
      order: 2
    }
  },

  // --------------------------------------------------
  // CREATE
  // --------------------------------------------------
  create: function (element, config) {
    element.innerHTML = "";
    element.style.fontFamily = config.font_family || "'Inter','Helvetica Neue',Arial,sans-serif";
    element.style.overflow = "hidden";
    element.style.background = "white";
    element.style.padding = "0";
    element.style.margin = "0";
    element.style.boxSizing = "border-box";
  },

  // --------------------------------------------------
  // UPDATE
  // --------------------------------------------------
  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    element.innerHTML = "";
    element.style.overflow = "hidden";
    element.style.padding = "0";
    element.style.margin = "0";

    // Kill scrollbars
    var parent = element.parentElement;
    while (parent && parent !== document.body) {
      parent.style.overflow = "hidden";
      parent = parent.parentElement;
    }
    if (!document.getElementById("_kpi_card_reset_css")) {
      var style = document.createElement("style");
      style.id = "_kpi_card_reset_css";
      style.textContent = "#vis, #vis-container, .looker-vis-context { padding: 0 !important; margin: 0 !important; overflow: hidden !important; }";
      document.head.appendChild(style);
    }

    // -- Validate --
    var dimensions = queryResponse.fields.dimension_like || queryResponse.fields.dimensions || [];
    var measures = queryResponse.fields.measure_like || [];
    if (measures.length === 0) {
      var m = queryResponse.fields.measures || [];
      var tc = queryResponse.fields.table_calculations || [];
      measures = m.concat(tc);
    }

    if (dimensions.length < 1 || measures.length < 1) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add 1 dimension and 1 measure to the query</p>';
      doneRendering();
      return;
    }

    if (!data || data.length === 0) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">No data returned</p>';
      doneRendering();
      return;
    }

    this.clearErrors();

    var dimField = dimensions[0];
    var measureField = measures[0];

    // -- Config --
    var fontFamily       = config.font_family || "'Inter','Helvetica Neue',Arial,sans-serif";
    var cardTitle        = (config.card_title || "").trim();
    var cardTitleColor   = config.card_title_color || "#111827";
    var cardTitleWeight  = config.card_title_weight === "normal" ? "400" : "700";
    var totalSubtitle    = config.total_subtitle || "Total";
    var subtitleColor    = config.total_subtitle_color || "#9CA3AF";
    var subtitleWeight   = config.total_subtitle_weight === "bold" ? "700" : "400";
    var totalFontSize    = Number(config.total_font_size) || 48;
    var subtitleSize     = Number(config.total_subtitle_size) || 14;
    var totalColor       = config.total_color || "#111827";
    var totalFontWeight  = config.total_font_weight === "normal" ? "400" : "800";
    var breakdownTitle   = config.breakdown_title || "Breakdown by type";
    var layout           = config.breakdown_layout || "grid";
    var cols             = Number(config.breakdown_columns) || 3;
    var brkLabelSize     = Number(config.breakdown_label_size) || 14;
    var brkValueSize     = Number(config.breakdown_value_size) || 28;
    var brkLabelColor    = config.breakdown_label_color || "#9CA3AF";
    var brkValueColor    = config.breakdown_value_color || "#111827";
    var brkFontWeight    = config.breakdown_font_weight === "normal" ? "400" : "700";
    var showDot          = config.show_dot !== "false";
    var vfSetting        = config.value_format || "auto";
    var vfCustom         = (config.value_format_custom || "").trim();

    // Thresholds
    var thGood           = config.threshold_good != null ? Number(config.threshold_good) : null;
    var thWarning        = config.threshold_warning != null ? Number(config.threshold_warning) : null;
    var thDirection      = config.threshold_direction || "asc";
    var clrGood          = config.color_good || "#22C55E";
    var clrWarning       = config.color_warning || "#F59E0B";
    var clrDanger        = config.color_danger || "#EF4444";
    var totalUseTh       = config.total_use_threshold === "true";
    var brkUseTh         = config.breakdown_use_threshold === "true";

    // Dot colors for table layout
    var dotColors = ["#F97316", "#3B82F6", "#6366F1", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

    // -- Threshold color function --
    function getThresholdColor(val) {
      if (thGood == null && thWarning == null) return null;
      if (thDirection === "asc") {
        // Higher is better: >= good = green, >= warning = yellow, else red
        if (thGood != null && val >= thGood) return clrGood;
        if (thWarning != null && val >= thWarning) return clrWarning;
        return clrDanger;
      } else {
        // Lower is better: <= good = green, <= warning = yellow, else red
        if (thGood != null && val <= thGood) return clrGood;
        if (thWarning != null && val <= thWarning) return clrWarning;
        return clrDanger;
      }
    }

    // -- Process data --
    var total = 0;
    var breakdownItems = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var dimCell = row[dimField.name];
      var measureCell = row[measureField.name];
      var label = dimCell ? (dimCell.rendered || LookerCharts.Utils.textForCell(dimCell) || String(dimCell.value)) : "--";
      var val = measureCell ? Number(measureCell.value) || 0 : 0;
      total += val;

      // Collect all measure values for table layout
      var measureValues = [];
      for (var mi = 0; mi < measures.length; mi++) {
        var mc = row[measures[mi].name];
        measureValues.push({
          value: mc ? Number(mc.value) || 0 : 0,
          rendered: mc ? mc.rendered : null,
          links: mc ? mc.links : null
        });
      }

      breakdownItems.push({
        label: label,
        value: val,
        rendered: measureCell ? measureCell.rendered : null,
        links: measureCell ? measureCell.links : null,
        measures: measureValues
      });
    }

    // -- Resolve format --
    var resolvedFormat = null;
    var useRendered = true;
    if (vfSetting === "custom" && vfCustom) {
      resolvedFormat = vfCustom;
      useRendered = false;
    } else if (vfSetting !== "auto") {
      resolvedFormat = _resolveNamedFormat(vfSetting);
      useRendered = false;
    } else {
      // Auto: detect from Looker field metadata or rendered values
      var lkFmt = measureField.value_format;
      if (lkFmt) {
        resolvedFormat = lkFmt;
      } else if (breakdownItems.length > 0 && breakdownItems[0].rendered) {
        var sample = breakdownItems[0].rendered;
        if (sample.indexOf('%') !== -1) {
          resolvedFormat = "#,##0.0%";
        } else if (sample.indexOf('$') !== -1) {
          var decMatch = sample.match(/\.(\d+)/);
          var dec = decMatch ? decMatch[1].length : 0;
          resolvedFormat = "$#,##0" + (dec > 0 ? "." + "0".repeat(dec) : "");
        }
      }
    }
    if (!resolvedFormat) resolvedFormat = "#,##0";

    // -- Format helper --
    function formatVal(num, rendered) {
      if (useRendered && rendered) return rendered;
      return formatNumber(num, resolvedFormat);
    }

    // -- Build layout --
    var container = document.createElement("div");
    container.style.fontFamily = fontFamily;
    container.style.padding = "16px 12px 0";
    container.style.boxSizing = "border-box";
    container.style.width = "100%";
    container.style.overflow = "hidden";
    container.style.display = "flex";
    container.style.flexDirection = "column";

    // -- Card title --
    if (cardTitle) {
      var titleEl = document.createElement("div");
      titleEl.style.fontSize = "16px";
      titleEl.style.fontWeight = cardTitleWeight;
      titleEl.style.color = cardTitleColor;
      titleEl.style.marginBottom = "8px";
      titleEl.textContent = cardTitle;
      container.appendChild(titleEl);
    }

    // -- Total section --
    var totalSection = document.createElement("div");
    totalSection.style.marginBottom = "4px";

    var totalValueEl = document.createElement("div");
    totalValueEl.style.fontSize = totalFontSize + "px";
    totalValueEl.style.fontWeight = totalFontWeight;
    totalValueEl.style.lineHeight = "1.1";
    totalValueEl.textContent = formatVal(total, null);

    // Total color: threshold or config
    if (totalUseTh) {
      var tColor = getThresholdColor(total);
      totalValueEl.style.color = tColor || totalColor;
    } else {
      totalValueEl.style.color = totalColor;
    }
    totalSection.appendChild(totalValueEl);

    var totalSubEl = document.createElement("div");
    totalSubEl.style.fontSize = subtitleSize + "px";
    totalSubEl.style.color = subtitleColor;
    totalSubEl.style.fontWeight = subtitleWeight;
    totalSubEl.style.marginTop = "4px";
    totalSubEl.textContent = totalSubtitle;
    totalSection.appendChild(totalSubEl);

    container.appendChild(totalSection);

    // -- Divider (always visible) --
    var divider = document.createElement("div");
    divider.style.height = "1px";
    divider.style.background = config.divider_color || "#E5E7EB";
    divider.style.margin = "16px 0";
    container.appendChild(divider);

    // -- Breakdown title --
    if (breakdownTitle) {
      var brkTitleEl = document.createElement("div");
      brkTitleEl.style.fontSize = subtitleSize + "px";
      brkTitleEl.style.color = "#9CA3AF";
      brkTitleEl.style.marginBottom = "12px";
      brkTitleEl.textContent = breakdownTitle;
      container.appendChild(brkTitleEl);
    }

    // =============================================
    // LAYOUT: GRID (original)
    // =============================================
    if (layout === "grid") {
      var grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
      grid.style.gap = "20px 16px";
      grid.style.overflow = "hidden";

      for (var j = 0; j < breakdownItems.length; j++) {
        var item = breakdownItems[j];
        var cell = document.createElement("div");
        cell.style.display = "flex";
        cell.style.flexDirection = "column";
        cell.style.gap = "2px";

        var cellLabel = document.createElement("div");
        cellLabel.style.fontSize = brkLabelSize + "px";
        cellLabel.style.color = brkLabelColor;
        cellLabel.style.fontWeight = "500";
        cellLabel.textContent = item.label;
        cell.appendChild(cellLabel);

        var cellValue = document.createElement("div");
        cellValue.style.fontSize = brkValueSize + "px";
        cellValue.style.fontWeight = brkFontWeight;
        cellValue.style.lineHeight = "1.2";
        cellValue.textContent = formatVal(item.value, item.rendered);
        if (brkUseTh) {
          var c = getThresholdColor(item.value);
          cellValue.style.color = c || brkValueColor;
        } else {
          cellValue.style.color = brkValueColor;
        }
        cell.appendChild(cellValue);

        addDrill(cell, item.links);
        grid.appendChild(cell);
      }
      container.appendChild(grid);
    }

    // =============================================
    // LAYOUT: LIST (label left, value right)
    // =============================================
    if (layout === "list") {
      var list = document.createElement("div");
      list.style.display = "flex";
      list.style.flexDirection = "column";
      list.style.gap = "0";

      for (var li = 0; li < breakdownItems.length; li++) {
        var lItem = breakdownItems[li];

        var row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.padding = "8px 0";
        if (li < breakdownItems.length - 1) {
          row.style.borderBottom = "1px solid #F3F4F6";
        }

        var rowLabel = document.createElement("div");
        rowLabel.style.fontSize = brkLabelSize + "px";
        rowLabel.style.color = brkLabelColor;
        rowLabel.style.fontWeight = "500";
        rowLabel.textContent = lItem.label;
        row.appendChild(rowLabel);

        var rowValue = document.createElement("div");
        rowValue.style.fontSize = brkValueSize + "px";
        rowValue.style.fontWeight = brkFontWeight;
        rowValue.style.lineHeight = "1.2";
        rowValue.textContent = formatVal(lItem.value, lItem.rendered);
        if (brkUseTh) {
          var lc = getThresholdColor(lItem.value);
          rowValue.style.color = lc || brkValueColor;
        } else {
          rowValue.style.color = brkValueColor;
        }
        row.appendChild(rowValue);

        addDrill(row, lItem.links);
        list.appendChild(row);
      }
      container.appendChild(list);
    }

    // =============================================
    // LAYOUT: TABLE (dot + label + multi measures)
    // =============================================
    if (layout === "table") {
      var table = document.createElement("div");
      table.style.display = "flex";
      table.style.flexDirection = "column";
      table.style.gap = "0";

      for (var ti = 0; ti < breakdownItems.length; ti++) {
        var tItem = breakdownItems[ti];

        var tRow = document.createElement("div");
        tRow.style.display = "flex";
        tRow.style.alignItems = "center";
        tRow.style.padding = "8px 0";
        tRow.style.gap = "12px";
        if (ti < breakdownItems.length - 1) {
          tRow.style.borderBottom = "1px solid #F3F4F6";
        }

        // Color dot
        if (showDot) {
          var dot = document.createElement("div");
          dot.style.width = "10px";
          dot.style.height = "10px";
          dot.style.borderRadius = "50%";
          dot.style.flexShrink = "0";
          dot.style.background = dotColors[ti % dotColors.length];
          tRow.appendChild(dot);
        }

        // Label
        var tLabel = document.createElement("div");
        tLabel.style.flex = "1";
        tLabel.style.fontSize = brkLabelSize + "px";
        tLabel.style.color = "#111827";
        tLabel.style.fontWeight = "500";
        tLabel.textContent = tItem.label;
        tRow.appendChild(tLabel);

        // Measure columns
        for (var mj = 0; mj < tItem.measures.length; mj++) {
          var mv = tItem.measures[mj];
          var mEl = document.createElement("div");
          mEl.style.textAlign = "right";
          mEl.style.minWidth = "60px";
          mEl.style.fontSize = brkLabelSize + "px";
          mEl.style.fontWeight = brkFontWeight;

          var mRendered = mv.rendered || formatNumber(mv.value, detectedFormat);
          mEl.textContent = mRendered;

          if (brkUseTh && mj === 0) {
            var mc2 = getThresholdColor(mv.value);
            mEl.style.color = mc2 || brkValueColor;
          } else {
            mEl.style.color = "#111827";
          }

          addDrill(mEl, mv.links);
          tRow.appendChild(mEl);
        }

        addDrill(tRow, tItem.links);
        table.appendChild(tRow);
      }
      container.appendChild(table);
    }

    element.appendChild(container);
    doneRendering();

    // -- Drill helper --
    function addDrill(el, links) {
      if (links && links.length > 0) {
        el.style.cursor = "pointer";
        (function (l) {
          el.addEventListener("click", function (e) {
            LookerCharts.Utils.openDrillMenu({ links: l, event: e });
          });
        })(links);
      }
    }
  }

});


// --------------------------------------------------
// Helpers
// --------------------------------------------------
function _resolveNamedFormat(name) {
  var map = {
    "decimal_0": "#,##0",
    "decimal_1": "#,##0.0",
    "decimal_2": "#,##0.00",
    "usd": "$#,##0.00",
    "usd_0": "$#,##0",
    "percent_0": "#,##0%",
    "percent_1": "#,##0.0%",
    "percent_2": "#,##0.00%",
    "number": "#,##0"
  };
  return map[name] || "#,##0";
}

function formatNumber(val, fmt) {
  if (!fmt) return String(val);

  if (fmt.indexOf('%') !== -1) {
    var decimals = 0;
    var match = fmt.match(/\.(0+)%/);
    if (match) decimals = match[1].length;
    return (val * 100).toFixed(decimals) + '%';
  }

  var prefix = '';
  if (fmt.charAt(0) === '$') {
    prefix = '$';
    fmt = fmt.substring(1);
  }

  var decMatch = fmt.match(/\.(0+)/);
  var dec = decMatch ? decMatch[1].length : 0;

  var useComma = fmt.indexOf(',') !== -1;
  var formatted = val.toFixed(dec);

  if (useComma) {
    var parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }

  return prefix + formatted;
}
