/**

- Coverage Donut — Looker Custom Visualization
- 
- Renders a donut chart showing a coverage percentage with status badge
- and optional period-over-period variation.
- 
- Query: 1 measure (coverage rate). Optional 2nd measure (previous period for variation).
- 
- manifest.lkml:
- visualization: {
- ```
  id: "coverage_donut"
  ```
- ```
  label: "Coverage Donut"
  ```
- ```
  file: "visualizations/coverage_donut.js"
  ```
- }
  */

looker.plugins.visualizations.add({

id: “single_value_donut”,
label: “Single Value Donut”,

options: {
color_filled: {
type: “string”,
label: “Fill Color”,
default: “#F97316”,
display: “color”,
section: “Donut”,
order: 1
},
color_empty: {
type: “string”,
label: “Empty Color”,
default: “#E5E7EB”,
display: “color”,
section: “Donut”,
order: 2
},
donut_thickness: {
type: “number”,
label: “Donut Thickness (px)”,
default: 20,
section: “Donut”,
order: 3
},
subtitle_text: {
type: “string”,
label: “Subtitle Text”,
default: “Covered”,
section: “Labels”,
order: 1
},
font_size_value: {
type: “number”,
label: “Value Font Size (px)”,
default: 32,
section: “Labels”,
order: 2
},
font_size_subtitle: {
type: “number”,
label: “Subtitle Font Size (px)”,
default: 13,
section: “Labels”,
order: 3
},
threshold_good: {
type: “number”,
label: “Good Threshold >= (%)”,
default: 80,
section: “Status”,
order: 1
},
threshold_fair: {
type: “number”,
label: “Fair Threshold >= (%)”,
default: 60,
section: “Status”,
order: 2
},
label_good: {
type: “string”,
label: “Good Label”,
default: “Good”,
section: “Status”,
order: 3
},
label_fair: {
type: “string”,
label: “Fair Label”,
default: “Fair”,
section: “Status”,
order: 4
},
label_poor: {
type: “string”,
label: “Poor Label”,
default: “Poor”,
section: “Status”,
order: 5
},
color_good: {
type: “string”,
label: “Good Color”,
default: “#22C55E”,
display: “color”,
section: “Status”,
order: 6
},
color_fair: {
type: “string”,
label: “Fair Color”,
default: “#F59E0B”,
display: “color”,
section: “Status”,
order: 7
},
color_poor: {
type: “string”,
label: “Poor Color”,
default: “#EF4444”,
display: “color”,
section: “Status”,
order: 8
},
show_variation: {
type: “string”,
label: “Show Variation”,
display: “select”,
values: [
{ “Yes”: “true” },
{ “No”: “false” }
],
default: “true”,
section: “Variation”,
order: 1
},
variation_label: {
type: “string”,
label: “Variation Label”,
default: “vs last period”,
section: “Variation”,
order: 2
}
},

// ──────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────
create: function (element, config) {
element.innerHTML = “”;
element.style.fontFamily = “‘Inter’,‘Helvetica Neue’,Arial,sans-serif”;
element.style.display = “flex”;
element.style.alignItems = “center”;
element.style.justifyContent = “center”;
element.style.width = “100%”;
element.style.height = “100%”;
element.style.overflow = “hidden”;
element.style.background = “white”;
element.style.padding = “0”;
element.style.margin = “0”;
element.style.boxSizing = “border-box”;
},

// ──────────────────────────────────────────────
// UPDATE
// ──────────────────────────────────────────────
updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
// Clear previous render
element.innerHTML = “”;
element.style.overflow = “hidden”;
element.style.padding = “0”;
element.style.margin = “0”;
// Walk up the DOM and force overflow hidden on all ancestors within the iframe
var parent = element.parentElement;
while (parent && parent !== document.body) {
parent.style.overflow = “hidden”;
parent.style.padding = “0”;
parent = parent.parentElement;
}

```
// Inject style override to kill any Looker padding on #vis
if (!document.getElementById("_donut_reset_css")) {
  var style = document.createElement("style");
  style.id = "_donut_reset_css";
  style.textContent = "#vis, #vis-container, .looker-vis-context { padding: 0 !important; margin: 0 !important; overflow: hidden !important; }";
  document.head.appendChild(style);
}

// ── Validate data ──
if (!data || data.length === 0) {
  element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">No data returned</p>';
  doneRendering();
  return;
}

// ── Gather all measure-like fields (measures + table_calculations) ──
// Use measure_like which is the canonical Looker API array.
// Fallback to manual concat if measure_like is not available.
var allMeasures = [];
if (queryResponse.fields.measure_like && queryResponse.fields.measure_like.length > 0) {
  allMeasures = queryResponse.fields.measure_like;
} else {
  var measures = queryResponse.fields.measures || queryResponse.fields.measure_like || [];
  var tablecalcs = queryResponse.fields.table_calculations || [];
  allMeasures = measures.concat(tablecalcs);
}

// If still empty, also check dimension_like as some table calcs end up there
if (allMeasures.length === 0) {
  // Last resort: grab any field that has data in the first row
  var allFields = [].concat(
    queryResponse.fields.measures || [],
    queryResponse.fields.dimensions || [],
    queryResponse.fields.table_calculations || []
  );
  allMeasures = allFields;
}

if (allMeasures.length < 1) {
  element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add at least 1 measure or table calculation to the query</p>';
  doneRendering();
  return;
}

this.clearErrors();

// ── Extract values ──
var row = data[0];
var primaryField = allMeasures[0];

var primaryCell = row[primaryField.name];
if (!primaryCell) {
  element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">No data for field: ' + primaryField.name + '</p>';
  doneRendering();
  return;
}

var primaryRaw = primaryCell.value;
var primaryValue = parseFloat(String(primaryRaw).replace("%", "")) || 0;

// Auto-detect if value is 0-1 (ratio) or 0-100 (percentage)
var pct = (primaryValue > 0 && primaryValue <= 1) ? primaryValue * 100 : primaryValue;
pct = Math.min(Math.max(pct, 0), 100);

// Variation (optional second measure)
var showVariation = config.show_variation !== "false";
var variationField = allMeasures.length > 1 ? allMeasures[1] : null;
var variationDelta = null;

if (variationField && showVariation) {
  var varCell = row[variationField.name];
  if (varCell) {
    var varRaw = varCell.value;
    var varValue = parseFloat(String(varRaw).replace("%", ""));
    if (!isNaN(varValue)) {
      var prevPct = (varValue > 0 && varValue <= 1) ? varValue * 100 : varValue;
      variationDelta = pct - prevPct;
    }
  }
}

// ── Config ──
var colorFilled = config.color_filled || "#F97316";
var colorEmpty  = config.color_empty  || "#E5E7EB";
var thickness   = Number(config.donut_thickness) || 20;
var subtitle    = config.subtitle_text || "Covered";
var fzValue     = Number(config.font_size_value) || 32;
var fzSub       = Number(config.font_size_subtitle) || 13;
var threshGood  = Number(config.threshold_good) || 80;
var threshFair  = Number(config.threshold_fair) || 60;
var labelGood   = config.label_good || "Good";
var labelFair   = config.label_fair || "Fair";
var labelPoor   = config.label_poor || "Poor";
var colorGood   = config.color_good || "#22C55E";
var colorFair   = config.color_fair || "#F59E0B";
var colorPoor   = config.color_poor || "#EF4444";
var varLabel    = config.variation_label || "vs last period";

// Status
var statusLabel, statusColor;
if (pct >= threshGood) {
  statusLabel = labelGood;
  statusColor = colorGood;
} else if (pct >= threshFair) {
  statusLabel = labelFair;
  statusColor = colorFair;
} else {
  statusLabel = labelPoor;
  statusColor = colorPoor;
}

// ── Sizing ──
// Try multiple approaches to get the real available space
var rect = element.getBoundingClientRect();
var elW = rect.width || element.clientWidth || window.innerWidth || 300;
var elH = rect.height || element.clientHeight || window.innerHeight || 300;

// Reserve space for badge (~28px) and variation row (~20px)
var badgeSpace = 30;
if (showVariation && variationDelta !== null) badgeSpace += 22;
var availH = elH - badgeSpace;

// Donut should fill as much as possible but NEVER exceed container
var svgSize = Math.max(Math.min(elW * 0.85, availH * 0.85), 80);
var cx = svgSize / 2;
var cy = svgSize / 2;
var r = (svgSize / 2) - (thickness / 2) - 4;
if (r < 20) r = 20;
var circum = 2 * Math.PI * r;
var filled = (pct / 100) * circum;
var gap = circum - filled;

// ── Build DOM ──
var wrapper = document.createElement("div");
wrapper.style.display = "flex";
wrapper.style.flexDirection = "column";
wrapper.style.alignItems = "center";
wrapper.style.justifyContent = "center";
wrapper.style.gap = "4px";
wrapper.style.width = "100%";
wrapper.style.height = "100%";
wrapper.style.padding = "0";
wrapper.style.margin = "0";
wrapper.style.overflow = "hidden";
wrapper.style.maxWidth = "100%";
wrapper.style.maxHeight = "100%";
wrapper.style.boxSizing = "border-box";

var ns = "http://www.w3.org/2000/svg";

var svg = document.createElementNS(ns, "svg");
svg.setAttribute("width", svgSize);
svg.setAttribute("height", svgSize);
svg.setAttribute("viewBox", "0 0 " + svgSize + " " + svgSize);
svg.style.maxWidth = "100%";
svg.style.maxHeight = "100%";
svg.style.display = "block";
svg.style.flexShrink = "1";

// Background circle (track)
var bg = document.createElementNS(ns, "circle");
bg.setAttribute("cx", cx);
bg.setAttribute("cy", cy);
bg.setAttribute("r", r);
bg.setAttribute("fill", "none");
bg.setAttribute("stroke", colorEmpty);
bg.setAttribute("stroke-width", thickness);
svg.appendChild(bg);

// Filled arc
if (pct > 0) {
  var arc = document.createElementNS(ns, "circle");
  arc.setAttribute("cx", cx);
  arc.setAttribute("cy", cy);
  arc.setAttribute("r", r);
  arc.setAttribute("fill", "none");
  arc.setAttribute("stroke", colorFilled);
  arc.setAttribute("stroke-width", thickness);
  arc.setAttribute("stroke-linecap", "round");
  arc.setAttribute("stroke-dasharray", filled + " " + gap);
  // Offset to start from top (12 o'clock position)
  arc.setAttribute("stroke-dashoffset", String(circum * 0.25));
  // Smooth animation on load
  arc.setAttribute("style",
    "transition: stroke-dasharray 0.6s ease-out; transform-origin: center; transform: rotate(0deg);"
  );
  svg.appendChild(arc);
}

// Value text
var tVal = document.createElementNS(ns, "text");
tVal.setAttribute("x", cx);
tVal.setAttribute("y", cy - 8);
tVal.setAttribute("text-anchor", "middle");
tVal.setAttribute("dominant-baseline", "central");
tVal.setAttribute("font-size", fzValue);
tVal.setAttribute("font-weight", "700");
tVal.setAttribute("fill", "#111827");
tVal.setAttribute("font-family", "'Inter','Helvetica Neue',Arial,sans-serif");
tVal.textContent = pct.toFixed(1) + "%";
svg.appendChild(tVal);

// Subtitle text
var tSub = document.createElementNS(ns, "text");
tSub.setAttribute("x", cx);
tSub.setAttribute("y", cy + fzValue * 1.0);
tSub.setAttribute("text-anchor", "middle");
tSub.setAttribute("dominant-baseline", "central");
tSub.setAttribute("font-size", fzSub);
tSub.setAttribute("fill", "#9CA3AF");
tSub.setAttribute("font-family", "'Inter','Helvetica Neue',Arial,sans-serif");
tSub.textContent = subtitle;
svg.appendChild(tSub);

wrapper.appendChild(svg);

// ── Status badge ──
var badge = document.createElement("div");
badge.style.display = "inline-flex";
badge.style.alignItems = "center";
badge.style.padding = "3px 12px";
badge.style.borderRadius = "99px";
badge.style.fontSize = "11px";
badge.style.fontWeight = "600";
badge.style.letterSpacing = "0.04em";
badge.style.background = statusColor + "1A";
badge.style.color = statusColor;
badge.style.border = "1px solid " + statusColor + "50";
badge.textContent = "Status: " + statusLabel;
wrapper.appendChild(badge);

// ── Variation row ──
if (showVariation && variationDelta !== null) {
  var isPos = variationDelta >= 0;
  var varClr = isPos ? colorGood : colorPoor;
  var arrow = isPos ? "\u2197" : "\u2198";
  var sign = isPos ? "+" : "";

  var varRow = document.createElement("div");
  varRow.style.display = "flex";
  varRow.style.alignItems = "center";
  varRow.style.gap = "4px";
  varRow.style.fontSize = "12px";
  varRow.style.color = "#6B7280";
  varRow.style.fontFamily = "'Inter','Helvetica Neue',Arial,sans-serif";

  var varNum = document.createElement("span");
  varNum.style.color = varClr;
  varNum.style.fontWeight = "700";
  varNum.style.fontSize = "13px";
  varNum.textContent = arrow + " " + sign + Math.abs(variationDelta).toFixed(1) + "%";

  var varLbl = document.createElement("span");
  varLbl.textContent = varLabel;

  varRow.appendChild(varNum);
  varRow.appendChild(varLbl);
  wrapper.appendChild(varRow);
}

// ── Drill support ──
var primaryLinks = primaryCell.links;
if (primaryLinks && primaryLinks.length > 0) {
  wrapper.style.cursor = "pointer";
  wrapper.addEventListener("click", function (e) {
    LookerCharts.Utils.openDrillMenu({
      links: primaryLinks,
      event: e
    });
  });
}

element.appendChild(wrapper);
doneRendering();
```

}

});
