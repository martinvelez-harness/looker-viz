/**
 * Coverage Donut - Looker Custom Visualization
 *
 * API Reference:    https://github.com/looker/custom_visualizations_v2/blob/master/docs/api_reference.md
 * Example Viz:      https://github.com/looker/custom_visualizations_v2/tree/master/src/examples
 * CVB Tool:         https://looker-open-source.github.io/custom-viz-builder/
 *
 * ─── FIELDS EXPECTED ────────────────────────────────────────────────────────
 *  • 1st measure : main percentage  (e.g. coverage_rate)  — value 0–1 or 0–100
 *  • 2nd measure : previous period  (optional)            — same scale as 1st
 *    The variation badge shows (current − previous).
 * ────────────────────────────────────────────────────────────────────────────
 **/

const visObject = {

  // ── Options (appear in the Looker vis editor panel) ───────────────────────
  options: {

    /* DONUT */
    color_filled: {
      type: "string", label: "Fill Color",
      default: "#F97316", display: "color",
      section: "Donut", order: 1
    },
    color_empty: {
      type: "string", label: "Empty Color",
      default: "#E5E7EB", display: "color",
      section: "Donut", order: 2
    },
    donut_thickness: {
      type: "number", label: "Donut Thickness (px)",
      default: 20,
      section: "Donut", order: 3
    },

    /* LABELS */
    subtitle_text: {
      type: "string", label: "Subtitle Text",
      default: "Covered",
      section: "Labels", order: 1
    },
    font_size_value: {
      type: "number", label: "Value Font Size (px)",
      default: 32,
      section: "Labels", order: 2
    },
    font_size_subtitle: {
      type: "number", label: "Subtitle Font Size (px)",
      default: 13,
      section: "Labels", order: 3
    },

    /* STATUS */
    threshold_good: {
      type: "number", label: "Good Threshold >= (%)",
      default: 80,
      section: "Status", order: 1
    },
    threshold_fair: {
      type: "number", label: "Fair Threshold >= (%)",
      default: 60,
      section: "Status", order: 2
    },
    label_good:  { type: "string", label: "Good Label",  default: "Good",  section: "Status", order: 3 },
    label_fair:  { type: "string", label: "Fair Label",  default: "Fair",  section: "Status", order: 4 },
    label_poor:  { type: "string", label: "Poor Label",  default: "Poor",  section: "Status", order: 5 },
    color_good:  { type: "string", label: "Good Color",  default: "#22C55E", display: "color", section: "Status", order: 6 },
    color_fair:  { type: "string", label: "Fair Color",  default: "#F59E0B", display: "color", section: "Status", order: 7 },
    color_poor:  { type: "string", label: "Poor Color",  default: "#EF4444", display: "color", section: "Status", order: 8 },

    /* VARIATION */
    show_variation: {
      type: "boolean", label: "Show Variation",
      default: true,
      section: "Variation", order: 1
    },
    variation_label: {
      type: "string", label: "Variation Label",
      default: "vs last period",
      section: "Variation", order: 2
    }
  },

  // ── Create: runs once when tile is mounted ────────────────────────────────
  create: function(element, config) {
    element.innerHTML = "";
    element.style.cssText = [
      "font-family:'Inter','Helvetica Neue',Arial,sans-serif",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "width:100%",
      "height:100%",
      "overflow:hidden"
    ].join(";");
  },

  // ── UpdateAsync: runs every time data or config changes ───────────────────
  updateAsync: function(data, element, config, queryResponse, details, doneRendering) {

    // Clear previous render
    element.innerHTML = "";

    // ── Validate ─────────────────────────────────────────────────────────────
    if (!data || data.length === 0) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">No data returned</p>';
      doneRendering();
      return;
    }

    var measures   = queryResponse.fields.measures;
    var tablecalcs = queryResponse.fields.table_calculations;
    var allMeasures = measures.concat(tablecalcs);

    if (allMeasures.length < 1) {
      element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add at least 1 measure to the query</p>';
      doneRendering();
      return;
    }

    // ── Extract field values ──────────────────────────────────────────────────
    var row            = data[0];
    var primaryField   = allMeasures[0];
    var variationField = allMeasures.length > 1 ? allMeasures[1] : null;

    // Access pattern: row["view.field_name"]["value"]  — same as example bar chart
    var primaryRaw   = row[primaryField.name] ? row[primaryField.name]["value"] : 0;
    var primaryValue = parseFloat(primaryRaw) || 0;

    // Normalize: treat 0–1 as fraction, otherwise direct percent
    var pct = (primaryValue > 0 && primaryValue <= 1) ? primaryValue * 100 : primaryValue;
    pct = Math.min(Math.max(pct, 0), 100); // clamp 0–100

    var variationDelta = null;
    if (variationField && config.show_variation !== false) {
      var varRaw   = row[variationField.name] ? row[variationField.name]["value"] : null;
      var varValue = parseFloat(varRaw);
      if (!isNaN(varValue)) {
        var prevPct      = (varValue > 0 && varValue <= 1) ? varValue * 100 : varValue;
        variationDelta   = pct - prevPct;
      }
    }

    // ── Read config with fallbacks ────────────────────────────────────────────
    var colorFilled  = config.color_filled    || "#F97316";
    var colorEmpty   = config.color_empty     || "#E5E7EB";
    var thickness    = Number(config.donut_thickness)    || 20;
    var subtitle     = config.subtitle_text              || "Covered";
    var fzValue      = Number(config.font_size_value)    || 32;
    var fzSub        = Number(config.font_size_subtitle) || 13;
    var threshGood   = Number(config.threshold_good)     || 80;
    var threshFair   = Number(config.threshold_fair)     || 60;
    var labelGood    = config.label_good  || "Good";
    var labelFair    = config.label_fair  || "Fair";
    var labelPoor    = config.label_poor  || "Poor";
    var colorGood    = config.color_good  || "#22C55E";
    var colorFair    = config.color_fair  || "#F59E0B";
    var colorPoor    = config.color_poor  || "#EF4444";
    var varLabel     = config.variation_label || "vs last period";

    // ── Status threshold ──────────────────────────────────────────────────────
    var statusLabel, statusColor;
    if (pct >= threshGood)      { statusLabel = labelGood; statusColor = colorGood; }
    else if (pct >= threshFair) { statusLabel = labelFair; statusColor = colorFair; }
    else                        { statusLabel = labelPoor; statusColor = colorPoor; }

    // ── Sizing ────────────────────────────────────────────────────────────────
    var elW     = element.offsetWidth  || 260;
    var elH     = element.offsetHeight || 260;
    var svgSize = Math.min(elW * 0.72, elH * 0.60, 210);
    var cx      = svgSize / 2;
    var cy      = svgSize / 2;
    var r       = (svgSize / 2) - (thickness / 2) - 4;
    var circum  = 2 * Math.PI * r;
    var filled  = (pct / 100) * circum;
    var gap     = circum - filled;

    // ── Build wrapper div ─────────────────────────────────────────────────────
    var wrapper = document.createElement("div");
    wrapper.style.cssText = [
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:center",
      "gap:10px",
      "width:100%",
      "height:100%"
    ].join(";");

    // ── SVG ───────────────────────────────────────────────────────────────────
    var ns  = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width",   svgSize);
    svg.setAttribute("height",  svgSize);
    svg.setAttribute("viewBox", "0 0 " + svgSize + " " + svgSize);

    // Background ring
    var bg = document.createElementNS(ns, "circle");
    bg.setAttribute("cx", cx); bg.setAttribute("cy", cy); bg.setAttribute("r", r);
    bg.setAttribute("fill", "none");
    bg.setAttribute("stroke", colorEmpty);
    bg.setAttribute("stroke-width", thickness);
    svg.appendChild(bg);

    // Filled arc — stroke-dashoffset = circum*0.25 rotates start to 12 o'clock
    var arc = document.createElementNS(ns, "circle");
    arc.setAttribute("cx", cx); arc.setAttribute("cy", cy); arc.setAttribute("r", r);
    arc.setAttribute("fill", "none");
    arc.setAttribute("stroke", colorFilled);
    arc.setAttribute("stroke-width", thickness);
    arc.setAttribute("stroke-linecap", "round");
    arc.setAttribute("stroke-dasharray",  filled + " " + gap);
    arc.setAttribute("stroke-dashoffset", circum * 0.25);
    svg.appendChild(arc);

    // Percentage text (center)
    var tVal = document.createElementNS(ns, "text");
    tVal.setAttribute("x", cx); tVal.setAttribute("y", cy - 2);
    tVal.setAttribute("text-anchor", "middle");
    tVal.setAttribute("dominant-baseline", "middle");
    tVal.setAttribute("font-size", fzValue);
    tVal.setAttribute("font-weight", "700");
    tVal.setAttribute("fill", "#111827");
    tVal.setAttribute("font-family", "'Inter','Helvetica Neue',Arial,sans-serif");
    tVal.textContent = pct.toFixed(1) + "%";
    svg.appendChild(tVal);

    // Subtitle text (below percentage)
    var tSub = document.createElementNS(ns, "text");
    tSub.setAttribute("x", cx); tSub.setAttribute("y", cy + fzValue * 0.65);
    tSub.setAttribute("text-anchor", "middle");
    tSub.setAttribute("dominant-baseline", "middle");
    tSub.setAttribute("font-size", fzSub);
    tSub.setAttribute("fill", "#9CA3AF");
    tSub.setAttribute("font-family", "'Inter','Helvetica Neue',Arial,sans-serif");
    tSub.textContent = subtitle;
    svg.appendChild(tSub);

    wrapper.appendChild(svg);

    // ── Status Badge ──────────────────────────────────────────────────────────
    var badge = document.createElement("div");
    badge.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "padding:3px 12px",
      "border-radius:99px",
      "font-size:11px",
      "font-weight:600",
      "letter-spacing:0.04em",
      "background:" + statusColor + "1A",
      "color:" + statusColor,
      "border:1px solid " + statusColor + "50"
    ].join(";");
    badge.textContent = "Status: " + statusLabel;
    wrapper.appendChild(badge);

    // ── Variation Row ─────────────────────────────────────────────────────────
    if (config.show_variation !== false && variationDelta !== null) {
      var isPos  = variationDelta >= 0;
      var varClr = isPos ? colorGood : colorPoor;
      var arrow  = isPos ? "\u2197" : "\u2198";  // ↗ ↘
      var sign   = isPos ? "+" : "";

      var varRow = document.createElement("div");
      varRow.style.cssText = [
        "display:flex",
        "align-items:center",
        "gap:4px",
        "font-size:12px",
        "color:#6B7280",
        "font-family:'Inter','Helvetica Neue',Arial,sans-serif"
      ].join(";");

      var varNum = document.createElement("span");
      varNum.style.cssText = "color:" + varClr + ";font-weight:700;font-size:13px;";
      varNum.textContent = arrow + " " + sign + Math.abs(variationDelta).toFixed(1) + "%";

      var varLbl = document.createElement("span");
      varLbl.textContent = varLabel;

      varRow.appendChild(varNum);
      varRow.appendChild(varLbl);
      wrapper.appendChild(varRow);
    }

    element.appendChild(wrapper);
    doneRendering();
  }
};

looker.plugins.visualizations.add(visObject);
