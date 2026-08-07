# Implementation Plan: SEFC Expense & Budget Visualizer

## Overview

Build a fully client-side static web app (plain HTML/CSS/JS, no build step, no test setup — per the assignment brief) that records transactions, optionally sets per-category budgets, and visualises spending by category via a Chart.js pie chart. All data persists in `localStorage`. Ships as exactly one CSS file and one JS file per the brief's folder rule, ready for direct GitHub Pages deployment.

This plan reflects the app as actually built. An earlier Kiro-generated plan (see `design.md` → Revision History) was superseded once the actual assignment brief PDF was reviewed against the implementation and found to conflict with it on several points (file count, chart type, category set, missing required field, an unrequired test suite).

---

## Tasks

- [x] 1. Project scaffold
  - [x] 1.1 `index.html` — page shell, header (logo/nav/theme-toggle/reset), five view sections (Dashboard, Add Transaction, Set Budget, Categories, Monthly Summary), confirm/cancel dialog, global toast element, single `css/main.css` link, single `js/main.js` script tag (classic script, not a module — runs over `file://` with no server required)
  - [x] 1.2 `css/main.css` — CSS custom properties for a light theme + dark-theme override block, mobile-first responsive layout, WCAG-conscious contrast and 44×44px touch targets

- [x] 2. Storage layer (`Storage` object in `js/main.js`)
  - [x] 2.1 `isAvailable()`, `read()`, `write()`, `clear()` — reads never throw (malformed JSON → `null`), writes return `{ ok, error? }`, in-memory state only updates after a successful write

- [x] 3. Validation (`Validator` object)
  - [x] 3.1 `isValidAmount`, `isValidDate`, `validateExpense` (including the required Item Name field), `validateBudget`, `validateCategoryName` — all pure, no DOM access

- [x] 4. Categories (`Categories` object)
  - [x] 4.1 3 default categories — **Food, Transport, Fun** (per the brief; not the 5-category set from the superseded plan)
  - [x] 4.2 `getAll/addCustom/deleteCustom/findById/isDefault`, custom categories persisted separately from defaults, case-insensitive duplicate rejection

- [x] 5. Transactions (`Expenses` object)
  - [x] 5.1 Data model includes `name` (Item Name — required per the brief, missing from the superseded plan), plus `amount/categoryId/categoryLabel/date/description/createdAt`
  - [x] 5.2 `getAll` (sorted date desc), `add`, `remove`; `categoryLabel` denormalised at write time so it survives category deletion
  - [x] 5.3 `sortExpenses(expenses, mode)` — date-desc / amount-desc / category-asc, for the sort optional challenge

- [x] 6. Budgets (`Budgets` object) — bonus feature supporting the "highlight over limit" optional challenge
  - [x] 6.1 `getAll/getByCategory/set` — one budget per category, overwritten on re-set

- [x] 7. UI rendering & interaction (`UI` object)
  - [x] 7.1 `renderTotalSummary`, `renderBudgetSummary` (with over-budget row highlighting), `renderExpenseList`, `renderMonthlySummary`, `renderEmptyState`
  - [x] 7.2 `showConfirmDialog` (focus-trapped modal, Promise<boolean>), `showConfirmation` (global toast, top-right, auto-dismiss), `showError`/`clearErrors` (inline, `role="alert"`), `setLoadingState`

- [x] 8. Chart (`ChartModule` object)
  - [x] 8.1 **Pie chart** of spending by category (Chart.js 4.4.1 via CDN) — not the grouped bar chart from the superseded plan, to match the brief's example output
  - [x] 8.2 Positional colour assignment (not hash-based) for guaranteed visual contrast between adjacent slices at low category counts
  - [x] 8.3 CDN-failure fallback message; empty-state handling that toggles both the `hidden` attribute and inline `style.display` on the canvas (Chart.js's own inline styles otherwise override `[hidden]`)

- [x] 9. Theme (`Theme` object) — dark/light mode optional challenge
  - [x] 9.1 Toggle button in the header; persists choice to `sefc_theme`; defaults to OS `prefers-color-scheme` on first visit

- [x] 10. App wiring — entry point, routing, and handlers
  - [x] 10.1 `DOMContentLoaded` bootstrap: storage-availability check, theme init, populate category `<select>`s, initial render, event listener attachment
  - [x] 10.2 `showView()` — panel-toggling router (no URL/hash routing) across the 5 views
  - [x] 10.3 Form submit handlers (Add Transaction, Set Budget, Add Category) — validate → save → toast → reset form → re-render
  - [x] 10.4 Delete handlers (transaction, category) — confirm dialog → remove → re-render
  - [x] 10.5 Reset-all-data handler — confirm dialog → clear 3 storage keys → re-render to empty state

- [x] 11. Monthly summary view — optional challenge
  - [x] 11.1 Groups transactions by `YYYY-MM`, shows month label, transaction count, and total spent, most recent month first

- [x] 12. Single-file consolidation
  - [x] 12.1 Merged the original 8-file ES-module architecture (`storage.js`, `validator.js`, `categories.js`, `expenses.js`, `budgets.js`, `ui.js`, `chart.js`, `main.js`) into one `js/main.js`, wrapped in an IIFE with namespaced objects to preserve separation of concerns
  - [x] 12.2 Merged `styles/main.css` → `css/main.css` (folder rename to match the brief), deleted the old `styles/` directory and the now-redundant module files

- [x] 13. UI polish pass
  - [x] 13.1 Data-entry forms (`#form-expense`, `#form-budget`, `#form-add-category`) restyled as centred, card-styled panels
  - [x] 13.2 Header made full-bleed (background spans the viewport edge-to-edge) with an inner `.header-inner` wrapper capping content to the same width as the page below it
  - [x] 13.3 Header compacted (reduced vertical padding); theme-toggle + reset buttons grouped into `.header-actions`, pushed flush right via `margin-left: auto`, aligned with the nav row
  - [x] 13.4 Budget Summary given a wider, non-overflowing column (`minmax()`-based desktop grid, tightened table cell padding, header labels allowed to wrap while data cells stay on one line)
  - [x] 13.5 Transaction list capped to a fixed max-height per breakpoint with an internally scrolling `.expense-items` list (sort control stays outside the scroll area); added scrollbar clearance so the delete button isn't flush against it
  - [x] 13.6 Desktop dashboard grid switched from fixed pixel column widths to `minmax()`-based flexible columns after fixed widths were found to overflow at the 1024px breakpoint boundary

- [x] 14. Verification
  - [x] 14.1 Manually driven in a real headless-Chromium browser (Playwright) against a local static file server: full add/validate/delete/reset/sort/theme-toggle/monthly-summary flow; layout checked at 375px / 768px / 1024px / 1400px / 1600px with zero page-level horizontal overflow and zero console errors at each

---

## Notes

- No automated test suite (Vitest/fast-check) — the brief's NFR-1 explicitly states "No test setup required." Verification was done by driving the real app in a browser instead (see Task 14).
- `js/main.js` is a **classic script**, not `type="module"` — this lets the app run directly from a double-clicked `index.html` (`file://`) with no local server needed, which the original ES-module version required due to CORS.
- The `categoryLabel` denormalisation pattern (Tasks 5.2, 6.1) is intentional — it preserves labels on existing transactions/budgets after a custom category is deleted.
- `Storage.write()` failures must never silently corrupt in-memory state — callers only commit an in-memory update after a successful write.
- Chart flicker is avoided by mutating `chart.data` in place and calling `chart.update()`, never destroying/recreating the Chart.js instance.
