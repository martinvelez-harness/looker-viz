!function(t,n){"object"==typeof exports&&"object"==typeof module?module.exports=n():"function"==typeof define&&define.amd?define([],n):"object"==typeof exports?exports.coverage_donut=n():t.coverage_donut=n()}(window,(function(){

  var visObject = {

    id: "coverage_donut",
    label: "Coverage Donut",

    options: {
      color_filled:     { type: "string",  label: "Fill Color",             default: "#F97316", display: "color", section: "Donut",     order: 1 },
      color_empty:      { type: "string",  label: "Empty Color",            default: "#E5E7EB", display: "color", section: "Donut",     order: 2 },
      donut_thickness:  { type: "number",  label: "Donut Thickness (px)",   default: 20,                         section: "Donut",     order: 3 },
      subtitle_text:    { type: "string",  label: "Subtitle Text",          default: "Covered",                  section: "Labels",    order: 1 },
      font_size_value:  { type: "number",  label: "Value Font Size (px)",   default: 32,                         section: "Labels",    order: 2 },
      font_size_subtitle:{ type: "number", label: "Subtitle Font Size (px)",default: 13,                         section: "Labels",    order: 3 },
      threshold_good:   { type: "number",  label: "Good Threshold >= (%)",  default: 80,                         section: "Status",    order: 1 },
      threshold_fair:   { type: "number",  label: "Fair Threshold >= (%)",  default: 60,                         section: "Status",    order: 2 },
      label_good:       { type: "string",  label: "Good Label",             default: "Good",                     section: "Status",    order: 3 },
      label_fair:       { type: "string",  label: "Fair Label",             default: "Fair",                     section: "Status",    order: 4 },
      label_poor:       { type: "string",  label: "Poor Label",             default: "Poor",                     section: "Status",    order: 5 },
      color_good:       { type: "string",  label: "Good Color",             default: "#22C55E", display: "color", section: "Status",   order: 6 },
      color_fair:       { type: "string",  label: "Fair Color",             default: "#F59E0B", display: "color", section: "Status",   order: 7 },
      color_poor:       { type: "string",  label: "Poor Color",             default: "#EF4444", display: "color", section: "Status",   order: 8 },
      show_variation:   { type: "boolean", label: "Show Variation",         default: true,                       section: "Variation", order: 1 },
      variation_label:  { type: "string",  label: "Variation Label",        default: "vs last period",           section: "Variation", order: 2 }
    },

    create: function(element, config) {
      element.innerHTML = "";
      element.style.fontFamily = "'Inter','Helvetica Neue',Arial,sans-serif";
      element.style.display = "flex";
      element.style.alignItems = "center";
      element.style.justifyContent = "center";
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.overflow = "hidden";
      element.style.background = "white";
    },

    updateAsync: function(data, element, config, queryResponse, details, doneRendering) {

      element.innerHTML = "";

      if (!data || data.length === 0) {
        element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">No data returned</p>';
        doneRendering();
        return;
      }

      var measures    = queryResponse.fields.measures            || [];
      var tablecalcs  = queryResponse.fields.table_calculations  || [];
      var allMeasures = measures.concat(tablecalcs);

      if (allMeasures.length < 1) {
        element.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;font-size:13px;">Add at least 1 measure to the query</p>';
        doneRendering();
        return;
      }

      var row            = data[0];
      var primaryField   = allMeasures[0];
      var variationField = allMeasures.length > 1 ? allMeasures[1] : null;

      var primaryRaw   = row[primaryField.name] ? row[primaryField.name]["value"] : 0;
      var primaryValue = parseFloat(String(primaryRaw).replace("%", "")) || 0;
      var pct = (primaryValue > 0 && primaryValue <= 1) ? primaryValue * 100 : primaryValue;
      pct = Math.min(Math.max(pct, 0), 100);

      var variationDelta = null;
      if (variationField && config.show_variation !== false) {
        var varRaw   = row[variationField.name] ? row[variationField.name]["value"] : null;
        var varValue = parseFloat(varRaw);
        if (!isNaN(varValue)) {
          var prevPct    = (varValue > 0 && varValue <= 1) ? varValue * 100 : varValue;
          variationDelta = pct - prevPct;
        }
      }

      var colorFilled = config.color_filled       || "#F97316";
      var colorEmpty  = config.color_empty        || "#E5E7EB";
      var thickness   = Number(config.donut_thickness)     || 20;
      var subtitle    = config.subtitle_text               || "Covered";
      var fzValue     = Number(config.font_size_value)     || 32;
      var fzSub       = Number(config.font_size_subtitle)  || 13;
      var threshGood  = Number(config.threshold_good)      || 80;
      var threshFair  = Number(config.threshold_fair)      || 60;
      var labelGood   = config.label_good   || "Good";
      var labelFair   = config.label_fair   || "Fair";
      var labelPoor   = config.label_poor   || "Poor";
      var colorGood   = config.color_good   || "#22C55E";
      var colorFair   = config.color_fair   || "#F59E0B";
      var colorPoor   = config.color_poor   || "#EF4444";
      var varLabel    = config.variation_label || "vs last period";

      var statusLabel, statusColor;
      if (pct >= threshGood)       { statusLabel = labelGood; statusColor = colorGood; }
      else if (pct >= threshFair)  { statusLabel = labelFair; statusColor = colorFair; }
      else                         { statusLabel = labelPoor; statusColor = colorPoor; }

      var elW     = element.offsetWidth  || (element.parentElement && element.parentElement.offsetWidth)  || 300;
      var elH     = element.offsetHeight || (element.parentElement && element.parentElement.offsetHeight) || 300;
      var svgSize = Math.max(Math.min(elW * 0.72, elH * 0.60), 100);
      var cx      = svgSize / 2;
      var cy      = svgSize / 2;
      var r       = (svgSize / 2) - (thickness / 2) - 4;
      var circum  = 2 * Math.PI * r;
      var filled  = (pct / 100) * circum;
      var gap     = circum - filled;

      var wrapper = document.createElement("div");
      wrapper.style.display        = "flex";
      wrapper.style.flexDirection  = "column";
      wrapper.style.alignItems     = "center";
      wrapper.style.justifyContent = "center";
      wrapper.style.gap            = "10px";
      wrapper.style.width          = "100%";
      wrapper.style.height         = "100%";

      var ns  = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(ns, "svg");
      svg.setAttribute("width",   svgSize);
      svg.setAttribute("height",  svgSize);
      svg.setAttribute("viewBox", "0 0 " + svgSize + " " + svgSize);

      var bg = document.createElementNS(ns, "circle");
      bg.setAttribute("cx", cx);  bg.setAttribute("cy", cy);  bg.setAttribute("r", r);
      bg.setAttribute("fill", "none");
      bg.setAttribute("stroke", colorEmpty);
      bg.setAttribute("stroke-width", thickness);
      svg.appendChild(bg);

      var arc = document.createElementNS(ns, "circle");
      arc.setAttribute("cx", cx); arc.setAttribute("cy", cy); arc.setAttribute("r", r);
      arc.setAttribute("fill", "none");
      arc.setAttribute("stroke", colorFilled);
      arc.setAttribute("stroke-width", thickness);
      arc.setAttribute("stroke-linecap", "round");
      arc.setAttribute("stroke-dasharray",  filled + " " + gap);
      arc.setAttribute("stroke-dashoffset", circum * 0.25);
      svg.appendChild(arc);

      var tVal = document.createElementNS(ns, "text");
      tVal.setAttribute("x", cx);  tVal.setAttribute("y", cy - 2);
      tVal.setAttribute("text-anchor", "middle");
      tVal.setAttribute("dominant-baseline", "middle");
      tVal.setAttribute("font-size", fzValue);
      tVal.setAttribute("font-weight", "700");
      tVal.setAttribute("fill", "#111827");
      tVal.setAttribute("font-family", "'Inter','Helvetica Neue',Arial,sans-serif");
      tVal.textContent = pct.toFixed(1) + "%";
      svg.appendChild(tVal);

      var tSub = document.createElementNS(ns, "text");
      tSub.setAttribute("x", cx);  tSub.setAttribute("y", cy + fzValue * 0.65);
      tSub.setAttribute("text-anchor", "middle");
      tSub.setAttribute("dominant-baseline", "middle");
      tSub.setAttribute("font-size", fzSub);
      tSub.setAttribute("fill", "#9CA3AF");
      tSub.setAttribute("font-family", "'Inter','Helvetica Neue',Arial,sans-serif");
      tSub.textContent = subtitle;
      svg.appendChild(tSub);

      wrapper.appendChild(svg);

      var badge = document.createElement("div");
      badge.style.display       = "inline-flex";
      badge.style.alignItems    = "center";
      badge.style.padding       = "3px 12px";
      badge.style.borderRadius  = "99px";
      badge.style.fontSize      = "11px";
      badge.style.fontWeight    = "600";
      badge.style.letterSpacing = "0.04em";
      badge.style.background    = statusColor + "1A";
      badge.style.color         = statusColor;
      badge.style.border        = "1px solid " + statusColor + "50";
      badge.textContent = "Status: " + statusLabel;
      wrapper.appendChild(badge);

      if (config.show_variation !== false && variationDelta !== null) {
        var isPos  = variationDelta >= 0;
        var varClr = isPos ? colorGood : colorPoor;
        var arrow  = isPos ? "\u2197" : "\u2198";
        var sign   = isPos ? "+" : "";

        var varRow = document.createElement("div");
        varRow.style.display     = "flex";
        varRow.style.alignItems  = "center";
        varRow.style.gap         = "4px";
        varRow.style.fontSize    = "12px";
        varRow.style.color       = "#6B7280";
        varRow.style.fontFamily  = "'Inter','Helvetica Neue',Arial,sans-serif";

        var varNum = document.createElement("span");
        varNum.style.color       = varClr;
        varNum.style.fontWeight  = "700";
        varNum.style.fontSize    = "13px";
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
  return visObject;

}));
