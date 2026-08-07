# Design Document: SEFC Expense & Budget Visualizer

## Overview

The SEFC Expense & Budget Visualizer is a fully client-side, single-page web application delivered as a small set of static files. It requires no build step, no backend, and no package manager — it runs directly in any modern browser and is deployable as-is to GitHub Pages.

The application lets users record expenses, set per-category budgets, and see a grouped bar chart comparing spending against budget limits. All data lives in the browser's `localStorage`. The only external dependency is **Chart.js 4.x** loaded from a CDN.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| File structure | Multi-file (HTML + CSS + JS) | Easier to maintain than a single 1000-line file; GitHub Pages serves any static file |
| State management | Module-level JS objects | No framework; plain ES modules replace component state |
| Chart library | Chart.js 4.x (CDN) | Meets the "one charting utility" constraint; grouped bar charts are built-in |
| IDs | `crypto.randomUUID()` | Cryptographically unique, natively available in all target browsers |
| Validation | Pure functions in `validator.js` | Decoupled from the DOM; easy to unit-test |
| Currency display | `Intl.NumberFormat` | Locale-aware formatting with no extra library |

---

## Architecture

The application follows a **layered module architecture** within a multi-file static project. There is no build step — files are loaded via `<script type="module">`.

```
Browser
  └─ index.html          (HTML shell, imports CSS, bootstraps JS)
       ├─ styles/
       │    └─ main.css  (responsive layout, component styles, WCAG colours)
       └─ js/
            ├─ main.js          (entry point — DOMContentLoaded, view routing)
            ├─ storage.js       (LocalStorage read/write/error handling)
            ├─ validator.js     (pure validation functions, no DOM access)
            ├─ categories.js    (default + custom category management)
            ├─ expenses.js      (expense CRUD operations)
            ├─ budgets.js       (budget CRUD operations)
            ├─ chart.js         (Chart.js wrapper — create, update, destroy)
            └─ ui.js            (DOM helpers, rendering, confirmation dialogs)
```

### Data Flow

```
User Action
    │
    ▼
ui.js  ──event handler──►  validator.js (pure validation)
    │                           │
    │  valid                    │ invalid
    ▼                           ▼
expenses.js / budgets.js /   ui.js (show inline error)
categories.js
    │
    ▼
storage.js (localStorage read/write)
    │
    ▼
ui.js + chart.js (re-render dashboard)
```

### View Routing

The app is a single-page application with two "views" toggled by CSS `display` on panel elements:

- **Dashboard** (default) — chart, summary totals, remaining budget table, expense list
- **Add Expense** — expense entry form
- **Set Budget** — budget entry form
- **Manage Categories** — add/delete custom categories

Navigation is handled by `main.js` by toggling an `aria-current` attribute on nav links and swapping visible panels. No URL changes or hash routing are required.

---

## Components and Interfaces

### `storage.js`

Wraps all `localStorage` access. Provides safe read/write with JSON serialisation and error handling.

```js
// Public API
storage.read(key)                 // → parsed object, or null on failure
storage.write(key, value)         // → { ok: true } | { ok: false, error }
storage.clear(keys[])             // → { ok: true } | { ok: false, error }
storage.isAvailable()             // → boolean
```

All reads return `null` (not throw) when data is absent or malformed. All writes return a result object rather than throwing.

### `validator.js`

Pure functions — no DOM access, no side effects.

```js
// Public API
validator.validateExpense({ amount, categoryId, date, description })
  // → { valid: true, errors: {} } | { valid: false, errors: { field: message } }

validator.validateBudget({ amount, categoryId })
  // → { valid: true, errors: {} } | { valid: false, errors: { field: message } }

validator.validateCategoryName(name, existingNames[])
  // → { valid: true } | { valid: false, error: string }

validator.isValidAmount(value)    // → boolean
validator.isValidDate(dateStr)    // → boolean  (within [today-10yr, today+1day])
```

Amount validation rules:
- Must be a finite number (or parseable string representing one)
- `0.01 ≤ value ≤ 999_999_999.99`
- No more than 2 decimal places

Date validation rules:
- Must parse to a valid calendar date
- No earlier than 10 years before the current date
- No later than 1 day after the current date

### `categories.js`

Manages the combined default + custom category list.

