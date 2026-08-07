# SEFC Expense & Budget Visualizer

A mobile-friendly, fully client-side web app for tracking daily spending — record transactions, group them by category, optionally set a budget per category, and see your spending broken down in a pie chart. Built for the CodingCamp "Expense & Budget Visualizer" assignment.

**Live demo:** https://richardtanu.github.io/CodingCamp-3August26-richard/

## Features

**Core**
- Add a transaction: item name, amount, category, date, optional description
- Total balance shown at the top, updating automatically
- Scrollable transaction list — amount, category, date, description; delete with confirmation
- Pie chart of spending by category, updating automatically as transactions change

**Optional challenges (all 5 implemented)**
- Custom categories — add your own alongside the defaults (Food, Transport, Fun)
- Per-category budgets with over-limit highlighting on the dashboard
- Sort transactions by date, amount, or category
- Dark / light mode toggle (persisted, defaults to your OS preference)
- Monthly summary view — totals grouped by month

## Tech stack

- HTML, CSS, and vanilla JavaScript only — no frameworks, no build step
- [Chart.js](https://www.chartjs.org/) (via CDN) for the pie chart
- Browser `localStorage` for all data — no backend

## Project structure

```
index.html      page shell
css/
  main.css      all styles
js/
  main.js       all application logic
.kiro/          Kiro spec docs (requirements, design, tasks)
```

Per the assignment's folder rules, there is exactly one CSS file and one JavaScript file.

## Running locally

`js/main.js` is a plain classic script (no ES modules), so the app runs directly from disk — no local server required:

1. Clone or download this repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)

An internet connection is needed for the Chart.js CDN; everything else works offline. Data is stored in your browser's `localStorage` and persists between sessions on the same device/browser.

## Deployment

Published via GitHub Pages, serving `index.html` directly from the `main` branch root — no build step required.

## Data & privacy

All data stays in your browser's `localStorage`; nothing is sent to a server. Use "Reset All Data" in the app to clear everything and start fresh.
