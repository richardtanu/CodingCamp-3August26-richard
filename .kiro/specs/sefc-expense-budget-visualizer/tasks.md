# Implementation Plan: SEFC Expense & Budget Visualizer

## Overview

Build a fully client-side static web app (plain HTML/CSS/JS, no build step) that records expenses, sets per-category budgets, and visualises spending against budgets via a Chart.js grouped bar chart. All data persists in `localStorage`. Files are structured for direct GitHub Pages deployment.

Implementation order: project scaffold → storage/validation foundation → domain modules → UI helpers → chart integration → entry point wiring → tests.

---

## Tasks

- [x] 1. Create project scaffold and HTML shell
  - [x] 1.1 Create `index.html` with full page structure
    - Add `<head>` with charset, viewport meta, title, Chart.js 4.4.1 CDN `<script>`, and `<link>` to `styles/main.css`
    - Add `<header>` with app title, `<nav>` with four links (Dashboard, Add Expense, Set Budget, Manage Categories), and `#btn-reset` button
    - Add `<main>` with four `<section>` panels: `#view-dashboard` (visible by default), `#view-add-expense` (hidden), `#view-set-budget` (hidden), `#view-categories` (hidden)
    - Inside `#view-dashboard` add `.summary-total`, `.chart-container` with `<canvas id="main-chart">`, `.budget-summary` table, and `.expense-list`
    - Inside `#view-add-expense` add `#form-expense` with labelled inputs for amount, category select, date, description textarea, submit button, and `.form-confirmation` status div
    - Inside `#view-set-budget` add `#form-budget` with labelled inputs for category select and budget limit, submit button, and `.form-confirmation` status div
    - Inside `#view-categories` add `#form-add-category` with labelled text input and submit button, `#custom-category-list` `<ul>`, and a read-only default categories display
    - Add `#dialog-overlay` (`role="dialog"`, `aria-modal="true"`, hidden) for confirm/cancel dialogs
    - Add `#loading-indicator` (`aria-live="polite"`, hidden) and a `#storage-warning` banner (hidden)
    - Add `<script type="module" src="./js/main.js">` before `</body>`
    - All form fields must use `<label for="...">` with matching `id` on the input; error containers use `role="alert"`; toast uses `role="status"`
    - _Requirements: 1.1, 2.1, 4.1, 5.1, 6.1, 7.1, 7.5, 7.6_

  - [x] 1.2 Create `styles/main.css` with responsive layout and WCAG colours
    - Define CSS custom properties for the colour palette (primary blue `#4A90D9`, overage red `#E53E3E`, neutral grey `#A0AEC0`, background, text); all text/background combinations must meet WCAG 4.5:1
    - Implement base mobile-first styles (single column, full-width sections, nav as horizontal scrollable tab bar)
    - Add `min-width: 768px` breakpoint for two-column dashboard (chart + budget summary side by side)
    - Add `min-width: 1024px` breakpoint for three-panel dashboard; nav always visible
    - `.chart-container`: `position: relative; height: 200px` on mobile, `height: 300px` at 768px, `height: 400px` at 1024px+
    - All interactive elements (buttons, delete icons) minimum 44×44 CSS pixels via padding
    - Style `#dialog-overlay` as full-screen modal backdrop with centred dialog card and focus-trap support
    - Style `.form-error` (inline error below field), toast `.form-confirmation`, and `#storage-warning` banner
    - No horizontal scroll at any viewport width from 375px to 1440px
    - _Requirements: 7.2, 7.4, 7.6, 7.8_

