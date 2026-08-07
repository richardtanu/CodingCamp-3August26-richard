# Design Document: SEFC Expense & Budget Visualizer

## Overview

A fully client-side, single-page web application delivered as exactly three files: `index.html`, `css/main.css`, and `js/main.js`. No build step, no backend, no package manager beyond an optional dev-time static file server for local testing. The only external dependency is **Chart.js 4.4.1** loaded from a CDN `<script>` tag.

This document reflects the app as actually built — it superseded an earlier draft (multi-file ES-module architecture, 5 default categories, a grouped bar chart, and a full Vitest/fast-check test suite) once the actual assignment brief's constraints were identified (see "Revision history" below).

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| File count | Exactly 1 CSS file, 1 JS file | Assignment folder rule: "Only 1 CSS file inside `css/`", "Only 1 JavaScript file inside `js/`" |
| Script type | Classic `<script src="./js/main.js">` (not `type="module"`) | Runs directly over `file://` with no CORS/server requirement — matches "no complex setup" and works as a double-clicked local file |
| Internal structure | One file, organised into namespaced `const` objects (`Storage`, `Validator`, `Categories`, `Expenses`, `Budgets`, `UI`, `ChartModule`, `Theme`) inside a single IIFE | Keeps the separation-of-concerns benefits of the original multi-module design without violating the one-file rule |
| Chart type | Pie chart (spending by category) | The brief's example output specifically shows a pie chart, not a bar chart |
| IDs | `crypto.randomUUID()`, with a timestamp+random fallback | Unique, natively available in all target browsers |
| Validation | Pure functions on the `Validator` object — no DOM access | Decoupled from rendering, easy to reason about |
| Currency display | `Intl.NumberFormat` | Locale-aware formatting, no extra library |
| Theming | CSS custom properties, toggled via `html[data-theme]`, persisted to `sefc_theme` | No CSS framework; cheap to toggle at runtime |

---

## Architecture

```
Browser
  └─ index.html          (HTML shell, single CSS link, single JS script)
       ├─ css/
       │    └─ main.css   (all styles: layout, theme, components, responsive)
       └─ js/
            └─ main.js    (everything — wrapped in one IIFE)
```

`js/main.js` is internally organised top-to-bottom as:

1. **Storage** — `isAvailable()`, `read()`, `write()`, `clear()` — safe localStorage wrapper.
2. **Validator** — `isValidAmount`, `isValidDate`, `validateExpense`, `validateBudget`, `validateCategoryName` — pure functions.
3. **Categories** — `DEFAULT_CATEGORIES` (Food/Transport/Fun) + `getAll/addCustom/deleteCustom/findById/isDefault`.
4. **Expenses** ("Transactions" in the UI) — `getAll/add/remove`, plus `sortExpenses()` for the sort-control optional challenge.
5. **Budgets** — `getAll/getByCategory/set`.
6. **Formatting helpers** — `formatCurrency`, `formatDate`, `formatMonthLabel`, `todayISO`, `buildSpentByCategory`.
7. **UI** — all DOM rendering and interaction: `renderTotalSummary`, `renderBudgetSummary`, `renderExpenseList`, `renderMonthlySummary`, `renderEmptyState`, `showConfirmDialog`, `showConfirmation` (toast), `showError`, `clearErrors`, `setLoadingState`.
8. **ChartModule** — Chart.js pie chart wrapper: `init`, `update`, `destroy`, with CDN-failure and empty-state handling.
9. **Theme** — `init`, `apply`, `toggle` for the dark/light mode optional challenge.
10. **App wiring** — `renderDashboard`, `populateCategorySelects`, `renderCategoryList`, `showView` (view router), form/delete/reset handlers, `attachEventListeners`, and the `DOMContentLoaded` bootstrap.

### Data Flow

```
User Action
    │
    ▼
DOM event handler (bottom of main.js) ──► Validator (pure validation)
    │                                          │
    │ valid                                    │ invalid
    ▼                                          ▼
Expenses / Budgets / Categories             UI.showError (inline, role=alert)
    │
    ▼
Storage (localStorage read/write)
    │
    ▼
UI render functions + ChartModule.update + UI.showConfirmation (toast)
```

### View Routing

Single-page app; views are `<section class="view">` panels toggled via `hidden` + a `view--active` class:

- **Dashboard** (default) — total balance, pie chart, budget summary, transaction list
- **Add Transaction** — transaction entry form
- **Set Budget** — budget entry form
- **Categories** — add/delete custom categories
- **Monthly Summary** — transactions grouped by month

