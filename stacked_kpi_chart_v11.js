/**
 * Stacked KPI Chart -- Looker Custom Visualization
 * Developed by Martin Velez
 *
 * Stacked bar chart with summary KPI metrics above.
 * - Pivot dimension values become stacked segments within each bar.
 * - Non-pivot dimensions (e.g. time, service) map to the X axis.
 * - Without pivots, each measure becomes a stacked segment.
 * - Summary KPIs above the chart: per-series totals + grand total.
 * - Dynamic per-series options (color, label, show in summary, include in total).
 *
 * Query:
 *   With pivots:  1 non-pivot dim (X axis) + 1 pivot dim (stacks) + 1+ measures
 *   Without:      1 dim (X axis) + 2+ measures (stacks)
 *
 * Admin -> Visualizations:
 *   ID: stacked_kpi_chart
 *   Label: Stacked KPI Chart
 *   Main: https://cdn.jsdelivr.net/gh/martinvelez-harness/looker-viz@main/stacked_kpi_chart.js
 */

looker.plugins.visualizations.add({

  id: "stacked_kpi_chart",
  label: "Stacked KPI Chart",

  options: {},

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
    var p = element.parentElement;
    while (p && p !== document.body) { p.style.overflow = "hidden"; p = p.parentElement; }
    if (!document.getElementById("_skc_reset_css")) {
      var st = document.createElement("style");
      st.id = "_skc_reset_css";
      st.textContent = "#vis, #vis-container, .looker-vis-context { padding:0!important; margin:0!important; overflow:hidden!important; }";
      document.head.appendChild(st);
    }

    // -- Validate --
    var dimensions = queryResponse.fields.dimension_like || queryResponse.fields.dimensions || [];
    var measures = queryResponse.fields.measure_like || [];
    if (measures.length === 0) {
      measures = (queryResponse.fields.measures || []).concat(queryResponse.fields.table_calculations || []);
    }
    var pivots = queryResponse.pivots || [];
    var hasPivots = pivots.length > 0;

    if (measures.length < 1) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add at least 1 measure</p>';
      doneRendering(); return;
    }
    if (!data || data.length === 0) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">No data</p>';
      doneRendering(); return;
    }

    this.clearErrors();

    // --------------------------------------------------
    // Determine series (stack segments) and groups (X axis)
    // --------------------------------------------------
    var seriesKeys = [];
    var seriesLabels = {};
    var groups = [];
    var chartData = [];

    if (hasPivots) {
      // Series = pivot values, groups = rows (non-pivot dim)
      for (var pi = 0; pi < pivots.length; pi++) {
        seriesKeys.push(pivots[pi].key);
        seriesLabels[pivots[pi].key] = pivots[pi].key;
      }
      var xDim = dimensions.length > 0 ? dimensions[0] : null;

      for (var ri = 0; ri < data.length; ri++) {
        var row = data[ri];
        var gl = xDim ? (row[xDim.name].rendered || String(row[xDim.name].value) || "--") : "Row " + (ri + 1);
        groups.push(gl);

        var stacks = [];
        for (var si = 0; si < seriesKeys.length; si++) {
          var sk = seriesKeys[si];
          var val = 0;
          var links = null;
          for (var mi = 0; mi < measures.length; mi++) {
            var mCell = row[measures[mi].name];
            if (mCell && mCell[sk]) {
              val += Number(mCell[sk].value) || 0;
              if (!links && mCell[sk].links) links = mCell[sk].links;
            }
          }
          stacks.push({ key: sk, value: val, links: links });
        }
        chartData.push({ group: gl, stacks: stacks });
      }
    } else {
      // No pivots: series = measures, groups = dimension values
      for (var mi2 = 0; mi2 < measures.length; mi2++) {
        var mf = measures[mi2];
        seriesKeys.push(mf.name);
        seriesLabels[mf.name] = mf.label_short || mf.label || mf.name;
      }
      var xDim2 = dimensions.length > 0 ? dimensions[0] : null;

      for (var ri2 = 0; ri2 < data.length; ri2++) {
        var row2 = data[ri2];
        var gl2 = xDim2 ? (row2[xDim2.name].rendered || String(row2[xDim2.name].value) || "--") : "Row " + (ri2 + 1);
        groups.push(gl2);

        var stacks2 = [];
        for (var si2 = 0; si2 < seriesKeys.length; si2++) {
          var mCell2 = row2[seriesKeys[si2]];
          stacks2.push({
            key: seriesKeys[si2],
            value: mCell2 ? Number(mCell2.value) || 0 : 0,
            links: mCell2 ? mCell2.links : null
          });
        }
        chartData.push({ group: gl2, stacks: stacks2 });
      }
    }

    // --------------------------------------------------
    // Register dynamic options
    // --------------------------------------------------
    var fieldKey = seriesKeys.join("|") + ":" + measures.map(function (f) { return f.name; }).join("|");
    if (this._registeredFields !== fieldKey) {
      this._registeredFields = fieldKey;
      var dynOpts = _buildBaseOptions();

      for (var oi = 0; oi < seriesKeys.length; oi++) {
        var osk = seriesKeys[oi];
        var safe = _safeKey(osk);
        var pfix = seriesLabels[osk] || osk;

        dynOpts["series_" + safe + "_color"] = {
          type: "string", label: pfix + " | Color",
          default: _defaultColors[oi % _defaultColors.length],
          display: "color", section: "Series", order: oi * 10
        };
        dynOpts["series_" + safe + "_label"] = {
          type: "string", label: pfix + " | Legend Label",
          default: "", placeholder: pfix,
          section: "Series", order: oi * 10 + 1
        };
        dynOpts["series_" + safe + "_in_chart"] = {
          type: "string", label: pfix + " | Show in Chart",
          display: "select", values: [{ "Yes": "true" }, { "No": "false" }],
          default: "true", section: "Series", order: oi * 10 + 2
        };
        dynOpts["summary_" + safe + "_show"] = {
          type: "string", label: pfix + " | Show in Summary",
          display: "select", values: [{ "Yes": "true" }, { "No": "false" }],
          default: "true", section: "Summary", order: oi * 10 + 10
        };
        dynOpts["summary_" + safe + "_label"] = {
          type: "string", label: pfix + " | Summary Label",
          default: "", placeholder: pfix,
          section: "Summary", order: oi * 10 + 11
        };
        dynOpts["summary_" + safe + "_color"] = {
          type: "string", label: pfix + " | Summary Color",
          default: _defaultColors[oi % _defaultColors.length],
          display: "color", section: "Summary", order: oi * 10 + 12
        };
        dynOpts["summary_" + safe + "_in_total"] = {
          type: "string", label: pfix + " | Include in Total",
          display: "select", values: [{ "Yes": "true" }, { "No": "false" }],
          default: "true", section: "Summary", order: oi * 10 + 13
        };
      }

      this.trigger("registerOptions", dynOpts);
    }

    // --------------------------------------------------
    // Config
    // --------------------------------------------------
    var fontFamily   = config.font_family || "'Inter','Helvetica Neue',Arial,sans-serif";
    var showSummary  = config.show_summary !== "false";
    var showTotal    = config.show_total !== "false";
    var totalLabel   = config.total_label || "Total";
    var totalColor   = config.total_color || "#111827";
    var yAxisLabel   = (config.y_axis_label || "").trim();
    var showGrid     = config.show_grid !== "false";
    var showLegend   = config.show_legend !== "false";
    var barRatio     = Math.max(0.1, Math.min(Number(config.bar_width) || 0.6, 1));
    var xRotation    = config.x_label_rotation != null ? Number(config.x_label_rotation) : 0;
    var vfSetting    = config.value_format || "auto";
    var vfCustom     = (config.value_format_custom || "").trim();
    var summarySize  = Number(config.summary_font_size) || 24;
    var summaryLabelSize = Number(config.summary_label_size) || 12;
    var summaryAlign = config.summary_align || "left";
    var legendAlign  = config.legend_align || "center";
    var summaryValueWeight = config.summary_value_weight === "normal" ? "400" : "700";
    var summaryLabelWeight = config.summary_label_weight === "bold" ? "700" : "400";

    // Resolve format
    var resolvedFmt = null;
    if (vfSetting === "custom" && vfCustom) {
      resolvedFmt = vfCustom;
    } else if (vfSetting !== "auto") {
      resolvedFmt = _resolveNamedFormat(vfSetting);
    } else if (measures.length > 0 && measures[0].value_format) {
      resolvedFmt = measures[0].value_format;
    }
    if (!resolvedFmt) resolvedFmt = "#,##0";

    // Series colors
    var seriesColors = {};
    for (var ci = 0; ci < seriesKeys.length; ci++) {
      var ck = _safeKey(seriesKeys[ci]);
      seriesColors[seriesKeys[ci]] = config["series_" + ck + "_color"] || _defaultColors[ci % _defaultColors.length];
    }

    // --------------------------------------------------
    // Calculate totals for summary
    // --------------------------------------------------
    var seriesTotals = {};
    for (var st = 0; st < seriesKeys.length; st++) seriesTotals[seriesKeys[st]] = 0;

    for (var di = 0; di < chartData.length; di++) {
      for (var dj = 0; dj < chartData[di].stacks.length; dj++) {
        seriesTotals[chartData[di].stacks[dj].key] += chartData[di].stacks[dj].value;
      }
    }

    var grandTotal = 0;
    for (var gt = 0; gt < seriesKeys.length; gt++) {
      var gtk = _safeKey(seriesKeys[gt]);
      if (config["summary_" + gtk + "_in_total"] !== "false") {
        grandTotal += seriesTotals[seriesKeys[gt]];
      }
    }

    // --------------------------------------------------
    // DOM: Container
    // --------------------------------------------------
    var container = document.createElement("div");
    container.style.fontFamily = fontFamily;
    container.style.padding = "16px";
    container.style.boxSizing = "border-box";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.overflow = "hidden";

    // --------------------------------------------------
    // DOM: Summary KPI row
    // --------------------------------------------------
    if (showSummary) {
      var summaryRow = document.createElement("div");
      summaryRow.style.display = "flex";
      summaryRow.style.gap = "32px";
      summaryRow.style.marginBottom = "12px";
      summaryRow.style.flexWrap = "wrap";
      summaryRow.style.flexShrink = "0";
      var justifyMap = { "left": "flex-start", "center": "center", "right": "flex-end" };
      summaryRow.style.justifyContent = justifyMap[summaryAlign] || "flex-start";

      if (showTotal) {
        summaryRow.appendChild(_createKpiEl(
          totalLabel,
          _formatCompact(grandTotal, resolvedFmt),
          totalColor,
          summarySize,
          summaryLabelSize,
          summaryValueWeight,
          summaryLabelWeight
        ));
      }

      for (var ski = 0; ski < seriesKeys.length; ski++) {
        var skk = _safeKey(seriesKeys[ski]);
        if (config["summary_" + skk + "_show"] === "false") continue;
        var sLabel = config["summary_" + skk + "_label"] || seriesLabels[seriesKeys[ski]] || seriesKeys[ski];
        var sColor = config["summary_" + skk + "_color"] || seriesColors[seriesKeys[ski]];
        summaryRow.appendChild(_createKpiEl(
          sLabel,
          _formatCompact(seriesTotals[seriesKeys[ski]], resolvedFmt),
          sColor,
          summarySize,
          summaryLabelSize,
          summaryValueWeight,
          summaryLabelWeight
        ));
      }

      container.appendChild(summaryRow);

      // Divider
      var divEl = document.createElement("div");
      divEl.style.height = "1px";
      divEl.style.background = config.divider_color || "#E5E7EB";
      divEl.style.marginBottom = "12px";
      divEl.style.flexShrink = "0";
      container.appendChild(divEl);
    }

    // --------------------------------------------------
    // DOM: Chart wrapper (flex:1 to fill remaining)
    // --------------------------------------------------
    var chartWrap = document.createElement("div");
    chartWrap.style.flex = "1";
    chartWrap.style.position = "relative";
    chartWrap.style.minHeight = "0";
    container.appendChild(chartWrap);

    element.appendChild(container);

    // Get available space
    var rect = chartWrap.getBoundingClientRect();
    var availW = rect.width || (element.clientWidth - 32) || 400;
    var availH = rect.height || 300;
    if (availH < 100) availH = 300;

    // --------------------------------------------------
    // Chart margins & dimensions
    // --------------------------------------------------
    var marginLeft   = yAxisLabel ? 65 : 55;
    var marginRight  = 8;
    var marginTop    = 8;
    var marginBottom = 24;

    // Extra space for rotated X labels
    var maxLblLen = 0;
    for (var mll = 0; mll < groups.length; mll++) {
      if (String(groups[mll]).length > maxLblLen) maxLblLen = String(groups[mll]).length;
    }
    if (xRotation > 0) marginBottom += Math.min(maxLblLen * 5, 80);
    if (showLegend) marginBottom += 28;

    var chartW = Math.max(availW - marginLeft - marginRight, 50);
    var chartH = Math.max(availH - marginTop - marginBottom, 50);

    // --------------------------------------------------
    // Y scale
    // --------------------------------------------------
    var yMax = 0;
    for (var ymi = 0; ymi < chartData.length; ymi++) {
      var sTotal = 0;
      for (var ysi = 0; ysi < chartData[ymi].stacks.length; ysi++) {
        var ySafe = _safeKey(chartData[ymi].stacks[ysi].key);
        if (config["series_" + ySafe + "_in_chart"] === "false") continue;
        sTotal += chartData[ymi].stacks[ysi].value;
      }
      if (sTotal > yMax) yMax = sTotal;
    }
    if (yMax === 0) yMax = 1;

    var yTicks = _niceScale(0, yMax, 5);
    yMax = yTicks[yTicks.length - 1];

    // --------------------------------------------------
    // SVG
    // --------------------------------------------------
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", availW);
    svg.setAttribute("height", availH);
    svg.style.display = "block";

    // -- Grid lines & Y labels --
    for (var gi = 0; gi < yTicks.length; gi++) {
      var gy = marginTop + chartH - (yTicks[gi] / yMax) * chartH;

      if (showGrid) {
        var gLine = document.createElementNS(ns, "line");
        gLine.setAttribute("x1", marginLeft);
        gLine.setAttribute("x2", marginLeft + chartW);
        gLine.setAttribute("y1", gy);
        gLine.setAttribute("y2", gy);
        gLine.setAttribute("stroke", "#E5E7EB");
        gLine.setAttribute("stroke-dasharray", "4 4");
        svg.appendChild(gLine);
      }

      var yLbl = document.createElementNS(ns, "text");
      yLbl.setAttribute("x", marginLeft - 8);
      yLbl.setAttribute("y", gy);
      yLbl.setAttribute("text-anchor", "end");
      yLbl.setAttribute("dominant-baseline", "central");
      yLbl.setAttribute("font-size", "11");
      yLbl.setAttribute("fill", "#9CA3AF");
      yLbl.setAttribute("font-family", fontFamily);
      yLbl.textContent = _formatCompact(yTicks[gi], resolvedFmt);
      svg.appendChild(yLbl);
    }

    // Y axis title (rotated)
    if (yAxisLabel) {
      var yAL = document.createElementNS(ns, "text");
      var yALx = 14;
      var yALy = marginTop + chartH / 2;
      yAL.setAttribute("x", yALx);
      yAL.setAttribute("y", yALy);
      yAL.setAttribute("text-anchor", "middle");
      yAL.setAttribute("font-size", "12");
      yAL.setAttribute("fill", "#6B7280");
      yAL.setAttribute("font-family", fontFamily);
      yAL.setAttribute("transform", "rotate(-90," + yALx + "," + yALy + ")");
      yAL.textContent = yAxisLabel;
      svg.appendChild(yAL);
    }

    // -- Bars --
    var groupW  = chartW / chartData.length;
    var barW    = groupW * barRatio;
    var barOff  = (groupW - barW) / 2;

    for (var bi = 0; bi < chartData.length; bi++) {
      var bx = marginLeft + bi * groupW + barOff;
      var byBase = marginTop + chartH;

      for (var bsi = 0; bsi < chartData[bi].stacks.length; bsi++) {
        var sv = chartData[bi].stacks[bsi];
        var bSafe = _safeKey(sv.key);
        if (config["series_" + bSafe + "_in_chart"] === "false") continue;
        if (sv.value <= 0) continue;
        var segH = (sv.value / yMax) * chartH;
        if (segH < 0.5) segH = 0.5;
        byBase -= segH;

        var barRect = document.createElementNS(ns, "rect");
        barRect.setAttribute("x", bx);
        barRect.setAttribute("y", byBase);
        barRect.setAttribute("width", barW);
        barRect.setAttribute("height", segH);
        barRect.setAttribute("fill", seriesColors[sv.key]);

        // Round top corners only on topmost visible segment
        var isTop = true;
        for (var chk = bsi + 1; chk < chartData[bi].stacks.length; chk++) {
          var chkSafe = _safeKey(chartData[bi].stacks[chk].key);
          if (config["series_" + chkSafe + "_in_chart"] === "false") continue;
          if (chartData[bi].stacks[chk].value > 0) { isTop = false; break; }
        }
        if (isTop) barRect.setAttribute("rx", "3");

        // Native tooltip
        var tip = document.createElementNS(ns, "title");
        tip.textContent = chartData[bi].group + " - " + (seriesLabels[sv.key] || sv.key) + ": " + _formatCompact(sv.value, resolvedFmt);
        barRect.appendChild(tip);

        // Drill support
        if (sv.links && sv.links.length > 0) {
          barRect.style.cursor = "pointer";
          (function (links) {
            barRect.addEventListener("click", function (e) {
              LookerCharts.Utils.openDrillMenu({ links: links, event: e });
            });
          })(sv.links);
        }

        svg.appendChild(barRect);
      }

      // -- X axis label --
      var xLblX = marginLeft + bi * groupW + groupW / 2;
      var xLblY = marginTop + chartH + 14;
      var xLbl = document.createElementNS(ns, "text");
      xLbl.setAttribute("x", xLblX);
      xLbl.setAttribute("y", xLblY);
      xLbl.setAttribute("font-size", "11");
      xLbl.setAttribute("fill", "#6B7280");
      xLbl.setAttribute("font-family", fontFamily);

      if (xRotation > 0) {
        xLbl.setAttribute("text-anchor", "end");
        xLbl.setAttribute("transform", "rotate(-" + xRotation + "," + xLblX + "," + xLblY + ")");
      } else {
        xLbl.setAttribute("text-anchor", "middle");
      }
      xLbl.textContent = chartData[bi].group;
      svg.appendChild(xLbl);
    }

    // -- Legend --
    if (showLegend) {
      var legendY = availH - 10;

      // Calculate total legend width first for alignment
      var legendItems = [];
      var totalLegendW = 0;
      for (var li = 0; li < seriesKeys.length; li++) {
        var lk = _safeKey(seriesKeys[li]);
        if (config["series_" + lk + "_in_chart"] === "false") continue;
        var lLabel = config["series_" + lk + "_label"] || seriesLabels[seriesKeys[li]] || seriesKeys[li];
        var itemW = 16 + lLabel.length * 7 + 24;
        legendItems.push({ label: lLabel, color: seriesColors[seriesKeys[li]], width: itemW });
        totalLegendW += itemW;
      }
      totalLegendW -= 24; // remove trailing gap

      var legendStartX = marginLeft;
      if (legendAlign === "center") {
        legendStartX = marginLeft + (chartW - totalLegendW) / 2;
      } else if (legendAlign === "right") {
        legendStartX = marginLeft + chartW - totalLegendW;
      }
      if (legendStartX < 0) legendStartX = 0;

      var legendX = legendStartX;
      for (var li2 = 0; li2 < legendItems.length; li2++) {
        var lgItem = legendItems[li2];

        var lRect = document.createElementNS(ns, "rect");
        lRect.setAttribute("x", legendX);
        lRect.setAttribute("y", legendY - 8);
        lRect.setAttribute("width", 12);
        lRect.setAttribute("height", 12);
        lRect.setAttribute("rx", "2");
        lRect.setAttribute("fill", lgItem.color);
        svg.appendChild(lRect);

        var lText = document.createElementNS(ns, "text");
        lText.setAttribute("x", legendX + 16);
        lText.setAttribute("y", legendY - 1);
        lText.setAttribute("font-size", "12");
        lText.setAttribute("fill", "#6B7280");
        lText.setAttribute("font-family", fontFamily);
        lText.setAttribute("dominant-baseline", "central");
        lText.textContent = lgItem.label;
        svg.appendChild(lText);

        legendX += lgItem.width;
      }
    }

    chartWrap.appendChild(svg);
    doneRendering();
  }
});