- [x] 2. Implement storage module
  - [x] 2.1 Create `js/storage.js`
    - Implement `storage.isAvailable()` — attempt a test `setItem`/`removeItem`; return `true` if no exception, `false` otherwise
    - Implement `storage.read(key)` — `JSON.parse(localStorage.getItem(key))`; return `null` (never throw) if item is absent or parsing fails
    - Implement `storage.write(key, value)` — `JSON.stringify` then `localStorage.setItem`; return `{ ok: true }` on success; catch `QuotaExceededError` and any other exception and return `{ ok: false, error }`
    - Implement `storage.clear(keys[])` — call `localStorage.removeItem` for each key; return `{ ok: true }` on success or `{ ok: false, error }` on any exception
    - Export all four functions as named exports from the module
    - _Requirements: 3.1, 3.3, 3.4, 3.6, 8.1, 8.5_

  - [ ] 2.2 Write unit tests for `storage.js` (`tests/storage.test.js`)
    - Mock `localStorage` with an in-memory object that can simulate unavailability and quota errors
    - Test `isAvailable()` returns `true` when storage works and `false` when `setItem` throws
    - Test `read()` returns `null` for absent key, `null` for malformed JSON, and the parsed object for valid JSON
    - Test `write()` returns `{ ok: true }` on success and `{ ok: false, error }` when `setItem` throws `QuotaExceededError`
    - Test `clear()` removes all specified keys and returns error result when `removeItem` throws
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Implement validator module
  - [x] 3.1 Create `js/validator.js`
    - Implement `validator.isValidAmount(value)` — trim, parse float, reject NaN/Infinity, enforce `0.01 ≤ v ≤ 999_999_999.99`, reject more than 2 decimal places; return boolean
    - Implement `validator.isValidDate(dateStr)` — `Date.parse` check, compute `minDate = today − 10 years` and `maxDate = today + 1 day`, return boolean
    - Implement `validator.validateExpense({ amount, categoryId, date, description })` — call `isValidAmount`, `isValidDate`, check `categoryId` is non-empty, check description ≤ 255 chars; return `{ valid: true, errors: {} }` or `{ valid: false, errors: { field: message } }`
    - Implement `validator.validateBudget({ amount, categoryId })` — call `isValidAmount`, check `categoryId`; return same shape as above
    - Implement `validator.validateCategoryName(name, existingNames[])` — trim, enforce 1–50 char length, case-insensitive duplicate check against `existingNames`; return `{ valid: true }` or `{ valid: false, error: string }`
    - All functions are pure — no DOM access, no module imports, no side effects
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.3, 2.4, 6.3, 6.4_

  - [ ]\* 3.2 Write unit tests for `validator.js` — known examples (`tests/validator.test.js`)
    - Test `isValidAmount`: boundary values `0.00` (reject), `0.01` (accept), `999,999,999.99` (accept), `1,000,000,000` (reject), non-numeric strings, negative numbers, three-decimal inputs
    - Test `isValidDate`: today (accept), today+1 day (accept), today+2 days (reject), exactly 10 years ago (accept), 10 years ago minus 1 day (reject), invalid string "not-a-date"
    - Test `validateExpense`: all-valid input, missing amount, missing categoryId, invalid date, description at 255 chars (accept), description at 256 chars (reject)
    - Test `validateBudget`: valid input, missing category, zero amount
    - Test `validateCategoryName`: 1-char name (accept), 50-char name (accept), 51-char name (reject), empty string (reject), case-insensitive duplicate (reject)
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 2.3, 2.4, 6.3, 6.4_

  - [ ]\* 3.3 Write property-based tests for `validator.js` (`tests/validator.test.js`)
    - **Property 2: Amount validation accepts valid range, rejects invalid inputs** — use `fc.float({ min: 0.01, max: 999_999_999.99 })` for valid amounts; `fc.oneof(fc.float({ min: -1e9, max: 0 }), fc.string())` for invalid; assert `isValidAmount` matches expected boolean
    - **Property 3: Date validation accepts valid range, rejects out-of-range dates** — use `fc.date({ min: tenYearsAgo, max: tomorrow })` for valid; dates outside range for invalid; assert `isValidDate` matches expected boolean
    - **Property 4: Description length boundary** — `fc.string({ maxLength: 255 })` → accept; `fc.string({ minLength: 256 })` → reject
    - **Property 15: Category name length and case-insensitive uniqueness** — `fc.string({ minLength: 1, maxLength: 50 })` with no duplicates → accept; length violations and case-insensitive duplicates → reject
    - Annotate each test: `// Feature: sefc-expense-budget-visualizer, Property N: <title>`
    - _Requirements: 1.3, 1.4, 1.7, 6.3, 6.4_

