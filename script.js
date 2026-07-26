const state = {
  catalog: [],
  detectedFields: [],
  selectedReportId: "",
  filters: {},
  previewRecords: [],
  comparison: null,
  generatedReport: false
};

const screens = {
  upload: document.querySelector("#upload-screen"),
  reportType: document.querySelector("#report-type-screen"),
  configure: document.querySelector("#configure-screen"),
  preview: document.querySelector("#preview-screen"),
  executive: document.querySelector("#executive-screen")
};

const screenSteps = { upload: 1, reportType: 2, configure: 3, preview: 4, executive: 5 };
const fileInput = document.querySelector("#catalog-file");
const browseFileButton = document.querySelector("#browse-file-button");
const dropZone = document.querySelector("#drop-zone");
const liveStatus = document.querySelector("#live-status");
const uploadContinueButton = document.querySelector("#upload-continue-button");
const reportTypeContinueButton = document.querySelector("#report-type-continue-button");
const configurationForm = document.querySelector("#configuration-form");
const configurationFields = document.querySelector("#configuration-fields");
const configurationError = document.querySelector("#configuration-error");
const generateReportButton = document.querySelector("#generate-report-button");
const startOverButton = document.querySelector("#start-over-button");

const fieldAliases = {
  title: ["title", "name"],
  type: ["type", "contenttype", "content_type", "content type"],
  country: ["country", "countryoforigin", "country_of_origin", "region"],
  genre: ["genre", "category"],
  rating: ["rating", "score"],
  releaseYear: ["releaseyear", "release_year", "release year", "year"],
  dateAdded: ["dateadded", "date_added", "date added", "addeddate"],
  description: ["description", "summary", "synopsis"]
};

const groupFields = [
  { value: "genre", label: "Genre" },
  { value: "country", label: "Country" },
  { value: "type", label: "Content type" },
  { value: "rating", label: "Rating" }
];

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function showStatus(message) {
  liveStatus.textContent = message;
}

function selectedReport() {
  return reportDefinitions.find(function (report) {
    return report.id === state.selectedReportId;
  });
}