// ==================================================
// Helper functions
// ==================================================

var _defaultColors = [
  "#22C55E", "#F97316", "#3B82F6", "#6366F1",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
  "#F59E0B", "#06B6D4", "#84CC16", "#D946EF"
];

function _safeKey(key) {
  return String(key).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}

function _createKpiEl(label, value, color, valSize, lblSize, valWeight, lblWeight) {
  var wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "2px";

  var lEl = document.createElement("div");
  lEl.style.fontSize = (lblSize || 12) + "px";
  lEl.style.color = "#9CA3AF";
  lEl.style.fontWeight = lblWeight || "500";
  lEl.textContent = label;
  wrap.appendChild(lEl);

  var vEl = document.createElement("div");
  vEl.style.fontSize = (valSize || 24) + "px";
  vEl.style.fontWeight = valWeight || "700";
  vEl.style.color = color;
  vEl.style.lineHeight = "1.1";
  vEl.textContent = value;
  wrap.appendChild(vEl);

  return wrap;
}

function _formatCompact(val, fmt) {
  if (fmt && fmt.indexOf("%") !== -1) {
    var pd = 0;
    var pm = fmt.match(/\.(0+)%/);
    if (pm) pd = pm[1].length;
    return (val * 100).toFixed(pd) + "%";
  }

  var prefix = "";
  if (fmt && fmt.charAt(0) === "$") prefix = "$";

  var abs = Math.abs(val);
  var suffix = "";
  var num = abs;

  if (abs >= 1e9) { num = abs / 1e9; suffix = "B"; }
  else if (abs >= 1e6) { num = abs / 1e6; suffix = "M"; }
  else if (abs >= 1e3) { num = abs / 1e3; suffix = "K"; }

  var dec = 0;
  if (suffix && num < 10) dec = 1;
  if (!suffix) {
    var dm = fmt ? fmt.match(/\.(0+)/) : null;
    dec = dm ? dm[1].length : 0;
  }

  var sign = val < 0 ? "-" : "";
  var result = sign + prefix + num.toFixed(dec) + suffix;

  // Add comma separators for non-compact numbers
  if (!suffix && fmt && fmt.indexOf(",") !== -1) {
    var parts = num.toFixed(dec).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    result = sign + prefix + parts.join(".");
  }

  return result;
}

