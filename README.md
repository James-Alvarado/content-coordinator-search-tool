# CatalogLens

CatalogLens is a browser-based reporting MVP for Content Coordinators working at streaming and media companies.

## Problem

> The Content Coordinator struggles to answer questions about content distribution and regional trends quickly because the information needed is spread across multiple files and data sources. This results in hours of manual searching and comparing each week, slowing decisions about which content the company should acquire.

## Solution

> The MVP is a reporting tool that enables the Content Coordinator to upload a content catalog, select a report type, preview the calculated results, and generate an executive report. Its purpose is to help the user answer recurring business questions about content distribution and regional trends without manually searching and comparing information across multiple files and data sources.

CatalogLens starts with the bundled Netflix Movies and TV Shows dataset from
Kaggle and processes CSV data locally in the browser. It does not send uploaded
catalogs to a backend or external service.

After parsing, CatalogLens applies conservative in-browser cleaning before
reports are calculated. Original field values remain available on each record,
missing values are not invented, and the bundled CSV is never rewritten.

## Approved User Flow

```text
Load the bundled catalog or upload a custom catalog
      ↓
Choose report type
      ↓
Configure relevant settings
      ↓
Preview calculated results
      ↓
Generate executive report
```

## Report Types

### Recent Additions Summary

Analyzes titles added during a required preset reporting period. Available
periods include rolling windows, complete calendar periods, the current catalog
quarter, and catalog year to date. CatalogLens resolves each preset from the
latest valid `date_added` in the uploaded catalog and shows the exact dates
before the report is applied.

### Distribution Analysis

Groups titles from a required preset reporting period by a selected catalog
field such as genre, country, type, or rating.

### Catalog Comparison

Compares title counts across two equivalent periods created by one comparison
preset, such as latest 30 days versus previous 30 days or current catalog
quarter versus previous quarter. The application distinguishes record-count
difference from percentage change and does not calculate percentage change when
the first period contains zero records.

### Gap Analysis

Identifies categories within a required preset reporting period whose catalog
share falls below a percentage threshold entered by the user. CatalogLens does
not decide that a category is underrepresented without this measurable
threshold.

### Custom Report

Applies a required preset reporting period and optional catalog filters, then
groups the matching results by a selected field.

## Expected CSV Fields

CatalogLens recognizes reasonable header variations for:

* `title`
* `type`
* `country`
* `genre`
* `rating`
* `release_year`
* `date_added`
* `description`

Examples such as `Title`, `Release Year`, `releaseYear`, `Date Added`, and `dateAdded` are normalized internally.

The title field is required. Optional missing information appears as **Not provided**. Invalid dates appear as **Unknown** and are excluded from date-range calculations.

## Core Features

* Bundled Netflix Movies and TV Shows dataset loaded automatically on startup
* Optional CSV drag-and-drop and file picker that replaces the current dataset for the session
* File validation and detected-field display
* Five selectable report templates
* Contextual configuration fields, including explicit date-period presets for recurring reports
* Filter options populated from uploaded data
* Reusable filtering, grouping, percentage, comparison, and gap calculations
* Calculated KPI cards
* Responsive results table
* Accessible HTML and CSS charts
* A visually distinct executive brief with narrative summary, emphasized KPIs,
  report-specific charts, composition diagrams, and numbered key findings
* Deterministic executive summary and key findings
* Back navigation that preserves uploaded data and settings
* Start Over control for restoring the bundled Netflix catalog

## Technology

* HTML
* CSS
* Vanilla JavaScript
* Browser File API

No framework, package manager, backend, database, external API, chart dependency, or AI service is required.

## How to Run

1. Open the project folder in Cursor, VS Code, or another editor.
2. Start Live Server and open `index.html`.
3. Wait for the bundled Netflix catalog to load automatically.
4. Optionally upload a compatible CSV to replace it for the session.
5. Select a report type.
6. Complete the relevant settings.
7. Preview the calculations.
8. Generate the executive report.

## Project Structure

```text
content-coordinator-search-tool/
├── index.html
├── styles.css
├── script.js
├── data-cleaning.js
├── data.js
├── public/
│   └── data/
│       └── netflix_titles.csv
├── tests/
│   └── verify-data-cleaning.js
└── README.md
```

## Verification

Run the data-cleaning and report regression gate before deployment:

```bash
node tests/verify-data-cleaning.js
```

The command exits with a failure status if any required check does not pass.

## Privacy

Uploaded CSV files remain in browser memory and are not uploaded or saved. Start
Over restores the bundled Netflix catalog.

## Scope Limits

CatalogLens does not include:

* Authentication
* Team collaboration
* Database or cloud storage
* Saved report history
* Scheduled or emailed reports
* PDF export
* Predictive analytics
* Acquisition recommendations
* Natural-language catalog questions
* AI-generated summaries

The executive summary uses deterministic templates based only on calculated results. It does not explain why a trend occurred or recommend an acquisition.

## Known MVP Limitations

* CSV files are limited to 5 MB.
* Dates must be recognizable by the browser’s standard date parser.
* The cleaned catalog keeps one row per title. Country and genre metrics create separate, temporary assignment lists that split and trim only the category being counted, preventing a country × genre Cartesian product.
* Charts show the ten largest categories to remain readable; all matching records remain available in the table.

## Author

James Alvarado
AI Native program Student