function showScreen(name) {
  Object.entries(screens).forEach(function (entry) {
    const isCurrent = entry[0] === name;
    entry[1].hidden = !isCurrent;
    entry[1].classList.toggle("is-visible", isCurrent);
  });

  const stepNumber = screenSteps[name];
  document.querySelectorAll(".workflow-item").forEach(function (item) {
    const itemStep = Number(item.dataset.step);
    item.classList.toggle("is-active", itemStep === stepNumber);
    item.classList.toggle("is-complete", itemStep < stepNumber);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function displayValue(value) {
  return value === null || value === undefined || String(value).trim() === ""
    ? "Not provided"
    : String(value);
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const next = csvText[index + 1];

    if (character === '"' && insideQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some(function (value) { return value.trim() !== ""; })) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (insideQuotes) throw new Error("The CSV contains an unclosed quotation mark.");
  row.push(cell);
  if (row.some(function (value) { return value.trim() !== ""; })) rows.push(row);
  return rows;
}

function findCanonicalField(header) {
  const normalized = normalizeHeader(header);
  return Object.keys(fieldAliases).find(function (field) {
    return fieldAliases[field].some(function (alias) {
      return normalizeHeader(alias) === normalized;
    });
  }) || null;
}

function parseDate(value) {
  if (!value || String(value).trim() === "") return null;
  const date = new Date(String(value).trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(String(value).trim());
  return Number.isFinite(number) ? number : null;
}

function parseCatalogCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) throw new Error("The CSV is empty.");
  if (rows.length === 1) throw new Error("The CSV needs a header row and at least one data row.");

  const rawHeaders = rows[0].map(function (header) {
    return header.replace(/^\uFEFF/, "").trim();
  });
  if (rawHeaders.every(function (header) { return header === ""; })) {
    throw new Error("The CSV header row is missing.");
  }

  const canonicalHeaders = rawHeaders.map(findCanonicalField);
  if (!canonicalHeaders.includes("title")) {
    throw new Error("A title column is required. Variations such as Title or title are accepted.");
  }

  const detected = [...new Set(canonicalHeaders.filter(Boolean))];
  let invalidRows = 0;
  let invalidDates = 0;
  const records = [];

  rows.slice(1).forEach(function (row, rowIndex) {
    const rawRecord = {};
    canonicalHeaders.forEach(function (field, columnIndex) {
      if (field) rawRecord[field] = row[columnIndex] ?? "";
    });

    const title = String(rawRecord.title || "").trim();
    if (title === "") {
      invalidRows += 1;
      return;
    }

    const rawDate = String(rawRecord.dateAdded || "").trim();
    const dateAdded = parseDate(rawDate);
    if (rawDate && !dateAdded) invalidDates += 1;

    records.push({
      id: rowIndex + 1,
      title,
      type: String(rawRecord.type || "").trim(),
      country: String(rawRecord.country || "").trim(),
      genre: String(rawRecord.genre || "").trim(),
      rating: parseNumber(rawRecord.rating),
      releaseYear: parseNumber(rawRecord.releaseYear),
      dateAdded,
      dateAddedRaw: rawDate,
      description: String(rawRecord.description || "").trim()
    });
  });

  if (records.length === 0) throw new Error("No valid records were found. Every valid row needs a title.");
  return { records, detected, invalidRows, invalidDates, rawHeaders };
}

function renderUploadMessage(type, heading, detail) {
  const message = document.querySelector("#upload-message");
  message.className = `upload-message is-${type}`;
  message.replaceChildren();
  const strong = document.createElement("strong");
  strong.textContent = heading;
  const span = document.createElement("span");
  span.textContent = detail;
  message.append(strong, span);
}

function renderDetectedFields(result, fileName) {
  const container = document.querySelector("#detected-fields");
  const tags = document.querySelector("#field-tags");
  tags.replaceChildren();
  result.detected.forEach(function (field) {
    const tag = document.createElement("span");
    tag.textContent = field;
    tags.append(tag);
  });
  document.querySelector("#import-details").textContent =
    `${fileName} · ${result.records.length} valid records · ${result.invalidRows} invalid rows skipped · ${result.invalidDates} invalid dates treated as unknown`;
  container.hidden = false;
}

async function processFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".csv")) {
    renderUploadMessage("error", "Unsupported file", "Choose a CSV file.");
    return;
  }
  if (file.size === 0) {
    renderUploadMessage("error", "Empty file", "The selected CSV contains no data.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    renderUploadMessage("error", "File is too large", "Choose a CSV smaller than 5 MB for this MVP.");
    return;
  }

  renderUploadMessage("loading", "Reading catalog", `Validating ${file.name}…`);
  try {
    const result = parseCatalogCsv(await file.text());
    state.catalog = result.records;
    state.detectedFields = result.detected;
    state.selectedReportId = "";
    state.filters = {};
    state.previewRecords = [];
    renderDetectedFields(result, file.name);
    renderUploadMessage("success", "Upload successful", `${result.records.length} valid catalog records imported.`);
    uploadContinueButton.disabled = false;
    startOverButton.hidden = false;
    showStatus(`${result.records.length} valid records imported from ${file.name}.`);
  } catch (error) {
    state.catalog = [];
    uploadContinueButton.disabled = true;
    document.querySelector("#detected-fields").hidden = true;
    renderUploadMessage("error", "Catalog could not be imported", error.message);
    showStatus(`Upload error: ${error.message}`);
  }
}

function renderReportTypes() {
  const grid = document.querySelector("#report-type-grid");
  grid.replaceChildren();
  reportDefinitions.forEach(function (report) {
    const label = document.createElement("label");
    label.className = "report-type-card";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "report-type";
    radio.value = report.id;
    radio.checked = report.id === state.selectedReportId;
    const content = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = report.name;
    const description = document.createElement("small");
    description.textContent = report.description;
    content.append(title, description);
    const arrow = document.createElement("b");
    arrow.textContent = "→";
    label.append(radio, content, arrow);
    radio.addEventListener("change", function () {
      state.selectedReportId = report.id;
      reportTypeContinueButton.disabled = false;
      document.querySelectorAll(".report-type-card").forEach(function (card) {
        card.classList.toggle("is-selected", card.contains(radio) && radio.checked);
      });
    });
    if (radio.checked) label.classList.add("is-selected");
    grid.append(label);
  });
  reportTypeContinueButton.disabled = state.selectedReportId === "";
}