- [ ] 4. Checkpoint — storage and validator foundation
  - Ensure all storage and validator tests pass. Ask the user if questions arise before continuing.

- [x] 5. Implement categories module
  - [x] 5.1 Create `js/categories.js`
    - Define the 5 hard-coded default categories: `{ id: "cat-food", name: "Food", isDefault: true }`, Transport, Utilities, Entertainment, Other
    - Implement `categories.getAll()` — return defaults merged with custom categories read from `storage.read("sefc_categories")`; always inject defaults even if storage is empty
    - Implement `categories.addCustom(name)` — call `validator.validateCategoryName(name, existing names)`; on valid, create `{ id: crypto.randomUUID(), name, isDefault: false }`, append to custom list, call `storage.write`; return `{ ok: true, category }` or `{ ok: false, error }`
    - Implement `categories.deleteCustom(id)` — reject if `isDefault`; remove from custom list, call `storage.write`; return `{ ok: true }` or `{ ok: false, error }`
    - Implement `categories.findById(id)` — search merged list; return `Category | null`
    - Implement `categories.isDefault(id)` — return boolean
    - Fall back gracefully if `crypto.randomUUID` is unavailable (use `Date.now() + Math.random()` composite)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]\* 5.2 Write unit tests for `categories.js` (`tests/categories.test.js`)
    - Test `getAll()` always includes the 5 defaults regardless of storage state
    - Test `addCustom()` with valid name, duplicate name (case-insensitive), name too long
    - Test `deleteCustom()` of a custom category succeeds; attempt to delete a default category returns error
    - Test `findById()` for default ID, custom ID, missing ID
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

- [x] 6. Implement expenses module
  - [x] 6.1 Create `js/expenses.js`
    - Implement `expenses.getAll()` — `storage.read("sefc_expenses") ?? []`; return array sorted by `date` descending (secondary sort by `createdAt` descending for same-day entries)
    - Implement `expenses.add(expenseData)` — generate `id` via `crypto.randomUUID()`, set `createdAt` to current ISO datetime, append to existing array, call `storage.write`; return `{ ok: true, expense }` or `{ ok: false }` (do NOT update in-memory if write fails)
    - Implement `expenses.remove(id)` — filter out matching expense, call `storage.write`; return `{ ok: true }` or `{ ok: false }`; if write fails, do NOT update in-memory state
    - Denormalise `categoryLabel` from `categories.findById(expenseData.categoryId).name` at write time
    - _Requirements: 1.2, 3.1, 3.6, 5.2, 5.4_

  - [ ]\* 6.2 Write unit tests for `expenses.js` (`tests/expenses.test.js`)
    - Test `add()` persists expense and returns `{ ok: true, expense }` with generated `id`
    - Test `add()` returns `{ ok: false }` when storage write fails (mock quota error)
    - Test `remove()` deletes correct expense by `id`, leaves all others intact
    - Test `getAll()` returns entries sorted date descending
    - Test `getAll()` returns `[]` when storage is empty or malformed
    - _Requirements: 1.2, 3.5, 5.2, 5.4_

  - [ ]\* 6.3 Write property-based tests for `expenses.js` (`tests/expenses.test.js`)
    - **Property 1: Expense ID uniqueness** — add N valid expenses; assert all IDs in `getAll()` are distinct
    - **Property 12: Expense list is sorted by date descending** — `fc.array(fc.record({...}))` of valid expenses; assert adjacent entries satisfy `date[i] >= date[i+1]`
    - **Property 13: Delete removes target and only target** — add N expenses, remove one, assert it is gone and count is N-1 with all others unchanged
    - **Property 14: Cancel delete is a no-op** — call `remove` only when confirmed; simulate cancel by not calling `remove`; assert `getAll()` unchanged
    - Annotate each: `// Feature: sefc-expense-budget-visualizer, Property N: <title>`
    - _Requirements: 1.2, 5.2, 5.4, 5.5_

