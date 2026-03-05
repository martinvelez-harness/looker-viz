/**
 * Treemap KPI -- Looker Custom Visualization
 * Developed by Martin Velez
 *
 * Renders a treemap where rectangle sizes are proportional to a measure,
 * colors are determined by the pivot dimension (e.g. provider), and labels
 * come from the non-pivot dimension (e.g. region).
 *
 * Query: 1 dimension + 1 pivot + 1 measure.
 *   - Dimension (non-pivot) = label inside each rectangle (e.g. region)
 *   - Pivot dimension       = color grouping (e.g. cloud provider)
 *   - Measure               = value (determines rectangle size)
 *
 * Admin -> Visualizations:
 *   ID: treemap_kpi
 *   Label: Treemap KPI
 *   Main: https://cdn.jsdelivr.net/gh/martinvelez-harness/looker-viz@main/treemap_kpi.js
 */

looker.plugins.visualizations.add({

  id: "treemap_kpi",
  label: "Treemap KPI",

  options: {},

  // ──────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────
  create: function (element, config) {
    element.innerHTML = "";
    element.style.fontFamily = config.font_family || "'Inter','Helvetica Neue',Arial,sans-serif";
    element.style.overflow = "hidden";
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
    element.style.overflow = "hidden";
    element.style.padding = "0";
    element.style.margin = "0";

    // Kill scrollbars
    var par = element.parentElement;
    while (par && par !== document.body) { par.style.overflow = "hidden"; par.style.padding = "0"; par = par.parentElement; }
    if (!document.getElementById("_treemap_reset_css")) {
      var st = document.createElement("style");
      st.id = "_treemap_reset_css";
      st.textContent = "#vis, #vis-container, .looker-vis-context { padding:0!important; margin:0!important; overflow:hidden!important; }";
      document.head.appendChild(st);
    }

    // Custom tooltip
    var tooltipEl = document.getElementById("_treemap_tooltip");
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.id = "_treemap_tooltip";
      tooltipEl.style.cssText = "position:fixed;pointer-events:none;z-index:99999;background:rgba(17,24,39,0.92);color:#fff;font-family:'Inter','Helvetica Neue',Arial,sans-serif;font-size:13px;padding:8px 12px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.25);white-space:nowrap;opacity:0;transition:opacity 0.15s;line-height:1.5;";
      document.body.appendChild(tooltipEl);
    }
    tooltipEl.style.opacity = "0";

    function showTooltip(e, html) {
      tooltipEl.innerHTML = html;
      tooltipEl.style.opacity = "1";
      _posTooltip(e);
    }
    function _posTooltip(e) {
      var tx = e.clientX + 12, ty = e.clientY - 10;
      var tw = tooltipEl.offsetWidth;
      if (tx + tw > window.innerWidth - 8) tx = e.clientX - tw - 12;
      tooltipEl.style.left = tx + "px";
      tooltipEl.style.top = ty + "px";
    }
    function hideTooltip() { tooltipEl.style.opacity = "0"; }

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

    if (dimensions.length < 1) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add 1 dimension (labels) + 1 pivot (colors) + 1 measure</p>';
      doneRendering(); return;
    }
    if (pivots.length === 0) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add a pivot dimension for color grouping</p>';
      doneRendering(); return;
    }
    if (measures.length < 1) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add at least 1 measure</p>';
      doneRendering(); return;
    }

    this.clearErrors();

    // ── Fields ──
    var labelDim = dimensions[0];
    var measureField = measures[0];

    // ── Color groups from pivot ──
    var colorGroups = [];
    for (var pi = 0; pi < pivots.length; pi++) {
      colorGroups.push(pivots[pi].key);
    }

    var fieldKey = colorGroups.join("|");
    if (this._registeredFields !== fieldKey) {
      this._registeredFields = fieldKey;
      var dynOpts = _buildBaseOptions();

      for (var oi = 0; oi < colorGroups.length; oi++) {
        var safe = _safeKey(colorGroups[oi]);
        var pfix = colorGroups[oi];
        dynOpts["group_" + safe + "_color"] = {
          type: "string", label: pfix + " | Color",
          default: _defaultColors[oi % _defaultColors.length],
          display: "color", section: "Groups", order: oi * 10
        };
        dynOpts["group_" + safe + "_label"] = {
          type: "string", label: pfix + " | Label",
          default: "", placeholder: pfix,
          section: "Groups", order: oi * 10 + 1
        };
      }

      this.trigger("registerOptions", dynOpts);
    }

    // ── Config ──
    var fontFamily       = config.font_family || "'Inter','Helvetica Neue',Arial,sans-serif";
    var showSummary      = config.show_summary !== "false";
    var totalLabel       = config.total_label || "Total";
    var totalColor       = config.total_color || "#F97316";
    var summaryValueSize = Number(config.summary_value_size) || 28;
    var summaryLabelSize = Number(config.summary_label_size) || 12;
    var summaryValueWeight = config.summary_value_weight === "normal" ? "400" : "700";
    var summaryLabelWeight = config.summary_label_weight === "bold" ? "700" : "400";
    var showLegend       = config.show_legend !== "false";
    var legendTitle      = config.legend_title != null ? config.legend_title : "";
    var legendPos        = config.legend_position || "above";
    var legendAlign      = config.legend_align || "left";
    var legendFw         = config.legend_font_weight === "bold" ? "700" : "400";
    var cellLabelSize    = Number(config.cell_label_size) || 13;
    var cellValueSize    = Number(config.cell_value_size) || 12;
    var cellLabelWeight  = config.cell_label_weight === "normal" ? "400" : "700";
    var cellValueWeight  = config.cell_value_weight === "bold" ? "700" : "400";
    var cellGap          = config.cell_gap != null ? Number(config.cell_gap) : 3;
    var cellRadius       = config.cell_border_radius != null ? Number(config.cell_border_radius) : 4;
    var vfSetting        = config.value_format || "auto";
    var vfCustom         = (config.value_format_custom || "").trim();

    // Resolve format
    var resolvedFmt = null;
    if (vfSetting === "custom" && vfCustom) resolvedFmt = vfCustom;
    else if (vfSetting !== "auto") resolvedFmt = _resolveNamedFormat(vfSetting);
    else if (measureField.value_format) resolvedFmt = measureField.value_format;
    if (!resolvedFmt) resolvedFmt = "$#,##0";

    // Group colors
    var groupColors = {};
    for (var gci = 0; gci < colorGroups.length; gci++) {
      var gk = _safeKey(colorGroups[gci]);
      groupColors[colorGroups[gci]] = config["group_" + gk + "_color"] || _defaultColors[gci % _defaultColors.length];
    }

    // ── Build data ──
    // Each row x pivot combination = one treemap rectangle
    var items = [];
    var groupTotals = {};
    var grandTotal = 0;

    for (var ri = 0; ri < data.length; ri++) {
      var row = data[ri];
      var lbl = row[labelDim.name].rendered || String(row[labelDim.name].value) || "--";
      var mCell = row[measureField.name];

      for (var pvi = 0; pvi < colorGroups.length; pvi++) {
        var pk = colorGroups[pvi];
        var val = 0;
        var links = null;

        if (mCell && mCell[pk]) {
          val = Number(mCell[pk].value) || 0;
          links = mCell[pk].links || null;
        }

        if (val <= 0) continue;

        items.push({ label: lbl, group: pk, value: val, links: links });
        grandTotal += val;
        groupTotals[pk] = (groupTotals[pk] || 0) + val;
      }
    }

    // Sort items by value descending
    items.sort(function (a, b) { return b.value - a.value; });

    if (items.length === 0) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">No positive values to display</p>';
      doneRendering(); return;
    }

    // ── DOM: Container ──
    var container = document.createElement("div");
    container.style.fontFamily = fontFamily;
    container.style.padding = "16px";
    container.style.boxSizing = "border-box";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.overflow = "hidden";

    // ── Summary KPI row ──
    if (showSummary) {
      var summaryRow = document.createElement("div");
      summaryRow.style.display = "flex";
      summaryRow.style.justifyContent = "space-between";
      summaryRow.style.alignItems = "flex-end";
      summaryRow.style.marginBottom = "12px";
      summaryRow.style.flexShrink = "0";
      summaryRow.style.flexWrap = "wrap";
      summaryRow.style.gap = "16px";

      // Total (left)
      var totalEl = document.createElement("div");
      totalEl.style.display = "flex";
      totalEl.style.flexDirection = "column";
      totalEl.style.gap = "2px";

      var tLbl = document.createElement("div");
      tLbl.style.fontSize = summaryLabelSize + "px";
      tLbl.style.color = "#9CA3AF";
      tLbl.style.fontWeight = summaryLabelWeight;
      tLbl.textContent = totalLabel;
      totalEl.appendChild(tLbl);

      var tVal = document.createElement("div");
      tVal.style.fontSize = summaryValueSize + "px";
      tVal.style.fontWeight = summaryValueWeight;
      tVal.style.color = totalColor;
      tVal.style.lineHeight = "1.1";
      tVal.textContent = _formatCompact(grandTotal, resolvedFmt);
      totalEl.appendChild(tVal);

      summaryRow.appendChild(totalEl);

      // Per-group values (right)
      var groupRow = document.createElement("div");
      groupRow.style.display = "flex";
      groupRow.style.gap = "24px";
      groupRow.style.alignItems = "flex-end";
      groupRow.style.flexWrap = "wrap";

      for (var gi = 0; gi < colorGroups.length; gi++) {
        var gName = colorGroups[gi];
        var gSafe = _safeKey(gName);
        var gLabel = config["group_" + gSafe + "_label"] || gName;
        var gColor = groupColors[gName];

        var gEl = document.createElement("div");
        gEl.style.display = "flex";
        gEl.style.flexDirection = "column";
        gEl.style.alignItems = "center";
        gEl.style.gap = "2px";

        var gLbl = document.createElement("div");
        gLbl.style.fontSize = summaryLabelSize + "px";
        gLbl.style.color = "#9CA3AF";
        gLbl.style.fontWeight = summaryLabelWeight;
        gLbl.textContent = gLabel;
        gEl.appendChild(gLbl);

        var gVal = document.createElement("div");
        gVal.style.fontSize = summaryValueSize + "px";
        gVal.style.fontWeight = summaryValueWeight;
        gVal.style.color = gColor;
        gVal.style.lineHeight = "1.1";
        gVal.textContent = _formatCompact(groupTotals[gName] || 0, resolvedFmt);
        gEl.appendChild(gVal);

        groupRow.appendChild(gEl);
      }

      summaryRow.appendChild(groupRow);
      container.appendChild(summaryRow);

      // Divider
      if (config.show_divider !== "false") {
        var divEl = document.createElement("div");
        divEl.style.height = "1px";
        divEl.style.background = config.divider_color || "#E5E7EB";
        divEl.style.marginTop = "8px";
        divEl.style.marginBottom = "12px";
        divEl.style.flexShrink = "0";
        container.appendChild(divEl);
      } else {
        // Still add spacing even without the line
        var spacer = document.createElement("div");
        spacer.style.height = "12px";
        spacer.style.flexShrink = "0";
        container.appendChild(spacer);
      }
    }

    // ── Legend builder ──
    function buildLegend() {
      var legend = document.createElement("div");
      legend.style.display = "flex";
      legend.style.alignItems = "center";
      legend.style.gap = "16px";
      legend.style.flexWrap = "wrap";
      legend.style.flexShrink = "0";
      legend.style.marginBottom = legendPos === "above" ? "8px" : "0";
      legend.style.marginTop = legendPos === "below" ? "8px" : "0";

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

      for (var li = 0; li < colorGroups.length; li++) {
        var gn = colorGroups[li];
        var gSafe2 = _safeKey(gn);
        var item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.gap = "6px";

        var swatch = document.createElement("div");
        swatch.style.width = "14px";
        swatch.style.height = "14px";
        swatch.style.borderRadius = "3px";
        swatch.style.background = groupColors[gn];
        swatch.style.flexShrink = "0";
        item.appendChild(swatch);

        var lbl2 = document.createElement("span");
        lbl2.style.fontSize = "13px";
        lbl2.style.color = "#374151";
        lbl2.style.fontWeight = legendFw;
        lbl2.textContent = config["group_" + gSafe2 + "_label"] || gn;
        item.appendChild(lbl2);

        legend.appendChild(item);
      }
      return legend;
    }

    // Legend above
    if (showLegend && legendPos === "above") {
      container.appendChild(buildLegend());
    }

    // ── Treemap area ──
    var treemapWrap = document.createElement("div");
    treemapWrap.style.flex = "1";
    treemapWrap.style.position = "relative";
    treemapWrap.style.minHeight = "0";
    treemapWrap.style.overflow = "hidden";
    container.appendChild(treemapWrap);

    // Legend below
    if (showLegend && legendPos === "below") {
      container.appendChild(buildLegend());
    }

    element.appendChild(container);

    // Get available space
    var rect = treemapWrap.getBoundingClientRect();
    var tmW = rect.width || 400;
    var tmH = rect.height || 300;
    if (tmH < 80) tmH = 300;

    // ── Squarified treemap layout ──
    var rects = _squarify(items.map(function (it) { return it.value; }), { x: 0, y: 0, w: tmW, h: tmH });

    // ── Render rectangles ──
    for (var ti = 0; ti < rects.length; ti++) {
      var r = rects[ti];
      var it = items[ti];
      var color = groupColors[it.group] || "#6B7280";

      var cell = document.createElement("div");
      cell.style.position = "absolute";
      cell.style.left = (r.x + cellGap / 2) + "px";
      cell.style.top = (r.y + cellGap / 2) + "px";
      cell.style.width = Math.max(r.w - cellGap, 0) + "px";
      cell.style.height = Math.max(r.h - cellGap, 0) + "px";
      cell.style.background = color;
      cell.style.borderRadius = cellRadius + "px";
      cell.style.overflow = "hidden";
      cell.style.display = "flex";
      cell.style.flexDirection = "column";
      cell.style.justifyContent = "center";
      cell.style.alignItems = "center";
      cell.style.textAlign = "center";
      cell.style.padding = "8px 12px";
      cell.style.boxSizing = "border-box";

      var cellW = r.w - cellGap;
      var cellHeight = r.h - cellGap;

      // Adaptive font size: scale down for small cells, never hide
      var adaptLblSize = cellLabelSize;
      var adaptValSize = cellValueSize;
      var showVal = true;

      // Scale font based on cell dimensions
      if (cellW < 80 || cellHeight < 50) {
        var scaleFactor = Math.min(cellW / 80, cellHeight / 50);
        scaleFactor = Math.max(scaleFactor, 0.45);
        adaptLblSize = Math.max(Math.round(cellLabelSize * scaleFactor), 7);
        adaptValSize = Math.max(Math.round(cellValueSize * scaleFactor), 6);
      }

      // Padding scales with cell size
      var padV = cellHeight < 30 ? 2 : (cellHeight < 50 ? 4 : 8);
      var padH = cellW < 50 ? 3 : (cellW < 80 ? 6 : 12);
      cell.style.padding = padV + "px " + padH + "px";

      // Hide value if vertically too tight for two lines
      if (cellHeight < adaptLblSize * 1.2 + adaptValSize * 1.2 + padV * 2 + 2) {
        showVal = false;
      }

      // Always show label
      var lblEl = document.createElement("div");
      lblEl.style.fontSize = adaptLblSize + "px";
      lblEl.style.fontWeight = cellLabelWeight;
      lblEl.style.color = "white";
      lblEl.style.lineHeight = "1.2";
      lblEl.style.overflow = "hidden";
      lblEl.style.textOverflow = "ellipsis";
      lblEl.style.whiteSpace = "nowrap";
      lblEl.style.maxWidth = "100%";
      lblEl.textContent = it.label;
      cell.appendChild(lblEl);

      if (showVal) {
        var valEl = document.createElement("div");
        valEl.style.fontSize = adaptValSize + "px";
        valEl.style.fontWeight = cellValueWeight;
        valEl.style.color = "rgba(255,255,255,0.9)";
        valEl.style.lineHeight = "1.2";
        valEl.textContent = _formatCompact(it.value, resolvedFmt);
        cell.appendChild(valEl);
      }

      // Tooltip
      (function (item, clr) {
        var tipHtml = '<div style="font-weight:600;margin-bottom:2px;">' + item.label + '</div>'
          + '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + clr + ';margin-right:6px;vertical-align:middle;"></span>'
          + '<span style="color:#D1D5DB;">' + item.group + ':</span> '
          + '<span style="font-weight:700;">' + _formatCompact(item.value, resolvedFmt) + '</span>';

        cell.addEventListener("mouseenter", function (e) { showTooltip(e, tipHtml); });
        cell.addEventListener("mousemove", function (e) { _posTooltip(e); });
        cell.addEventListener("mouseleave", hideTooltip);

        // Drill
        if (item.links && item.links.length > 0) {
          cell.style.cursor = "pointer";
          cell.addEventListener("click", function (e) {
            hideTooltip();
            LookerCharts.Utils.openDrillMenu({ links: item.links, event: e });
          });
        }
      })(it, color);

      treemapWrap.appendChild(cell);
    }

    doneRendering();
  }
});


