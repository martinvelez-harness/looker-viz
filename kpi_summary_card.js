/**


KPI Summary Card – Looker Custom Visualization

Displays a total KPI value at the top with a breakdown grid below,
grouped by a dimension. Calculates the total automatically from query data.

Query: 1 dimension + 1 measure. The viz sums the measure for the total
and shows each dimension value with its corresponding measure.

Admin -> Visualizations:
ID: kpi_summary_card
Label: KPI Summary Card
Main: https://cdn.jsdelivr.net/gh/martinvelez-harness/looker-viz@main/kpi_summary_card.js
  */

looker.plugins.visualizations.add({

id: “kpi_summary_card”,
label: “KPI Summary Card”,

options: {
// Total section
total_subtitle: {
type: “string”,
label: “Total Subtitle”,
default: “Total”,
section: “Total”,
order: 1
},
total_font_size: {
type: “number”,
label: “Total Value Font Size (px)”,
default: 48,
section: “Total”,
order: 2
},
total_subtitle_size: {
type: “number”,
label: “Subtitle Font Size (px)”,
default: 14,
section: “Total”,
order: 3
},
total_color: {
type: “string”,
label: “Total Value Color”,
default: “#111827”,
display: “color”,
section: “Total”,
order: 4
},

```
// Breakdown section
breakdown_title: {
  type: "string",
  label: "Breakdown Section Title",
  default: "Breakdown by type",
  section: "Breakdown",
  order: 1
},
breakdown_columns: {
  type: "string",
  label: "Columns per Row",
  display: "select",
  values: [
    { "2": "2" },
    { "3": "3" },
    { "4": "4" }
  ],
  default: "3",
  section: "Breakdown",
  order: 2
},
breakdown_label_size: {
  type: "number",
  label: "Label Font Size (px)",
  default: 14,
  section: "Breakdown",
  order: 3
},
breakdown_value_size: {
  type: "number",
  label: "Value Font Size (px)",
  default: 28,
  section: "Breakdown",
  order: 4
},
breakdown_label_color: {
  type: "string",
  label: "Label Color",
  default: "#9CA3AF",
  display: "color",
  section: "Breakdown",
  order: 5
},
breakdown_value_color: {
  type: "string",
  label: "Value Color",
  default: "#111827",
  display: "color",
  section: "Breakdown",
  order: 6
},
show_divider: {
  type: "string",
  label: "Show Divider Line",
  display: "select",
  values: [
    { "Yes": "true" },
    { "No": "false" }
  ],
  default: "true",
  section: "Breakdown",
  order: 7
},

// Format
value_format_override: {
  type: "string",
  label: "Value Format Override",
  default: "",
  placeholder: "e.g. #,##0 or $#,##0.00",
  section: "Format",
  order: 1
},
font_family: {
  type: "string",
  label: "Font Family",
  default: "'Inter','Helvetica Neue',Arial,sans-serif",
  section: "Format",
  order: 2
}
```

},

// –––––––––––––––––––––––
// CREATE
// –––––––––––––––––––––––
create: function (element, config) {
element.innerHTML = “”;
element.style.fontFamily = config.font_family || “‘Inter’,‘Helvetica Neue’,Arial,sans-serif”;
element.style.overflow = “hidden”;
element.style.background = “white”;
element.style.padding = “0”;
element.style.margin = “0”;
element.style.boxSizing = “border-box”;
},

// –––––––––––––––––––––––
// UPDATE
// –––––––––––––––––––––––
updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
element.innerHTML = “”;
element.style.overflow = “hidden”;
element.style.padding = “0”;
element.style.margin = “0”;

```
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
var fontFamily       = config.font_family || "'Inter','Helvetica Neue',Arial,sans-serif";
var totalSubtitle    = config.total_subtitle || "Total";
var totalFontSize    = Number(config.total_font_size) || 48;
var subtitleSize     = Number(config.total_subtitle_size) || 14;
var totalColor       = config.total_color || "#111827";
var breakdownTitle   = config.breakdown_title || "Breakdown by type";
var cols             = Number(config.breakdown_columns) || 3;
var brkLabelSize     = Number(config.breakdown_label_size) || 14;
var brkValueSize     = Number(config.breakdown_value_size) || 28;
var brkLabelColor    = config.breakdown_label_color || "#9CA3AF";
var brkValueColor    = config.breakdown_value_color || "#111827";
var showDivider      = config.show_divider !== "false";
var fmtOverride      = (config.value_format_override || "").trim();

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
  breakdownItems.push({
    label: label,
    value: val,
    rendered: measureCell ? measureCell.rendered : null,
    links: measureCell ? measureCell.links : null
  });
}

// -- Format helper --
function formatVal(num, rendered) {
  if (fmtOverride) return formatNumber(num, fmtOverride);
  if (rendered) return rendered;
  return formatNumber(num, "#,##0");
}

// -- Build layout --
var container = document.createElement("div");
container.style.fontFamily = fontFamily;
container.style.padding = "20px 24px";
container.style.boxSizing = "border-box";
container.style.width = "100%";
container.style.height = "100%";
container.style.overflow = "hidden";
container.style.display = "flex";
container.style.flexDirection = "column";

// -- Total section --
var totalSection = document.createElement("div");
totalSection.style.marginBottom = "4px";

var totalValueEl = document.createElement("div");
totalValueEl.style.fontSize = totalFontSize + "px";
totalValueEl.style.fontWeight = "800";
totalValueEl.style.color = totalColor;
totalValueEl.style.lineHeight = "1.1";
totalValueEl.textContent = formatVal(total, null);
totalSection.appendChild(totalValueEl);

var totalSubEl = document.createElement("div");
totalSubEl.style.fontSize = subtitleSize + "px";
totalSubEl.style.color = "#9CA3AF";
totalSubEl.style.marginTop = "4px";
totalSubEl.textContent = totalSubtitle;
totalSection.appendChild(totalSubEl);

container.appendChild(totalSection);

// -- Divider --
if (showDivider) {
  var divider = document.createElement("div");
  divider.style.height = "1px";
  divider.style.background = "#E5E7EB";
  divider.style.margin = "16px 0";
  container.appendChild(divider);
}

// -- Breakdown title --
if (breakdownTitle) {
  var brkTitleEl = document.createElement("div");
  brkTitleEl.style.fontSize = subtitleSize + "px";
  brkTitleEl.style.color = "#9CA3AF";
  brkTitleEl.style.marginBottom = "16px";
  brkTitleEl.textContent = breakdownTitle;
  container.appendChild(brkTitleEl);
}

// -- Breakdown grid --
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
  cellValue.style.fontWeight = "700";
  cellValue.style.color = brkValueColor;
  cellValue.style.lineHeight = "1.2";
  cellValue.textContent = formatVal(item.value, item.rendered);
  cell.appendChild(cellValue);

  // Drill support
  if (item.links && item.links.length > 0) {
    cell.style.cursor = "pointer";
    (function (links) {
      cell.addEventListener("click", function (e) {
        LookerCharts.Utils.openDrillMenu({
          links: links,
          event: e
        });
      });
    })(item.links);
  }

  grid.appendChild(cell);
}

container.appendChild(grid);
element.appendChild(container);
doneRendering();
```

}

});

// –––––––––––––––––––––––
// Helpers
// –––––––––––––––––––––––
function formatNumber(val, fmt) {
if (!fmt) return String(val);

if (fmt.indexOf(’%’) !== -1) {
var decimals = 0;
var match = fmt.match(/.(0+)%/);
if (match) decimals = match[1].length;
return (val * 100).toFixed(decimals) + ‘%’;
}

var prefix = ‘’;
if (fmt.charAt(0) === ‘$’) {
prefix = ‘$’;
fmt = fmt.substring(1);
}

var decMatch = fmt.match(/.(0+)/);
var dec = decMatch ? decMatch[1].length : 0;

var useComma = fmt.indexOf(’,’) !== -1;
var formatted = val.toFixed(dec);

if (useComma) {
var parts = formatted.split(’.’);
parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ‘,’);
formatted = parts.join(’.’);
}

return prefix + formatted;
}
