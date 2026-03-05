/**
 * Heatmap Table -- Looker Custom Visualization
 * Developed by Martin Velez
 *
 * Renders a table where rows = dimension values, columns = pivot values,
 * and cells are colored by configurable thresholds (High / Medium / Low).
 *
 * Query: 1 dimension (rows) + 1 pivot dimension (columns) + 1 measure (cell value).
 *
 * Admin -> Visualizations:
 *   ID: heatmap_table
 *   Label: Heatmap Table
 *   Main: https://cdn.jsdelivr.net/gh/martinvelez-harness/looker-viz@main/heatmap_table.js
 */

looker.plugins.visualizations.add({

  id: "heatmap_table",
  label: "Heatmap Table",

  options: {
    // -- Thresholds --
    threshold_high: {
      type: "number", label: "High Threshold >= (%)",
      default: 80, section: "Thresholds", order: 1
    },
    threshold_medium: {
      type: "number", label: "Medium Threshold >= (%)",
      default: 60, section: "Thresholds", order: 2
    },
    color_high: {
      type: "string", label: "High Color", default: "#22C55E",
      display: "color", section: "Thresholds", order: 3
    },
    color_medium: {
      type: "string", label: "Medium Color", default: "#F59E0B",
      display: "color", section: "Thresholds", order: 4
    },
    color_low: {
      type: "string", label: "Low Color", default: "#EF4444",
      display: "color", section: "Thresholds", order: 5
    },
    label_high: {
      type: "string", label: "High Label", default: "High",
      section: "Thresholds", order: 6
    },
    label_medium: {
      type: "string", label: "Medium Label", default: "Medium",
      section: "Thresholds", order: 7
    },
    label_low: {
      type: "string", label: "Low Label", default: "Low",
      section: "Thresholds", order: 8
    },

    // -- Legend --
    show_legend: {
      type: "string", label: "Show Legend", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Legend", order: 1
    },
    legend_title: {
      type: "string", label: "Legend Title", default: "Coverage Rate:",
      section: "Legend", order: 2
    },
    legend_position: {
      type: "string", label: "Legend Position", display: "select",
      values: [{ "Above Table": "above" }, { "Below Table": "below" }],
      default: "above", section: "Legend", order: 3
    },
    legend_align: {
      type: "string", label: "Legend Alignment", display: "select",
      values: [{ "Left": "left" }, { "Center": "center" }, { "Right": "right" }],
      default: "left", section: "Legend", order: 4
    },

    // -- Table --
    header_label: {
      type: "string", label: "Header Label (Row / Col)",
      default: "", placeholder: "e.g. Type / Region",
      section: "Table", order: 1
    },
    cell_font_size: {
      type: "number", label: "Cell Font Size (px)", default: 16,
      section: "Table", order: 2
    },
    header_font_size: {
      type: "number", label: "Header Font Size (px)", default: 14,
      section: "Table", order: 3
    },
    cell_height: {
      type: "number", label: "Cell Height (px)", default: 56,
      section: "Table", order: 4
    },
    cell_border_radius: {
      type: "number", label: "Cell Border Radius (px)", default: 6,
      section: "Table", order: 5
    },
    cell_gap: {
      type: "number", label: "Cell Gap (px)", default: 4,
      section: "Table", order: 6
    },
    font_family: {
      type: "string", label: "Font Family",
      default: "'Inter','Helvetica Neue',Arial,sans-serif",
      section: "Table", order: 7
    },
    value_is_percentage: {
      type: "string", label: "Values are Percentages", display: "select",
      values: [{ "Yes (0-1 or 0-100)": "true" }, { "No (raw numbers)": "false" }],
      default: "true", section: "Table", order: 8
    }
  },

  // ──────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────
  create: function (element, config) {
    element.innerHTML = "";
    element.style.fontFamily = config.font_family || "'Inter','Helvetica Neue',Arial,sans-serif";
    element.style.display = "flex";
    element.style.alignItems = "flex-start";
    element.style.justifyContent = "center";
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.overflow = "auto";
    element.style.background = "white";
    element.style.padding = "0";
    element.style.margin = "0";
    element.style.boxSizing = "border-box";
  },

  // ──────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────
  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    element.innerHTML = "";

    // ── Validate ──
    if (!data || data.length === 0) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">No data returned</p>';
      doneRendering(); return;
    }

    var dimensions = queryResponse.fields.dimension_like || queryResponse.fields.dimensions || [];
    var measures = queryResponse.fields.measure_like || [];
    if (measures.length === 0) {
      measures = (queryResponse.fields.measures || []).concat(queryResponse.fields.table_calculations || []);
    }
    var pivots = queryResponse.pivots || [];

    if (measures.length < 1) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add at least 1 measure</p>';
      doneRendering(); return;
    }
    if (pivots.length === 0) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add a pivot dimension to generate columns</p>';
      doneRendering(); return;
    }

    this.clearErrors();

    // ── Config ──
    var threshHigh   = config.threshold_high != null ? Number(config.threshold_high) : 80;
    var threshMed    = config.threshold_medium != null ? Number(config.threshold_medium) : 60;
    var colorHigh    = config.color_high || "#22C55E";
    var colorMed     = config.color_medium || "#F59E0B";
    var colorLow     = config.color_low || "#EF4444";
    var labelHigh    = config.label_high || "High";
    var labelMed     = config.label_medium || "Medium";
    var labelLow     = config.label_low || "Low";
    var showLegend   = config.show_legend !== "false";
    var legendTitle   = config.legend_title != null ? config.legend_title : "Coverage Rate:";
    var legendPos    = config.legend_position || "above";
    var legendAlign  = config.legend_align || "left";
    var headerLabel  = config.header_label || "";
    var cellFz       = Number(config.cell_font_size) || 16;
    var headerFz     = Number(config.header_font_size) || 14;
    var cellH        = Number(config.cell_height) || 56;
    var cellRadius   = config.cell_border_radius != null ? Number(config.cell_border_radius) : 6;
    var cellGap      = config.cell_gap != null ? Number(config.cell_gap) : 4;
    var fontFamily   = config.font_family || "'Inter','Helvetica Neue',Arial,sans-serif";
    var isPercentage = config.value_is_percentage !== "false";

    // ── Extract pivot keys ──
    var pivotKeys = [];
    var pivotLabels = {};
    for (var pi = 0; pi < pivots.length; pi++) {
      pivotKeys.push(pivots[pi].key);
      pivotLabels[pivots[pi].key] = pivots[pi].key;
    }

    // ── Row dimension ──
    var rowDim = dimensions.length > 0 ? dimensions[0] : null;
    var measureField = measures[0];

    // ── Build row data ──
    var rows = [];
    for (var ri = 0; ri < data.length; ri++) {
      var row = data[ri];
      var rowLabel = rowDim ? (row[rowDim.name].rendered || String(row[rowDim.name].value) || "--") : "Row " + (ri + 1);
      var cells = [];

      for (var ci = 0; ci < pivotKeys.length; ci++) {
        var pk = pivotKeys[ci];
        var mCell = row[measureField.name];
        var val = null;
        var rendered = null;
        var links = null;

        if (mCell && mCell[pk]) {
          val = Number(mCell[pk].value);
          rendered = mCell[pk].rendered || null;
          links = mCell[pk].links || null;
        }

        cells.push({ pivotKey: pk, value: val, rendered: rendered, links: links });
      }

      rows.push({ label: rowLabel, cells: cells });
    }

    // ── Helper: get display value and threshold color ──
    function getCellDisplay(val, rendered) {
      if (val === null || isNaN(val)) return { display: "--", pct: null };

      var pct;
      if (isPercentage) {
        pct = (val > 0 && val <= 1) ? val * 100 : val;
      } else {
        pct = val;
      }

      var display;
      if (rendered && !isPercentage) {
        display = rendered;
      } else if (isPercentage) {
        display = Math.round(pct) + "%";
      } else {
        display = rendered || String(Math.round(val));
      }

      return { display: display, pct: pct };
    }

    function getColor(pct) {
      if (pct === null) return "#F3F4F6";
      if (pct >= threshHigh) return colorHigh;
      if (pct >= threshMed) return colorMed;
      return colorLow;
    }

    // ── DOM: Main wrapper ──
    var wrapper = document.createElement("div");
    wrapper.style.fontFamily = fontFamily;
    wrapper.style.padding = "16px";
    wrapper.style.boxSizing = "border-box";
    wrapper.style.width = "100%";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "12px";

    // ── Legend builder ──
    function buildLegend() {
      var legend = document.createElement("div");
      legend.style.display = "flex";
      legend.style.alignItems = "center";
      legend.style.gap = "16px";
      legend.style.flexWrap = "wrap";

      var alignMap = { "left": "flex-start", "center": "center", "right": "flex-end" };
      legend.style.justifyContent = alignMap[legendAlign] || "flex-start";

      if (legendTitle) {
        var titleEl = document.createElement("span");
        titleEl.style.fontSize = "13px";
        titleEl.style.color = "#6B7280";
        titleEl.style.fontWeight = "500";
        titleEl.textContent = legendTitle;
        legend.appendChild(titleEl);
      }

      var items = [
        { color: colorLow, label: labelLow },
        { color: colorMed, label: labelMed },
        { color: colorHigh, label: labelHigh }
      ];

      for (var li = 0; li < items.length; li++) {
        var item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.gap = "6px";

        var swatch = document.createElement("div");
        swatch.style.width = "16px";
        swatch.style.height = "16px";
        swatch.style.borderRadius = "3px";
        swatch.style.background = items[li].color;
        swatch.style.flexShrink = "0";
        item.appendChild(swatch);

        var lbl = document.createElement("span");
        lbl.style.fontSize = "13px";
        lbl.style.color = "#374151";
        lbl.textContent = items[li].label;
        item.appendChild(lbl);

        legend.appendChild(item);
      }

      return legend;
    }

    // ── Legend above ──
    if (showLegend && legendPos === "above") {
      wrapper.appendChild(buildLegend());
    }

    // ── Table ──
    var table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "separate";
    table.style.borderSpacing = cellGap + "px";
    table.style.tableLayout = "fixed";

    // Header row
    var thead = document.createElement("thead");
    var hRow = document.createElement("tr");

    // Top-left header cell
    var thCorner = document.createElement("th");
    thCorner.style.textAlign = "left";
    thCorner.style.fontSize = headerFz + "px";
    thCorner.style.fontWeight = "700";
    thCorner.style.color = "#374151";
    thCorner.style.padding = "12px 16px";
    thCorner.style.background = "#F9FAFB";
    thCorner.style.borderRadius = cellRadius + "px";
    thCorner.textContent = headerLabel;
    hRow.appendChild(thCorner);

    // Pivot column headers
    for (var hi = 0; hi < pivotKeys.length; hi++) {
      var th = document.createElement("th");
      th.style.textAlign = "center";
      th.style.fontSize = headerFz + "px";
      th.style.fontWeight = "700";
      th.style.color = "#374151";
      th.style.padding = "12px 8px";
      th.style.background = "#F9FAFB";
      th.style.borderRadius = cellRadius + "px";
      th.textContent = pivotLabels[pivotKeys[hi]];
      hRow.appendChild(th);
    }

    thead.appendChild(hRow);
    table.appendChild(thead);

    // Body rows
    var tbody = document.createElement("tbody");
    for (var tri = 0; tri < rows.length; tri++) {
      var tr = document.createElement("tr");

      // Row label cell
      var tdLabel = document.createElement("td");
      tdLabel.style.padding = "12px 16px";
      tdLabel.style.fontSize = headerFz + "px";
      tdLabel.style.fontWeight = "600";
      tdLabel.style.color = "#374151";
      tdLabel.style.background = "#F9FAFB";
      tdLabel.style.borderRadius = cellRadius + "px";
      tdLabel.style.height = cellH + "px";
      tdLabel.style.verticalAlign = "middle";
      tdLabel.textContent = rows[tri].label;
      tr.appendChild(tdLabel);

      // Data cells
      for (var tci = 0; tci < rows[tri].cells.length; tci++) {
        var cell = rows[tri].cells[tci];
        var info = getCellDisplay(cell.value, cell.rendered);
        var bgColor = getColor(info.pct);

        var td = document.createElement("td");
        td.style.textAlign = "center";
        td.style.verticalAlign = "middle";
        td.style.fontSize = cellFz + "px";
        td.style.fontWeight = "700";
        td.style.color = "white";
        td.style.background = bgColor;
        td.style.borderRadius = cellRadius + "px";
        td.style.height = cellH + "px";
        td.style.padding = "8px";
        td.textContent = info.display;

        // Null/missing cells
        if (info.pct === null) {
          td.style.color = "#9CA3AF";
        }

        // Drill support
        if (cell.links && cell.links.length > 0) {
          td.style.cursor = "pointer";
          (function (links) {
            td.addEventListener("click", function (e) {
              LookerCharts.Utils.openDrillMenu({ links: links, event: e });
            });
          })(cell.links);
        }

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);

    // ── Legend below ──
    if (showLegend && legendPos === "below") {
      wrapper.appendChild(buildLegend());
    }

    element.appendChild(wrapper);
    doneRendering();
  }

});
