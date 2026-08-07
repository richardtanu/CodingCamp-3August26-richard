# Requirements Document

## Introduction

The SEFC Expense & Budget Visualizer is a browser-based web application (built for the CodingCamp "Expense & Budget Visualizer" assignment brief) that lets a user record transactions, group them by category, set an optional per-category budget, and see a visual breakdown of spending. It is built with plain HTML, CSS, and vanilla JavaScript (no frameworks), stores all data in the browser's `localStorage`, and is deployable via GitHub Pages. Per the assignment's folder rules, the project ships exactly one CSS file (`css/main.css`) and exactly one JavaScript file (`js/main.js`).

## Glossary

- **Application**: The SEFC Expense & Budget Visualizer web app running in the browser.
- **User**: A person using the Application in a modern web browser.
- **Transaction**: A record of a monetary amount spent, with an item name, category, date, and optional description. (Referred to as "Expense" internally in code/storage.)
- **Budget**: An optional spending limit assigned to a category.
- **Category**: A named label used to group Transactions and Budgets. Defaults are Food, Transport, and Fun; the User may add custom categories.
- **LocalStorage**: The browser's built-in key-value storage used to persist data between sessions.
- **Chart**: A pie chart showing spending distribution by category, rendered with Chart.js.
- **Dashboard**: The main view of the Application — total balance, chart, budget summary, and transaction list.
- **Toast**: A transient, auto-dismissing notification shown in the top-right corner after a successful action.

---

## Requirements

### Requirement 1: Transaction Entry (MVP)

**User Story:** As a User, I want to enter transactions through a form, so that I can track my spending over time.

#### Acceptance Criteria

1. THE Input Form SHALL include required fields for Item Name, Amount, Category, and Date, and an optional Description field.
2. WHEN the User submits the form with all required fields valid, THE Application SHALL add the Transaction to LocalStorage with a unique identifier and display a toast confirmation.
3. THE Application SHALL validate that Amount is numeric, between 0.01 and 999,999,999.99 inclusive, with at most 2 decimal places.
4. THE Application SHALL validate that Date is a valid calendar date no earlier than 10 years before today and no later than 1 day after today.
5. IF the User submits the form with a required field empty or invalid, THEN THE Application SHALL show an inline error message next to that field and SHALL NOT save the Transaction.
6. IF a Description is provided, THE Application SHALL reject it if longer than 255 characters.
7. WHEN a Transaction is successfully saved, THE form SHALL clear all fields (Date resets to today).

---

### Requirement 2: Budget (bonus — supports "highlight spending over a set limit")

**User Story:** As a User, I want to optionally set a budget limit per category, so that I can see when I've overspent.

#### Acceptance Criteria

1. THE Application SHALL provide a "Set Budget" form accepting a Category and a limit amount (0.01–999,999,999.99).
2. WHEN the User submits a valid Budget, THE Application SHALL save it (overwriting any existing budget for that category) and show a toast confirming "Budget set!" or "Budget updated!".
3. THE Dashboard's Budget Summary table SHALL show, per budgeted category: Category, Budget, Spent, and Remaining (Budget − Spent, may be negative).
4. WHEN a category's total spending exceeds its budget, THE Dashboard SHALL visually flag that row (distinct color) — this satisfies the "highlight spending over a set limit" optional challenge.

---

### Requirement 3: Data Persistence

**User Story:** As a User, I want my data saved between sessions, so I don't lose my records on refresh.

#### Acceptance Criteria

1. THE Application SHALL store Transactions, Budgets, custom Categories, and the theme preference under separate LocalStorage keys (`sefc_expenses`, `sefc_budgets`, `sefc_categories`, `sefc_theme`).
2. WHEN the Application loads, THE Application SHALL read all previously saved data from LocalStorage and render the Dashboard.
3. IF LocalStorage is unavailable (private mode, blocked access), THEN THE Application SHALL show a persistent warning banner and continue functioning in-memory for the session.
4. IF stored data is malformed/not valid JSON, THEN THE Application SHALL discard it and initialise that data set to empty rather than throwing.
5. IF a LocalStorage write fails (e.g. quota exceeded), THEN THE Application SHALL show an inline error and SHALL NOT update in-memory state, so the UI never shows unsaved data as saved.

---

### Requirement 4: Visualization (MVP)

**User Story:** As a User, I want a chart of my spending by category, so I can see my financial situation at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL display a **pie chart** showing the proportion of total spending contributed by each category (Chart.js).
2. THE Chart SHALL update automatically whenever a Transaction is added or removed.
3. THE Dashboard SHALL display the running Total Balance (sum of all Transaction amounts) prominently, formatted as currency, updating automatically.
4. WHEN no Transactions exist, THE Chart area SHALL show an empty-state message instead of an empty chart.
5. IF the Chart.js library fails to load (e.g. CDN unavailable), THEN THE Application SHALL show a fallback message in place of the chart; the rest of the app SHALL remain functional.

---

### Requirement 5: Transaction List and Management (MVP)

**User Story:** As a User, I want to view and manage my transactions, so I can keep my records accurate.

#### Acceptance Criteria