function uniqueValues(field) {
  return [...new Set(
    state.catalog.map(function (record) { return record[field]; })
      .filter(function (value) { return value !== null && String(value).trim() !== ""; })
  )].sort(function (a, b) {
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
}

function createField(labelText, name, type, options, required) {
  const wrapper = document.createElement("div");
  wrapper.className = "form-field";
  const label = document.createElement("label");
  label.htmlFor = `config-${name}`;
  label.textContent = labelText;
  let control;

  if (type === "select") {
    control = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = required ? "Select an option" : "All";
    control.append(empty);
    options.forEach(function (option) {
      const element = document.createElement("option");
      element.value = typeof option === "object" ? option.value : option;
      element.textContent = typeof option === "object" ? option.label : option;
      control.append(element);
    });
  } else {
    control = document.createElement("input");
    control.type = type;
  }

  control.id = `config-${name}`;
  control.name = name;
  control.required = Boolean(required);
  if (type === "number" && name === "gapThreshold") {
    control.min = "0";
    control.max = "100";
    control.step = "0.1";
    control.placeholder = "Example: 10";
  }
  if (state.filters[name] !== undefined) control.value = state.filters[name];
  wrapper.append(label, control);
  return wrapper;
}

function addCommonFilters(container, includeDates, includeReleaseYears) {
  if (includeDates) {
    container.append(createField("Date added from", "dateFrom", "date", [], false));
    container.append(createField("Date added to", "dateTo", "date", [], false));
  }
  if (includeReleaseYears) {
    container.append(createField("Release year from", "releaseYearFrom", "number", [], false));
    container.append(createField("Release year to", "releaseYearTo", "number", [], false));
  }
  container.append(createField("Content type", "type", "select", uniqueValues("type"), false));
  container.append(createField("Country", "country", "select", uniqueValues("country"), false));
  container.append(createField("Genre", "genre", "select", uniqueValues("genre"), false));
  container.append(createField("Rating", "rating", "select", uniqueValues("rating"), false));
}

function renderConfiguration() {
  const report = selectedReport();
  document.querySelector("#selected-report-name").textContent = report.name;
  document.querySelector("#configure-description").textContent = report.description;
  configurationFields.replaceChildren();
  configurationError.hidden = true;

  if (report.id === "recent") {
    configurationFields.append(createField("Date added from", "dateFrom", "date", [], true));
    configurationFields.append(createField("Date added to", "dateTo", "date", [], true));
    addCommonFilters(configurationFields, false, false);
  } else if (report.id === "distribution") {
    configurationFields.append(createField("Group results by", "groupBy", "select", groupFields, true));
    addCommonFilters(configurationFields, true, false);
  } else if (report.id === "comparison") {
    configurationFields.append(
      createField("Period A start", "periodAStart", "date", [], true),
      createField("Period A end", "periodAEnd", "date", [], true),
      createField("Period B start", "periodBStart", "date", [], true),
      createField("Period B end", "periodBEnd", "date", [], true),
      createField("Compare by", "groupBy", "select", groupFields, true)
    );
  } else if (report.id === "gap") {
    configurationFields.append(
      createField("Analyze categories by", "groupBy", "select", groupFields, true),
      createField("Gap threshold percentage", "gapThreshold", "number", [], true)
    );
  } else {
    configurationFields.append(createField("Group results by", "groupBy", "select", groupFields, true));
    addCommonFilters(configurationFields, true, true);
  }
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function validateConfiguration(filters) {
  const report = selectedReport();
  const requiredByReport = {
    recent: ["dateFrom", "dateTo"],
    distribution: ["groupBy"],
    comparison: ["periodAStart", "periodAEnd", "periodBStart", "periodBEnd", "groupBy"],
    gap: ["groupBy", "gapThreshold"],
    custom: ["groupBy"]
  };
  const missing = requiredByReport[report.id].some(function (name) { return !filters[name]; });
  if (missing) return "Complete all required report settings.";

  const datePairs = report.id === "comparison"
    ? [["periodAStart", "periodAEnd"], ["periodBStart", "periodBEnd"]]
    : [["dateFrom", "dateTo"]];
  for (const pair of datePairs) {
    if (filters[pair[0]] && filters[pair[1]] && new Date(filters[pair[0]]) > new Date(filters[pair[1]])) {
      return "Each start date must be on or before its end date.";
    }
  }
  if (report.id === "gap") {
    const threshold = Number(filters.gapThreshold);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
      return "Gap threshold must be between 0 and 100.";
    }
  }
  return "";
}

function recordMatchesFilters(record, filters) {
  const equalityFields = ["type", "country", "genre", "rating"];
  const matchesSelections = equalityFields.every(function (field) {
    return !filters[field] || normalizeText(record[field]) === normalizeText(filters[field]);
  });
  if (!matchesSelections) return false;
  if (filters.dateFrom && (!record.dateAdded || record.dateAdded < new Date(filters.dateFrom))) return false;
  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setHours(23, 59, 59, 999);
    if (!record.dateAdded || record.dateAdded > end) return false;
  }
  if (filters.releaseYearFrom && (!record.releaseYear || record.releaseYear < Number(filters.releaseYearFrom))) return false;
  if (filters.releaseYearTo && (!record.releaseYear || record.releaseYear > Number(filters.releaseYearTo))) return false;
  return true;
}

function filterRecords(records, filters) {
  return records.filter(function (record) {
    return recordMatchesFilters(record, filters);
  });
}

function recordsInPeriod(records, startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  end.setHours(23, 59, 59, 999);
  return records.filter(function (record) {
    return record.dateAdded && record.dateAdded >= start && record.dateAdded <= end;
  });
}

function groupRecords(records, field) {
  return records.reduce(function (groups, record) {
    const label = displayValue(record[field]);
    if (!groups[label]) groups[label] = [];
    groups[label].push(record);
    return groups;
  }, {});
}

function countCategories(records, field) {
  return Object.entries(groupRecords(records, field))
    .map(function (entry) { return { label: entry[0], count: entry[1].length }; })
    .sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label); });
}