- [x] 7. Implement budgets module
  - [x] 7.1 Create `js/budgets.js`
    - Implement `budgets.getAll()` — `storage.read("sefc_budgets") ?? []`
    - Implement `budgets.getByCategory(categoryId)` — find first entry with matching `categoryId`; return `Budget | null`
    - Implement `budgets.set(budgetData)` — if budget for category already exists, overwrite it (same `id`); else append; set `updatedAt`; call `storage.write`; return `{ ok: true, budget, isUpdate }` or `{ ok: false }`; do NOT update in-memory if write fails
    - Denormalise `categoryLabel` from `categories.findById(budgetData.categoryId).name`
    - _Requirements: 2.2, 2.5, 3.1, 3.6_

  - [ ]\* 7.2 Write unit tests for `budgets.js` (`tests/budgets.test.js`)
    - Test `set()` creates new budget and returns `{ isUpdate: false }`
    - Test `set()` overwrites existing budget for same category and returns `{ isUpdate: true }`
    - Test `getByCategory()` returns correct budget and `null` for missing category
    - Test `getAll()` returns `[]` when storage empty
    - _Requirements: 2.2, 2.5_

  - [ ]\* 7.3 Write property-based tests for `budgets.js` (`tests/budgets.test.js`)
    - **Property 6: Budget overwrite is idempotent per category** — `fc.tuple(fc.float({min:0.01, max:999999999.99}), fc.float({min:0.01, max:999999999.99}))` as amounts A, B; set A then B for same category; assert `getByCategory().amount === B` and `getAll()` has exactly one entry for that category
    - Annotate: `// Feature: sefc-expense-budget-visualizer, Property 6: Budget overwrite is idempotent per category`
    - _Requirements: 2.5_

- [ ] 8. Checkpoint — domain modules
  - Ensure all categories, expenses, and budgets tests pass. Ask the user if questions arise before continuing.

- [x] 9. Implement UI helpers module
  - [x] 9.1 Create `js/ui.js` — rendering functions
    - Implement `ui.renderExpenseList(expenses)` — render expense entries into `.expense-list`; each item shows amount (formatted with `Intl.NumberFormat`), `categoryLabel`, `date`, `description` (or empty placeholder), and a delete button with `data-id` attribute; show empty state message if array is empty
    - Implement `ui.renderBudgetSummary(budgets, expenses, categories)` — render the budget summary table (Category | Budget | Spent | Remaining) inside `.budget-summary`; compute per-category totals from expenses array; show empty state if no budgets set
    - Implement `ui.renderTotalSummary(expenses)` — sum all expense amounts, format with `Intl.NumberFormat`, write into `.summary-total`
    - Implement `ui.renderEmptyState(containerEl, message)` — insert a styled empty-state paragraph into the target container
    - _Requirements: 4.1, 4.3, 4.6, 5.1, 5.6_

  - [x] 9.2 Create `js/ui.js` — interaction helpers
    - Implement `ui.showConfirmDialog(message)` — show `#dialog-overlay`, set message text, return `Promise<boolean>` that resolves on confirm (true) or cancel (false); trap focus inside dialog while open; hide overlay on resolution
    - Implement `ui.showConfirmation(message, durationMs)` — set toast message in `.form-confirmation` (`role="status"`), auto-dismiss after `durationMs` ms
    - Implement `ui.showError(fieldEl, message)` — insert/update error element adjacent to `fieldEl` with `role="alert"`
    - Implement `ui.clearErrors(formEl)` — remove all `role="alert"` elements inside `formEl`
    - Implement `ui.setLoadingState(bool)` — show/hide `#loading-indicator`
    - _Requirements: 1.2, 1.5, 1.6, 1.7, 2.2, 2.3, 2.4, 5.3, 7.6, 7.7_