`showView()` toggles panel visibility and `aria-current` on the matching nav link; no URL/hash routing.

---

## Data Models

### Expense ("Transaction")

```js
{
  id: string,            // crypto.randomUUID()
  name: string,           // Item Name — required, 1–100 chars
  amount: number,          // 0.01 – 999,999,999.99, max 2 decimal places
  categoryId: string,      // references Category.id
  categoryLabel: string,   // denormalised snapshot of category name at write time
  date: string,            // "YYYY-MM-DD"
  description: string,     // "" if not provided; max 255 chars
  createdAt: string        // ISO datetime, internal sort tiebreaker
}
```

> `categoryLabel` is denormalised so a Transaction keeps a readable category name even after its custom Category is deleted.

### Budget

```js
{
  id: string,
  categoryId: string,      // one budget per category (overwritten on re-set)
  categoryLabel: string,
  amount: number,
  updatedAt: string
}
```

### Category

```js
{
  id: string,      // fixed for defaults ("cat-food" etc.); crypto.randomUUID() for custom
  name: string,     // 1–50 chars
  isDefault: boolean
}
```

### Default Categories (hard-coded)

| id | name |
|---|---|
| `cat-food` | Food |
| `cat-transport` | Transport |
| `cat-fun` | Fun |

---

## LocalStorage Schema

| Key | Value | Description |
|---|---|---|
| `sefc_expenses` | `Expense[]` | All transactions |
| `sefc_budgets` | `Budget[]` | One entry per budgeted category |
| `sefc_categories` | `Category[]` | Custom categories only; the 3 defaults are always injected at runtime |
| `sefc_theme` | `"light" \| "dark"` | Persisted theme preference |

Reads never throw — malformed JSON resolves to `null`, and callers fall back to `[]`. Writes return `{ ok, error? }`; callers only update in-memory state after a successful write, so a failed write never leaves the UI showing unsaved data as saved.

---

## UI Layout and Responsive Strategy

```
<body>
  #storage-warning         (banner, hidden unless localStorage is unavailable)
  #loading-indicator        (aria-live, hidden after first render)
  <header>                  full-bleed background, sticky, compact padding
    .header-inner            capped at --container-max (1320px), centred — logo, nav, actions
      <h1>
      <nav>                  Dashboard | Add Transaction | Set Budget | Categories | Monthly Summary
      .header-actions         grouped so it always wraps as a unit — Dark Mode toggle + Reset All Data
  <main>                     capped at --container-max, centred
    #view-dashboard           default view
      .summary-total           "Total Balance: $X,XXX.XX"
      .chart-container          <canvas> pie chart (220px mobile / 300px tablet / 400px desktop)
      .budget-summary           table: Category | Budget | Spent | Remaining
      .expense-list             header (title + sort <select>) + .expense-items (internally scrollable, capped height)
    #view-add-expense (hidden)   #form-expense — centred card
    #view-set-budget (hidden)    #form-budget — centred card
    #view-categories (hidden)    #form-add-category — centred card; custom + default category lists
    #view-monthly (hidden)       month-grouped totals table
  #dialog-overlay             confirm/cancel modal (delete, reset)
  #toast                      fixed top-right, anchored dynamically below the header
</body>
```

### Responsive breakpoints

- **Mobile (< 768px)**: single column; nav is a horizontally scrollable tab row; header wraps to multiple rows as needed.
- **Tablet (≥ 768px)**: two-column dashboard (chart + budget summary), transaction list full-width below.
- **Desktop (≥ 1024px)**: three-panel dashboard — `grid-template-columns: minmax(240px, 1.4fr) minmax(280px, 1fr) minmax(280px, 1fr)`. `minmax()` (not fixed pixel widths) lets all three panels shrink together at the low end of this breakpoint instead of overflowing.

### Forms as cards

`#form-expense`, `#form-budget`, and `#form-add-category` share one rule: `max-width: 480px; margin-inline: auto;` plus a white card background, rounded corners, and shadow — centred on the page rather than left-aligned plain fields.

### Toast notifications

A single global `#toast` element (not one per form) is reused by every action. `UI.showConfirmation()` reads the header's live rendered height and sets the toast's `top` inline style to sit just below it — accounting for the header wrapping to more than one row on narrow viewports or when the storage warning banner is visible. It slides in from the right and fades out on auto-dismiss (default 3s).

### Fixed-height, internally-scrolling panels