```js
categories.getAll()                     // → Category[]
categories.addCustom(name)              // → { ok: true, category } | { ok: false, error }
categories.deleteCustom(id)             // → { ok: true } | { ok: false, error }
categories.findById(id)                 // → Category | null
categories.isDefault(id)               // → boolean
```

### `expenses.js`

```js
expenses.getAll()                       // → Expense[] sorted by date DESC
expenses.add(expenseData)              // → { ok: true, expense } | { ok: false }
expenses.remove(id)                    // → { ok: true } | { ok: false }
```

### `budgets.js`

```js
budgets.getAll()                       // → Budget[]
budgets.getByCategory(categoryId)      // → Budget | null
budgets.set(budgetData)               // → { ok: true, budget, isUpdate } | { ok: false }
```

### `chart.js`

Wraps Chart.js. Creates a grouped bar chart instance and provides an update method.

```js
chartModule.init(canvasEl)            // Creates Chart instance; idempotent
chartModule.update(expenses, budgets, categories)  // Recomputes datasets, calls chart.update()
chartModule.destroy()                 // Cleans up Chart instance
```

Chart dataset structure:
- Dataset 1 "Spent": one bar per category; background colour = normal colour unless over budget, then overage colour
- Dataset 2 "Budget": one bar per category; neutral background colour

### `ui.js`

DOM helpers and rendering functions. All functions that touch the DOM live here.

```js
ui.renderExpenseList(expenses)
ui.renderBudgetSummary(budgets, expenses, categories)
ui.renderTotalSummary(expenses)
ui.showConfirmDialog(message)                          // → Promise<boolean>
ui.showConfirmation(message, durationMs)               // Auto-dismissing toast
ui.showError(fieldEl, message)
ui.clearErrors(formEl)
ui.setLoadingState(bool)
ui.renderEmptyState(containerEl, message)
```

### `main.js`

Entry point. Sets up event listeners for all user actions and orchestrates calls to the other modules. Handles the `DOMContentLoaded` lifecycle:

1. Check `storage.isAvailable()` — show warning banner if not
2. Load data via `expenses.getAll()`, `budgets.getAll()`, `categories.getAll()`
3. Populate category dropdowns
4. Render dashboard (chart, expense list, summary)
5. Attach event listeners to nav, forms, and action buttons

---

## Data Models

### Expense

```js
{
  id: string,          // crypto.randomUUID() — globally unique
  amount: number,      // 0.01 – 999,999,999.99 (2 decimal places max)
  categoryId: string,  // References Category.id
  categoryLabel: string, // Snapshot of category name at time of entry
  date: string,        // ISO 8601 date string "YYYY-MM-DD"
  description: string  // "" if not provided; max 255 characters
  createdAt: string    // ISO 8601 datetime for internal ordering (not displayed)
}
```

> `categoryLabel` is a denormalised snapshot. If a custom category is later deleted, the label string is preserved on the expense record as-is (Requirement 6.5).

### Budget

```js
{
  id: string,          // crypto.randomUUID()
  categoryId: string,  // References Category.id (unique constraint enforced in budgets.js)
  categoryLabel: string, // Snapshot of category name
  amount: number,      // 0.01 – 999,999,999.99
  updatedAt: string    // ISO 8601 datetime of last write
}
```

### Category

```js
{
  id: string,          // Fixed string for defaults; crypto.randomUUID() for custom
  name: string,        // Display name; 1–50 characters
  isDefault: boolean   // true = cannot be deleted
}
```

### Default Categories (hard-coded in `categories.js`)

| id | name |
|---|---|
| `"cat-food"` | Food |
| `"cat-transport"` | Transport |
| `"cat-utilities"` | Utilities |
| `"cat-entertainment"` | Entertainment |
| `"cat-other"` | Other |

---

## LocalStorage Schema

| Key | Value type | Description |
|---|---|---|
| `"sefc_expenses"` | `Expense[]` (JSON array) | All expense records |
| `"sefc_budgets"` | `Budget[]` (JSON array) | One entry per category |
| `"sefc_categories"` | `Category[]` (JSON array) | Custom categories only; defaults are always injected at runtime |

**Read strategy**: On app load, `storage.read(key)` attempts `JSON.parse`. If parsing fails, it returns `null` and the caller initialises from an empty array. A user-visible warning banner is shown.