function calculatePercentage(count, total) {
  return total === 0 ? null : (count / total) * 100;
}

function calculatePercentageChange(previous, current) {
  return previous === 0 ? null : ((current - previous) / previous) * 100;
}

function categoriesBelowThreshold(records, field, threshold) {
  return countCategories(records, field)
    .map(function (category) {
      return { ...category, share: calculatePercentage(category.count, records.length) };
    })
    .filter(function (category) { return category.share !== null && category.share < threshold; })
    .sort(function (a, b) { return a.share - b.share; });
}

function preparePreview() {
  const report = selectedReport();
  state.comparison = null;
  state.generatedReport = false;
  if (report.id === "comparison") {
    const periodA = recordsInPeriod(state.catalog, state.filters.periodAStart, state.filters.periodAEnd);
    const periodB = recordsInPeriod(state.catalog, state.filters.periodBStart, state.filters.periodBEnd);
    state.comparison = { periodA, periodB };
    state.previewRecords = [...new Map([...periodA, ...periodB].map(function (record) {
      return [record.id, record];
    })).values()];
  } else if (report.id === "recent") {
    state.previewRecords = filterRecords(state.catalog, state.filters);
  } else if (report.id === "distribution" || report.id === "custom") {
    state.previewRecords = filterRecords(state.catalog, state.filters);
  } else {
    state.previewRecords = [...state.catalog];
  }
}

function topCategory(records, field) {
  const categories = countCategories(records, field).filter(function (category) {
    return category.label !== "Not provided";
  });
  return categories[0] || null;
}

function calculateKpis(records) {
  return {
    total: records.length,
    countries: new Set(records.map(function (record) { return record.country; }).filter(Boolean)).size,
    genres: new Set(records.map(function (record) { return record.genre; }).filter(Boolean)).size,
    topGenre: topCategory(records, "genre")?.label || "Not available",
    topType: topCategory(records, "type")?.label || "Not available"
  };
}