- [x] 10. Implement chart module
  - [x] 10.1 Create `js/chart.js`
    - Implement `chartModule.init(canvasEl)` — guard against double-init; create `new Chart(canvasEl, config)` with `type: 'bar'`, `responsive: true`, `maintainAspectRatio: false`; store instance in module-level variable
    - Implement `chartModule.update(expenses, budgets, categories)` — compute per-category spent totals; set bar colours (`#E53E3E` if spent > budget, `#4A90D9` otherwise); budget bars always `#A0AEC0`; mutate `chart.data` and call `chart.update()` (no destroy/recreate)
    - Implement `chartModule.destroy()` — call `chart.destroy()` and null out the instance
    - Handle Chart.js CDN load failure: if `window.Chart` is undefined, hide canvas and show fallback message "Chart unavailable — could not load charting library"
    - Currency tooltip callback: `label: (ctx) => \`\${ctx.dataset.label}: \${formatCurrency(ctx.parsed.y)}\``; y-axis tick callback uses `formatCurrency`
    - Show empty state (hide canvas) when both expenses and budgets arrays are empty; show canvas on first data entry
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 7.3_

  - [ ]\* 10.2 Write property-based tests for chart data preparation (`tests/expenses.test.js` or a dedicated `tests/chart.test.js`)
    - **Property 8: Total spent equals sum of all expense amounts** — `fc.array(fc.record({ amount: fc.float({min:0.01, max:999999.99}) }))` of expenses; assert computed total equals `expenses.reduce((s,e) => s + e.amount, 0)` rounded to 2 dp
    - **Property 9: Over-budget categories flagged; within-budget not flagged** — for any set of expenses and budgets, assert category colour is overage colour iff `sum(expenses) > budget.amount`; categories with no budget are never flagged
    - **Property 10: Remaining budget equals budget minus total expenses** — for any category with a budget, assert `remaining === budget.amount - sum(expenses for category)`; value may be negative
    - Annotate each: `// Feature: sefc-expense-budget-visualizer, Property N: <title>`
    - _Requirements: 4.3, 4.4, 4.6_

- [x] 11. Implement entry point and event wiring
  - [x] 11.1 Create `js/main.js` — app initialisation
    - Wrap all logic in `DOMContentLoaded` listener
    - Call `storage.isAvailable()`; if false, show `#storage-warning` banner and proceed with empty in-memory state
    - Call `ui.setLoadingState(true)` immediately; call `ui.setLoadingState(false)` after dashboard renders
    - Load `expenses.getAll()`, `budgets.getAll()`, `categories.getAll()`
    - Populate both category `<select>` elements (expense form and budget form) from `categories.getAll()`
    - Render dashboard: call `ui.renderTotalSummary`, `ui.renderBudgetSummary`, `ui.renderExpenseList`
    - Initialise chart: call `chartModule.init(document.getElementById('main-chart'))` then `chartModule.update(...)`
    - _Requirements: 3.2, 3.4, 4.2, 7.3, 7.5, 7.7_

  - [x] 11.2 Create `js/main.js` — view routing
    - Implement `showView(viewId)` — hide all `<section>` panels, show the one matching `viewId`, update `aria-current` on nav links
    - Attach `click` listeners to all four nav links to call `showView` with the appropriate panel id
    - _Requirements: 7.5_

  - [x] 11.3 Create `js/main.js` — expense form handler
    - Implement `handleExpenseSubmit(event)`: `preventDefault`, read form values, call `validator.validateExpense`; on invalid call `ui.showError` for each field and return; on valid call `expenses.add`; if storage fails call `ui.showError`; on success call `ui.showConfirmation("Expense added!", 3000)`, `form.reset()`, re-render dashboard and chart
    - Attach `submit` listener on `#form-expense`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 11.4 Create `js/main.js` — budget form handler
    - Implement `handleBudgetSubmit(event)`: `preventDefault`, read form values, call `validator.validateBudget`; on invalid show errors; on valid call `budgets.set`; on success call `ui.showConfirmation(isUpdate ? "Budget updated!" : "Budget set!", 3000)`; re-render chart and budget summary
    - Attach `submit` listener on `#form-budget`
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 11.5 Create `js/main.js` — delete expense handler
    - Implement `handleDeleteExpense(id)`: call `await ui.showConfirmDialog("Delete this expense?")`; if confirmed call `expenses.remove(id)`, re-render expense list and chart; if cancelled do nothing
    - Attach delegated `click` listener on `.expense-list` for delete button clicks (read `data-id`)
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 11.6 Create `js/main.js` — category management and data reset handlers
    - Implement `handleAddCategory(event)`: `preventDefault`, call `categories.addCustom(name)`; on invalid show error; on success re-render category list in `#view-categories`, re-populate category selects, show confirmation toast
    - Implement `handleDeleteCategory(id)`: call `await ui.showConfirmDialog("Delete this category?")`; if confirmed call `categories.deleteCustom(id)`, re-render category list and re-populate selects
    - Implement `handleReset()`: call `await ui.showConfirmDialog` with full warning text; if confirmed call `storage.clear([...])`, reload data from storage, re-render dashboard; if storage clear fails call `ui.showError` with "Reset failed. Your data is unchanged."
    - Attach `submit` on `#form-add-category`, delegated `click` on `#custom-category-list`, and `click` on `#btn-reset`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12. Checkpoint — full app wiring
  - Verify the app loads in a browser: dashboard renders, forms submit and validate, chart displays, delete and reset prompts work. Ask the user if questions arise before continuing.