**Write strategy**: `storage.write(key, array)` calls `JSON.stringify` then `localStorage.setItem`. The call is synchronous. If a `QuotaExceededError` or any other exception is thrown, the function returns `{ ok: false, error }` and the caller shows an error message — the in-memory state is NOT updated so the UI remains consistent with what is actually stored.

**Storage budget estimate**: Each expense record is roughly 200 bytes as JSON. A user with 10,000 expenses would use ~2 MB, well within the 5–10 MB limit ([source](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)).

---

## UI Layout and Component Hierarchy

```
<body>
  <header>                          Navigation bar + app title
    <nav>                           Dashboard | Add Expense | Set Budget | Manage Categories
    <button id="btn-reset">         "Reset All Data"

  <main>
    <section id="view-dashboard">   Default visible view
      <div class="summary-total">   "Total Spent: $X,XXX.XX"
      <div class="chart-container"> <canvas id="main-chart">
      <div class="budget-summary">  Table: Category | Budget | Spent | Remaining
      <div class="expense-list">    List items with delete button

    <section id="view-add-expense" hidden>
      <form id="form-expense">
        <label>Amount <input type="number" ...>
        <label>Category <select ...>
        <label>Date <input type="date" ...>
        <label>Description <textarea ...>   (optional)
        <button type="submit">Add Expense
        <div class="form-confirmation" role="status">

    <section id="view-set-budget" hidden>
      <form id="form-budget">
        <label>Category <select ...>
        <label>Budget Limit <input type="number" ...>
        <button type="submit">Set Budget
        <div class="form-confirmation" role="status">

    <section id="view-categories" hidden>
      <form id="form-add-category">
        <label>Category Name <input type="text" ...>
        <button type="submit">Add Category
      <ul id="custom-category-list">   (each item has a delete button)
      <div>Default categories: Food, Transport, ...   (read-only list)

  <div id="dialog-overlay" role="dialog" aria-modal="true" hidden>
    Confirm/Cancel dialogs (delete, reset)

  <div id="loading-indicator" aria-live="polite" hidden>
```

### Responsive Layout Strategy

- **Mobile (375–767px)**: Single column. Nav becomes a collapsible hamburger menu or a scrollable horizontal tab bar. Chart takes full width with reduced height (200px). Budget summary collapses to a stacked card list.
- **Tablet (768–1023px)**: Two-column layout for the dashboard (chart + budget summary side by side).
- **Desktop (1024–1440px)**: Three-panel dashboard. Nav is always visible as a sidebar or top bar.

CSS uses a `min-width` media query approach. No CSS frameworks — all layout is CSS Grid and Flexbox.

### WCAG Compliance Notes

- All form fields use `<label for="...">` with matching `id` on the input.
- Error messages use `role="alert"` so screen readers announce them immediately.
- Confirmation toast uses `role="status"` (polite) so it does not interrupt.
- Confirmation dialogs use `role="dialog"` with `aria-modal="true"` and `aria-labelledby`.
- Touch targets (buttons, delete icons) are at minimum 44×44 CSS pixels via padding.
- Colour palette is chosen to guarantee 4.5:1 contrast ratio for all text. Overage bars use a colour distinguishable from both normal bars and the background (tested with a colour contrast checker).
- Focus trap is applied inside the confirm dialog while it is open.

---

## Chart Integration (Chart.js)

**CDN include** (added to `<head>` of `index.html`):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
```

**Chart configuration** (produced by `chartModule.update()`):

```js
{
  type: 'bar',
  data: {
    labels: ['Food', 'Transport', ...],   // category names
    datasets: [
      {
        label: 'Spent',
        data: [450, 120, ...],            // sum of expenses per category
        backgroundColor: categories.map(c =>
          isOverBudget(c) ? '#E53E3E' : '#4A90D9'   // red if over, blue otherwise
        )
      },
      {
        label: 'Budget',
        data: [500, 200, ...],            // budget limit per category (0 if unset)
        backgroundColor: '#A0AEC0'        // neutral grey
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: formatCurrency }
      }
    }
  }
}
```

The `<canvas>` is wrapped in a `div.chart-container` with `position: relative` and a fixed height (300px mobile, 400px desktop) so `responsive: true` / `maintainAspectRatio: false` sizes the chart correctly.

The chart instance is stored in `chartModule`'s module-level variable. On every data change, `chartModule.update()` mutates `chart.data` directly and calls `chart.update()` to avoid destroying and recreating the instance (avoids flicker).

**Empty state**: When `expenses.getAll()` and `budgets.getAll()` both return empty arrays, `chartModule` hides the canvas and shows the empty-state message. On first data entry, the canvas is made visible and the chart is initialised.

---

## Validation Logic Design

All validation is performed in `validator.js` as pure functions before any storage write. The DOM layer (`ui.js`) calls the validator, reads the `errors` object, and renders inline error messages adjacent to each offending field.

### Amount Validation

```
isValidAmount(raw):
  1. Trim whitespace
  2. If empty → false
  3. Parse to float → if NaN or Infinity → false
  4. If value < 0.01 or value > 999_999_999.99 → false
  5. If decimal places > 2 → false
  6. → true
