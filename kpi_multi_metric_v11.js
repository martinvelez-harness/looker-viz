/**
 * KPI Multi-Metric Card -- Looker Custom Visualization
 *
 * Displays multiple measures as a KPI card. One measure is the primary
 * (big number), the rest are secondary. Per-series config for order,
 * thresholds, bold, and divider lines -- generated dynamically from query.
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
    card_title: {
      type: "string",
      label: "Card Title",
      default: "",
      placeholder: "e.g. Unused Commitments",
      section: "General",
      order: 1
    },
    card_subtitle: {
      type: "string",
      label: "Subtitle (below primary)",
      default: "",
      placeholder: "e.g. Wasted commitment spend",
      section: "General",
      order: 2
    },
    primary_font_size: {
      type: "number",
      label: "Primary Font Size (px)",
      default: 48,
      section: "General",
      order: 3
    },
    secondary_font_size: {
      type: "number",
      label: "Secondary Font Size (px)",
      default: 16,
      section: "General",
      order: 4
    },
    secondary_label_size: {
      type: "number",
      label: "Secondary Label Size (px)",
      default: 14,
      section: "General",
      order: 5
    },
    secondary_label_color: {
      type: "string",
      label: "Secondary Label Color",
      default: "#6B7280",
      display: "color",
      section: "General",
      order: 6
    },
    font_family: {
      type: "string",
      label: "Font Family",
      default: "'Inter','Helvetica Neue',Arial,sans-serif",
      section: "General",
      order: 7
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
    this._registeredFields = null;
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

    // -- Dynamic options registration per series --
    var fieldKey = allMeasures.map(function (f) { return f.name; }).join("|");
    if (this._registeredFields !== fieldKey) {
      this._registeredFields = fieldKey;
      var dynOpts = buildBaseOptions();

      for (var oi = 0; oi < allMeasures.length; oi++) {
        var f = allMeasures[oi];
        var sLabel = f.label_short || f.label || f.name;
        var tag = sLabel;
        var sec = "Series";
        var prefix = "series_" + oi + "_";
        // Each series block of 20 order slots to keep them grouped
        var base = 100 + (oi * 20);

        // Header separator label
        dynOpts[prefix + "_header"] = {
          type: "string",
          label: "--- " + tag + " ---",
          default: "",
          section: sec,
          order: base
        };
        dynOpts[prefix + "role"] = {
          type: "string",
          label: tag + " | Role",
          display: "select",
          values: [
            { "Primary": "primary" },
            { "Secondary": "secondary" },
            { "Hidden": "hidden" }
          ],
          default: oi === 0 ? "primary" : "secondary",
          section: sec,
          order: base + 1
        };
        dynOpts[prefix + "order"] = {
          type: "number",
          label: tag + " | Display Order",
          default: oi + 1,
          section: sec,
          order: base + 2
        };
        dynOpts[prefix + "label"] = {
          type: "string",
          label: tag + " | Custom Label",
          default: "",
          placeholder: sLabel,
          section: sec,
          order: base + 3
        };
        dynOpts[prefix + "bold"] = {
          type: "string",
          label: tag + " | Font Weight",
          display: "select",
          values: [
            { "Bold": "bold" },
            { "Normal": "normal" }
          ],
          default: "bold",
          section: sec,
          order: base + 4
        };
        dynOpts[prefix + "value_format"] = {
          type: "string",
          label: tag + " | Value Format",
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
          section: sec,
          order: base + 5
        };
        dynOpts[prefix + "value_format_custom"] = {
          type: "string",
          label: tag + " | Custom Format",
          default: "",
          placeholder: "e.g. $#,##0.00",
          section: sec,
          order: base + 6
        };
        dynOpts[prefix + "color"] = {
          type: "string",
          label: tag + " | Value Color",
          default: "#111827",
          display: "color",
          section: sec,
          order: base + 7
        };
        dynOpts[prefix + "divider_after"] = {
          type: "string",
          label: tag + " | Divider After",
          display: "select",
          values: [
            { "No": "false" },
            { "Yes": "true" }
          ],
          default: oi === 0 ? "true" : "false",
          section: sec,
          order: base + 8
        };
        dynOpts[prefix + "use_threshold"] = {
          type: "string",
          label: tag + " | Threshold",
          display: "select",
          values: [
            { "Off": "false" },
            { "On": "true" }
          ],
          default: "false",
          section: sec,
          order: base + 9
        };
        dynOpts[prefix + "th_good"] = {
          type: "number",
          label: tag + " | Good >=",
          default: null,
          section: sec,
          order: base + 10
        };
        dynOpts[prefix + "th_warning"] = {
          type: "number",
          label: tag + " | Warning >=",
          default: null,
          section: sec,
          order: base + 11
        };
        dynOpts[prefix + "th_direction"] = {
          type: "string",
          label: tag + " | Direction",
          display: "select",
          values: [
            { "Higher is better": "asc" },
            { "Lower is better": "desc" }
          ],
          default: "asc",
          section: sec,
          order: base + 12
        };
        dynOpts[prefix + "th_color_good"] = {
          type: "string",
          label: tag + " | Good Color",
          default: "#22C55E",
          display: "color",
          section: sec,
          order: base + 13
        };
        dynOpts[prefix + "th_color_warning"] = {
          type: "string",
          label: tag + " | Warning Color",
          default: "#F59E0B",
          display: "color",
          section: sec,
          order: base + 14
        };
        dynOpts[prefix + "th_color_danger"] = {
          type: "string",
          label: tag + " | Danger Color",
          default: "#EF4444",
          display: "color",
          section: sec,
          order: base + 15
        };
      }

      this.trigger("registerOptions", dynOpts);
    }

    var row = data[0];

    // -- Config --
    var fontFamily     = config.font_family || "'Inter','Helvetica Neue',Arial,sans-serif";
    var cardTitle      = (config.card_title || "").trim();
    var cardSubtitle   = (config.card_subtitle || "").trim();
    var primaryFS      = Number(config.primary_font_size) || 48;
    var secondaryFS    = Number(config.secondary_font_size) || 16;
    var secLabelSize   = Number(config.secondary_label_size) || 14;
    var secLabelColor  = config.secondary_label_color || "#6B7280";

    // -- Build series array with per-series config --
    var series = [];
    for (var i = 0; i < allMeasures.length; i++) {
      var field = allMeasures[i];
      var cell = row[field.name];
      var val = cell ? Number(cell.value) || 0 : 0;
      var rendered = cell ? cell.rendered : null;
      var links = cell ? cell.links : null;
      var defLabel = field.label_short || field.label || field.name;
      var p = "series_" + i + "_";

      // Per-series config
      var role = config[p + "role"] || (i === 0 ? "primary" : "secondary");
      var order = config[p + "order"] != null ? Number(config[p + "order"]) : i + 1;
      var customLabel = (config[p + "label"] || "").trim();
      var bold = config[p + "bold"] || (i === 0 ? "bold" : "bold");
      var color = config[p + "color"] || "#111827";
      var divAfter = config[p + "divider_after"] === "true";
      var useTh = config[p + "use_threshold"] === "true";
      var thGood = config[p + "th_good"] != null ? Number(config[p + "th_good"]) : null;
      var thWarn = config[p + "th_warning"] != null ? Number(config[p + "th_warning"]) : null;
      var thDir = config[p + "th_direction"] || "asc";
      var thClrGood = config[p + "th_color_good"] || "#22C55E";
      var thClrWarn = config[p + "th_color_warning"] || "#F59E0B";
      var thClrDang = config[p + "th_color_danger"] || "#EF4444";

      // Per-series value format
      var vfSetting = config[p + "value_format"] || "auto";
      var vfCustom = (config[p + "value_format_custom"] || "").trim();

      // Resolve format
      var fmt = null;
      if (vfSetting === "custom" && vfCustom) {
        fmt = vfCustom;
      } else if (vfSetting !== "auto") {
        fmt = _resolveNamedFormat(vfSetting);
      } else {
        // Auto: detect from Looker field metadata or rendered value
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
      }

      series.push({
        label: customLabel || defLabel,
        value: val,
        rendered: vfSetting === "auto" ? rendered : null,
        links: links,
        format: fmt || "#,##0",
        role: role,
        order: order,
        bold: bold,
        color: color,
        dividerAfter: divAfter,
        useTh: useTh,
        thGood: thGood,
        thWarn: thWarn,
        thDir: thDir,
        thClrGood: thClrGood,
        thClrWarn: thClrWarn,
        thClrDang: thClrDang
      });
    }

    // Sort by order
    series.sort(function (a, b) { return a.order - b.order; });

    // -- Threshold color per series --
    function seriesColor(s) {
      if (!s.useTh) return s.color;
      if (s.thGood == null && s.thWarn == null) return s.color;
      if (s.thDir === "asc") {
        if (s.thGood != null && s.value >= s.thGood) return s.thClrGood;
        if (s.thWarn != null && s.value >= s.thWarn) return s.thClrWarn;
        return s.thClrDang;
      } else {
        if (s.thGood != null && s.value <= s.thGood) return s.thClrGood;
        if (s.thWarn != null && s.value <= s.thWarn) return s.thClrWarn;
        return s.thClrDang;
      }
    }

    function fmtVal(s) {
      if (s.rendered) return s.rendered;
      return _formatNumber(s.value, s.format);
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

    // -- Render series --
    for (var si = 0; si < series.length; si++) {
      var s = series[si];
      if (s.role === "hidden") continue;

      if (s.role === "primary") {
        // Primary: big number
        var pEl = document.createElement("div");
        pEl.style.fontSize = primaryFS + "px";
        pEl.style.fontWeight = s.bold === "normal" ? "400" : "800";
        pEl.style.lineHeight = "1.1";
        pEl.style.color = seriesColor(s);
        pEl.textContent = fmtVal(s);
        container.appendChild(pEl);

        // Drill
        if (s.links && s.links.length > 0) {
          pEl.style.cursor = "pointer";
          (function (l) {
            pEl.addEventListener("click", function (e) {
              LookerCharts.Utils.openDrillMenu({ links: l, event: e });
            });
          })(s.links);
        }

        // Subtitle after primary
        if (cardSubtitle && si === 0) {
          var subEl = document.createElement("div");
          subEl.style.fontSize = "14px";
          subEl.style.color = "#9CA3AF";
          subEl.style.marginTop = "4px";
          subEl.textContent = cardSubtitle;
          container.appendChild(subEl);
        }

      } else {
        // Secondary: label-value row
        var sRow = document.createElement("div");
        sRow.style.display = "flex";
        sRow.style.justifyContent = "space-between";
        sRow.style.alignItems = "center";
        sRow.style.padding = "6px 0";

        var sLabel = document.createElement("div");
        sLabel.style.fontSize = secLabelSize + "px";
        sLabel.style.color = secLabelColor;
        sLabel.style.fontWeight = "500";
        sLabel.textContent = s.label;
        sRow.appendChild(sLabel);

        var sValue = document.createElement("div");
        sValue.style.fontSize = secondaryFS + "px";
        sValue.style.fontWeight = s.bold === "normal" ? "400" : "700";
        sValue.style.color = seriesColor(s);
        sValue.textContent = fmtVal(s);
        sRow.appendChild(sValue);

        // Drill
        if (s.links && s.links.length > 0) {
          sRow.style.cursor = "pointer";
          (function (l) {
            sRow.addEventListener("click", function (e) {
              LookerCharts.Utils.openDrillMenu({ links: l, event: e });
            });
          })(s.links);
        }

        container.appendChild(sRow);
      }

      // Divider after this series
      if (s.dividerAfter) {
        var div = document.createElement("div");
        div.style.height = "1px";
        div.style.background = "#E5E7EB";
        div.style.margin = "12px 0";
        container.appendChild(div);
      }
    }

    element.appendChild(container);
    doneRendering();
  }

});


// --------------------------------------------------
// Base options builder (static options only)
// --------------------------------------------------
function buildBaseOptions() {
  return {
    card_title: {
      type: "string",
      label: "Card Title",
      default: "",
      placeholder: "e.g. Unused Commitments",
      section: "General",
      order: 1
    },
    card_subtitle: {
      type: "string",
      label: "Subtitle (below primary)",
      default: "",
      placeholder: "e.g. Wasted commitment spend",
      section: "General",
      order: 2
    },
    primary_font_size: {
      type: "number",
      label: "Primary Font Size (px)",
      default: 48,
      section: "General",
      order: 3
    },
    secondary_font_size: {
      type: "number",
      label: "Secondary Font Size (px)",
      default: 16,
      section: "General",
      order: 4
    },
    secondary_label_size: {
      type: "number",
      label: "Secondary Label Size (px)",
      default: 14,
      section: "General",
      order: 5
    },
    secondary_label_color: {
      type: "string",
      label: "Secondary Label Color",
      default: "#6B7280",
      display: "color",
      section: "General",
      order: 6
    },
    font_family: {
      type: "string",
      label: "Font Family",
      default: "'Inter','Helvetica Neue',Arial,sans-serif",
      section: "General",
      order: 7
    }
  };
}


// --------------------------------------------------
// Named format resolver (Looker defaults)
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

// --------------------------------------------------
// Format helper
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
