const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const csvPath = path.join(projectRoot, "public/data/netflix_titles.csv");
const expectedCsvHash = "df1f4ad2027a5a14c3a33932ef0d4054565ff88adf92b7f263601b70fdc6f3f3";
const expectedRatings = new Set([
  "", "G", "NC-17", "NR", "PG", "PG-13", "R", "TV-14", "TV-G",
  "TV-MA", "TV-PG", "TV-Y", "TV-Y7", "TV-Y7-FV", "UR"
]);

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.className = "";
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.value = "";
    this.checked = false;
    this.classList = {
      add: () => {},
      remove: () => {},
      toggle: () => {}
    };
  }

  addEventListener() {}
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  querySelector() { return new FakeElement(); }
  contains(element) { return this === element || this.children.includes(element); }
  focus() {}
}

function createApplicationHarness() {
  const elements = new Map();
  const document = {
    documentElement: new FakeElement("html"),
    body: new FakeElement("body"),
    activeElement: null,
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, new FakeElement());
      return elements.get(selector);
    },
    querySelectorAll() { return []; },
    createElement(tagName) { return new FakeElement(tagName); },
    createElementNS(namespace, tagName) { return new FakeElement(tagName); }
  };

  const context = {
    console,
    Date,
    Intl,
    Map,
    Set,
    FormData: class {},
    document,
    localStorage: { getItem: () => null, setItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {} },
    matchMedia: () => ({ matches: false }),
    scrollTo: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    confirm: () => true
  };
  context.window = context;
  vm.createContext(context);

  vm.runInContext(
    fs.readFileSync(path.join(projectRoot, "data.js"), "utf8"),
    context
  );
  vm.runInContext(
    fs.readFileSync(path.join(projectRoot, "data-cleaning.js"), "utf8"),
    context
  );

  const applicationSource = fs.readFileSync(path.join(projectRoot, "script.js"), "utf8")
    .replace(/\nloadDefaultDataset\(\);\s*$/, "")
    .concat(`
      globalThis.__app = {
        state,
        parseCatalogCsv,
        displayValue,
        formatDate,
        resolveReportingPeriod,
        resolveComparisonPeriod,
        latestCatalogDate,
        recordsInPeriod,
        filterRecords,
        calculateKpis,
        countCategories,
        categoryAssignments,
        splitCategoryValues,
        preparePreview,
        renderPreview,
        renderTable,
        renderExecutiveReport,
        buildSummary,
        keyFindings
      };
    `);
  vm.runInContext(applicationSource, context);
  return { app: context.__app, elements };
}

function countValues(records, field) {
  return Object.fromEntries(
    [...records.reduce(function (counts, record) {
      const value = record[field];
      counts.set(value, (counts.get(value) || 0) + 1);
      return counts;
    }, new Map()).entries()].sort(function (a, b) {
      return String(a[0]).localeCompare(String(b[0]));
    })
  );
}

function oneRowPerSource(records) {
  return [...new Map(records.map(function (record) {
    return [record.sourceRecordId, record];
  })).values()];
}

function missingCountsBefore(records) {
  const sourceRecords = oneRowPerSource(records);
  const fields = ["director", "cast", "country", "date_added", "rating", "duration"];
  return Object.fromEntries(fields.map(function (field) {
    return [field, sourceRecords.filter(function (record) {
      return String(record.raw[field] ?? "").trim() === "";
    }).length];
  }));
}

function missingCountsAfter(records) {
  const sourceRecords = oneRowPerSource(records);
  const fields = ["director", "cast", "country", "rating", "duration"];
  const counts = Object.fromEntries(fields.map(function (field) {
    return [field, sourceRecords.filter(function (record) {
      return String(record[field] ?? "").trim() === "";
    }).length];
  }));
  counts.date_added = sourceRecords.filter(function (record) { return !record.dateAdded; }).length;
  return counts;
}

function textValuesHaveNoOuterWhitespace(records) {
  const fields = [
    "showId", "title", "type", "country", "genre", "rating", "dateAddedRaw",
    "description", "director", "cast", "duration"
  ];
  return records.every(function (record) {
    return fields.every(function (field) {
      return typeof record[field] !== "string" || record[field] === record[field].trim();
    });
  });
}