```

### Date Validation

```
isValidDate(dateStr):
  1. Attempt Date.parse → if invalid → false
  2. Compute minDate = today minus 10 years
  3. Compute maxDate = today plus 1 day
  4. If date < minDate or date > maxDate → false
  5. → true
```

### Description Validation (optional field)

```
validateDescription(value):
  1. If empty string → valid (optional field)
  2. If length > 255 → invalid, error message
  3. → valid
```

### Category Name Validation

```
validateCategoryName(name, existingNames):
  1. Trim whitespace
  2. If length < 1 → invalid
  3. If length > 50 → invalid
  4. Normalise to lowercase; if any existingNames normalised to lowercase matches → duplicate error
  5. → valid
```

---

## Event Flow / Interaction Patterns

### Add Expense

```
1. User fills form and submits
2. main.js handleExpenseSubmit(event):
   a. event.preventDefault()
   b. Read form values
   c. validator.validateExpense(data) → if invalid: ui.showErrors(); return
   d. expenses.add(data) → calls storage.write()
   e. If storage write fails: ui.showError(form, "Save failed"); return
   f. ui.showConfirmation("Expense added!", 3000)
   g. form.reset()
   h. Re-render chart + expense list
```

### Delete Expense

```
1. User clicks delete button on an expense row
2. main.js handleDeleteExpense(id):
   a. confirmed = await ui.showConfirmDialog("Delete this expense?")
   b. If !confirmed: return
   c. expenses.remove(id) → calls storage.write()
   d. Re-render expense list + chart + summary
```

### Set Budget

```
1. User fills budget form and submits
2. main.js handleBudgetSubmit(event):
   a. validator.validateBudget(data) → if invalid: ui.showErrors(); return
   b. isUpdate = budgets.getByCategory(categoryId) !== null
   c. budgets.set(data)
   d. ui.showConfirmation(isUpdate ? "Budget updated!" : "Budget set!", 3000)
   e. Re-render chart + summary
```

### Reset All Data

```
1. User clicks "Reset All Data"
2. confirmed = await ui.showConfirmDialog("This will delete all expenses, budgets, and custom categories. Are you sure?")
3. If !confirmed: return
4. result = storage.clear(["sefc_expenses", "sefc_budgets", "sefc_categories"])
5. If !result.ok: ui.showError(null, "Reset failed. Please try again."); return
6. Reload all data from storage (now empty); re-render dashboard
```

### App Load

```
DOMContentLoaded:
  1. If !storage.isAvailable(): show persistent warning banner; init with empty state
  2. Else: load expenses, budgets, categories from storage
  3. Populate category selects
  4. Render dashboard
  5. Attach all event listeners
  6. Hide loading indicator
```

---

## File Structure for GitHub Pages Deployment

```
/ (repository root)
├─ index.html
├─ styles/
│    └─ main.css
└─ js/
     ├─ main.js
     ├─ storage.js
     ├─ validator.js
     ├─ categories.js
     ├─ expenses.js
     ├─ budgets.js
     ├─ chart.js
     └─ ui.js
