// Report definitions live in one place so the cards and configuration logic use the same names.
const reportDefinitions = [
  {
    id: "recent",
    name: "Recent Additions Summary",
    description: "Analyze titles added during a preset reporting period."
  },
  {
    id: "distribution",
    name: "Distribution Analysis",
    description: "Group titles from a preset reporting period by genre, country, type, or rating."
  },
  {
    id: "comparison",
    name: "Catalog Comparison",
    description: "Compare catalog activity across two equivalent preset periods."
  },
  {
    id: "gap",
    name: "Gap Analysis",
    description: "Find categories in a preset reporting period whose catalog share falls below your threshold."
  },
  {
    id: "custom",
    name: "Custom Report",
    description: "Choose a preset reporting period, optional filters, and a field for grouping the results."
  }
];
