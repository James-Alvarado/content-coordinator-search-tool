(function () {
  "use strict";

  function smoothPath(points) {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    return points.reduce(function (path, point, index) {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      const beforePrevious = points[index - 2] || previous;
      const next = points[index + 1] || point;
      const controlOneX = previous.x + (point.x - beforePrevious.x) / 6;
      const controlOneY = previous.y + (point.y - beforePrevious.y) / 6;
      const controlTwoX = point.x - (next.x - previous.x) / 6;
      const controlTwoY = point.y - (next.y - previous.y) / 6;
      return `${path} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${point.x} ${point.y}`;
    }, "");
  }

  function tooltipElement() {
    let tooltip = document.querySelector("#chart-tooltip");
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.id = "chart-tooltip";
    tooltip.className = "chart-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.append(tooltip);
    return tooltip;
  }

  function positionTooltip(tooltip, x, y) {
    tooltip.style.left = `${x + 12}px`;
    tooltip.style.top = `${y + 12}px`;
  }

  function addTooltip(target, text) {
    target.setAttribute("tabindex", "0");
    target.setAttribute("aria-label", text);
    target.addEventListener("pointerenter", function (event) {
      const tooltip = tooltipElement();
      tooltip.textContent = text;
      tooltip.hidden = false;
      positionTooltip(tooltip, event.clientX, event.clientY);
    });
    target.addEventListener("pointermove", function (event) {
      const tooltip = tooltipElement();
      if (!tooltip.hidden) positionTooltip(tooltip, event.clientX, event.clientY);
    });
    target.addEventListener("pointerleave", function () {
      tooltipElement().hidden = true;
    });
    target.addEventListener("focus", function () {
      const tooltip = tooltipElement();
      const bounds = target.getBoundingClientRect();
      tooltip.textContent = text;
      tooltip.hidden = false;
      positionTooltip(tooltip, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    });
    target.addEventListener("blur", function () {
      tooltipElement().hidden = true;
    });
  }

  function bindDonutCenter(target, centerValue, centerLabel, total, item) {
    function showCategory() {
      centerValue.textContent = item.count;
      centerLabel.textContent = item.label;
    }
    function showTotal() {
      centerValue.textContent = total;
      centerLabel.textContent = "titles";
    }
    target.addEventListener("pointerenter", showCategory);
    target.addEventListener("pointerleave", showTotal);
    target.addEventListener("focus", showCategory);
    target.addEventListener("blur", showTotal);
  }

  function barTooltip(label, count, percentage, description) {
    const percentageLabel = percentage === null || percentage === undefined ? "Not available" : `${percentage.toFixed(1)}%`;
    return `${label}\nCount: ${count}\nPercentage: ${percentageLabel}\n${description}`;
  }

  function trendTooltip(date, value, percentageChange) {
    const changeLine = percentageChange === null || percentageChange === undefined
      ? ""
      : `\nChange: ${percentageChange > 0 ? "+" : ""}${percentageChange.toFixed(1)}%`;
    return `Date: ${date}\nValue: ${value}${changeLine}`;
  }

  function createInsightCard(eyebrow, value, metric, detail) {
    const card = document.createElement("aside");
    card.className = "chart-insight-card";
    const label = document.createElement("span");
    label.textContent = eyebrow;
    const primary = document.createElement("strong");
    primary.textContent = value;
    const summary = document.createElement("b");
    summary.textContent = metric;
    const context = document.createElement("small");
    context.textContent = detail;
    card.append(label, primary, summary, context);
    return card;
  }

  function createAnnotations(items) {
    const annotations = document.createElement("aside");
    annotations.className = "chart-annotations";
    annotations.setAttribute("aria-label", "Chart annotations");
    items.filter(function (item) { return item && item.value !== null && item.value !== undefined; }).forEach(function (item) {
      const annotation = document.createElement("span");
      const label = document.createElement("b");
      label.textContent = item.label;
      const value = document.createElement("small");
      value.textContent = item.value;
      annotation.append(label, value);
      annotations.append(annotation);
    });
    return annotations;
  }

  window.CatalogLensChartPresentation = Object.freeze({ addTooltip, barTooltip, bindDonutCenter, createAnnotations, createInsightCard, smoothPath, trendTooltip });
}());