```

GitHub Pages serves any file in the repository root by default. No `_config.yml` or Jekyll configuration is needed. The `index.html` at the root is served as the default document.

All internal script imports use relative paths (`./js/main.js`, `./styles/main.css`). The Chart.js CDN tag means there is zero local build output to manage.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property-based testing library**: [fast-check](https://fast-check.io/) (JavaScript). Tests run in a browser-compatible test harness (Vitest or Jest). Each property test runs a minimum of 100 iterations.

---

### Property 1: Expense ID uniqueness

*For any* sequence of N valid expense saves, all resulting expense IDs in LocalStorage are distinct — no two saved expenses share the same `id`.

**Validates: Requirements 1.2**

---

### Property 2: Amount validation accepts valid range, rejects invalid inputs

*For any* numeric value, `validator.isValidAmount(value)` returns `true` if and only if `0.01 ≤ value ≤ 999,999,999.99` with at most 2 decimal places, and returns `false` for all other inputs (negative, zero, non-numeric, out-of-range, too many decimals).

**Validates: Requirements 1.3, 2.1, 2.3**

---

### Property 3: Date validation accepts valid range, rejects out-of-range dates

*For any* date string, `validator.isValidDate(dateStr)` returns `true` if and only if the date parses to a valid calendar date falling within `[today − 10 years, today + 1 day]`, and returns `false` for all dates outside this range or for unparseable strings.

**Validates: Requirements 1.4**

---

### Property 4: Description length boundary

*For any* string of length ≤ 255 characters, the validator accepts the description. *For any* string of length > 255 characters, the validator rejects it with an error.

**Validates: Requirements 1.7**

---

### Property 5: Successful save clears the form (state after save)

*For any* valid expense input, after `expenses.add(data)` completes successfully, calling `form.reset()` followed by inspecting each form field value yields an empty string or the field's default value. (This property validates the post-save form state; the "clear fields" behaviour is unconditional on valid save.)

**Validates: Requirements 1.8**

---

### Property 6: Budget overwrite is idempotent per category

*For any* category and *any two* valid budget amounts A and B applied sequentially to the same category, `budgets.getByCategory(categoryId).amount` equals B (the last written value), and `budgets.getAll()` contains exactly one entry for that category.

**Validates: Requirements 2.5**

---

### Property 7: Corrupt LocalStorage initialises to empty state

*For any* string that is not valid JSON, storing it under `"sefc_expenses"` or `"sefc_budgets"` and then calling the app's load routine results in an empty expense list and empty budget list (and triggers a user warning), rather than throwing an unhandled exception.

**Validates: Requirements 3.5**

---

### Property 8: Total spent summary equals sum of all expense amounts

*For any* collection of expense records, the value returned by the total-spent computation equals the precise arithmetic sum of all `amount` fields, rounded to 2 decimal places.

**Validates: Requirements 4.3**

---

### Property 9: Over-budget categories are flagged; within-budget categories are not

*For any* set of expenses and budgets, the chart data-preparation function marks a category as "over budget" (overage colour) if and only if the sum of its expenses strictly exceeds its budget amount. Categories with no budget set are never flagged.

**Validates: Requirements 4.4**

---

### Property 10: Remaining budget equals budget minus total expenses

*For any* category that has a budget, the remaining-budget value surfaced in the dashboard equals `budget.amount − sum(expenses for that category)`, which may be negative when over budget.

**Validates: Requirements 4.6**

---

### Property 11: Expense list contains all required fields for every entry

*For any* collection of expense records passed to the render function, every rendered list item contains the `amount`, `categoryLabel`, `date`, and `description` (or empty placeholder) of the corresponding expense.

**Validates: Requirements 5.1**

---

### Property 12: Expense list is sorted by date descending

*For any* collection of expense records, the list rendered by `ui.renderExpenseList(expenses)` presents entries in descending date order: for any two adjacent entries i and i+1, `entry[i].date >= entry[i+1].date`.

**Validates: Requirements 5.2**

---

### Property 13: Delete removes the target expense and only that expense

*For any* expense in storage and *any* confirmed delete action on that expense, it no longer appears in the result of `expenses.getAll()`, and all other expenses remain present and unchanged.

**Validates: Requirements 5.4**

---

### Property 14: Cancel delete is a no-op

*For any* storage state and *any* cancelled delete action, `expenses.getAll()` returns the same collection before and after the cancel.

**Validates: Requirements 5.5**

---

### Property 15: Category name validation enforces length and case-insensitive uniqueness

*For any* proposed category name, `validator.validateCategoryName(name, existing)` accepts names of 1–50 characters that do not case-insensitively match any existing name, and rejects names outside that length range or that are case-insensitive duplicates of an existing name.

**Validates: Requirements 6.3, 6.4**

---

### Property 16: Deleted custom category label is preserved on existing expenses

*For any* expense assigned to a custom category, deleting that custom category leaves the expense's `categoryLabel` field unchanged.

**Validates: Requirements 6.5**

---

### Property 17: Reset produces empty storage with only default categories

*For any* storage state, after confirming a data reset, `expenses.getAll()` returns `[]`, `budgets.getAll()` returns `[]`, and `categories.getAll()` returns exactly the 5 default categories (Food, Transport, Utilities, Entertainment, Other).

**Validates: Requirements 8.3**

---

### Property 18: Cancel reset is a no-op

*For any* storage state, after cancelling a data reset, `expenses.getAll()`, `budgets.getAll()`, and `categories.getAll()` each return the same data as before the cancel action.

**Validates: Requirements 8.4**

---

## Error Handling

| Scenario | Handling |
|---|---|
| `localStorage` unavailable (blocked, private mode) | Persistent banner: "Storage unavailable — data will not be saved"; app still functional in-memory for the session |
| `JSON.parse` fails on load | Discard that key, warn user via banner, initialise with `[]` |
| `localStorage.setItem` throws `QuotaExceededError` | Show inline error near the form: "Could not save — storage is full"; in-memory state is not updated |
| `localStorage.clear` / `removeItem` throws | Show error message: "Reset failed. Your data is unchanged."; do not alter in-memory state |
| Chart.js CDN fails to load | The `<canvas>` container shows a fallback message: "Chart unavailable — could not load charting library"; the rest of the app is unaffected |
| `crypto.randomUUID` unavailable (very old browser) | Fall back to a timestamp + Math.random composite ID string |

---

## Testing Strategy

### Unit Tests (example-based)

Use **Vitest** (zero-config, browser-compatible, ES module-native) run with `--run` for single execution.

Focus areas:
- `validator.js` — specific known-good and known-bad inputs for amount, date, description, category name
- `storage.js` — localStorage mock: read/write success, unavailable, quota exceeded, malformed JSON
- `categories.js` — add/delete/duplicate detection with the 5 defaults always present
- `expenses.js` / `budgets.js` — add, remove, overwrite, sort order
- `ui.js` rendering helpers — stub DOM, verify output strings and element states
- Chart data-preparation logic — overage flag, remaining budget arithmetic, currency formatting

Unit tests cover:
- Known valid examples (boundary values, common cases)
- Specific edge conditions: empty inputs, boundary amounts (0.00, 0.01, 999,999,999.99, 1,000,000,000), malformed dates, max-length descriptions

### Property-Based Tests

Use **fast-check** ([fast-check.io](https://fast-check.io/)) run through Vitest.

Each property test runs **minimum 100 iterations** (fast-check default is 100). Each test is annotated with the property it validates.

Tag format:
```
// Feature: sefc-expense-budget-visualizer, Property N: <property text>
```

Properties 2–18 above are each implemented as a single property-based test. Generators used:
- `fc.float({ min: 0.01, max: 999_999_999.99 })` for valid amounts
- `fc.oneof(fc.float({ min: -1e9, max: 0 }), fc.string())` for invalid amounts
- `fc.date({ min: new Date('2000-01-01'), max: new Date() })` for valid dates
- `fc.array(fc.record({ amount, categoryId, date, description }))` for expense collections
- `fc.string({ minLength: 1, maxLength: 50 })` for category names
- `fc.string()` for arbitrary JSON-malformed strings

### Integration / Manual Tests

The following require manual or browser-based verification:
- Responsive layout at 375px, 768px, 1024px, 1440px (DevTools device toolbar)
- Cross-browser rendering (Chrome, Firefox, Edge, Safari)
- Screen reader announcement of form errors and toasts (VoiceOver / NVDA)
- 44×44px touch target verification (DevTools touch simulation)
- WCAG 4.5:1 contrast ratio (browser DevTools accessibility panel or WebAIM contrast checker)
- Dashboard load time ≤ 2 seconds on a throttled 25 Mbps connection (DevTools Network throttle)
- Chart.js CDN unavailable fallback (DevTools block CDN request)
