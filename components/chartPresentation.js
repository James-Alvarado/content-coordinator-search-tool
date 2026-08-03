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
    const gap = 14;
    const width = tooltip.offsetWidth || 220;
    const height = tooltip.offsetHeight || 120;
    const viewportWidth = window.innerWidth || 1024;
    const viewportHeight = window.innerHeight || 768;
    const left = x + gap + width > viewportWidth ? x - width - gap : x + gap;
    const top = y + gap + height > viewportHeight ? y - height - gap : y + gap;
    tooltip.style.left = `${Math.max(8, Math.min(left, viewportWidth - width - 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(top, viewportHeight - height - 8))}px`;
  }

  function renderTooltip(tooltip, content) {
    tooltip.replaceChildren();
    if (typeof content === "string") {
      const fallback = document.createElement("span");
      fallback.textContent = content;
      tooltip.append(fallback);
      return;
    }
    const title = document.createElement("strong");
    title.className = "chart-tooltip-title";
    title.textContent = content.title;
    const details = document.createElement("dl");
    details.className = "chart-tooltip-details";
    content.rows.forEach(function (row) {
      if (row.value === null || row.value === undefined || row.value === "") return;
      const label = document.createElement("dt");
      label.textContent = row.label;
      const value = document.createElement("dd");
      value.textContent = row.value;
      details.append(label, value);
    });
    tooltip.append(title, details);
  }

  function addTooltip(target, content) {
    const accessibleText = typeof content === "string"
      ? content
      : `${content.title}. ${content.rows.filter(function (row) {
          return row.value !== null && row.value !== undefined && row.value !== "";
        }).map(function (row) { return `${row.label}: ${row.value}`; }).join(". ")}`;
    target.setAttribute("tabindex", "0");
    target.setAttribute("aria-label", accessibleText);
    target.addEventListener("pointerenter", function (event) {
      const tooltip = tooltipElement();
      renderTooltip(tooltip, content);
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
      renderTooltip(tooltip, content);
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

  function barTooltip(label, count, percentage, description, comparison) {
    const percentageLabel = percentage === null || percentage === undefined ? "Not available" : `${percentage.toFixed(1)}%`;
    return {
      title: label,
      rows: [
        { label: "Category", value: label },
        { label: "Count", value: count },
        { label: "Percentage", value: percentageLabel },
        { label: "Comparison", value: comparison },
        { label: "Context", value: description }
      ]
    };
  }

  function trendTooltip(date, value, percentageChange) {
    const change = percentageChange === null || percentageChange === undefined
      ? null
      : `${percentageChange > 0 ? "+" : ""}${percentageChange.toFixed(1)}%`;
    return {
      title: date,
      rows: [
        { label: "Category", value: "Date" },
        { label: "Count", value },
        { label: "Percentage", value: change || "Not available" },
        { label: "Comparison", value: change ? "Previous month" : null }
      ]
    };
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