`.expense-items` (the `<ul>` inside the transaction list) has `overflow-y: auto` with a `max-height` matched to the chart panel's height at each breakpoint, so the Dashboard page itself doesn't grow as transactions accumulate — only that inner list scrolls. The sort control stays outside the scroll area so it's always reachable.

### WCAG / accessibility notes

- All form fields use `<label for>` matched to input `id`.
- Error messages use `role="alert"`; the toast uses `role="status"`.
- The confirm/cancel dialog uses `role="dialog"`, `aria-modal="true"`, and traps focus while open.
- Touch targets are ≥ 44×44 CSS pixels.

---

## Chart Integration (Chart.js)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
```

`ChartModule.update(expenses, categories)` builds a single-dataset **pie** chart: one slice per category with `spentByCategory > 0`, labelled with the category name, coloured from a fixed 10-colour palette assigned **by position** (not by hashing the category ID) — hashing produced visually similar adjacent colours for small category counts (e.g. Food and Fun both landing on similar blues), so positional assignment is used instead for guaranteed contrast with 2–3 categories.

```js
{
  type: 'pie',
  data: {
    labels: [...],                 // category names with spending > 0
    datasets: [{
      data: [...],                  // total spent per category
      backgroundColor: [...],       // CHART_PALETTE[index % length]
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } },
    },
  },
}
```

`chart.data` is mutated in place and `chart.update()` is called — the Chart instance is never destroyed/recreated, avoiding flicker. Both the canvas's `hidden` attribute **and** its inline `style.display` are toggled together for the empty/unavailable states, because Chart.js applies its own inline `display` style for responsive sizing, which otherwise silently overrides the `[hidden]` UA stylesheet rule.

---

## Validation Logic

All in `Validator`, pure, no DOM access.

- **Amount**: trim → parse float → reject NaN/Infinity → `0.01 ≤ v ≤ 999,999,999.99` → reject > 2 decimal places.
- **Date**: `Date.parse` must succeed → within `[today − 10y, today + 1d]`.
- **Item Name**: required, ≤ 100 chars.
- **Description**: optional, ≤ 255 chars.
- **Category name**: 1–50 chars, case-insensitive duplicate check against existing names.

---

## Error Handling

| Scenario | Handling |
|---|---|
| `localStorage` unavailable | Persistent banner; app stays functional in-memory for the session |
| Malformed JSON in storage | Discard that key's data, initialise as `[]`, no throw |
| `localStorage.setItem` throws (quota) | Inline field error "Could not save — storage is full or unavailable."; in-memory state untouched |
| `localStorage.clear`/`removeItem` throws | `window.alert("Reset failed. Your data is unchanged.")`; data preserved |
| Chart.js CDN fails to load | Canvas hidden, fallback message shown; rest of app unaffected |
| `crypto.randomUUID` unavailable | Falls back to a timestamp + `Math.random()` composite ID |

---

## Testing Strategy

Per the assignment brief's NFR-1 ("No test setup required"), there is no Vitest/fast-check suite. Verification during development was done by driving the app in a real headless-Chromium browser (Playwright) against a local static file server — exercising the full add/validate/delete/reset/sort/theme-toggle/monthly-summary flow, checking rendered layout metrics (widths, overflow, scroll containment) at multiple viewport widths, and confirming zero console errors — rather than relying on code review alone.

---

## File Structure for GitHub Pages Deployment

```
/ (repository root)
├─ index.html
├─ css/
│    └─ main.css
└─ js/
     └─ main.js
```

GitHub Pages serves `index.html` at the repository root directly — no `_config.yml`, no build output to manage.

---

## Revision History

- **v1 (superseded)**: Kiro-generated plan built before the actual assignment brief (PDF) was reviewed against the implementation. Used a multi-file ES-module architecture (`storage.js`, `validator.js`, `categories.js`, `expenses.js`, `budgets.js`, `ui.js`, `chart.js`, `main.js`), 5 default categories (Food/Transport/Utilities/Entertainment/Other), a grouped bar chart (Spent vs Budget), no "Item Name" field, and a full Vitest + fast-check property-testing plan.
- **v2 (current)**: Rebuilt to match the actual brief — consolidated to one CSS file and one JS file (assignment folder rule), added the required Item Name field, switched default categories to Food/Transport/Fun, switched the chart to a pie chart, removed the test-suite plan (brief explicitly says none is required), and added all 5 optional challenges (custom categories, over-budget highlighting, sort, dark/light mode, monthly summary). Subsequent UI passes added toast notifications, card-styled centred forms, fixed-height scrollable panels, and a full-bleed header with capped inner content.
