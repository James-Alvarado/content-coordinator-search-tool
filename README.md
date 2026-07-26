# CatalogLens

CatalogLens is a browser-based reporting MVP for Content Coordinators working at streaming and media companies.

## Problem

> The Content Coordinator struggles to answer questions about content distribution and regional trends quickly because the information needed is spread across multiple files and data sources. This results in hours of manual searching and comparing each week, slowing decisions about which content the company should acquire.

## Solution

> The MVP is a reporting tool that enables the Content Coordinator to upload a content catalog, select a report type, preview the calculated results, and generate an executive report. Its purpose is to help the user answer recurring business questions about content distribution and regional trends without manually searching and comparing information across multiple files and data sources.

CatalogLens processes CSV data locally in the browser. It does not send uploaded catalogs to a backend or external service.

## Approved User Flow

```text
Upload catalog
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

Analyzes titles added during a user-selected date range.

### Distribution Analysis

Groups matching titles by a selected catalog field such as genre, country, type, or rating.

### Catalog Comparison

Compares record counts across two user-selected date periods. The application distinguishes record-count difference from percentage change and does not calculate percentage change when the first period contains zero records.

### Gap Analysis

Identifies categories whose catalog share falls below a percentage threshold entered by the user. CatalogLens does not decide that a category is underrepresented without this measurable threshold.

### Custom Report

Applies optional filters and groups the matching results by a selected field.

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

## CSV Example

```csv
title,type,country,genre,rating,release_year,date_added,description
Example Title,Movie,Colombia,Drama,8.1,2024,2025-01-15,A fictional catalog description.
```

The repository includes [sample-data.csv](sample-data.csv), containing 20 clearly fictional records for local testing.

## Core Features

* CSV drag-and-drop and file picker
* File validation and detected-field display
* Five selectable report templates
* Contextual configuration fields
* Filter options populated from uploaded data
* Reusable filtering, grouping, percentage, comparison, and gap calculations
* Calculated KPI cards
* Responsive results table
* Accessible HTML and CSS charts
* Deterministic executive summary and key findings
* Back navigation that preserves uploaded data and settings
* Start Over control for loading a different catalog

## Technology

* HTML
* CSS
* Vanilla JavaScript
* Browser File API

No framework, package manager, backend, database, external API, chart dependency, or AI service is required.

## How to Run

1. Open the project folder in Cursor, VS Code, or another editor.
2. Start Live Server and open `index.html`.
3. Download `sample-data.csv` from the upload screen or use the repository copy.
4. Upload the CSV.
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
├── data.js
├── sample-data.csv
└── README.md
```

## Privacy

CSV files remain in browser memory and are not uploaded or saved. Start Over removes the current catalog from application state.

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
* Multi-country cells are treated as one category unless the source CSV separates them into individual records.
* Charts show the ten largest categories to remain readable; all matching records remain available in the table.

## Author

James Alvarado
AI Product Builder at Pursuit
