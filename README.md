# Content Coordinator Catalog Reporter

An AI-assisted reporting tool that helps Content Coordinators quickly answer recurring business questions about their content catalog without manually searching through multiple spreadsheets and data sources.

---

## Problem

Content Coordinators are responsible for answering questions about the company's content catalog to support content acquisition and business decisions.

Today, the information needed to answer these questions is spread across multiple spreadsheets and data sources. As a result, Content Coordinators spend hours every week manually searching, filtering, comparing, and summarizing catalog information.

### Problem Statement

> **The Content Coordinator struggles to answer questions about content distribution and regional trends quickly because the information needed is spread across multiple files and data sources. This results in hours of manual searching and comparing each week, slowing decisions about which content the company should acquire.**

---

## Solution

The Content Coordinator Catalog Reporter simplifies this workflow by allowing users to upload a catalog, select the type of business report they need, preview the results, and generate an executive-ready report in just a few steps.

Instead of manually combining information from multiple files, the system automatically analyzes the catalog and presents the results using KPIs, charts, and a concise executive summary.

---

## Target User

**Content Coordinator**

A professional working at a streaming or media company who:

- Manages movie and TV catalog information
- Supports Content Acquisition teams
- Answers recurring business questions
- Creates reports for directors and executives
- Identifies catalog trends and content gaps

---

## MVP Goal

Validate that a guided reporting workflow can significantly reduce the time required for a Content Coordinator to answer recurring catalog questions.

The MVP focuses on solving **one core workflow** rather than building a complete catalog management platform.

---

# User Workflow

```text
Upload Catalog
      ↓
System validates the file
and detects catalog fields
      ↓
Choose Report Type
      ↓
Configure Relevant Filters
      ↓
Preview Results
      ↓
Generate Executive Report
```

---

# Core Features

## Upload Catalog

- Upload CSV catalog
- Validate file
- Automatically detect catalog fields

Detected fields may include:

- Title
- Type
- Country
- Genre
- Rating
- Release Year
- Date Added
- Description

---

## Report Templates

The report templates were designed from recurring questions identified during user interviews.

Current templates include:

- Recent Additions Summary
- Distribution Analysis
- Catalog Comparison
- Gap Analysis
- Custom Report

---

## Contextual Filters

Instead of showing every possible filter, the application only displays filters relevant to the selected report.

Examples include:

- Genre
- Country
- Region
- Content Type
- Rating
- Release Year
- Date Added

---

## Preview Results

Before generating the final report, the user can review:

- Matching titles
- KPI cards
- Active filters
- Calculated metrics

This allows the user to verify the results before creating the final report.

---

## Executive Report

The final report includes:

- KPI summary
- Distribution charts
- Trend visualizations
- Executive summary
- Key insights generated from the catalog data

The report is designed to support business discussions and content acquisition meetings.

---

# Current MVP Scope

The first version validates one complete reporting workflow.

Current MVP:

- Upload catalog
- Generate a Recent Additions Summary
- Preview results
- Generate an executive report

Additional report templates will be expanded after validating the initial workflow.

---

# Out of Scope

The following features are intentionally excluded from the first MVP:

- User authentication
- Database integration
- Live production catalog
- Team collaboration
- Saved reports
- Scheduled reports
- AI recommendations
- Predictive analytics
- Natural language search
- PDF export
- Dashboard customization

These features may be explored in future iterations.

---

# Technology

Frontend

- HTML
- CSS
- JavaScript

Data

- CSV upload
- Client-side filtering
- KPI calculations

Visualization

- Charts
- KPI cards
- Executive summary

---

# Success Metrics

The MVP will be considered successful if a Content Coordinator can:

- Upload a catalog successfully
- Generate a report in a few minutes
- Understand the preview metrics
- Trust the generated results
- Answer recurring business questions faster than the current manual process

---

# Future Improvements

Potential future enhancements include:

- Natural language questions
- Additional report templates
- Database integrations
- Saved reports
- PDF export
- Historical trend dashboards
- AI-powered report recommendations

---

# Why This Project

This project was created as part of the Pursuit AI Native program to demonstrate how AI-assisted workflows can improve operational efficiency by solving a real problem identified through user interviews.

Rather than building a feature-rich catalog management system, the MVP focuses on validating a single hypothesis:

> A guided reporting workflow can help Content Coordinators answer recurring catalog questions significantly faster than the current manual process.