function collectText(element, output = []) {
  if (typeof element.textContent === "string" && element.textContent) {
    output.push(element.textContent);
  }
  element.children.forEach(function (child) {
    if (child instanceof FakeElement) collectText(child, output);
  });
  return output;
}

function reportFilters(app, reportId, period) {
  if (reportId === "comparison") {
    return {
      comparisonPeriod: period,
      groupBy: "type",
      ...app.resolveComparisonPeriod(period, app.latestCatalogDate())
    };
  }
  return {
    reportPeriod: period,
    groupBy: reportId === "gap" ? "rating" : "genre",
    gapThreshold: reportId === "gap" ? "5" : "",
    ...app.resolveReportingPeriod(period, app.latestCatalogDate())
  };
}

function run() {
  const failures = [];
  const checks = [];

  function check(name, callback) {
    try {
      callback();
      checks.push({ name, status: "PASS" });
    } catch (error) {
      checks.push({ name, status: "FAIL", error: error.message });
      failures.push({ name, error });
    }
  }

  const originalCsv = fs.readFileSync(csvPath);
  const csvHash = crypto.createHash("sha256").update(originalCsv).digest("hex");
  const { app, elements } = createApplicationHarness();
  const parsed = app.parseCatalogCsv(originalCsv.toString("utf8"));
  app.state.catalog = parsed.records;
  app.state.cleaningSummary = parsed.cleaningSummary;

  const records = parsed.records;
  const sourceRecords = oneRowPerSource(records);
  const rawShowIds = sourceRecords.map(function (record) { return record.raw.show_id; });
  const cleanedShowIds = sourceRecords.map(function (record) { return record.showId; });
  const correctionRows = records.filter(function (record) {
    return record.dataQuality.includes("TARGETED_RATING_DURATION_CORRECTION");
  });
  const corrections = oneRowPerSource(correctionRows);
  const unexpectedRatingsBefore = [...new Set(records
    .map(function (record) { return record.raw.rating; })
    .filter(function (rating) { return !expectedRatings.has(rating); }))].sort();
  const unexpectedRatingsAfter = [...new Set(records
    .map(function (record) { return record.rating; })
    .filter(function (rating) {
      return rating !== "Unknown" && !expectedRatings.has(rating);
    }))].sort();

  check("1. The cleaned catalog keeps one row per title", function () {
    assert.equal(parsed.cleaningSummary.totalRecordsProcessed, 8807);
    assert.equal(records.length, 8807);
  });

  check("2. Every source show_id is preserved", function () {
    assert.deepEqual(cleanedShowIds, rawShowIds);
    assert.equal(new Set(cleanedShowIds).size, 8807);
    assert(records.every(function (record) {
      return record.showId === record.raw.show_id;
    }));
    assert.equal(new Set(records.map(function (record) { return record.id; })).size, 8807);
  });

  check("3. Original CSV hash is unchanged", function () {
    assert.equal(csvHash, expectedCsvHash);
  });

  check("4. Only approved values change", function () {
    records.forEach(function (record) {
      const corrected = record.dataQuality.includes("TARGETED_RATING_DURATION_CORRECTION");
      assert.equal(record.showId, record.raw.show_id.trim());
      assert.equal(record.title, record.raw.title.trim());
      assert.equal(record.type, record.raw.type.trim());
      assert.equal(record.country, record.raw.country.trim());
      assert.equal(record.genre, record.raw.listed_in.trim());
      assert.equal(record.description, record.raw.description.trim());
      assert.equal(record.director, record.raw.director.trim());
      assert.equal(record.cast, record.raw.cast.trim());
      assert.equal(record.dateAddedRaw, record.raw.date_added.trim());
      if (corrected) {
        assert.equal(record.rating, "Unknown");
        assert.equal(record.duration, record.raw.rating.trim());
      } else {
        assert.equal(record.rating, record.raw.rating.trim());
        assert.equal(record.duration, record.raw.duration.trim());
      }
    });
  });

  check("5. Application text has no outer whitespace", function () {
    assert.equal(textValuesHaveNoOuterWhitespace(records), true);
    assert.equal(parsed.cleaningSummary.whitespaceValuesTrimmed, 89);
  });

  check("6. Valid dates filter and sort correctly", function () {
    const dated = records.filter(function (record) { return record.dateAdded; });
    assert.equal(parsed.cleaningSummary.datesSuccessfullyParsed, 8797);
    const sorted = [...dated].sort(function (a, b) { return a.dateAdded - b.dateAdded; });
    assert(sorted.every(function (record, index) {
      return index === 0 || sorted[index - 1].dateAdded <= record.dateAdded;
    }));
    const entire = app.resolveReportingPeriod("entireCatalog", app.latestCatalogDate());
    assert.equal(app.recordsInPeriod(records, entire.dateFrom, entire.dateTo).length, dated.length);
  });

  check("7. Ten missing dates remain safe", function () {
    const missingDates = records.filter(function (record) { return !record.dateAdded; });
    assert.equal(new Set(missingDates.map(function (record) {
      return record.sourceRecordId;
    })).size, 10);
    assert.equal(app.formatDate(null), "Unknown");
    assert.doesNotThrow(function () {
      app.filterRecords(missingDates, {});
      app.calculateKpis(missingDates);
      app.countCategories(missingDates, "type");
    });
  });

  check("8. Missing values have safe interface fallbacks", function () {
    assert.equal(app.displayValue(undefined), "Not provided");
    assert.equal(app.displayValue(null), "Not provided");
    assert.equal(app.displayValue(""), "Not provided");
    app.state.selectedReportId = "custom";
    app.state.filters = reportFilters(app, "custom", "entireCatalog");
    app.renderPreview();
    const visibleText = [...elements.values()].flatMap(function (element) {
      return collectText(element);
    });
    assert.equal(visibleText.includes("undefined"), false);
    assert.equal(visibleText.includes("null"), false);
  });

  check("9. Exactly three targeted rating/duration corrections", function () {
    assert.deepEqual(
      Array.from(corrections, function (record) { return record.showId; }),
      ["s5542", "s5795", "s5814"]
    );
    assert.deepEqual(
      Array.from(corrections, function (record) {
        return [record.raw.rating, record.raw.duration, record.rating, record.duration];
      }),
      [
        ["74 min", "", "Unknown", "74 min"],
        ["84 min", "", "Unknown", "84 min"],
        ["66 min", "", "Unknown", "66 min"]
      ]
    );
    assert.equal(parsed.cleaningSummary.suspiciousRatingDurationRecordsCorrected, 3);
    assert.equal(parsed.cleaningSummary.suspiciousRatingDurationRecordsFlagged, 0);
  });

  check("10. Every report type and period produces report output", function () {
    const standardPeriods = [
      "entireCatalog", "last30Days", "previousMonth", "currentQuarter",
      "previousQuarter", "yearToDate", "last12Months"
    ];
    const comparisonPeriods = [
      "recent30VsPrevious30", "currentMonthVsPreviousMonth",
      "currentQuarterVsPreviousQuarter", "yearToDateVsPreviousYear"
    ];

    ["recent", "distribution", "gap", "custom"].forEach(function (reportId) {
      standardPeriods.forEach(function (period) {
        app.state.selectedReportId = reportId;
        app.state.filters = reportFilters(app, reportId, period);
        app.preparePreview();
        assert(app.state.previewRecords.length > 0, `${reportId}/${period} returned no records`);
        assert(app.calculateKpis(app.state.previewRecords).total > 0);
      });
    });

    comparisonPeriods.forEach(function (period) {
      app.state.selectedReportId = "comparison";
      app.state.filters = reportFilters(app, "comparison", period);
      app.preparePreview();
      assert(app.state.previewRecords.length > 0, `comparison/${period} returned no records`);
      assert(app.state.comparison);
    });

    ["recent", "distribution", "comparison", "gap", "custom"].forEach(function (reportId) {
      app.state.selectedReportId = reportId;
      const period = reportId === "comparison" ? comparisonPeriods[0] : "entireCatalog";
      app.state.filters = reportFilters(app, reportId, period);
      app.renderPreview();
      app.renderExecutiveReport();
      assert.equal(elements.get("#preview-kpis").children.length, 5);
      assert(elements.get("#preview-charts").children.length > 0);
      assert.equal(elements.get("#executive-kpis").children.length, 5);
      assert(elements.get("#executive-charts").children.length > 0);
      assert(elements.get("#executive-summary").textContent);
      assert(elements.get("#key-findings").children.length > 0);
    });
  });

  check("11. Compatible custom CSV upload format still parses", function () {
    const sample = app.parseCatalogCsv(
      fs.readFileSync(path.join(projectRoot, "sample-data.csv"), "utf8")
    );
    assert.equal(sample.records.length, 200);
    assert.equal(sample.cleaningSummary.datesSuccessfullyParsed, 200);
    assert.equal(sample.cleaningSummary.suspiciousRatingDurationRecordsCorrected, 0);
  });

  check("12. Previously clean data remains unchanged", function () {
    records.filter(function (record) {
      return !record.dataQuality.includes("TARGETED_RATING_DURATION_CORRECTION")
        && record.raw.title === record.raw.title.trim()
        && record.raw.type === record.raw.type.trim()
        && record.raw.country === record.raw.country.trim()
        && record.raw.listed_in === record.raw.listed_in.trim()
        && record.raw.rating === record.raw.rating.trim()
        && record.raw.duration === record.raw.duration.trim();
    }).forEach(function (record) {
      assert.equal(record.title, record.raw.title);
      assert.equal(record.type, record.raw.type);
      assert.equal(record.country, record.raw.country);
      assert.equal(record.genre, record.raw.listed_in);
      assert.equal(record.rating, record.raw.rating);
      assert.equal(record.duration, record.raw.duration);
    });
  });

  check("13. Country values are exploded and counted individually", function () {
    const assignments = app.categoryAssignments(records, "country");
    assert.equal(assignments.length, 10843);
    assert(assignments.every(function (record) { return !record.country.includes(","); }));
    const countryCounts = Object.fromEntries(app.countCategories(records, "country")
      .filter(function (category) { return category.label !== "Unknown"; })
      .map(function (category) { return [category.label, category.count]; }));
    assert.equal(Object.keys(countryCounts).length, 122);
    assert.equal(countryCounts["United States"], 3690);
    assert.equal(countryCounts.India, 1046);
    assert.equal(countryCounts["United Kingdom"], 806);
  });

  check("14. listed_in values are exploded and counted individually", function () {
    const assignments = app.categoryAssignments(records, "genre");
    assert.equal(assignments.length, 19323);
    assert(assignments.every(function (record) { return !record.genre.includes(","); }));
    const genreCounts = Object.fromEntries(app.countCategories(records, "genre")
      .filter(function (category) { return category.label !== "Unknown"; })
      .map(function (category) { return [category.label, category.count]; }));
    assert.equal(Object.keys(genreCounts).length, 42);
    assert.equal(genreCounts["International Movies"], 2752);
    assert.equal(genreCounts.Dramas, 2427);
    assert.equal(genreCounts.Comedies, 1674);
  });

  check("15. Multi-country and multi-genre assignments do not form a Cartesian product", function () {
    const title = records.find(function (record) { return record.showId === "s8"; });
    assert(title);
    assert.equal(app.splitCategoryValues(title.country).length, 6);
    assert.equal(app.splitCategoryValues(title.genre).length, 3);
    assert.equal(app.categoryAssignments([title], "country").length, 6);
    assert.equal(app.categoryAssignments([title], "genre").length, 3);
    assert.equal(records.filter(function (record) { return record.showId === "s8"; }).length, 1);
    assert.equal(app.calculateKpis([title]).total, 1);
  });

  check("16. Matching-title preview collapses to four rows without changing results", function () {
    const originalPreview = records.slice(0, 10);
    app.state.previewRecords = originalPreview;
    app.state.showAllPreviewTitles = false;
    app.renderTable();
    assert.equal(elements.get("#preview-table-body").children.length, 4);
    assert.equal(elements.get("#preview-table-toggle").hidden, false);
    assert.equal(elements.get("#toggle-preview-titles").textContent, "Show all matching titles");
    assert.equal(elements.get("#toggle-preview-titles").attributes["aria-expanded"], "false");

    app.state.showAllPreviewTitles = true;
    app.renderTable();
    assert.equal(elements.get("#preview-table-body").children.length, 10);
    assert.equal(elements.get("#toggle-preview-titles").textContent, "Show fewer titles");
    assert.equal(elements.get("#toggle-preview-titles").attributes["aria-expanded"], "true");
    assert.equal(app.state.previewRecords, originalPreview);

    app.state.previewRecords = records.slice(0, 4);
    app.state.showAllPreviewTitles = false;
    app.renderTable();
    assert.equal(elements.get("#preview-table-body").children.length, 4);
    assert.equal(elements.get("#preview-table-toggle").hidden, true);
  });

  check("17. Workflow actions use one compact top placement per screen", function () {
    const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
    const screenIds = ["upload-screen", "report-type-screen", "configure-screen", "preview-screen"];
    screenIds.forEach(function (screenId, index) {
      const start = html.indexOf(`id="${screenId}"`);
      const nextId = screenIds[index + 1] || "executive-screen";
      const end = html.indexOf(`id="${nextId}"`);
      const screenHtml = html.slice(start, end);
      assert.equal((screenHtml.match(/class="screen-actions workflow-actions"/g) || []).length, 1);
      assert(screenHtml.indexOf('class="screen-actions workflow-actions"') < screenHtml.indexOf(index === 0 ? 'class="panel upload-panel"' : index === 1 ? 'id="report-type-grid"' : index === 2 ? 'id="configuration-form"' : 'id="preview-kpis"'));
    });
    const previewStart = html.indexOf('id="preview-screen"');
    const previewEnd = html.indexOf('id="executive-screen"');
    const previewHtml = html.slice(previewStart, previewEnd);
    assert.equal((previewHtml.match(/id="generate-report-button"/g) || []).length, 1);
    assert.equal((previewHtml.match(/>Back to Filters</g) || []).length, 1);
    assert.equal((html.match(/id="upload-continue-button"/g) || []).length, 1);
    assert.equal((html.match(/id="report-type-continue-button"/g) || []).length, 1);
    assert.equal((html.match(/id="clear-configuration-button"/g) || []).length, 1);
    assert.equal((html.match(/id="generate-report-button"/g) || []).length, 1);
    assert(html.includes('type="reset" form="configuration-form"'));
    assert(html.includes('type="submit" form="configuration-form"'));
  });

  console.log("CatalogLens data-cleaning deployment gate");
  console.table(checks);
  console.log("Row count:", {
    beforeCleaning: parsed.cleaningSummary.totalRecordsProcessed,
    afterCleaning: records.length
  });
  console.log("Type values and counts:", countValues(records, "type"));
  console.log("Title and category-assignment totals:", {
    uniqueTitles: new Set(records.map(function (record) { return record.showId; })).size,
    countryAssignments: app.categoryAssignments(records, "country").length,
    genreAssignments: app.categoryAssignments(records, "genre").length
  });
  console.log("Top individual-country counts:", app.countCategories(records, "country").slice(0, 10));
  console.log("Top individual-genre counts:", app.countCategories(records, "genre").slice(0, 10));
  console.log("Unexpected ratings before cleaning:", unexpectedRatingsBefore);
  console.log("Unexpected ratings after cleaning:", unexpectedRatingsAfter);
  console.log("Cleaned Unknown rating count:", countValues(records, "rating").Unknown || 0);
  console.log("Missing values before cleaning:", missingCountsBefore(records));
  console.log("Missing values after cleaning:", missingCountsAfter(records));
  console.log("Targeted records before and after:", corrections.map(function (record) {
    return {
      showId: record.showId,
      before: { rating: record.raw.rating, duration: record.raw.duration },
      after: { rating: record.rating, duration: record.duration }
    };
  }));
  console.log("Remaining invalid or unhandled values:", {
    invalidDates: records.filter(function (record) {
      return record.dataQuality.includes("INVALID_DATE_ADDED");
    }).length,
    invalidReleaseYears: records.filter(function (record) {
      return record.dataQuality.includes("INVALID_RELEASE_YEAR");
    }).length,
    suspiciousRatingDuration: parsed.cleaningSummary.suspiciousRatingDurationRecordsFlagged,
    unexpectedRatingsAfter
  });

  if (failures.length) {
    console.error("DEPLOYMENT GATE: FAILED");
    failures.forEach(function (failure) {
      console.error(`- ${failure.name}: ${failure.error.message}`);
    });
    process.exitCode = 1;
  } else {
    console.log("DEPLOYMENT GATE: PASSED");
  }
}

run();
