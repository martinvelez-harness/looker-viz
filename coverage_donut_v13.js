/**
 * Coverage Donut -- Looker Custom Visualization
 * Developed by Martin Velez
 *
 * Renders a donut chart showing a coverage percentage with status badge
 * and optional period-over-period variation.
 *
 * Query: 1 measure (coverage rate). Optional 2nd measure (previous period for variation).
 * Optional dimension: if present, renders up to 3 filter buttons to switch between values.
 *
 * manifest.lkml:
 *   visualization: {
 *     id: "coverage_donut"
 *     label: "Coverage Donut"
 *     file: "visualizations/coverage_donut.js"
 *   }
 */

looker.plugins.visualizations.add({

  id: "single_value_donut",
  label: "Single Value Donut",

  options: {
    color_filled: {
      type: "string",
      label: "Fill Color",
      default: "#F97316",
      display: "color",
      section: "Donut",
      order: 1
    },
    color_empty: {
      type: "string",
      label: "Empty Color",
      default: "#E5E7EB",
      display: "color",
      section: "Donut",
      order: 2
    },
    donut_thickness: {
      type: "number",
      label: "Donut Thickness (px)",
      default: 20,
      section: "Donut",
      order: 3
    },
    subtitle_text: {
      type: "string",
      label: "Subtitle Text",
      default: "Covered",
      section: "Labels",
      order: 1
    },
    font_size_value: {
      type: "number",
      label: "Value Font Size (px)",
      default: 32,
      section: "Labels",
      order: 2
    },
    font_size_subtitle: {
      type: "number",
      label: "Subtitle Font Size (px)",
      default: 13,
      section: "Labels",
      order: 3
    },
    text_gap: {
      type: "number",
      label: "Text Gap (px)",
      default: 4,
      section: "Labels",
      order: 4
    },
    threshold_good: {
      type: "number",
      label: "Good Threshold >= (%)",
      default: 80,
      section: "Status",
      order: 1
    },
    threshold_fair: {
      type: "number",
      label: "Fair Threshold >= (%)",
      default: 60,
      section: "Status",
      order: 2
    },
    label_good: {
      type: "string",
      label: "Good Label",
      default: "Good",
      section: "Status",
      order: 3
    },
    label_fair: {
      type: "string",
      label: "Fair Label",
      default: "Fair",
      section: "Status",
      order: 4
    },
    label_poor: {
      type: "string",
      label: "Poor Label",
      default: "Poor",
      section: "Status",
      order: 5
    },
    color_good: {
      type: "string",
      label: "Good Color",
      default: "#22C55E",
      display: "color",
      section: "Status",
      order: 6
    },
    color_fair: {
      type: "string",
      label: "Fair Color",
      default: "#F59E0B",
      display: "color",
      section: "Status",
      order: 7
    },
    color_poor: {
      type: "string",
      label: "Poor Color",
      default: "#EF4444",
      display: "color",
      section: "Status",
      order: 8
    },
    show_variation: {
      type: "string",
      label: "Show Variation",
      display: "select",
      values: [
        { "Yes": "true" },
        { "No": "false" }
      ],
      default: "true",
      section: "Variation",
      order: 1
    },
    variation_label: {
      type: "string",
      label: "Variation Label",
      default: "vs last period",
      section: "Variation",
      order: 2
    },
    // ── Filter Buttons (shown when a dimension is added to the query) ──
    filter_label_1: {
      type: "string",
      label: "Button 1 Label",
      default: "",
      placeholder: "Uses dimension value if empty",
      section: "Filter Buttons",
      order: 1
    },
    filter_label_2: {
      type: "string",
      label: "Button 2 Label",
      default: "",
      placeholder: "Uses dimension value if empty",
      section: "Filter Buttons",
      order: 2
    },
    filter_label_3: {
      type: "string",
      label: "Button 3 Label",
      default: "",
      placeholder: "Uses dimension value if empty",
      section: "Filter Buttons",
      order: 3
    }
  },

  // ──────────────────────────────────────────────
  // CREATE — initialize persistent state
  // ──────────────────────────────────────────────
  create: function (element, config) {
    // Persist selected filter button index across re-renders
    this._selectedDimIndex = 0;

    element.innerHTML = "";
    element.style.fontFamily = "'Inter','Helvetica Neue',Arial,sans-serif";
    element.style.display = "flex";
    element.style.alignItems = "center";
    element.style.justifyContent = "center";
    element.style.width = "100%";
    element.style.height = "100%";
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
    var self = this;

    // Clear previous render
    element.innerHTML = "";
    element.style.overflow = "hidden";
    element.style.padding = "0";
    element.style.margin = "0";

    // Walk up the DOM and force overflow hidden on all ancestors within the iframe
    var parent = element.parentElement;
    while (parent && parent !== document.body) {
      parent.style.overflow = "hidden";
      parent.style.padding = "0";
      parent = parent.parentElement;
    }

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

    // ── Gather all measure-like fields ──
    var allMeasures = [];
    if (queryResponse.fields.measure_like && queryResponse.fields.measure_like.length > 0) {
      allMeasures = queryResponse.fields.measure_like;
    } else {
      var measures = queryResponse.fields.measures || [];
      var tablecalcs = queryResponse.fields.table_calculations || [];
      allMeasures = measures.concat(tablecalcs);
    }

    if (allMeasures.length === 0) {
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

    // ── Dimension filter logic ──
    // If a dimension is present, extract up to 3 unique values and show filter buttons.
    var dims = queryResponse.fields.dimensions || [];
    var hasDims = dims.length > 0 && data.length > 1;
    var activeDim = hasDims ? dims[0] : null;

    // Build list of up to 3 unique rows keyed by first dimension value
    var filteredRows = [];
    var dimValues = [];
    if (hasDims) {
      var seen = {};
      for (var i = 0; i < data.length && filteredRows.length < 3; i++) {
        var cell = data[i][activeDim.name];
        var key = cell ? String(cell.value) : "";
        if (!seen[key]) {
          seen[key] = true;
          filteredRows.push(data[i]);
          dimValues.push(cell ? cell.value : "");
        }
      }
    } else {
      filteredRows = [data[0]];
    }

    // Clamp selected index in case data changes
    if (this._selectedDimIndex >= filteredRows.length) {
      this._selectedDimIndex = 0;
    }

    var row = filteredRows[this._selectedDimIndex];

    // ── Extract measure values from selected row ──
    var primaryField = allMeasures[0];
    var primaryCell = row[primaryField.name];

    if (!primaryCell) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">No data for field: ' + primaryField.name + '</p>';
      doneRendering();
      return;
    }

    var primaryRaw = primaryCell.value;
    var primaryValue = parseFloat(String(primaryRaw).replace("%", "")) || 0;

    // Auto-detect ratio (0-1) vs percentage (0-100)
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
    var textGap     = config.text_gap != null ? Number(config.text_gap) : 4;
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

    var filterLabels = [
      config.filter_label_1 || "",
      config.filter_label_2 || "",
      config.filter_label_3 || ""
    ];

    // Status
    var statusLabel, statusColor;
    if (pct >= threshGood) {
      statusLabel = labelGood; statusColor = colorGood;
    } else if (pct >= threshFair) {
      statusLabel = labelFair; statusColor = colorFair;
    } else {
      statusLabel = labelPoor; statusColor = colorPoor;
    }

    // ── Sizing ──
    var rect = element.getBoundingClientRect();
    var elW = rect.width || element.clientWidth || window.innerWidth || 300;
    var elH = rect.height || element.clientHeight || window.innerHeight || 300;

    // Reserve space for filter buttons row if present
    var buttonsSpace = hasDims ? 34 : 0;
    var badgeSpace = 30;
    if (showVariation && variationDelta !== null) badgeSpace += 22;
    var availH = elH - badgeSpace - buttonsSpace;

    var svgSize = Math.max(Math.min(elW * 0.75, availH * 0.80), 80);
    var cx = svgSize / 2;
    var cy = svgSize / 2;
    var r = (svgSize / 2) - (thickness / 2) - 4;
    if (r < 20) r = 20;
    var circum = 2 * Math.PI * r;
    var filled = (pct / 100) * circum;
    var gap = circum - filled;

    // ── Build wrapper ──
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
    wrapper.style.maxWidth = "calc(100% - 4px)";
    wrapper.style.maxHeight = "100%";
    wrapper.style.boxSizing = "border-box";

    // ── Filter buttons row (only when dimension is present) ──
    if (hasDims) {
      var buttonsRow = document.createElement("div");
      buttonsRow.style.display = "flex";
      buttonsRow.style.gap = "6px";
      buttonsRow.style.justifyContent = "center";
      buttonsRow.style.flexWrap = "wrap";
      buttonsRow.style.flexShrink = "0";

      dimValues.forEach(function (val, idx) {
        var btnLabel = filterLabels[idx] || String(val);

        var btn = document.createElement("button");
        btn.textContent = btnLabel;
        btn.style.padding = "3px 14px";
        btn.style.borderRadius = "99px";
        btn.style.fontSize = "11px";
        btn.style.fontWeight = "600";
        btn.style.cursor = "pointer";
        btn.style.border = "1.5px solid";
        btn.style.outline = "none";
        btn.style.transition = "all 0.15s ease";
        btn.style.fontFamily = "'Inter','Helvetica Neue',Arial,sans-serif";
        btn.style.letterSpacing = "0.03em";

        if (idx === self._selectedDimIndex) {
          btn.style.background = colorFilled;
          btn.style.color = "white";
          btn.style.borderColor = colorFilled;
        } else {
          btn.style.background = "white";
          btn.style.color = "#6B7280";
          btn.style.borderColor = "#D1D5DB";
        }

        btn.addEventListener("mouseenter", function () {
          if (idx !== self._selectedDimIndex) {
            btn.style.borderColor = colorFilled;
            btn.style.color = colorFilled;
          }
        });
        btn.addEventListener("mouseleave", function () {
          if (idx !== self._selectedDimIndex) {
            btn.style.borderColor = "#D1D5DB";
            btn.style.color = "#6B7280";
          }
        });

        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          self._selectedDimIndex = idx;
          self.updateAsync(data, element, config, queryResponse, details, function () {});
        });

        buttonsRow.appendChild(btn);
      });

      wrapper.appendChild(buttonsRow);
    }

    // ── SVG Donut ──
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
      arc.setAttribute("stroke-dashoffset", String(circum * 0.25));
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
    tSub.setAttribute("y", cy + fzValue * 0.5 + textGap);
    tSub.setAttribute("text-anchor", "middle");
    tSub.setAttribute("dominant-baseline", "hanging");
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
  }

});
