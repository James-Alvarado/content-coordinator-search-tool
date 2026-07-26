const catalogFileInput = document.querySelector("#catalog-file");
const catalogFileLabel = document.querySelector("label[for='catalog-file']");
const sampleDataButton = document.querySelector("#sample-data-button");
const uploadFeedback = document.querySelector("#upload-feedback");
const filtersSection = document.querySelector("#filters-section");
const filtersForm = document.querySelector("#filters-form");
const reviewSection = document.querySelector("#review-section");
const reportSection = document.querySelector("#report-section");
const appStatus = document.querySelector("#app-status");
const metricsGrid = document.querySelector("#metrics-grid");
const resultsBody = document.querySelector("#results-body");
const resultsCount = document.querySelector("#results-count");
const resultsEmpty = document.querySelector("#results-empty");
const tableScroll = document.querySelector("#table-scroll");
const generateReportButton = document.querySelector("#generate-report-button");
const backToResultsButton = document.querySelector("#back-to-results-button");
const printReportButton = document.querySelector("#print-report-button");

const filterElements = {
  title: document.querySelector("#title-filter"),
  contentType: document.querySelector("#type-filter"),
  genre: document.querySelector("#genre-filter"),
  country: document.querySelector("#country-filter"),
  language: document.querySelector("#language-filter"),
  releaseYear: document.querySelector("#year-filter"),
  status: document.querySelector("#status-filter")
};

let catalogRecords = [];
let filteredRecords = [];

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function showStatus(message) {
  appStatus.textContent = message;
}

function setWorkflowStep(stepNumber) {
  document.querySelectorAll(".workflow-step").forEach(function (step) {
    const number = Number(step.dataset.step);
    step.classList.toggle("is-active", number === stepNumber);
    step.classList.toggle("is-complete", number < stepNumber);
  });
}

function showUploadFeedback(type, heading, detail) {
  uploadFeedback.className = `upload-feedback is-${type}`;
  uploadFeedback.replaceChildren();

  const strong = document.createElement("strong");
  strong.textContent = heading;
  const span = document.createElement("span");
  span.textContent = detail;
  uploadFeedback.append(strong, span);
}

function toNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const number = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function findValue(record, possibleNames) {
  const normalizedKeys = {};

  Object.keys(record).forEach(function (key) {
    normalizedKeys[normalizeText(key).replace(/[^a-z0-9]/g, "")] = record[key];
  });

  for (const name of possibleNames) {
    const normalizedName = name.replace(/[^a-z0-9]/g, "");
    if (Object.hasOwn(normalizedKeys, normalizedName)) {
      return normalizedKeys[normalizedName];
    }
  }

  return "";
}

function normalizeRecord(record, index) {
  const rawType = findValue(record, ["contenttype", "type"]);
  const normalizedType = normalizeText(rawType);
  let contentType = String(rawType || "").trim();

  if (["series", "tv", "tvseries", "televisionseries", "show"].includes(normalizedType.replace(/\s/g, ""))) {
    contentType = "TV Show";
  } else if (normalizedType === "movie" || normalizedType === "film") {
    contentType = "Movie";
  }

  return {
    id: findValue(record, ["id"]) || index + 1,
    title: String(findValue(record, ["title", "name"]) || "").trim(),
    contentType: contentType,
    genre: String(findValue(record, ["genre"]) || "").trim(),
    country: String(findValue(record, ["country", "countryoforigin", "region"]) || "").trim(),
    language: String(findValue(record, ["language"]) || "").trim(),
    releaseYear: toNumber(findValue(record, ["releaseyear", "year"])),
    status: String(findValue(record, ["status"]) || "").trim(),
    runtime: toNumber(findValue(record, ["runtime", "runtimeminutes", "duration"])),
    rating: toNumber(findValue(record, ["rating", "score"])),
    acquisitionCost: toNumber(findValue(record, ["acquisitioncost", "cost", "price"]))
  };
}

function validateData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("The catalog is empty. Add at least one record and try again.");
  }

  const normalizedRecords = data
    .filter(function (record) {
      return record && typeof record === "object" && !Array.isArray(record);
    })
    .map(normalizeRecord)
    .filter(function (record) {
      return record.title !== "";
    });

  if (normalizedRecords.length === 0) {
    throw new Error("No valid records were found. Each record needs a title.");
  }

  return normalizedRecords;
}

