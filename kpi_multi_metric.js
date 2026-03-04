/**
 * KPI Multi-Metric Card -- Looker Custom Visualization
 *
 * Displays a primary KPI value with secondary metrics below.
 * No dimensions needed -- query N measures, pick which is primary.
 * Secondary metrics render in a list with label (from measure name) and value.
 * Configurable thresholds for color coding.
 *
 * Query: 1..N measures (no dimension required).
 *
 * Admin -> Visualizations:
 *   ID: kpi_multi_metric
 *   Label: KPI Multi-Metric Card
 *   Main: https://cdn.jsdelivr.net/gh/martinvelez-harness/looker-viz@main/kpi_multi_metric.js
 */

looker.plugins.visualizations.add({

  id: "kpi_multi_metric",
  label: "KPI Multi-Metric Card",

  options: {
    // -- Primary --
    card_title: {
      type: "string",
      label: "Card Title",
      default: "",
      placeholder: "e.g. Unused Commitments",
      section: "Primary",
      order: 1
    },
    primary_measure_index: {
      type: "string",
      label: "Primary Measure (position)",
      display: "select",
      values: [
        { "1st measure": "0" },
        { "2nd measure": "1" },
        { "3rd measure": "2" },
        { "4th measure": "3" },
        { "5th measure": "4" }
      ],
      default: "0",
      section: "Primary",
      order: 2
    },
    primary_subtitle: {
      type: "string",
      label: "Subtitle",
      default: "",
      placeholder: "e.g. Wasted commitment spend",
      section: "Primary",
      order: 3
    },
    primary_font_size: {
      type: "number",
      label: "Value Font Size (px)",
      default: 48,
      section: "Primary",
      order: 4
    },
    primary_subtitle_size: {
      type: "number",
      label: "Subtitle Font Size (px)",
      default: 14,
      section: "Primary",
      order: 5
    },
    primary_color: {
      type: "string",
      label: "Value Color",
      default: "#111827",
      display: "color",
      section: "Primary",
      order: 6
    },
    primary_use_threshold: {
      type: "string",
      label: "Apply Threshold",
      display: "select",
      values: [
        { "No": "false" },
        { "Yes": "true" }
      ],
      default: "false",
      section: "Primary",
      order: 7
    },

    // -- Secondary --
    secondary_label_size: {
      type: "number",
      label: "Label Font Size (px)",
      default: 14,
      section: "Secondary",
      order: 1
    },
    secondary_value_size: {
      type: "number",
      label: "Value Font Size (px)",
      default: 16,
      section: "Secondary",
      order: 2
    },
    secondary_label_color: {
      type: "string",
      label: "Label Color",
      default: "#6B7280",
      display: "color",
      section: "Secondary",
      order: 3
    },
    secondary_value_color: {
      type: "string",
      label: "Value Color",
      default: "#111827",
      display: "color",
      section: "Secondary",
      order: 4
    },
    secondary_use_threshold: {
      type: "string",
      label: "Apply Threshold",
      display: "select",
      values: [
        { "No": "false" },
        { "Yes": "true" }
      ],
      default: "false",
      section: "Secondary",
      order: 5
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

    // -- Format --
    value_format_override: {
      type: "string",
      label: "Primary Format Override",
      default: "",
      placeholder: "e.g. $#,##0 or #,##0.0%",
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
    if (!document.getElementById("_kpi_mm_reset_css")) {
      var st = document.createElement("style");
      st.id = "_kpi_mm_reset_css";
      st.textContent = "#vis, #vis-container, .looker-vis-context { padding: 0 !important; margin: 0 !important; overflow: hidden !important; }";
      document.head.appendChild(st);
    }

    // -- Gather measures --
    var allMeasures = queryResponse.fields.measure_like || [];
    if (allMeasures.length === 0) {
      var ms = queryResponse.fields.measures || [];
      var tcs = queryResponse.fields.table_calculations || [];
      allMeasures = ms.concat(tcs);
    }

    if (allMeasures.length < 1) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add at least 1 measure to the query</p>';
      doneRendering();
      return;
    }

    if (!data || data.length === 0) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">No data returned</p>';
      doneRendering();
      return;
    }

    this.clearErrors();

    var row = data[0];

    // -- Config --
    var fontFamily       = config.font_family || "'Inter','Helvetica Neue',Arial,sans-serif";
    var cardTitle        = (config.card_title || "").trim();
    var primaryIdx       = Math.min(Number(config.primary_measure_index) || 0, allMeasures.length - 1);
    var primarySubtitle  = config.primary_subtitle || "";
    var primaryFontSize  = Number(config.primary_font_size) || 48;
    var subtitleSize     = Number(config.primary_subtitle_size) || 14;
    var primaryColor     = config.primary_color || "#111827";
    var primaryUseTh     = config.primary_use_threshold === "true";
    var secLabelSize     = Number(config.secondary_label_size) || 14;
    var secValueSize     = Number(config.secondary_value_size) || 16;
    var secLabelColor    = config.secondary_label_color || "#6B7280";
    var secValueColor    = config.secondary_value_color || "#111827";
    var secUseTh         = config.secondary_use_threshold === "true";
    var fmtOverride      = (config.value_format_override || "").trim();

    // Thresholds
    var thGood       = config.threshold_good != null ? Number(config.threshold_good) : null;
    var thWarning    = config.threshold_warning != null ? Number(config.threshold_warning) : null;
    var thDirection  = config.threshold_direction || "asc";
    var clrGood      = config.color_good || "#22C55E";
    var clrWarning   = config.color_warning || "#F59E0B";
    var clrDanger    = config.color_danger || "#EF4444";

    function getThresholdColor(val) {
      if (thGood == null && thWarning == null) return null;
      if (thDirection === "asc") {
        if (thGood != null && val >= thGood) return clrGood;
        if (thWarning != null && val >= thWarning) return clrWarning;
        return clrDanger;
      } else {
        if (thGood != null && val <= thGood) return clrGood;
        if (thWarning != null && val <= thWarning) return clrWarning;
        return clrDanger;
      }
    }

    // -- Extract all measure values --
    var items = [];
    for (var i = 0; i < allMeasures.length; i++) {
      var field = allMeasures[i];
      var cell = row[field.name];
      var val = cell ? Number(cell.value) || 0 : 0;
      var rendered = cell ? cell.rendered : null;
      var links = cell ? cell.links : null;
      var label = field.label_short || field.label || field.name;

      // Detect format per field
      var fmt = null;
      if (field.value_format) {
        fmt = field.value_format;
      } else if (rendered) {
        if (rendered.indexOf('%') !== -1) {
          fmt = "#,##0.0%";
        } else if (rendered.indexOf('$') !== -1) {
          var dm = rendered.match(/\.(\d+)/);
          var d = dm ? dm[1].length : 0;
          fmt = "$#,##0" + (d > 0 ? "." + "0".repeat(d) : "");
        }
      }

      items.push({
        label: label,
        value: val,
        rendered: rendered,
        links: links,
        format: fmt || "#,##0"
      });
    }

    // Primary item
    var primary = items[primaryIdx];

    // Format helpers
    function fmtPrimary(num, rendered) {
      if (fmtOverride) return _formatNumber(num, fmtOverride);
      if (rendered) return rendered;
      return _formatNumber(num, primary.format);
    }

    function fmtSecondary(item) {
      if (item.rendered) return item.rendered;
      return _formatNumber(item.value, item.format);
    }

    // -- Build DOM --
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
      titleEl.style.fontWeight = "700";
      titleEl.style.color = "#111827";
      titleEl.style.marginBottom = "8px";
      titleEl.textContent = cardTitle;
      container.appendChild(titleEl);
    }

    // -- Primary value --
    var primaryValueEl = document.createElement("div");
    primaryValueEl.style.fontSize = primaryFontSize + "px";
    primaryValueEl.style.fontWeight = "800";
    primaryValueEl.style.lineHeight = "1.1";
    primaryValueEl.textContent = fmtPrimary(primary.value, primary.rendered);

    if (primaryUseTh) {
      var pc = getThresholdColor(primary.value);
      primaryValueEl.style.color = pc || primaryColor;
    } else {
      primaryValueEl.style.color = primaryColor;
    }
    container.appendChild(primaryValueEl);

    // Drill on primary
    if (primary.links && primary.links.length > 0) {
      primaryValueEl.style.cursor = "pointer";
      (function (l) {
        primaryValueEl.addEventListener("click", function (e) {
          LookerCharts.Utils.openDrillMenu({ links: l, event: e });
        });
      })(primary.links);
    }

    // -- Primary subtitle --
    if (primarySubtitle) {
      var subEl = document.createElement("div");
      subEl.style.fontSize = subtitleSize + "px";
      subEl.style.color = "#9CA3AF";
      subEl.style.marginTop = "4px";
      subEl.textContent = primarySubtitle;
      container.appendChild(subEl);
    }

    // -- Secondary metrics --
    var secondaryItems = [];
    for (var si = 0; si < items.length; si++) {
      if (si !== primaryIdx) secondaryItems.push(items[si]);
    }

    if (secondaryItems.length > 0) {
      // Divider
      var divider = document.createElement("div");
      divider.style.height = "1px";
      divider.style.background = "#E5E7EB";
      divider.style.margin = "16px 0";
      container.appendChild(divider);

      // List
      var list = document.createElement("div");
      list.style.display = "flex";
      list.style.flexDirection = "column";
      list.style.gap = "0";

      for (var li = 0; li < secondaryItems.length; li++) {
        var sItem = secondaryItems[li];

        var sRow = document.createElement("div");
        sRow.style.display = "flex";
        sRow.style.justifyContent = "space-between";
        sRow.style.alignItems = "center";
        sRow.style.padding = "6px 0";
        if (li < secondaryItems.length - 1) {
          sRow.style.borderBottom = "1px solid #F3F4F6";
        }

        var sLabel = document.createElement("div");
        sLabel.style.fontSize = secLabelSize + "px";
        sLabel.style.color = secLabelColor;
        sLabel.style.fontWeight = "500";
        sLabel.textContent = sItem.label;
        sRow.appendChild(sLabel);

        var sValue = document.createElement("div");
        sValue.style.fontSize = secValueSize + "px";
        sValue.style.fontWeight = "700";
        sValue.textContent = fmtSecondary(sItem);

        if (secUseTh) {
          var sc = getThresholdColor(sItem.value);
          sValue.style.color = sc || secValueColor;
        } else {
          sValue.style.color = secValueColor;
        }
        sRow.appendChild(sValue);

        // Drill
        if (sItem.links && sItem.links.length > 0) {
          sRow.style.cursor = "pointer";
          (function (l) {
            sRow.addEventListener("click", function (e) {
              LookerCharts.Utils.openDrillMenu({ links: l, event: e });
            });
          })(sItem.links);
        }

        list.appendChild(sRow);
      }
      container.appendChild(list);
    }

    element.appendChild(container);
    doneRendering();
  }

});


// --------------------------------------------------
// Helpers
// --------------------------------------------------
function _formatNumber(val, fmt) {
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