1. THE Dashboard SHALL display a scrollable list of all Transactions showing item name, amount, category, date, and description (if any).
2. THE list SHALL be sorted by date descending by default, with a control to re-sort by Amount (highest first) or Category (A–Z) — satisfies the "sort transactions" optional challenge.
3. THE Transaction list panel SHALL have a fixed maximum height with its own internal vertical scrollbar, so the Dashboard page itself does not grow unbounded as transactions are added.
4. WHEN the User clicks delete on a Transaction, THE Application SHALL show a confirm/cancel dialog before removing anything.
5. WHEN the User confirms deletion, THE Application SHALL remove the Transaction and re-render the list, chart, and totals.
6. IF the User cancels, THEN THE Transaction SHALL remain unchanged.
7. IF no Transactions exist, THEN THE list SHALL show an empty-state message.

---

### Requirement 6: Category Management

**User Story:** As a User, I want to organize transactions by category, including adding my own, so I can track spending the way I want.

#### Acceptance Criteria

1. THE Application SHALL provide 3 default Categories — **Food, Transport, Fun** — available on first load and not deletable.
2. THE Application SHALL let the User add a custom Category (1–50 characters) — satisfies the "custom categories" optional challenge.
3. IF a proposed Category name case-insensitively duplicates an existing one, THEN THE Application SHALL reject it with an error and SHALL NOT save it.
4. THE User SHALL be able to delete a custom Category. Existing Transactions/Budgets referencing it SHALL retain their category label unchanged (the label is denormalised at write time).
5. Default Categories SHALL NOT be deletable.

---

### Requirement 7: User Interface, Accessibility, and Responsive Layout

**User Story:** As a User, I want a clean, mobile-friendly interface, so I can use the app comfortably on any device.

#### Acceptance Criteria

1. THE Application SHALL be implemented in plain HTML, CSS, and vanilla JavaScript, with Chart.js as the only external dependency (per Technical Constraint TC-1).
2. THE Application SHALL be responsive with no horizontal page overflow from 375px (mobile) to at least 1600px (wide desktop) — mobile single column, tablet (≥768px) two-column dashboard, desktop (≥1024px) three-panel dashboard with flexible (`minmax()`) column widths so panels shrink together rather than overflow.
3. Data-entry forms (Add Transaction, Set Budget, Add Category) SHALL be presented as centred, card-styled panels (white background, rounded corners, shadow) rather than plain left-aligned fields.
4. THE header/nav bar SHALL span the full viewport width (background edge-to-edge) while its inner content (logo, nav links, theme/reset buttons) stays aligned to the same capped, centred width as the page content below it.
5. THE theme-toggle and reset buttons SHALL be grouped so they always appear together, flush to the right edge of the header, aligned with the nav row.
6. THE Dashboard SHALL be the default view on load; navigation between Dashboard / Add Transaction / Set Budget / Categories / Monthly Summary SHALL require no page reload.
7. Confirmation messages after an action SHALL appear as an auto-dismissing toast in the top-right corner (anchored below the header), not inline within the form.
8. All interactive touch targets SHALL be at least 44×44 CSS pixels; form fields SHALL have programmatically associated labels; error messages SHALL use `role="alert"`.

---

### Requirement 8: Data Reset

**User Story:** As a User, I want to clear all my data, so I can start fresh without manually clearing browser storage.

#### Acceptance Criteria

1. THE Application SHALL provide a "Reset All Data" action that clears Transactions, Budgets, and custom Categories from LocalStorage.
2. WHEN selected, THE Application SHALL show a confirm/cancel dialog describing the action before making any changes.
3. WHEN confirmed, THE Application SHALL clear the data and re-render the Dashboard to its empty state with only the 3 default Categories.
4. IF cancelled, THEN all data SHALL remain unchanged.
5. IF the clear operation fails, THEN THE Application SHALL alert the User that the reset failed and preserve existing data.

---

### Requirement 9: Optional Challenges (assignment requires choosing 3 of 5 — all 5 implemented)

1. ✅ **Custom categories** — Requirement 6.2.
2. ✅ **Highlight spending over a set limit** — Requirement 2.4 (via the Budget feature).
3. ✅ **Sort transactions by amount or category** — Requirement 5.2.
4. ✅ **Dark/light mode toggle** — a theme toggle button in the header switches between light and dark palettes, persists the choice in `sefc_theme`, and defaults to the OS `prefers-color-scheme` on first visit.
5. ✅ **Monthly summary view** — a dedicated "Monthly Summary" view groups Transactions by calendar month (most recent first), showing transaction count and total spent per month.

---

## Non-Functional Requirements (from the assignment brief)

- **NFR-1 Simplicity**: Clean, minimal interface; no build step; no test setup required.
- **NFR-2 Performance**: Fast load, responsive interactions, no noticeable lag when adding/deleting data.
- **NFR-3 Visual Design**: User-friendly aesthetic, clear visual hierarchy, readable typography, light/dark theming.

## Technical Constraints (from the assignment brief)

- **TC-1**: HTML + CSS + vanilla JavaScript only (Chart.js is the one permitted charting utility); no backend server.
- **TC-2**: All data stored client-side via the LocalStorage API.
- **TC-3**: Works in current Chrome, Firefox, Edge, and Safari.
- **Folder rule**: Exactly one CSS file in `css/`, exactly one JavaScript file in `js/`.
