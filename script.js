const state = {
  catalog: [],
  detectedFields: [],
  datasetSource: "",
  cleaningSummary: null,
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
const themeToggle = document.querySelector("#theme-toggle");

function savedTheme() {
  try {
    return window.localStorage.getItem("catalogLensTheme");
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  const isLight = theme === "light";
  document.documentElement.dataset.theme = isLight ? "light" : "dark";
  themeToggle.setAttribute("aria-pressed", String(isLight));
  themeToggle.querySelector(".theme-toggle-icon").textContent = isLight ? "☾" : "☀";
  themeToggle.querySelector(".theme-toggle-label").textContent = isLight ? "Dark mode" : "Light mode";
  themeToggle.title = isLight ? "Switch to dark mode" : "Switch to light mode";
}

// Use a saved choice first; otherwise respect the device preference. This only
// changes CSS colors and never resets the uploaded catalog or report settings.
const initialTheme = savedTheme()
  || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
applyTheme(initialTheme);

const introScreen = document.querySelector("#intro-screen");
const introGetStarted = document.querySelector("#intro-get-started");
const introSkip = document.querySelector("#intro-skip");
const appRegions = [document.querySelector(".topbar"), document.querySelector(".app-shell")];
const introTransitionDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 480;
let introTimer;
let introClosing = false;

function introWasSeen() {
  try {
    return window.sessionStorage.getItem("catalogLensIntroSeen") === "true";
  } catch {
    return false;
  }
}

function rememberIntro() {
  try {
    window.sessionStorage.setItem("catalogLensIntroSeen", "true");
  } catch {
    // The intro can still close normally if browser session storage is blocked.
  }
}

function setApplicationInert(isInert) {
  appRegions.forEach(function (region) {
    region.inert = isInert;
    if (isInert) region.setAttribute("aria-hidden", "true");
    else region.removeAttribute("aria-hidden");
  });
}

function closeIntro() {
  if (introClosing || introScreen.hidden) return;
  introClosing = true;
  window.clearTimeout(introTimer);
  rememberIntro();
  introScreen.classList.add("is-leaving");
  document.body.classList.remove("intro-active");

  window.setTimeout(function () {
    introScreen.hidden = true;
    introScreen.setAttribute("aria-hidden", "true");
    setApplicationInert(false);
    browseFileButton.focus({ preventScroll: true });
  }, introTransitionDuration);
}

function initializeIntro() {
  if (introWasSeen()) {
    introScreen.hidden = true;
    introScreen.setAttribute("aria-hidden", "true");
    return;
  }

  document.body.classList.add("intro-active");
  setApplicationInert(true);
  window.setTimeout(function () {
    introGetStarted.focus({ preventScroll: true });
  }, 0);
  introTimer = window.setTimeout(closeIntro, 4000);
}

introGetStarted.addEventListener("click", closeIntro);
introSkip.addEventListener("click", closeIntro);
introScreen.addEventListener("keydown", function (event) {
  if (event.key === "Escape") closeIntro();
  if (event.key === "Tab") {
    const firstControl = introGetStarted;
    const lastControl = introSkip;
    if (event.shiftKey && document.activeElement === firstControl) {
      event.preventDefault();
      lastControl.focus();
    } else if (!event.shiftKey && document.activeElement === lastControl) {
      event.preventDefault();
      firstControl.focus();
    }
  }
});
initializeIntro();

const fieldAliases = {
  title: ["title", "name"],
  type: ["type", "contenttype", "content_type", "content type"],
  country: ["country", "countryoforigin", "country_of_origin", "region"],
  genre: ["genre", "category", "listed_in", "listed in"],
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

// These presets replace open date fields in Recent Additions. The labels explain
// whether a period is rolling, complete, or still in progress.
const reportPeriodOptions = [
  { value: "entireCatalog", label: "Entire catalog history" },
  { value: "last30Days", label: "Last 30 days (rolling)" },
  { value: "previousMonth", label: "Previous calendar month (complete)" },
  { value: "currentQuarter", label: "Current catalog quarter (to latest date)" },
  { value: "previousQuarter", label: "Previous calendar quarter (complete)" },
  { value: "yearToDate", label: "Catalog year to date" },
  { value: "last12Months", label: "Last 12 months (rolling)" }
];

const comparisonPeriodOptions = [
  { value: "recent30VsPrevious30", label: "Latest 30 days vs previous 30 days" },
  { value: "currentMonthVsPreviousMonth", label: "Current catalog month vs previous month" },
  { value: "currentQuarterVsPreviousQuarter", label: "Current catalog quarter vs previous quarter" },
  { value: "yearToDateVsPreviousYear", label: "Catalog year to date vs previous year" }
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
  let missingTitles = 0;
  const sourceRecords = [];

  rows.slice(1).forEach(function (row, rowIndex) {
    const raw = {};
    const canonical = {};
    rawHeaders.forEach(function (header, columnIndex) {
      raw[header] = row[columnIndex] ?? "";
    });
    canonicalHeaders.forEach(function (field, columnIndex) {
      if (field) canonical[field] = row[columnIndex] ?? "";
    });

    if (String(canonical.title || "").trim() === "") missingTitles += 1;
    sourceRecords.push({
      id: rowIndex + 1,
      raw,
      canonical
    });
  });

  const cleaned = window.CatalogDataCleaning.cleanRecords(sourceRecords);
  return {
    records: cleaned.records,
    cleaningSummary: cleaned.summary,
    detected,
    missingTitles,
    rawHeaders
  };
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
  const summary = result.cleaningSummary;
  document.querySelector("#import-details").textContent =
    `${fileName} · ${summary.totalRecordsProcessed} titles · ${summary.whitespaceValuesTrimmed} whitespace values trimmed · ${summary.datesSuccessfullyParsed} dates parsed · ${summary.datesLeftMissingOrInvalid} dates missing or invalid · ${summary.suspiciousRatingDurationRecordsCorrected} rating/duration corrections`;
  container.hidden = false;
}

function setDataset(result, source) {
  state.catalog = result.records;
  state.detectedFields = result.detected;
  state.datasetSource = source;
  state.cleaningSummary = result.cleaningSummary;
  state.selectedReportId = "";
  state.filters = {};
  state.previewRecords = [];
  state.comparison = null;
  state.generatedReport = false;
  renderDetectedFields(result, source === "default" ? "netflix_titles.csv" : "Custom CSV");
  uploadContinueButton.disabled = false;
  startOverButton.hidden = false;

  const sourceLabel = source === "default"
    ? "Netflix Movies and TV Shows dataset (Kaggle)"
    : "Custom dataset";
  renderUploadMessage("success", `Loaded: ${sourceLabel}`, `${result.cleaningSummary.totalRecordsProcessed} titles are ready.`);
  showStatus(`Loaded: ${sourceLabel}. ${result.cleaningSummary.totalRecordsProcessed} titles are ready.`);
}

async function loadDefaultDataset() {
  renderUploadMessage("loading", "Loading default catalog", "Preparing the Netflix Movies and TV Shows dataset…");
  try {
    const response = await fetch("public/data/netflix_titles.csv");
    if (!response.ok) throw new Error(`The default dataset request failed (${response.status}).`);
    const result = parseCatalogCsv(await response.text());
    setDataset(result, "default");
  } catch (error) {
    uploadContinueButton.disabled = true;
    document.querySelector("#detected-fields").hidden = true;
    renderUploadMessage("error", "Default catalog could not be loaded", "You can still upload a compatible CSV below.");
    showStatus(`Default dataset error: ${error.message}`);
  }
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
    setDataset(result, "custom");
  } catch (error) {
    state.catalog = [];
    uploadContinueButton.disabled = true;
    document.querySelector("#detected-fields").hidden = true;
    renderUploadMessage("error", "Catalog could not be imported", error.message);
    showStatus(`Upload error: ${error.message}`);
  }
}

function renderReportTypes() {
  // This function rebuilds the report cards from reportDefinitions in data.js.
  // Keeping the report information in data.js prevents us from repeating names
  // and descriptions in both the HTML and JavaScript files.
  const grid = document.querySelector("#report-type-grid");
  grid.replaceChildren();

  reportDefinitions.forEach(function (report) {
    // Each report card contains a real radio input. Radio inputs are useful here
    // because the user must select exactly one report type before continuing.
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
      // Save the selected report in application state. Later screens read this
      // value to decide which configuration fields and calculations to display.
      state.selectedReportId = report.id;

      // The Continue button starts disabled so the user cannot advance without
      // making a valid report selection.
      reportTypeContinueButton.disabled = false;

      // Update the visual selection state without changing the radio input's
      // native keyboard and screen-reader behavior.
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
  const values = field === "country" || field === "genre"
    ? categoryAssignments(state.catalog, field).map(function (record) { return record[field]; })
    : state.catalog.map(function (record) { return record[field]; });
  return [...new Set(
    values.filter(function (value) { return value !== null && String(value).trim() !== ""; })
  )].sort(function (a, b) {
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
}

function toIsoDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function latestCatalogDate() {
  const validDates = state.catalog.map(function (record) {
    return record.dateAdded;
  }).filter(Boolean);
  if (validDates.length === 0) return null;
  return new Date(Math.max(...validDates.map(function (date) { return date.getTime(); })));
}

function earliestCatalogDate() {
  const validDates = state.catalog.map(function (record) {
    return record.dateAdded;
  }).filter(Boolean);
  if (validDates.length === 0) return null;
  return new Date(Math.min(...validDates.map(function (date) { return date.getTime(); })));
}

function shiftUtcDate(date, values) {
  const result = new Date(date.getTime());
  if (values.years) result.setUTCFullYear(result.getUTCFullYear() + values.years);
  if (values.months) result.setUTCMonth(result.getUTCMonth() + values.months);
  if (values.days) result.setUTCDate(result.getUTCDate() + values.days);
  return result;
}

function resolveReportingPeriod(period, anchorDate) {
  if (!anchorDate) return null;
  const year = anchorDate.getUTCFullYear();
  const month = anchorDate.getUTCMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  let start;
  let end;

  if (period === "entireCatalog") {
    const earliest = earliestCatalogDate();
    if (!earliest) return null;
    start = earliest;
    end = anchorDate;
  } else if (period === "last30Days") {
    start = shiftUtcDate(anchorDate, { days: -29 });
    end = anchorDate;
  } else if (period === "previousMonth") {
    start = new Date(Date.UTC(year, month - 1, 1));
    end = new Date(Date.UTC(year, month, 0));
  } else if (period === "currentQuarter") {
    start = new Date(Date.UTC(year, quarterStartMonth, 1));
    end = anchorDate;
  } else if (period === "previousQuarter") {
    start = new Date(Date.UTC(year, quarterStartMonth - 3, 1));
    end = new Date(Date.UTC(year, quarterStartMonth, 0));
  } else if (period === "yearToDate") {
    start = new Date(Date.UTC(year, 0, 1));
    end = anchorDate;
  } else if (period === "last12Months") {
    start = shiftUtcDate(anchorDate, { years: -1, days: 1 });
    end = anchorDate;
  } else {
    return null;
  }

  return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
}

function reportPeriodLabel(value) {
  return reportPeriodOptions.find(function (option) {
    return option.value === value;
  })?.label || value;
}

function comparisonPeriodLabel(value) {
  return comparisonPeriodOptions.find(function (option) {
    return option.value === value;
  })?.label || value;
}

function resolveComparisonPeriod(period, anchorDate) {
  if (!anchorDate) return null;
  const year = anchorDate.getUTCFullYear();
  const month = anchorDate.getUTCMonth();
  const day = anchorDate.getUTCDate();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  let periodAStart;
  let periodAEnd;
  let periodBStart;
  let periodBEnd;

  if (period === "recent30VsPrevious30") {
    periodBStart = shiftUtcDate(anchorDate, { days: -29 });
    periodBEnd = anchorDate;
    periodAEnd = shiftUtcDate(periodBStart, { days: -1 });
    periodAStart = shiftUtcDate(periodAEnd, { days: -29 });
  } else if (period === "currentMonthVsPreviousMonth") {
    periodBStart = new Date(Date.UTC(year, month, 1));
    periodBEnd = anchorDate;
    periodAStart = new Date(Date.UTC(year, month - 1, 1));
    // Use the same elapsed day when possible so partial months are comparable.
    periodAEnd = new Date(Date.UTC(year, month - 1, Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate())));
  } else if (period === "currentQuarterVsPreviousQuarter") {
    periodBStart = new Date(Date.UTC(year, quarterStartMonth, 1));
    periodBEnd = anchorDate;
    const elapsedDays = Math.round((periodBEnd - periodBStart) / 86400000);
    periodAStart = new Date(Date.UTC(year, quarterStartMonth - 3, 1));
    const previousQuarterEnd = new Date(Date.UTC(year, quarterStartMonth, 0));
    periodAEnd = shiftUtcDate(periodAStart, { days: elapsedDays });
    if (periodAEnd > previousQuarterEnd) periodAEnd = previousQuarterEnd;
  } else if (period === "yearToDateVsPreviousYear") {
    periodBStart = new Date(Date.UTC(year, 0, 1));
    periodBEnd = anchorDate;
    periodAStart = new Date(Date.UTC(year - 1, 0, 1));
    const previousYearMonthEnd = new Date(Date.UTC(year - 1, month + 1, 0)).getUTCDate();
    periodAEnd = new Date(Date.UTC(year - 1, month, Math.min(day, previousYearMonthEnd)));
  } else {
    return null;
  }

  return {
    periodAStart: toIsoDate(periodAStart),
    periodAEnd: toIsoDate(periodAEnd),
    periodBStart: toIsoDate(periodBStart),
    periodBEnd: toIsoDate(periodBEnd)
  };
}

function createReportingPeriodField() {
  const wrapper = createField("Reporting period", "reportPeriod", "select", reportPeriodOptions, true);
  const select = wrapper.querySelector("select");
  const explanation = document.createElement("p");
  explanation.className = "field-help";

  function updateExplanation() {
    const anchor = latestCatalogDate();
    const range = resolveReportingPeriod(select.value, anchor);
    explanation.textContent = range
      ? `${reportPeriodLabel(select.value)} resolves to ${range.dateFrom} through ${range.dateTo}, based on the latest valid catalog date (${toIsoDate(anchor)}).`
      : "Choose a preset. CatalogLens will show the exact dates before applying the report.";
  }

  // Showing the resolved dates removes ambiguity without asking a beginner to
  // manually calculate month or quarter boundaries.
  select.addEventListener("change", updateExplanation);
  updateExplanation();
  wrapper.append(explanation);
  return wrapper;
}

function createComparisonPeriodField() {
  const wrapper = createField("Comparison period", "comparisonPeriod", "select", comparisonPeriodOptions, true);
  const select = wrapper.querySelector("select");
  const explanation = document.createElement("p");
  explanation.className = "field-help";

  function updateExplanation() {
    const range = resolveComparisonPeriod(select.value, latestCatalogDate());
    explanation.textContent = range
      ? `${comparisonPeriodLabel(select.value)}: Period A is ${range.periodAStart} through ${range.periodAEnd}; Period B is ${range.periodBStart} through ${range.periodBEnd}.`
      : "Choose a preset comparison. CatalogLens will show both exact periods before applying the report.";
  }

  select.addEventListener("change", updateExplanation);
  updateExplanation();
  wrapper.append(explanation);
  return wrapper;
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

function addCommonFilters(container, includeReleaseYears) {
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
  // Read the report selected on the previous screen. The selected report
  // controls which fields are relevant to the user's current business question.
  const report = selectedReport();
  document.querySelector("#selected-report-name").textContent = report.name;
  document.querySelector("#configure-description").textContent = report.description;

  // Remove fields from a previously selected report before adding the new ones.
  // replaceChildren() avoids leaving old controls or duplicate element IDs behind.
  configurationFields.replaceChildren();
  configurationError.hidden = true;

  if (report.id === "recent") {
    // A required preset is more consistent for a recurring report than two open
    // dates. It also prevents reversed or incomplete date ranges.
    configurationFields.append(createReportingPeriodField());
    addCommonFilters(configurationFields, false);
  } else if (report.id === "distribution") {
    // Distribution Analysis must know which catalog field should define the
    // chart categories, such as genre, country, type, or rating.
    configurationFields.append(
      createReportingPeriodField(),
      createField("Group results by", "groupBy", "select", groupFields, true)
    );
    addCommonFilters(configurationFields, false);
  } else if (report.id === "comparison") {
    // One comparison preset creates two equivalent periods. This keeps the form
    // consistent while preventing accidental comparisons of unrelated lengths.
    configurationFields.append(
      createComparisonPeriodField(),
      createField("Compare by", "groupBy", "select", groupFields, true)
    );
  } else if (report.id === "gap") {
    // Gap Analysis never invents an "underrepresented" category. The user must
    // provide a measurable percentage threshold for the calculation.
    configurationFields.append(
      createReportingPeriodField(),
      createField("Analyze categories by", "groupBy", "select", groupFields, true),
      createField("Gap threshold percentage", "gapThreshold", "number", [], true)
    );
  } else {
    // Custom Report exposes the broadest set of optional filters while still
    // requiring one grouping field so that a meaningful chart can be created.
    configurationFields.append(
      createReportingPeriodField(),
      createField("Group results by", "groupBy", "select", groupFields, true)
    );
    addCommonFilters(configurationFields, true);
  }
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function validateConfiguration(filters) {
  const report = selectedReport();
  const requiredByReport = {
    recent: ["reportPeriod"],
    distribution: ["reportPeriod", "groupBy"],
    comparison: ["comparisonPeriod", "groupBy"],
    gap: ["reportPeriod", "groupBy", "gapThreshold"],
    custom: ["reportPeriod", "groupBy"]
  };
  const missing = requiredByReport[report.id].some(function (name) { return !filters[name]; });
  if (missing) return "Complete all required report settings.";

  if (report.id === "gap") {
    const threshold = Number(filters.gapThreshold);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
      return "Gap threshold must be between 0 and 100.";
    }
  }
  return "";
}

function recordMatchesFilters(record, filters) {
  const equalityFields = ["type", "rating"];
  const matchesSelections = equalityFields.every(function (field) {
    return !filters[field] || normalizeText(record[field]) === normalizeText(filters[field]);
  });
  if (!matchesSelections) return false;
  const matchesCategories = ["country", "genre"].every(function (field) {
    return !filters[field] || splitCategoryValues(record[field]).some(function (value) {
      return normalizeText(value) === normalizeText(filters[field]);
    });
  });
  if (!matchesCategories) return false;
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
  const recordsToGroup = field === "country" || field === "genre"
    ? categoryAssignments(records, field)
    : uniqueTitleRecords(records);
  return recordsToGroup.reduce(function (groups, record) {
    const label = displayValue(record[field]);
    if (!groups[label]) groups[label] = [];
    groups[label].push(record);
    return groups;
  }, {});
}

function splitCategoryValues(value) {
  const values = String(value ?? "").split(",").map(function (item) {
    return item.trim();
  }).filter(Boolean);
  return values.length ? [...new Set(values)] : ["Unknown"];
}

function categoryAssignments(records, field) {
  return records.flatMap(function (record) {
    return splitCategoryValues(record[field]).map(function (value) {
      return {
        showId: record.showId,
        [field]: value
      };
    });
  });
}

function uniqueTitleRecords(records) {
  return [...new Map(records.map(function (record) {
    return [record.sourceRecordId ?? record.showId ?? record.id, record];
  })).values()];
}

function uniqueTitleCount(records) {
  return uniqueTitleRecords(records).length;
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
  const categories = countCategories(records, field);
  const total = categories.reduce(function (sum, category) {
    return sum + category.count;
  }, 0);
  return categories
    .map(function (category) {
      return { ...category, share: calculatePercentage(category.count, total) };
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
  } else {
    state.previewRecords = filterRecords(state.catalog, state.filters);
  }
}

function topCategory(records, field) {
  const categories = countCategories(records, field).filter(function (category) {
    return category.label !== "Not provided" && category.label !== "Unknown";
  });
  return categories[0] || null;
}

function calculateKpis(records) {
  const countries = countCategories(records, "country").filter(function (category) {
    return category.label !== "Unknown";
  });
  const genres = countCategories(records, "genre").filter(function (category) {
    return category.label !== "Unknown";
  });
  return {
    total: uniqueTitleCount(records),
    countries: countries.length,
    genres: genres.length,
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

const executiveChartColors = ["#5635c6", "#5791df", "#25a18e", "#e09f3e", "#d65d7a", "#8c87a3"];

function createExecutiveVisual(title, description, wide) {
  const card = document.createElement("section");
  card.className = `executive-visual${wide ? " executive-visual-wide" : ""}`;
  const heading = document.createElement("h3");
  heading.textContent = title;
  const text = document.createElement("p");
  text.textContent = description;
  card.append(heading, text);
  return card;
}

function executiveChartRecords() {
  // Comparison charts use Period B as the current period. All other report
  // types use the same records already approved on the Preview screen.
  return state.selectedReportId === "comparison" ? state.comparison.periodB : state.previewRecords;
}

function executiveGroupingField() {
  return state.selectedReportId === "recent" ? "genre" : state.filters.groupBy || "genre";
}

function createDonutVisual(title, description, categories, total) {
  const card = createExecutiveVisual(title, description, false);
  const visible = categories.slice(0, 5);
  const otherCount = categories.slice(5).reduce(function (sum, item) { return sum + item.count; }, 0);
  const parts = otherCount > 0 ? [...visible, { label: "Other", count: otherCount }] : visible;
  const layout = document.createElement("div");
  layout.className = "donut-layout";
  const donut = document.createElement("div");
  donut.className = "donut-chart";
  donut.setAttribute("role", "img");
  donut.setAttribute("aria-label", `${title}. ${parts.map(function (item) { return `${item.label}: ${item.count}`; }).join(", ")}`);
  let currentPercentage = 0;
  donut.style.background = `conic-gradient(${parts.map(function (item, index) {
    const start = currentPercentage;
    currentPercentage += calculatePercentage(item.count, total) || 0;
    return `${executiveChartColors[index % executiveChartColors.length]} ${start}% ${currentPercentage}%`;
  }).join(", ")})`;
  const center = document.createElement("div");
  center.className = "donut-center";
  const centerValue = document.createElement("strong");
  centerValue.textContent = total;
  const centerLabel = document.createElement("span");
  centerLabel.textContent = "titles";
  center.append(centerValue, centerLabel);
  donut.append(center);

  const legend = document.createElement("div");
  legend.className = "donut-legend";

  parts.forEach(function (item, index) {
    const percentage = calculatePercentage(item.count, total) || 0;
    const color = executiveChartColors[index % executiveChartColors.length];
    const row = document.createElement("div");
    row.className = "donut-legend-item";
    const swatch = document.createElement("span");
    swatch.className = "donut-swatch";
    swatch.style.background = color;
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = `${item.count} · ${percentage.toFixed(1)}%`;
    row.append(swatch, label, value);
    legend.append(row);
  });
  layout.append(donut, legend);
  card.append(layout);
  return card;
}

function monthlySeries(records) {
  const counts = uniqueTitleRecords(records).reduce(function (result, record) {
    if (!record.dateAdded) return result;
    const key = `${record.dateAdded.getUTCFullYear()}-${String(record.dateAdded.getUTCMonth() + 1).padStart(2, "0")}`;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  return Object.entries(counts).sort(function (a, b) {
    return a[0].localeCompare(b[0]);
  }).map(function (entry) {
    const date = new Date(`${entry[0]}-01T00:00:00Z`);
    return {
      label: new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date),
      count: entry[1]
    };
  });
}

function createVerticalBarVisual(title, description, categories) {
  const card = createExecutiveVisual(title, description, false);
  const chart = document.createElement("div");
  chart.className = "vertical-bar-chart";
  chart.setAttribute("role", "img");
  chart.setAttribute("aria-label", categories.map(function (item) { return `${item.label}: ${item.count}`; }).join(", "));
  const maximum = Math.max(...categories.map(function (item) { return item.count; }), 1);
  categories.slice(0, 6).forEach(function (item, index) {
    const column = document.createElement("div");
    column.className = "vertical-bar-column";
    const value = document.createElement("strong");
    value.textContent = item.count;
    const track = document.createElement("div");
    track.className = "vertical-bar-track";
    const fill = document.createElement("div");
    fill.className = "vertical-bar-fill";
    fill.style.height = `${(item.count / maximum) * 100}%`;
    fill.style.background = index === 0 ? "#5635c6" : "#8da9eb";
    track.append(fill);
    const label = document.createElement("span");
    label.textContent = item.label;
    column.append(value, track, label);
    chart.append(column);
  });
  card.append(chart);
  return card;
}

function createTrendVisual(records) {
  const series = monthlySeries(records);
  const card = createExecutiveVisual("Titles added over time", "Monthly additions within the selected reporting period.", false);
  const chart = document.createElement("div");
  chart.className = "line-chart";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 300 150");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", series.map(function (item) { return `${item.label}: ${item.count} titles`; }).join(", "));
  const maximum = Math.max(...series.map(function (item) { return item.count; }), 1);
  [25, 60, 95, 130].forEach(function (y) {
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", "15");
    gridLine.setAttribute("x2", "290");
    gridLine.setAttribute("y1", y);
    gridLine.setAttribute("y2", y);
    gridLine.setAttribute("class", "line-grid");
    svg.append(gridLine);
  });
  const points = series.map(function (item, index) {
    const x = series.length === 1 ? 150 : 20 + (index / (series.length - 1)) * 265;
    const y = 130 - (item.count / maximum) * 105;
    return { ...item, x, y };
  });
  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", points.map(function (point) { return `${point.x},${point.y}`; }).join(" "));
  polyline.setAttribute("class", "line-series");
  svg.append(polyline);
  points.forEach(function (point) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", "4");
    circle.setAttribute("class", "line-point");
    svg.append(circle);
  });
  const labels = document.createElement("div");
  labels.className = "line-chart-labels";
  series.forEach(function (item) {
    const label = document.createElement("span");
    label.textContent = item.label;
    labels.append(label);
  });
  chart.append(svg, labels);
  card.append(chart);
  return card;
}

function renderExecutiveCharts(container) {
  const records = executiveChartRecords();
  container.replaceChildren();
  if (records.length === 0) return;
  const groupingField = executiveGroupingField();
  const groupingCategories = countCategories(records, groupingField);
  const groupingTotal = groupingCategories.reduce(function (sum, category) {
    return sum + category.count;
  }, 0);
  const comparisonBars = state.selectedReportId === "comparison"
    ? [
        { label: "Period A", count: uniqueTitleCount(state.comparison.periodA) },
        { label: "Period B", count: uniqueTitleCount(state.comparison.periodB) }
      ]
    : countCategories(records, "country");

  // The three-card layout mirrors a familiar executive dashboard: composition,
  // a direct category comparison, and a time trend. Each card keeps visible
  // values and an accessible text description.
  container.append(
    createDonutVisual(
      `Distribution by ${groupLabel(groupingField)}`,
      `Share of titles grouped by ${groupLabel(groupingField).toLowerCase()}.`,
      groupingCategories,
      groupingTotal
    ),
    createVerticalBarVisual(
      state.selectedReportId === "comparison" ? "Titles by period" : "Titles by country",
      state.selectedReportId === "comparison" ? "Direct record-count comparison." : "Top six country categories.",
      comparisonBars
    ),
    createTrendVisual(records)
  );
}

function formatDate(date) {
  return date ? new Intl.DateTimeFormat("en-US").format(date) : "Unknown";
}

function renderTable() {
  const body = document.querySelector("#preview-table-body");
  body.replaceChildren();
  const titleCount = uniqueTitleCount(state.previewRecords);
  document.querySelector("#matching-count").textContent = `${titleCount} titles`;
  const empty = state.previewRecords.length === 0;
  document.querySelector("#preview-empty").hidden = !empty;
  document.querySelector("#preview-table-scroll").hidden = empty;
  generateReportButton.disabled = empty;

  state.previewRecords.forEach(function (record) {
    const row = document.createElement("tr");
    const columns = [
      { label: "Title", value: record.title },
      { label: "Type", value: record.type },
      { label: "Genre", value: record.genre },
      { label: "Country", value: record.country },
      { label: "Release year", value: record.releaseYear },
      { label: "Rating", value: record.rating },
      { label: "Date added", value: formatDate(record.dateAdded) }
    ];
    columns.forEach(function (column) {
      const cell = document.createElement("td");
      cell.dataset.label = column.label;
      cell.textContent = displayValue(column.value);
      row.append(cell);
    });
    body.append(row);
  });
}

function filterSummary() {
  const report = selectedReport();
  const excluded = new Set(["groupBy"]);
  if (report.id !== "comparison") {
    // The preset and its exact resolved dates describe the same choice. Keep the
    // human-readable preset in the summary instead of repeating both raw dates.
    excluded.add("dateFrom");
    excluded.add("dateTo");
  } else {
    excluded.add("periodAStart");
    excluded.add("periodAEnd");
    excluded.add("periodBStart");
    excluded.add("periodBEnd");
  }
  const labels = {
    dateFrom: "Date from", dateTo: "Date to", type: "Type", country: "Country",
    genre: "Genre", rating: "Rating", releaseYearFrom: "Release year from",
    releaseYearTo: "Release year to", periodAStart: "Period A start",
    periodAEnd: "Period A end", periodBStart: "Period B start",
    periodBEnd: "Period B end", gapThreshold: "Gap threshold",
    reportPeriod: "Reporting period", comparisonPeriod: "Comparison period"
  };
  const parts = Object.entries(state.filters).filter(function (entry) {
    return entry[1] && !excluded.has(entry[0]);
  }).map(function (entry) {
    const value = entry[0] === "reportPeriod"
      ? reportPeriodLabel(entry[1])
      : entry[0] === "comparisonPeriod" ? comparisonPeriodLabel(entry[1]) : entry[1];
    return `${labels[entry[0]]}: ${value}${entry[0] === "gapThreshold" ? "%" : ""}`;
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
    const a = uniqueTitleCount(state.comparison.periodA);
    const b = uniqueTitleCount(state.comparison.periodB);
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
  const titleCount = uniqueTitleCount(records);
  const groupedTotal = countCategories(records, report.id === "distribution" || report.id === "custom" ? state.filters.groupBy : "genre")
    .reduce(function (sum, category) { return sum + category.count; }, 0);
  return `${dateSentence}${titleCount} titles match the report settings.${
    top ? ` ${top.label} is the largest measured category with ${top.count} titles (${calculatePercentage(top.count, groupedTotal).toFixed(1)}%).` : ""
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
  if (type) findings.push(`${type.label} accounts for ${calculatePercentage(type.count, uniqueTitleCount(records)).toFixed(1)}% of matching titles.`);
  if (state.selectedReportId === "comparison") {
    const difference = uniqueTitleCount(state.comparison.periodB) - uniqueTitleCount(state.comparison.periodA);
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
  // Executive charts intentionally use a different visual system from Preview.
  // Preview supports verification; this view ranks and summarizes the results.
  renderExecutiveCharts(document.querySelector("#executive-charts"));
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
  // Prevent the browser's default form submission, which would reload the page
  // and erase the uploaded catalog stored in JavaScript memory.
  event.preventDefault();

  // Convert the current form controls into a plain object. For example:
  // { groupBy: "genre", country: "Colombia", dateFrom: "2025-01-01" }
  const filters = formValues(configurationForm);

  // Validation depends on the selected report. A comparison needs a comparison
  // preset, while a gap report also needs a grouping field and threshold.
  const error = validateConfiguration(filters);
  if (error) {
    // Keep the user on this screen, show a visible message, and announce the
    // same message through the page's aria-live status area.
    configurationError.textContent = error;
    configurationError.hidden = false;
    showStatus(error);
    return;
  }
  configurationError.hidden = true;

  if (state.selectedReportId === "comparison") {
    // The comparison preset becomes two concrete, equivalent date ranges used
    // by the existing comparison calculation.
    const comparisonRange = resolveComparisonPeriod(filters.comparisonPeriod, latestCatalogDate());
    if (!comparisonRange) {
      configurationError.textContent = "The catalog needs at least one valid date to compare reporting periods.";
      configurationError.hidden = false;
      showStatus(configurationError.textContent);
      return;
    }
    Object.assign(filters, comparisonRange);
  } else {
    // Relative presets need concrete boundaries before the shared filtering
    // function can use them. The latest valid catalog date is the report anchor,
    // so archived catalogs still produce meaningful recurring reports.
    const range = resolveReportingPeriod(filters.reportPeriod, latestCatalogDate());
    if (!range) {
      configurationError.textContent = "The catalog needs at least one valid date to use a preset reporting period.";
      configurationError.hidden = false;
      showStatus(configurationError.textContent);
      return;
    }
    Object.assign(filters, range);
  }

  // Save validated settings in shared state so Back navigation and the final
  // executive report use the same configuration as the preview.
  state.filters = filters;

  // renderPreview() performs the report-specific filtering and calculations,
  // then renders KPI cards, charts, and the matching-titles table.
  renderPreview();

  // Only advance after the configuration is valid and the preview is ready.
  showScreen("preview");
  showStatus(`${uniqueTitleCount(state.previewRecords)} matching titles calculated.`);
}

function resetApplication() {
  if (state.catalog.length > 0 && !window.confirm("Start over and restore the default Netflix catalog?")) return;
  state.selectedReportId = "";
  state.filters = {};
  state.previewRecords = [];
  state.comparison = null;
  state.generatedReport = false;
  fileInput.value = "";
  showScreen("upload");
  loadDefaultDataset();
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
    // Rebuild the fields so dynamic help text returns to its unselected state
    // together with the native form controls.
    renderConfiguration();
    configurationError.hidden = true;
    showStatus("Report settings cleared.");
  }, 0);
});
generateReportButton.addEventListener("click", function () {
  renderExecutiveReport();
  showScreen("executive");
});
startOverButton.addEventListener("click", resetApplication);
themeToggle.addEventListener("click", function () {
  const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  applyTheme(nextTheme);
  try {
    window.localStorage.setItem("catalogLensTheme", nextTheme);
  } catch {
    // The switch still works for this page visit if browser storage is blocked.
  }
});

document.querySelectorAll("[data-go-screen]").forEach(function (button) {
  button.addEventListener("click", function () {
    showScreen(button.dataset.goScreen);
  });
});

loadDefaultDataset();