// This parser reads standard CSV quoting, including commas and line breaks inside quoted fields.
function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some(function (cell) { return cell.trim() !== ""; })) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some(function (cell) { return cell.trim() !== ""; })) {
    rows.push(row);
  }

  return rows;
}

function parseCsv(csvText) {
  const rows = parseCsvRows(csvText);

  if (rows.length < 2) {
    throw new Error("The CSV needs a header row and at least one catalog record.");
  }

  const headers = rows[0].map(function (header) {
    return header.replace(/^\uFEFF/, "").trim();
  });

  return rows.slice(1).map(function (row) {
    const record = {};
    headers.forEach(function (header, index) {
      record[header] = row[index] ?? "";
    });
    return record;
  });
}

async function parseUploadedFile(file) {
  if (!file) {
    return;
  }

  const extension = file.name.split(".").pop().toLowerCase();
  if (!["csv", "json"].includes(extension)) {
    throw new Error("Please choose a CSV or JSON file.");
  }

  if (file.size === 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("For this MVP, choose a file smaller than 5 MB.");
  }

  const text = await file.text();
  if (text.trim() === "") {
    throw new Error("The selected file is empty.");
  }

  if (extension === "json") {
    const parsedJson = JSON.parse(text);
    return Array.isArray(parsedJson) ? parsedJson : parsedJson.records;
  }

  return parseCsv(text);
}

function uniqueValues(fieldName) {
  return [...new Set(
    catalogRecords
      .map(function (record) { return record[fieldName]; })
      .filter(function (value) { return value !== null && String(value).trim() !== ""; })
  )].sort(function (first, second) {
    return String(first).localeCompare(String(second), undefined, { numeric: true });
  });
}