function _niceScale(min, max, targetTicks) {
  var range = max - min;
  if (range === 0) range = 1;
  var roughStep = range / targetTicks;
  var mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  var residual = roughStep / mag;
  var niceStep;
  if (residual <= 1.5) niceStep = 1 * mag;
  else if (residual <= 3) niceStep = 2 * mag;
  else if (residual <= 7) niceStep = 5 * mag;
  else niceStep = 10 * mag;

  var niceMin = Math.floor(min / niceStep) * niceStep;
  var niceMax = Math.ceil(max / niceStep) * niceStep;

  var ticks = [];
  for (var t = niceMin; t <= niceMax; t += niceStep) {
    ticks.push(Math.round(t * 1e10) / 1e10);
  }
  if (ticks.length === 0) ticks = [0, max];
  return ticks;
}

function _buildBaseOptions() {
  return {
    // -- General --
    show_summary: {
      type: "string", label: "Show Summary Row", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "General", order: 1
    },

    // -- Summary --
    show_total: {
      type: "string", label: "Show Total", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Summary", order: 1
    },
    total_label: {
      type: "string", label: "Total Label", default: "Total",
      section: "Summary", order: 2
    },
    total_color: {
      type: "string", label: "Total Value Color", default: "#111827",
      display: "color", section: "Summary", order: 3
    },
    summary_font_size: {
      type: "number", label: "Value Font Size (px)", default: 24,
      section: "Summary", order: 4
    },
    summary_label_size: {
      type: "number", label: "Label Font Size (px)", default: 12,
      section: "Summary", order: 5
    },
    summary_value_weight: {
      type: "string", label: "Value Font Weight", display: "select",
      values: [{ "Bold": "bold" }, { "Normal": "normal" }],
      default: "bold", section: "Summary", order: 6
    },
    summary_label_weight: {
      type: "string", label: "Label Font Weight", display: "select",
      values: [{ "Normal": "normal" }, { "Bold": "bold" }],
      default: "normal", section: "Summary", order: 7
    },
    summary_align: {
      type: "string", label: "Summary Alignment", display: "select",
      values: [{ "Left": "left" }, { "Center": "center" }, { "Right": "right" }],
      default: "left", section: "Summary", order: 8
    },

    // -- Chart --
    y_axis_label: {
      type: "string", label: "Y Axis Label", default: "",
      placeholder: "e.g. Cost ($)", section: "Chart", order: 1
    },
    show_grid: {
      type: "string", label: "Grid Lines", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Chart", order: 2
    },
    show_legend: {
      type: "string", label: "Legend", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Chart", order: 3
    },
    legend_align: {
      type: "string", label: "Legend Alignment", display: "select",
      values: [{ "Left": "left" }, { "Center": "center" }, { "Right": "right" }],
      default: "center", section: "Chart", order: 4
    },
    bar_width: {
      type: "number", label: "Bar Width (0.1-1)", default: 0.6,
      section: "Chart", order: 4
    },
    x_label_rotation: {
      type: "number", label: "X Label Rotation (deg)", default: 0,
      section: "Chart", order: 5
    },

    // -- Format --
    value_format: {
      type: "string", label: "Value Format", display: "select",
      values: [
        { "Auto": "auto" }, { "Decimal (0)": "decimal_0" },
        { "Decimal (1)": "decimal_1" }, { "Decimal (2)": "decimal_2" },
        { "USD": "usd" }, { "USD (0)": "usd_0" },
        { "Percent (0)": "percent_0" }, { "Percent (1)": "percent_1" },
        { "Number": "number" }, { "Custom": "custom" }
      ],
      default: "auto", section: "Format", order: 1
    },
    value_format_custom: {
      type: "string", label: "Custom Format", default: "",
      placeholder: "e.g. $#,##0.00", section: "Format", order: 2
    },
    divider_color: {
      type: "string", label: "Divider Color", default: "#E5E7EB",
      display: "color", section: "Format", order: 3
    },
    font_family: {
      type: "string", label: "Font Family",
      default: "'Inter','Helvetica Neue',Arial,sans-serif",
      section: "Format", order: 4
    }
  };
}

function _resolveNamedFormat(name) {
  var map = {
    "decimal_0": "#,##0", "decimal_1": "#,##0.0", "decimal_2": "#,##0.00",
    "usd": "$#,##0.00", "usd_0": "$#,##0",
    "percent_0": "#,##0%", "percent_1": "#,##0.0%", "percent_2": "#,##0.00%",
    "number": "#,##0"
  };
  return map[name] || "#,##0";
}
