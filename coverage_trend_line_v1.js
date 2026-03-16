/**
 * Coverage Trend Line -- Looker Custom Visualization
 * Developed by Martin Velez
 *
 * Line chart for coverage/utilization trends with event markers and a target line.
 *
 * Query layout:
 *   - Dimension 0  : X-axis labels (e.g. month, billing period)
 *   - Measure   0  : Y-axis values (e.g. coverage_rate)
 *   - Dimension 1  : Event date A — if non-null on a row, renders a dot on the line
 *                    at that row's X position  (e.g. commitment purchase date)
 *   - Dimension 2  : Event date B — same behaviour  (e.g. commitment expiration date)
 *
 * Options:
 *   Line    : color, type (linear / monotone), width, fill area
 *   Event A : label, color, style (filled / outline), size
 *   Event B : label, color, style (filled / outline), size
 *   Target  : enable, fixed value, label, color, dash style
 *   Legend  : split into two groups, position, series group label, events group label
 *   Axes    : Y label, Y min/max, format as %
 *
 * Admin -> Visualizations:
 *   ID:    coverage_trend_line
 *   Label: Coverage Trend Line
 *   Main:  https://cdn.jsdelivr.net/gh/martinvelez-harness/looker-viz@main/coverage_trend_line.js
 */

looker.plugins.visualizations.add({

  id: "coverage_trend_line",
  label: "Coverage Trend Line",

  // ─────────────────────────────────────────────────────────────────────────
  // OPTIONS
  // ─────────────────────────────────────────────────────────────────────────
  options: {

    // ── Line ──────────────────────────────────────────────────────────────
    series_palette: {
      type: "array", label: "Series Color Palette",
      display: "colors",
      section: "Line", order: 1
    },
    line_color: {
      type: "string", label: "Fallback / Single Series Color", default: "#6366F1",
      display: "color", section: "Line", order: 2
    },
    line_type: {
      type: "string", label: "Line Type", display: "select",
      values: [{ "Linear": "linear" }, { "Smooth (Monotone)": "monotone" }],
      default: "linear", section: "Line", order: 3
    },
    line_width: {
      type: "number", label: "Line Width (px)", default: 2,
      section: "Line", order: 4
    },
    series_point_style: {
      type: "string", label: "Series Point Style", display: "select",
      values: [{ "Filled": "filled" }, { "Outline": "outline" }, { "Hidden": "none" }],
      default: "filled", section: "Line", order: 5
    },
    series_point_size: {
      type: "number", label: "Series Point Size (px)", default: 3,
      section: "Line", order: 6
    },
    fill_area: {
      type: "boolean", label: "Fill Area Under Line", default: false,
      section: "Line", order: 7
    },
    fill_opacity: {
      type: "number", label: "Fill Opacity (0–1)", default: 0.12,
      section: "Line", order: 8
    },

    // ── Event A (Dimension 1) ─────────────────────────────────────────────
    event_a_label: {
      type: "string", label: "Event A Label", default: "Purchase",
      section: "Event A", order: 1
    },
    event_a_color: {
      type: "string", label: "Event A Color", default: "#22C55E",
      display: "color", section: "Event A", order: 2
    },
    event_a_style: {
      type: "string", label: "Event A Dot Style", display: "select",
      values: [{ "Filled": "filled" }, { "Outline": "outline" }],
      default: "filled", section: "Event A", order: 3
    },
    event_a_size: {
      type: "number", label: "Event A Dot Size (px)", default: 8,
      section: "Event A", order: 4
    },

    // ── Event B (Dimension 2) ─────────────────────────────────────────────
    event_b_label: {
      type: "string", label: "Event B Label", default: "Expiration",
      section: "Event B", order: 1
    },
    event_b_color: {
      type: "string", label: "Event B Color", default: "#EF4444",
      display: "color", section: "Event B", order: 2
    },
    event_b_style: {
      type: "string", label: "Event B Dot Style", display: "select",
      values: [{ "Filled": "filled" }, { "Outline": "outline" }],
      default: "outline", section: "Event B", order: 3
    },
    event_b_size: {
      type: "number", label: "Event B Dot Size (px)", default: 8,
      section: "Event B", order: 4
    },

    // ── Target Line ───────────────────────────────────────────────────────
    target_enabled: {
      type: "boolean", label: "Show Target Line", default: false,
      section: "Target", order: 1
    },
    target_value: {
      type: "number", label: "Target Value", default: 75,
      section: "Target", order: 2
    },
    target_label: {
      type: "string", label: "Target Label", default: "Target",
      section: "Target", order: 3
    },
    target_color: {
      type: "string", label: "Target Line Color", default: "#F97316",
      display: "color", section: "Target", order: 4
    },
    target_dash: {
      type: "string", label: "Target Line Style", display: "select",
      values: [{ "Dashed": "dashed" }, { "Solid": "solid" }],
      default: "dashed", section: "Target", order: 5
    },

    // ── Legend ────────────────────────────────────────────────────────────
    legend_split: {
      type: "boolean",
      label: "Split into Two Groups",
      default: true,
      section: "Legend",
      order: 1
    },
    legend_position: {
      type: "string", label: "Legend Position", display: "select",
      values: [
        { "Top Left":     "top-left"     },
        { "Top Right":    "top-right"    },
        { "Top Center":   "top-center"   },
        { "Bottom Left":  "bottom-left"  },
        { "Bottom Right": "bottom-right" },
        { "Bottom Center":"bottom-center"},
        { "Right Top":    "right-top"    },
        { "Right Middle": "right-middle" },
        { "Right Bottom": "right-bottom" }
      ],
      default: "top-right", section: "Legend", order: 2
    },
    legend_series_title: {
      type: "string", label: "Group 1 Title (Series)", default: "Series",
      section: "Legend", order: 3
    },
    legend_events_title: {
      type: "string", label: "Group 2 Title (Events & Target)", default: "Events",
      section: "Legend", order: 4
    },
    legend_font_size: {
      type: "number", label: "Legend Font Size (px)", default: 12,
      section: "Legend", order: 5
    },

    // ── Axes ──────────────────────────────────────────────────────────────
    y_axis_label: {
      type: "string", label: "Y-Axis Label", default: "",
      section: "Axes", order: 1
    },
    y_min: {
      type: "number", label: "Y Min", default: 0,
      section: "Axes", order: 2
    },
    y_max: {
      type: "number", label: "Y Max", default: 100,
      section: "Axes", order: 3
    },
    y_as_percent: {
      type: "boolean", label: "Format Y as Percentage", default: true,
      section: "Axes", order: 4
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────
  create: function (element, config) {
    element.innerHTML = "";
    element.style.fontFamily = "'Inter','Helvetica Neue',Arial,sans-serif";
    element.style.overflow   = "hidden";
    element.style.background = "white";
    element.style.padding    = "0";
    element.style.boxSizing  = "border-box";
    this._chart = null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────────
  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    var self = this;
    if (typeof Chart === "undefined") {
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js";
      script.onload = function () { self._render(data, element, config, queryResponse, doneRendering); };
      document.head.appendChild(script);
    } else {
      this._render(data, element, config, queryResponse, doneRendering);
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  _render: function (data, element, config, queryResponse, doneRendering) {
    var self = this;

    if (this._chart) { this._chart.destroy(); this._chart = null; }
    element.innerHTML = "";

    // ── Field refs ─────────────────────────────────────────────────────────
    var dims    = queryResponse.fields.dimension_like || [];
    var meas    = queryResponse.fields.measure_like   || [];

    if (dims.length < 1 || meas.length < 1) {
      element.innerHTML = "<p style='color:#6B7280;padding:16px;'>Need at least 1 dimension and 1 measure.</p>";
      doneRendering(); return;
    }

    var dimKey0 = dims[0].name;
    var measKey = meas[0].name;
    var dimKey1 = dims.length > 1 ? dims[1].name : null;
    var dimKey2 = dims.length > 2 ? dims[2].name : null;

    // ── Config ─────────────────────────────────────────────────────────────
    var cfg = {
      seriesPalette: Array.isArray(config.series_palette) && config.series_palette.length ? config.series_palette : null,
      lineColor:    config.line_color    || "#6366F1",
      lineType:     config.line_type     || "linear",
      lineWidth:    +(config.line_width   || 2),
      pointStyle:   config.series_point_style || "filled",
      pointSize:    +(config.series_point_size || 3),
      fillArea:     !!config.fill_area,
      fillOpacity:  +(config.fill_opacity || 0.12),

      evtALabel:    config.event_a_label || "Purchase",
      evtAColor:    config.event_a_color || "#22C55E",
      evtAStyle:    config.event_a_style || "filled",
      evtASize:     +(config.event_a_size || 8),

      evtBLabel:    config.event_b_label || "Expiration",
      evtBColor:    config.event_b_color || "#EF4444",
      evtBStyle:    config.event_b_style || "outline",
      evtBSize:     +(config.event_b_size || 8),

      targetOn:     !!config.target_enabled,
      targetVal:    +(config.target_value || 75),
      targetLabel:  config.target_label  || "Target",
      targetColor:  config.target_color  || "#F97316",
      targetDash:   config.target_dash   || "dashed",

      legendSplit:    config.legend_split !== false,
      legendPos:      config.legend_position    || "top-right",
      legendSeries:   config.legend_series_title || "Series",
      legendEvents:   config.legend_events_title || "Events",
      legendFontSize: +(config.legend_font_size  || 12),

      yLabel:      config.y_axis_label || (meas[0] ? (meas[0].label_short || meas[0].label) : ""),
      yMin:        config.y_min != null ? +config.y_min : 0,
      yMax:        config.y_max != null ? +config.y_max : 100,
      yAsPercent:  config.y_as_percent !== false
    };

    // ── Helpers ─────────────────────────────────────────────────────────────
    function hexToRgba(hex, alpha) {
      var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      return "rgba("+r+","+g+","+b+","+alpha+")";
    }

    // Color palette: use Looker palette if configured, otherwise defaults
    var PALETTE = cfg.seriesPalette && cfg.seriesPalette.length
      ? cfg.seriesPalette
      : [cfg.lineColor, "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#8B5CF6", "#06B6D4", "#84CC16", "#EF4444"];

    function parseValue(v) {
      if (v === null || v === undefined) return null;
      if (typeof v === "number") return cfg.yAsPercent && v <= 1 ? v * 100 : v;
      var n = parseFloat(String(v).replace("%", ""));
      return isNaN(n) ? null : n;
    }

    // ── Detect pivot mode ───────────────────────────────────────────────────
    var pivots    = queryResponse.pivots || [];
    var isPivoted = pivots.length > 0;

    // ── Parse labels + event marker indices (same in both modes) ───────────
    var labels     = [];
    var eventAIdxs = [];
    var eventBIdxs = [];

    data.forEach(function (row, i) {
      var c0 = row[dimKey0];
      labels.push(c0 ? (c0.rendered != null ? c0.rendered : String(c0.value)) : "");

      if (dimKey1) {
        var c1 = row[dimKey1];
        if (c1 && c1.value !== null && c1.value !== "" && c1.value !== undefined) eventAIdxs.push(i);
      }
      if (dimKey2) {
        var c2 = row[dimKey2];
        if (c2 && c2.value !== null && c2.value !== "" && c2.value !== undefined) eventBIdxs.push(i);
      }
    });

    // ── Build series datasets ───────────────────────────────────────────────
    // seriesMap: pivotKey → values array  (flat mode uses key = "")
    var seriesMap    = {};   // { key: [values...] }
    var seriesLabels = {};   // { key: "Display Label" }

    if (isPivoted) {
      // One series per pivot value
      pivots.forEach(function (pv) {
        var key = pv.key;
        seriesLabels[key] = pv.data ? (pv.data[Object.keys(pv.data)[0]] || key) : key;
        seriesMap[key] = data.map(function (row) {
          var cell = row[measKey];
          if (!cell) return null;
          // Pivoted cell is an object keyed by pivot key
          var pivotCell = cell[key];
          return pivotCell ? parseValue(pivotCell.value) : null;
        });
      });
    } else {
      // Flat: single series
      var flatLabel = meas[0].label_short || meas[0].label || "Value";
      seriesLabels[""] = flatLabel;
      seriesMap[""] = data.map(function (row) {
        var mc = row[measKey];
        return mc ? parseValue(mc.value) : null;
      });
    }

    // yValues for the first series (used for event marker Y positioning)
    var firstKey    = Object.keys(seriesMap)[0];
    var yValuesFirst = seriesMap[firstKey] || [];

    function evtData(idxs) {
      return idxs.map(function(i){ return { x: i, y: yValuesFirst[i] != null ? yValuesFirst[i] : null }; });
    }

    // ── Datasets ────────────────────────────────────────────────────────────
    var datasets = [];

    // Series (group 1)
    var seriesDatasets = [];
    // Point style helpers for series lines
    var ptRadius      = cfg.pointStyle === "none" ? 0 : cfg.pointSize;
    var ptHoverRadius = cfg.pointStyle === "none" ? 0 : cfg.pointSize + 2;

    Object.keys(seriesMap).forEach(function (key, si) {
      var color  = PALETTE[si % PALETTE.length];
      var values = seriesMap[key];
      var label  = seriesLabels[key] || key || "Value";

      var ptBg     = cfg.pointStyle === "outline"  ? "transparent" : color;
      var ptBorder = cfg.pointStyle === "outline"  ? color         : "white";
      var ptBW     = cfg.pointStyle === "outline"  ? 2             : 1.5;

      seriesDatasets.push({
        label:                label,
        data:                 values,
        borderColor:          color,
        backgroundColor:      cfg.fillArea ? hexToRgba(color, cfg.fillOpacity) : "transparent",
        fill:                 cfg.fillArea,
        tension:              cfg.lineType === "monotone" ? 0.4 : 0,
        borderWidth:          cfg.lineWidth,
        pointRadius:          ptRadius,
        pointHoverRadius:     ptHoverRadius,
        pointBackgroundColor: ptBg,
        pointBorderColor:     ptBorder,
        pointBorderWidth:     ptBW,
        type:                 "line",
        order:                3,
        yAxisID:              "y",
        _group:               "series"
      });
    });

    // Events / Target (group 2)
    var eventDatasets = [];

    if (eventAIdxs.length > 0) {
      eventDatasets.push({
        label:              cfg.evtALabel,
        data:               evtData(eventAIdxs),
        type:               "scatter",
        pointRadius:        cfg.evtASize,
        pointHoverRadius:   cfg.evtASize + 2,
        pointStyle:         "circle",
        backgroundColor:    cfg.evtAStyle === "outline" ? "transparent" : cfg.evtAColor,
        borderColor:        cfg.evtAColor,
        borderWidth:        cfg.evtAStyle === "outline" ? 2.5 : 0,
        order:              1,
        yAxisID:            "y",
        _group:             "events"
      });
    }

    if (eventBIdxs.length > 0) {
      eventDatasets.push({
        label:              cfg.evtBLabel,
        data:               evtData(eventBIdxs),
        type:               "scatter",
        pointRadius:        cfg.evtBSize,
        pointHoverRadius:   cfg.evtBSize + 2,
        pointStyle:         "circle",
        backgroundColor:    cfg.evtBStyle === "outline" ? "transparent" : cfg.evtBColor,
        borderColor:        cfg.evtBColor,
        borderWidth:        cfg.evtBStyle === "outline" ? 2.5 : 0,
        order:              2,
        yAxisID:            "y",
        _group:             "events"
      });
    }

    if (cfg.targetOn) {
      eventDatasets.push({
        label:              cfg.targetLabel,
        data:               labels.map(function(){ return cfg.targetVal; }),
        type:               "line",
        borderColor:        cfg.targetColor,
        backgroundColor:    "transparent",
        borderWidth:        1.5,
        borderDash:         cfg.targetDash === "dashed" ? [6,4] : [],
        pointRadius:        0,
        pointHoverRadius:   0,
        fill:               false,
        tension:            0,
        order:              4,
        yAxisID:            "y",
        _group:             "events"
      });
    }

    datasets = seriesDatasets.concat(eventDatasets);

    // Stamp each dataset with its index so legend click handlers can reference it
    datasets.forEach(function (ds, i) { ds._dsIndex = i; });

    // ── Layout scaffolding based on legend position ────────────────────────
    var pos       = cfg.legendPos;  // e.g. "top-right", "right-top"
    var isRight   = pos.startsWith("right");
    var isBottom  = pos.startsWith("bottom");

    // Outer container
    var outer = document.createElement("div");
    outer.style.cssText = [
      "width:100%", "height:100%", "display:flex", "box-sizing:border-box",
      "padding:12px",
      isRight ? "flex-direction:row" : "flex-direction:column"
    ].join(";");
    element.appendChild(outer);

    // Legend block builder
    function buildLegendBlock() {
      var block = document.createElement("div");
      block.style.cssText = [
        "display:flex",
        isRight ? "flex-direction:column;align-items:flex-start" : "flex-direction:row;flex-wrap:wrap;align-items:center",
        "gap:8px",
        isRight ? "min-width:120px;flex-shrink:0;padding-right:12px" : "padding-bottom:8px"
      ].join(";");

      // Vertical alignment within right panel
      if (isRight) {
        var va = pos.split("-")[1] || "top";
        block.style.justifyContent = va === "middle" ? "center" : va === "bottom" ? "flex-end" : "flex-start";
        block.style.height = "100%";
      } else {
        // Horizontal alignment for top/bottom
        var ha = pos.split("-")[1] || "right";
        block.style.justifyContent = ha === "center" ? "center" : ha === "left" ? "flex-start" : "flex-end";
        block.style.width = "100%";
      }
      return block;
    }

    // Legend group builder (series or events)
    // dsArr items must have a _dsIndex property (position in datasets array)
    function buildLegendGroup(title, dsArr) {
      var group = document.createElement("div");
      group.style.cssText = [
        "display:flex", "flex-direction:row", "align-items:center",
        "flex-wrap:wrap", "gap:10px 16px"
      ].join(";");

      if (title) {
        var lbl = document.createElement("span");
        lbl.textContent = title;
        lbl.style.cssText = [
          "font-size:" + (cfg.legendFontSize - 1) + "px",
          "font-weight:600",
          "color:#9CA3AF",
          "margin-right:4px",
          "white-space:nowrap"
        ].join(";");
        group.appendChild(lbl);
      }

      dsArr.forEach(function (ds) {
        var dsIndex = ds._dsIndex;

        var item = document.createElement("div");
        item.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;transition:opacity .15s;";
        item.title = "Click to show/hide";

        var icon = document.createElement("div");

        if (ds.type === "scatter") {
          icon.style.cssText = [
            "width:" + (cfg.legendFontSize + 2) + "px",
            "height:" + (cfg.legendFontSize + 2) + "px",
            "border-radius:50%",
            "flex-shrink:0",
            "background:" + (ds.backgroundColor === "transparent" ? "transparent" : ds.borderColor),
            "border:2px solid " + ds.borderColor,
            "box-sizing:border-box",
            "transition:opacity .15s"
          ].join(";");
        } else if (ds.borderDash && ds.borderDash.length) {
          icon.style.cssText = [
            "width:28px", "height:2px", "flex-shrink:0",
            "background:repeating-linear-gradient(90deg," + ds.borderColor + " 0px," + ds.borderColor + " 6px,transparent 6px,transparent 10px)",
            "transition:opacity .15s"
          ].join(";");
        } else {
          icon.style.cssText = [
            "width:28px", "height:" + Math.max(2, ds.borderWidth || 2) + "px",
            "flex-shrink:0", "background:" + ds.borderColor,
            "border-radius:2px", "transition:opacity .15s"
          ].join(";");
        }

        var text = document.createElement("span");
        text.textContent = ds.label;
        text.style.cssText = [
          "font-size:" + cfg.legendFontSize + "px",
          "color:#374151",
          "white-space:nowrap",
          "transition:color .15s,text-decoration .15s"
        ].join(";");

        // Toggle handler — closes over item, icon, text, dsIndex
        item.addEventListener("click", function () {
          var chart = self._chart;
          if (!chart) return;

          var visible = chart.isDatasetVisible(dsIndex);
          chart.setDatasetVisibility(dsIndex, !visible);
          chart.update();

          // Visual feedback: dim + strikethrough when hidden
          var nowVisible = chart.isDatasetVisible(dsIndex);
          item.style.opacity  = nowVisible ? "1" : "0.4";
          text.style.textDecoration = nowVisible ? "none" : "line-through";
          text.style.color          = nowVisible ? "#374151" : "#9CA3AF";
        });

        item.appendChild(icon);
        item.appendChild(text);
        group.appendChild(item);
      });

      return group;
    }

    // ── Assemble legend and chart ──────────────────────────────────────────
    var legendEl = buildLegendBlock();

    if (cfg.legendSplit) {
      // Group 1: series
      legendEl.appendChild(buildLegendGroup(cfg.legendSeries, seriesDatasets));
      // Divider
      if (eventDatasets.length > 0) {
        var sep = document.createElement("div");
        sep.style.cssText = isRight
          ? "width:100%;height:1px;background:#E5E7EB;margin:4px 0;"
          : "width:1px;height:20px;background:#E5E7EB;margin:0 4px;align-self:center;";
        legendEl.appendChild(sep);
        // Group 2: events + target
        legendEl.appendChild(buildLegendGroup(cfg.legendEvents, eventDatasets));
      }
    } else {
      // Single combined legend
      legendEl.appendChild(buildLegendGroup("", datasets));
    }

    // Canvas wrapper
    var canvasWrap = document.createElement("div");
    canvasWrap.style.cssText = "position:relative;flex:1;min-height:0;min-width:0;";

    var canvas = document.createElement("canvas");
    canvasWrap.appendChild(canvas);

    // Insert order: legend before or after chart
    if (isBottom) {
      outer.appendChild(canvasWrap);
      outer.appendChild(legendEl);
    } else if (isRight) {
      outer.appendChild(canvasWrap);
      outer.appendChild(legendEl);
    } else {
      // top (default)
      outer.appendChild(legendEl);
      outer.appendChild(canvasWrap);
    }

    // ── Chart.js instance (built-in legend OFF — we render our own) ─────────
    this._chart = new Chart(canvas, {
      type: "line",
      data: { labels: labels, datasets: datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        animation:           { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(17,24,39,0.9)",
            titleColor:      "#F9FAFB",
            bodyColor:       "#D1D5DB",
            padding:         10,
            cornerRadius:    6,
            mode:            "index",
            intersect:       false,
            callbacks: {
              label: function (ctx) {
                if (ctx.dataset.type === "scatter") return " " + ctx.dataset.label;
                var v = ctx.parsed.y;
                if (v === null || v === undefined) return "";
                return " " + ctx.dataset.label + ": " + (cfg.yAsPercent ? v.toFixed(1) + "%" : v);
              }
            }
          }
        },
        scales: {
          x: {
            type: "category",
            ticks:  { color: "#6B7280", font: { size: 11 }, maxRotation: 45 },
            grid:   { display: false }
          },
          y: {
            min:    cfg.yMin,
            max:    cfg.yMax,
            title:  { display: cfg.yLabel !== "", text: cfg.yLabel, color: "#6B7280", font: { size: 11 } },
            ticks:  {
              color: "#6B7280", font: { size: 11 },
              callback: cfg.yAsPercent ? function(v){ return v + "%"; } : function(v){ return v; }
            },
            grid:   { color: "rgba(0,0,0,0.05)" }
          }
        }
      }
    });

    doneRendering();
  }

});