- [ ] 13. Integration property tests
  - [ ]\* 13.1 Write property-based tests for storage corruption handling (`tests/storage.test.js`)
    - **Property 7: Corrupt LocalStorage initialises to empty state** — `fc.string()` as malformed JSON; store under `"sefc_expenses"` and `"sefc_budgets"`; call `storage.read`; assert result is `null` (no throw) and callers initialise to `[]`
    - Annotate: `// Feature: sefc-expense-budget-visualizer, Property 7: Corrupt LocalStorage initialises to empty state`
    - _Requirements: 3.5_

  - [ ]\* 13.2 Write property-based tests for reset and category management (`tests/categories.test.js`)
    - **Property 5: Successful save clears form fields** — `fc.record({...})` of valid expense data; simulate `form.reset()` call; assert all field values are empty string or default; (pure DOM-mock test)
    - **Property 11: Expense list contains all required fields** — `fc.array(fc.record({amount, categoryLabel, date, description}))` of expenses; render via stub; assert each rendered item contains all four fields
    - **Property 16: Deleted custom category label preserved on expenses** — add expense with custom category, delete category, call `expenses.getAll()`; assert `categoryLabel` is unchanged
    - **Property 17: Reset produces empty storage with only default categories** — `fc.anything()` as prior state; confirm reset; assert `getAll()` results are empty and categories is exactly the 5 defaults
    - **Property 18: Cancel reset is a no-op** — cancel reset prompt; assert all three `getAll()` calls return same data as before
    - Annotate each: `// Feature: sefc-expense-budget-visualizer, Property N: <title>`
    - _Requirements: 1.8, 5.1, 6.5, 8.3, 8.4_

- [ ] 14. Final checkpoint — ensure all tests pass
  - Run `npx vitest --run` and confirm all unit and property-based tests pass with zero failures. Ask the user if any test failures need investigation before marking the feature complete.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP — they do not block any downstream implementation task.
- All implementation files use `<script type="module">` — no bundler required.
- Testing uses **Vitest** (`npx vitest --run`) with **fast-check** for property tests. Run `npm init -y && npm install --save-dev vitest fast-check` in the repo root if no `package.json` exists yet.
- Property tests run a minimum of 100 iterations each (fast-check default).
- Each property test must be annotated: `// Feature: sefc-expense-budget-visualizer, Property N: <title>`
- The `categoryLabel` denormalisation pattern (tasks 6.1 and 7.1) is intentional — it preserves labels after custom category deletion (Requirement 6.5).
- `storage.write` failures must never silently corrupt in-memory state; the caller must only commit the in-memory update after a successful write.
- Chart flicker is avoided by mutating `chart.data` in place and calling `chart.update()` rather than destroying and recreating the Chart.js instance.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3"] },
    { "id": 3, "tasks": ["5.1", "6.1", "7.1"] },
    { "id": 4, "tasks": ["5.2", "6.2", "6.3", "7.2", "7.3"] },
    { "id": 5, "tasks": ["9.1", "9.2", "10.1"] },
    { "id": 6, "tasks": ["10.2", "11.1"] },
    { "id": 7, "tasks": ["11.2", "11.3", "11.4", "11.5"] },
    { "id": 8, "tasks": ["11.6"] },
    { "id": 9, "tasks": ["13.1", "13.2"] }
  ]
}
```