function createKpi(label, value, detail) {
  const card = document.createElement("article");
  card.className = "kpi-card";
  const strong = document.createElement("strong");
  strong.textContent = value;
  const span = document.createElement("span");
  span.textContent = label;
  const small = document.createElement("small");
  small.textContent = detail;
  card.append(strong, span, small);
  return card;
}

function renderKpis(container, records) {
  const kpis = calculateKpis(records);
  container.replaceChildren(
    createKpi("Matching titles", kpis.total, "Record count"),
    createKpi("Countries", kpis.countries, "Represented"),
    createKpi("Genres", kpis.genres, "Represented"),
    createKpi("Most common genre", kpis.topGenre, "Largest category"),
    createKpi("Most common type", kpis.topType, "Largest category")
  );
}

function createBarChart(title, description, categories, valueFormatter) {
  const card = document.createElement("section");
  card.className = "chart-card";
  const heading = document.createElement("h2");
  heading.textContent = title;
  const text = document.createElement("p");
  text.textContent = description;
  const chart = document.createElement("div");
  chart.className = "bar-chart";
  const maximum = Math.max(...categories.map(function (item) { return item.count; }), 1);

  categories.slice(0, 10).forEach(function (item) {
    const row = document.createElement("div");
    row.className = "bar-row";
    const label = document.createElement("span");
    label.textContent = item.label;
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${(item.count / maximum) * 100}%`;
    track.append(fill);
    const value = document.createElement("strong");
    value.textContent = valueFormatter ? valueFormatter(item) : item.count;
    row.append(label, track, value);
    chart.append(row);
  });
  card.append(heading, text, chart);
  return card;
}

function monthKey(record) {
  if (!record.dateAdded) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short" }).format(record.dateAdded);
}

function comparisonCategories() {
  const field = state.filters.groupBy;
  const a = Object.fromEntries(countCategories(state.comparison.periodA, field).map(function (item) { return [item.label, item.count]; }));
  const b = Object.fromEntries(countCategories(state.comparison.periodB, field).map(function (item) { return [item.label, item.count]; }));
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].map(function (label) {
    return { label, countA: a[label] || 0, countB: b[label] || 0, count: Math.max(a[label] || 0, b[label] || 0) };
  }).sort(function (first, second) { return second.count - first.count; });
}

function createComparisonChart() {
  const categories = comparisonCategories();
  const card = document.createElement("section");
  card.className = "chart-card chart-card-wide";
  const heading = document.createElement("h2");
  heading.textContent = `Period comparison by ${groupLabel(state.filters.groupBy)}`;
  const text = document.createElement("p");
  text.textContent = "Side-by-side record counts. Purple is Period A; blue is Period B.";
  const chart = document.createElement("div");
  chart.className = "comparison-chart";
  const maximum = Math.max(...categories.map(function (item) { return item.count; }), 1);
  categories.slice(0, 10).forEach(function (item) {
    const row = document.createElement("div");
    row.className = "comparison-row";
    const label = document.createElement("span");
    label.textContent = item.label;
    const bars = document.createElement("div");
    bars.className = "comparison-bars";
    const barA = document.createElement("i");
    barA.className = "period-a";
    barA.style.width = `${(item.countA / maximum) * 100}%`;
    const barB = document.createElement("i");
    barB.className = "period-b";
    barB.style.width = `${(item.countB / maximum) * 100}%`;
    bars.append(barA, barB);
    const value = document.createElement("strong");
    value.textContent = `${item.countA} / ${item.countB}`;
    row.append(label, bars, value);
    chart.append(row);
  });
  card.append(heading, text, chart);
  return card;
}

function groupLabel(value) {
  return groupFields.find(function (field) { return field.value === value; })?.label || value;
}

function renderCharts(container) {
  const report = selectedReport();
  container.replaceChildren();
  if (state.previewRecords.length === 0) return;

  if (report.id === "comparison") {
    container.append(createComparisonChart());
  } else if (report.id === "gap") {
    const categories = categoriesBelowThreshold(state.previewRecords, state.filters.groupBy, Number(state.filters.gapThreshold));
    container.append(createBarChart(
      `Categories below ${state.filters.gapThreshold}%`,
      `Share of catalog grouped by ${groupLabel(state.filters.groupBy)}. Only categories below the user-defined threshold are shown.`,
      categories.map(function (item) { return { ...item, count: item.share }; }),
      function (item) { return `${item.share.toFixed(1)}%`; }
    ));
  } else {
    const field = report.id === "recent" ? "dateAdded" : state.filters.groupBy;
    const categories = field === "dateAdded"
      ? countCategories(state.previewRecords.map(function (record) { return { ...record, month: monthKey(record) }; }), "month")
      : countCategories(state.previewRecords, field);
    container.append(createBarChart(
      report.id === "recent" ? "Titles added over time" : `Distribution by ${groupLabel(field)}`,
      "Each bar shows a calculated record count from the current preview.",
      categories
    ));
    if (report.id === "recent") {
      container.append(createBarChart("Distribution by genre", "Genre counts for titles in the selected date range.", countCategories(state.previewRecords, "genre")));
    }
  }
}

function formatDate(date) {
  return date ? new Intl.DateTimeFormat("en-US").format(date) : "Unknown";
}

function renderTable() {
  const body = document.querySelector("#preview-table-body");
  body.replaceChildren();
  document.querySelector("#matching-count").textContent = `${state.previewRecords.length} records`;
  const empty = state.previewRecords.length === 0;
  document.querySelector("#preview-empty").hidden = !empty;
  document.querySelector("#preview-table-scroll").hidden = empty;
  generateReportButton.disabled = empty;

  state.previewRecords.forEach(function (record) {
    const row = document.createElement("tr");
    [record.title, record.type, record.genre, record.country, record.releaseYear, record.rating, formatDate(record.dateAdded)].forEach(function (value) {
      const cell = document.createElement("td");
      cell.textContent = displayValue(value);
      row.append(cell);
    });
    body.append(row);
  });
}

function filterSummary() {
  const report = selectedReport();
  const excluded = new Set(["groupBy"]);
  const labels = {
    dateFrom: "Date from", dateTo: "Date to", type: "Type", country: "Country",
    genre: "Genre", rating: "Rating", releaseYearFrom: "Release year from",
    releaseYearTo: "Release year to", periodAStart: "Period A start",
    periodAEnd: "Period A end", periodBStart: "Period B start",
    periodBEnd: "Period B end", gapThreshold: "Gap threshold"
  };
  const parts = Object.entries(state.filters).filter(function (entry) {
    return entry[1] && !excluded.has(entry[0]);
  }).map(function (entry) {
    return `${labels[entry[0]]}: ${entry[1]}${entry[0] === "gapThreshold" ? "%" : ""}`;
  });
  return `${report.name}${parts.length ? ` · ${parts.join(" · ")}` : " · No optional filters"}`;
}

function renderPreview() {
  preparePreview();
  document.querySelector("#preview-report-type").textContent = selectedReport().name;
  document.querySelector("#preview-context").textContent = filterSummary();
  renderKpis(document.querySelector("#preview-kpis"), state.previewRecords);
  renderCharts(document.querySelector("#preview-charts"));
  renderTable();
}

function buildSummary() {
  const report = selectedReport();
  const records = state.previewRecords;
  const top = report.id === "distribution" || report.id === "custom"
    ? topCategory(records, state.filters.groupBy)
    : topCategory(records, "genre");

  if (report.id === "comparison") {
    const a = state.comparison.periodA.length;
    const b = state.comparison.periodB.length;
    const change = calculatePercentageChange(a, b);
    return `Period A contains ${a} titles and Period B contains ${b} titles. ${
      change === null
        ? "Percentage change is not available because Period A contains zero titles."
        : `The record-count percentage change from Period A to Period B is ${change.toFixed(1)}%.`
    }`;
  }
  if (report.id === "gap") {
    const gaps = categoriesBelowThreshold(records, state.filters.groupBy, Number(state.filters.gapThreshold));
    return `${gaps.length} categories fall below the user-defined ${state.filters.gapThreshold}% share threshold when grouped by ${groupLabel(state.filters.groupBy)}.`;
  }
  const dateSentence = report.id === "recent"
    ? `From ${state.filters.dateFrom} through ${state.filters.dateTo}, `
    : "";
  return `${dateSentence}${records.length} titles match the report settings.${
    top ? ` ${top.label} is the largest measured category with ${top.count} titles (${calculatePercentage(top.count, records.length).toFixed(1)}%).` : ""
  }`;
}

function keyFindings() {
  const findings = [];
  const records = state.previewRecords;
  const genre = topCategory(records, "genre");
  const country = topCategory(records, "country");
  const type = topCategory(records, "type");
  if (genre) findings.push(`${genre.label} is the largest genre with ${genre.count} titles.`);
  if (country) findings.push(`${country.label} is the largest country category with ${country.count} titles.`);
  if (type) findings.push(`${type.label} accounts for ${calculatePercentage(type.count, records.length).toFixed(1)}% of matching records.`);
  if (state.selectedReportId === "comparison") {
    const difference = state.comparison.periodB.length - state.comparison.periodA.length;
    findings.push(`Period B has ${Math.abs(difference)} ${difference >= 0 ? "more" : "fewer"} titles than Period A (record-count difference).`);
  }
  return findings;
}

function renderExecutiveReport() {
  const report = selectedReport();
  document.querySelector("#executive-heading").textContent = report.name;
  document.querySelector("#executive-context").textContent = filterSummary();
  document.querySelector("#generated-date").textContent = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date());
  renderKpis(document.querySelector("#executive-kpis"), state.previewRecords);
  renderCharts(document.querySelector("#executive-charts"));
  document.querySelector("#executive-summary").textContent = buildSummary();
  const list = document.querySelector("#key-findings");
  list.replaceChildren();
  keyFindings().forEach(function (finding) {
    const item = document.createElement("li");
    item.textContent = finding;
    list.append(item);
  });
  state.generatedReport = true;
}

function handleConfigurationSubmit(event) {
  event.preventDefault();
  const filters = formValues(configurationForm);
  const error = validateConfiguration(filters);
  if (error) {
    configurationError.textContent = error;
    configurationError.hidden = false;
    showStatus(error);
    return;
  }
  configurationError.hidden = true;
  state.filters = filters;
  renderPreview();
  showScreen("preview");
  showStatus(`${state.previewRecords.length} matching titles calculated.`);
}

function resetApplication() {
  if (state.catalog.length > 0 && !window.confirm("Start over and remove the current catalog from memory?")) return;
  state.catalog = [];
  state.detectedFields = [];
  state.selectedReportId = "";
  state.filters = {};
  state.previewRecords = [];
  state.comparison = null;
  state.generatedReport = false;
  fileInput.value = "";
  uploadContinueButton.disabled = true;
  startOverButton.hidden = true;
  document.querySelector("#detected-fields").hidden = true;
  renderUploadMessage("neutral", "No file selected", "Upload a CSV to begin the reporting workflow.");
  showScreen("upload");
}

// The native button supplies keyboard access to the visually hidden file input.
browseFileButton.addEventListener("click", function () { fileInput.click(); });
["dragenter", "dragover"].forEach(function (eventName) {
  dropZone.addEventListener(eventName, function (event) {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});
["dragleave", "drop"].forEach(function (eventName) {
  dropZone.addEventListener(eventName, function (event) {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});
dropZone.addEventListener("drop", function (event) {
  processFile(event.dataTransfer.files[0]);
});
fileInput.addEventListener("change", function () {
  processFile(fileInput.files[0]);
});

uploadContinueButton.addEventListener("click", function () {
  renderReportTypes();
  showScreen("reportType");
});
reportTypeContinueButton.addEventListener("click", function () {
  renderConfiguration();
  showScreen("configure");
});
configurationForm.addEventListener("submit", handleConfigurationSubmit);
configurationForm.addEventListener("reset", function () {
  window.setTimeout(function () {
    state.filters = {};
    configurationError.hidden = true;
    showStatus("Report settings cleared.");
  }, 0);
});
generateReportButton.addEventListener("click", function () {
  renderExecutiveReport();
  showScreen("executive");
});
startOverButton.addEventListener("click", resetApplication);

document.querySelectorAll("[data-go-screen]").forEach(function (button) {
  button.addEventListener("click", function () {
    showScreen(button.dataset.goScreen);
  });
});
