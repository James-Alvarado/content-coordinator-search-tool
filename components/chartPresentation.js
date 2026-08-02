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

  window.CatalogLensChartPresentation = Object.freeze({ addTooltip, bindDonutCenter, smoothPath });
}());