function populateSelect(select, fieldName, allLabel) {
  select.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = allLabel;
  select.append(allOption);

  uniqueValues(fieldName).forEach(function (value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function populateFilterOptions() {
  populateSelect(filterElements.contentType, "contentType", "All types");
  populateSelect(filterElements.genre, "genre", "All genres");
  populateSelect(filterElements.country, "country", "All countries");
  populateSelect(filterElements.language, "language", "All languages");
  populateSelect(filterElements.releaseYear, "releaseYear", "All years");
  populateSelect(filterElements.status, "status", "All statuses");
}

function activateCatalog(records, sourceName) {
  catalogRecords = validateData(records);
  filteredRecords = [];
  populateFilterOptions();
  filtersForm.reset();

  document.querySelector("#loaded-file-name").textContent = sourceName;
  document.querySelector("#loaded-record-count").textContent = `${catalogRecords.length} records loaded`;

  showUploadFeedback(
    "success",
    "Catalog loaded successfully",
    `${catalogRecords.length} valid records are ready to filter.`
  );

  filtersSection.hidden = false;
  reviewSection.hidden = true;
  reportSection.hidden = true;
  setWorkflowStep(2);
  showStatus(`${catalogRecords.length} catalog records loaded.`);
  filtersSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function handleFileUpload() {
  const file = catalogFileInput.files[0];
  if (!file) {
    return;
  }

  showUploadFeedback("loading", "Loading catalog", `Validating ${file.name}…`);
  showStatus(`Loading ${file.name}.`);

  try {
    const parsedData = await parseUploadedFile(file);
    activateCatalog(parsedData, file.name);
  } catch (error) {
    showUploadFeedback("error", "Catalog could not be loaded", error.message);
    showStatus(`Catalog error: ${error.message}`);
    filtersSection.hidden = true;
    reviewSection.hidden = true;
    reportSection.hidden = true;
    setWorkflowStep(1);
  }
}

function loadSampleData() {
  // A shallow copy prevents filtering logic from changing the original demonstration dataset.
  const sampleCopy = sampleCatalogData.map(function (record) {
    return { ...record };
  });
  activateCatalog(sampleCopy, "Fictional sample catalog");
}

function getSelectedFilters() {
  return {
    title: filterElements.title.value.trim(),
    contentType: filterElements.contentType.value,
    genre: filterElements.genre.value,
    country: filterElements.country.value,
    language: filterElements.language.value,
    releaseYear: filterElements.releaseYear.value,
    status: filterElements.status.value
  };
}

function matchesFilter(record, fieldName, selectedValue) {
  if (selectedValue === "") {
    return true;
  }
  return normalizeText(record[fieldName]) === normalizeText(selectedValue);
}

function buildFilterSummary(filters) {
  const labels = {
    title: "Title",
    contentType: "Type",
    genre: "Genre",
    country: "Country",
    language: "Language",
    releaseYear: "Year",
    status: "Status"
  };

  const applied = Object.entries(filters)
    .filter(function (entry) { return entry[1] !== ""; })
    .map(function (entry) { return `${labels[entry[0]]}: ${entry[1]}`; });

  return applied.length > 0
    ? `Applied filters · ${applied.join(" · ")}`
    : "No filters applied · All catalog records included";
}

function applyFilters(event) {
  event.preventDefault();
  const filters = getSelectedFilters();

  filteredRecords = catalogRecords.filter(function (record) {
    const titleMatches =
      filters.title === "" ||
      normalizeText(record.title).includes(normalizeText(filters.title));

    return (
      titleMatches &&
      matchesFilter(record, "contentType", filters.contentType) &&
      matchesFilter(record, "genre", filters.genre) &&
      matchesFilter(record, "country", filters.country) &&
      matchesFilter(record, "language", filters.language) &&
      matchesFilter(record, "releaseYear", filters.releaseYear) &&
      matchesFilter(record, "status", filters.status)
    );
  });

  document.querySelector("#filter-summary").textContent = buildFilterSummary(filters);
  renderReview();
  reviewSection.hidden = false;
  reportSection.hidden = true;
  setWorkflowStep(3);
  showStatus(`${filteredRecords.length} matching catalog records found.`);
  reviewSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function calculateAverage(records, fieldName) {
  const values = records
    .map(function (record) { return record[fieldName]; })
    .filter(function (value) { return Number.isFinite(value); });

  if (values.length === 0) {
    return null;
  }

  return values.reduce(function (total, value) { return total + value; }, 0) / values.length;
}

function countBy(records, fieldName) {
  return records.reduce(function (counts, record) {
    const label = String(record[fieldName] || "Not available").trim() || "Not available";
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
}

function topCategory(records, fieldName) {
  const entries = Object.entries(countBy(records, fieldName))
    .filter(function (entry) { return entry[0] !== "Not available"; })
    .sort(function (first, second) { return second[1] - first[1]; });

  return entries.length > 0 ? entries[0] : null;
}

function percentage(records, fieldName, expectedValue) {
  if (records.length === 0) {
    return null;
  }
  const matching = records.filter(function (record) {
    return normalizeText(record[fieldName]) === normalizeText(expectedValue);
  }).length;
  return Math.round((matching / records.length) * 100);
}

function calculateMetrics(records) {
  const averageRating = calculateAverage(records, "rating");
  const averageYear = calculateAverage(records, "releaseYear");
  const mostCommonGenre = topCategory(records, "genre");

  return {
    total: records.length,
    movies: records.filter(function (record) { return record.contentType === "Movie"; }).length,
    tvShows: records.filter(function (record) { return record.contentType === "TV Show"; }).length,
    averageRating: averageRating === null ? null : averageRating.toFixed(1),
    averageYear: averageYear === null ? null : Math.round(averageYear),
    countries: uniqueCount(records, "country"),
    mostCommonGenre: mostCommonGenre ? mostCommonGenre[0] : null,
    acquired: percentage(records, "status", "Acquired"),
    underReview: percentage(records, "status", "Under Review")
  };
}

function uniqueCount(records, fieldName) {
  return new Set(
    records
      .map(function (record) { return record[fieldName]; })
      .filter(function (value) { return value !== null && String(value).trim() !== ""; })
  ).size;
}

function displayMetricValue(value, suffix) {
  return value === null || value === undefined || value === ""
    ? "Not available"
    : `${value}${suffix || ""}`;
}

function createMetricCard(label, value, detail) {
  const card = document.createElement("article");
  card.className = "metric-card";
  const metricValue = document.createElement("strong");
  metricValue.textContent = value;
  const metricLabel = document.createElement("span");
  metricLabel.textContent = label;
  const metricDetail = document.createElement("small");
  metricDetail.textContent = detail;
  card.append(metricValue, metricLabel, metricDetail);
  return card;
}

function renderMetricCards(records) {
  const metrics = calculateMetrics(records);
  metricsGrid.replaceChildren(
    createMetricCard("Matching titles", metrics.total, "Filtered records"),
    createMetricCard("Movies", metrics.movies, "Feature-length titles"),
    createMetricCard("TV shows", metrics.tvShows, "Series in selection"),
    createMetricCard("Average rating", displayMetricValue(metrics.averageRating), "Available ratings only"),
    createMetricCard("Countries", metrics.countries, "Represented markets"),
    createMetricCard("Most common genre", displayMetricValue(metrics.mostCommonGenre), "Leading category")
  );
}

function displayValue(value) {
  return value === null || value === undefined || String(value).trim() === ""
    ? "Not available"
    : value;
}

function createTableCell(value) {
  const cell = document.createElement("td");
  cell.textContent = displayValue(value);
  return cell;
}

function renderResultsTable(records) {
  resultsBody.replaceChildren();
  resultsCount.textContent = `${records.length} ${records.length === 1 ? "record" : "records"}`;
  resultsEmpty.hidden = records.length > 0;
  tableScroll.hidden = records.length === 0;
  generateReportButton.disabled = records.length === 0;

  records.forEach(function (record) {
    const row = document.createElement("tr");
    const titleCell = createTableCell(record.title);
    titleCell.className = "title-cell";
    const statusCell = createTableCell(record.status);
    statusCell.className = "status-cell";
    statusCell.dataset.status = normalizeText(record.status).replace(/\s/g, "-");

    row.append(
      titleCell,
      createTableCell(record.contentType),
      createTableCell(record.genre),
      createTableCell(record.country),
      createTableCell(record.language),
      createTableCell(record.releaseYear),
      statusCell,
      createTableCell(record.rating)
    );
    resultsBody.append(row);
  });
}

function renderReview() {
  renderMetricCards(filteredRecords);
  renderResultsTable(filteredRecords);
}

function clearFilters() {
  window.setTimeout(function () {
    filteredRecords = [];
    reviewSection.hidden = true;
    reportSection.hidden = true;
    setWorkflowStep(2);
    showStatus("Filters cleared. Choose filters and apply them again.");
    filterElements.title.focus();
  }, 0);
}

function sortedCountEntries(records, fieldName) {
  return Object.entries(countBy(records, fieldName))
    .sort(function (first, second) { return second[1] - first[1]; });
}

function createBarChart(title, explanation, entries) {
  const chart = document.createElement("section");
  chart.className = "chart-card";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const description = document.createElement("p");
  description.textContent = explanation;
  const bars = document.createElement("div");
  bars.className = "bar-chart";
  const maximum = Math.max(...entries.map(function (entry) { return entry[1]; }), 1);

  entries.slice(0, 6).forEach(function (entry) {
    const row = document.createElement("div");
    row.className = "bar-row";
    const label = document.createElement("span");
    label.textContent = entry[0];
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${(entry[1] / maximum) * 100}%`;
    const value = document.createElement("strong");
    value.textContent = entry[1];
    track.append(fill);
    row.append(label, track, value);
    bars.append(row);
  });

  chart.append(heading, description, bars);
  return chart;
}

function createMixChart(records) {
  const entries = sortedCountEntries(records, "contentType");
  const total = Math.max(records.length, 1);
  const movieCount = entries.find(function (entry) { return entry[0] === "Movie"; })?.[1] || 0;
  const moviePercentage = Math.round((movieCount / total) * 100);

  const chart = document.createElement("section");
  chart.className = "chart-card";
  const heading = document.createElement("h3");
  heading.textContent = "Movies versus TV shows";
  const description = document.createElement("p");
  description.textContent = "Share of the selected catalog by content type.";
  const content = document.createElement("div");
  content.className = "mix-chart-layout";
  const donut = document.createElement("div");
  donut.className = "donut-chart";
  donut.style.setProperty("--movie-share", `${moviePercentage * 3.6}deg`);
  donut.setAttribute("role", "img");
  donut.setAttribute("aria-label", `${moviePercentage}% movies and ${100 - moviePercentage}% TV shows`);
  const center = document.createElement("strong");
  center.textContent = `${records.length}`;
  donut.append(center);
  const legend = document.createElement("ul");
  legend.className = "chart-legend";
  entries.forEach(function (entry) {
    const item = document.createElement("li");
    item.textContent = `${entry[0]}: ${entry[1]} (${Math.round((entry[1] / total) * 100)}%)`;
    legend.append(item);
  });
  content.append(donut, legend);
  chart.append(heading, description, content);
  return chart;
}

function renderCharts(records) {
  const chartsGrid = document.querySelector("#charts-grid");
  chartsGrid.replaceChildren(
    createBarChart("Titles by genre", "Compares the most frequent genres.", sortedCountEntries(records, "genre")),
    createMixChart(records),
    createBarChart("Titles by country", "Shows the leading countries in this selection.", sortedCountEntries(records, "country")),
    createBarChart("Titles by status", "Shows the current catalog workflow status.", sortedCountEntries(records, "status"))
  );
}

function generateExecutiveInsights(records) {
  const metrics = calculateMetrics(records);
  const insights = [];
  const genre = topCategory(records, "genre");
  const country = topCategory(records, "country");

  if (genre) {
    insights.push(`${genre[0]} is the leading genre, representing ${Math.round((genre[1] / records.length) * 100)}% of matching titles.`);
  }
  if (metrics.movies + metrics.tvShows > 0) {
    const leadingType = metrics.movies >= metrics.tvShows ? "Movies" : "TV shows";
    const leadingCount = Math.max(metrics.movies, metrics.tvShows);
    insights.push(`${leadingType} account for ${Math.round((leadingCount / records.length) * 100)}% of this selection.`);
  }
  if (country) {
    insights.push(`${country[0]} is the most represented country with ${country[1]} ${country[1] === 1 ? "title" : "titles"}.`);
  }
  if (metrics.underReview !== null && metrics.underReview > 0) {
    insights.push(`${metrics.underReview}% of matching titles are currently under review.`);
  }
  if (metrics.averageRating !== null) {
    insights.push(`The average available rating for the selected catalog is ${metrics.averageRating}.`);
  }

  return insights.slice(0, 5);
}

function renderReportKpis(records) {
  const metrics = calculateMetrics(records);
  document.querySelector("#report-kpis").replaceChildren(
    createMetricCard("Total titles", metrics.total, "Current selection"),
    createMetricCard("Average rating", displayMetricValue(metrics.averageRating), "Available ratings"),
    createMetricCard("Acquired", displayMetricValue(metrics.acquired, "%"), "Of matching titles"),
    createMetricCard("Under review", displayMetricValue(metrics.underReview, "%"), "Of matching titles"),
    createMetricCard("Countries", metrics.countries, "Represented markets")
  );
}

function showExecutiveReport() {
  if (filteredRecords.length === 0) {
    return;
  }

  const summary = buildFilterSummary(getSelectedFilters());
  document.querySelector("#report-filter-summary").textContent = summary;
  document.querySelector("#report-date").textContent = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long"
  }).format(new Date());

  renderReportKpis(filteredRecords);
  renderCharts(filteredRecords);

  const insightsList = document.querySelector("#insights-list");
  insightsList.replaceChildren();
  generateExecutiveInsights(filteredRecords).forEach(function (insight) {
    const item = document.createElement("li");
    item.textContent = insight;
    insightsList.append(item);
  });

  reviewSection.hidden = true;
  reportSection.hidden = false;
  setWorkflowStep(4);
  showStatus("Executive report generated from the filtered catalog.");
  reportSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function returnToResults() {
  reportSection.hidden = true;
  reviewSection.hidden = false;
  setWorkflowStep(3);
  showStatus("Returned to filtered catalog results.");
  reviewSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Event listeners connect each visible control to one focused action.
catalogFileInput.addEventListener("change", handleFileUpload);
catalogFileLabel.addEventListener("keydown", function (event) {
  // The custom upload label also opens the file chooser with Enter or Space.
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    catalogFileInput.click();
  }
});
sampleDataButton.addEventListener("click", loadSampleData);
filtersForm.addEventListener("submit", applyFilters);
document.querySelector("#clear-filters-button").addEventListener("click", clearFilters);
generateReportButton.addEventListener("click", showExecutiveReport);
backToResultsButton.addEventListener("click", returnToResults);
printReportButton.addEventListener("click", function () {
  window.print();
});