// ==================================================
// Helper functions
// ==================================================

var _defaultColors = [
  "#F97316", "#3B82F6", "#1E40AF", "#22C55E",
  "#6366F1", "#EF4444", "#8B5CF6", "#EC4899",
  "#14B8A6", "#F59E0B", "#06B6D4", "#84CC16"
];

function _safeKey(key) {
  return String(key).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
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

  if (!suffix && fmt && fmt.indexOf(",") !== -1) {
    var parts = num.toFixed(dec).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    result = sign + prefix + parts.join(".");
  }

  return result;
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

// --------------------------------------------------
// Squarified treemap algorithm
// --------------------------------------------------
function _squarify(values, bounds) {
  var total = 0;
  for (var i = 0; i < values.length; i++) total += values[i];
  if (total === 0) return values.map(function () { return { x: 0, y: 0, w: 0, h: 0 }; });

  var rects = new Array(values.length);
  var indices = [];
  for (var j = 0; j < values.length; j++) indices.push(j);

  // Sort descending
  indices.sort(function (a, b) { return values[b] - values[a]; });

  _layoutStrip(values, indices, bounds, total, rects);
  return rects;
}

function _layoutStrip(values, indices, bounds, totalVal, rects) {
  if (indices.length === 0) return;
  if (indices.length === 1) {
    rects[indices[0]] = { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h };
    return;
  }

  var area = bounds.w * bounds.h;
  var isWide = bounds.w >= bounds.h;
  var side = isWide ? bounds.h : bounds.w;

  var strip = [];
  var stripVal = 0;
  var bestRatio = Infinity;

  for (var i = 0; i < indices.length; i++) {
    var v = values[indices[i]];
    var newStripVal = stripVal + v;
    var newStrip = strip.concat([v]);

    var ratio = _worstRatio(newStrip, newStripVal, side, area, totalVal);

    if (ratio <= bestRatio) {
      strip = newStrip;
      stripVal = newStripVal;
      bestRatio = ratio;
    } else {
      // Lay out current strip
      var stripFrac = stripVal / totalVal;
      var stripSize = isWide ? bounds.w * stripFrac : bounds.h * stripFrac;

      var offset = 0;
      for (var s = 0; s < strip.length; s++) {
        var frac = strip[s] / stripVal;
        var segSize = side * frac;

        if (isWide) {
          rects[indices[s]] = { x: bounds.x, y: bounds.y + offset, w: stripSize, h: segSize };
        } else {
          rects[indices[s]] = { x: bounds.x + offset, y: bounds.y, w: segSize, h: stripSize };
        }
        offset += segSize;
      }

      // Recurse with remaining
      var newBounds;
      if (isWide) {
        newBounds = { x: bounds.x + stripSize, y: bounds.y, w: bounds.w - stripSize, h: bounds.h };
      } else {
        newBounds = { x: bounds.x, y: bounds.y + stripSize, w: bounds.w, h: bounds.h - stripSize };
      }

      _layoutStrip(values, indices.slice(strip.length), newBounds, totalVal - stripVal, rects);
      return;
    }
  }

  // All items fit in one strip
  var finalFrac = stripVal / totalVal;
  var finalSize = isWide ? bounds.w * finalFrac : bounds.h * finalFrac;
  if (isWide) finalSize = bounds.w;
  else finalSize = bounds.h;

  var off2 = 0;
  for (var f = 0; f < strip.length; f++) {
    var fr = strip[f] / stripVal;
    var seg = side * fr;

    if (isWide) {
      rects[indices[f]] = { x: bounds.x, y: bounds.y + off2, w: finalSize, h: seg };
    } else {
      rects[indices[f]] = { x: bounds.x + off2, y: bounds.y, w: seg, h: finalSize };
    }
    off2 += seg;
  }
}

function _worstRatio(strip, stripVal, side, area, totalVal) {
  var stripArea = (stripVal / totalVal) * area;
  var stripLen = stripArea / side;
  if (stripLen === 0) return Infinity;

  var worst = 0;
  for (var i = 0; i < strip.length; i++) {
    var segArea = (strip[i] / totalVal) * area;
    var segLen = segArea / stripLen;
    var r = Math.max(stripLen / segLen, segLen / stripLen);
    if (r > worst) worst = r;
  }
  return worst;
}

// --------------------------------------------------
// Base options
// --------------------------------------------------
function _buildBaseOptions() {
  return {
    // -- Summary --
    show_summary: {
      type: "string", label: "Show Summary", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Summary", order: 1
    },
    total_label: {
      type: "string", label: "Total Label", default: "Total",
      section: "Summary", order: 2
    },
    total_color: {
      type: "string", label: "Total Value Color", default: "#F97316",
      display: "color", section: "Summary", order: 3
    },
    summary_value_size: {
      type: "number", label: "Value Font Size (px)", default: 28,
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
    show_divider: {
      type: "string", label: "Show Divider", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Summary", order: 8
    },
    divider_color: {
      type: "string", label: "Divider Color", default: "#E5E7EB",
      display: "color", section: "Summary", order: 9
    },

    // -- Legend --
    show_legend: {
      type: "string", label: "Show Legend", display: "select",
      values: [{ "Yes": "true" }, { "No": "false" }],
      default: "true", section: "Legend", order: 1
    },
    legend_title: {
      type: "string", label: "Legend Title", default: "",
      section: "Legend", order: 2
    },
    legend_position: {
      type: "string", label: "Legend Position", display: "select",
      values: [{ "Above Treemap": "above" }, { "Below Treemap": "below" }],
      default: "above", section: "Legend", order: 3
    },
    legend_align: {
      type: "string", label: "Legend Alignment", display: "select",
      values: [{ "Left": "left" }, { "Center": "center" }, { "Right": "right" }],
      default: "left", section: "Legend", order: 4
    },
    legend_font_weight: {
      type: "string", label: "Legend Font Weight", display: "select",
      values: [{ "Normal": "normal" }, { "Bold": "bold" }],
      default: "normal", section: "Legend", order: 5
    },

    // -- Treemap --
    cell_label_size: {
      type: "number", label: "Cell Label Font Size (px)", default: 13,
      section: "Treemap", order: 1
    },
    cell_value_size: {
      type: "number", label: "Cell Value Font Size (px)", default: 12,
      section: "Treemap", order: 2
    },
    cell_label_weight: {
      type: "string", label: "Cell Label Font Weight", display: "select",
      values: [{ "Bold": "bold" }, { "Normal": "normal" }],
      default: "bold", section: "Treemap", order: 3
    },
    cell_value_weight: {
      type: "string", label: "Cell Value Font Weight", display: "select",
      values: [{ "Normal": "normal" }, { "Bold": "bold" }],
      default: "normal", section: "Treemap", order: 4
    },
    cell_gap: {
      type: "number", label: "Cell Gap (px)", default: 3,
      section: "Treemap", order: 5
    },
    cell_border_radius: {
      type: "number", label: "Cell Border Radius (px)", default: 4,
      section: "Treemap", order: 6
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
    font_family: {
      type: "string", label: "Font Family",
      default: "'Inter','Helvetica Neue',Arial,sans-serif",
      section: "Format", order: 3
    }
  };
}
