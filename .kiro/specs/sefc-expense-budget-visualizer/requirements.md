# Requirements Document

## Introduction

The SEFC Expense & Budget Visualizer is a browser-based web application that allows users to input, manage, and visualize personal or organizational expense and budget data. The application is built with plain HTML, CSS, and JavaScript (no frameworks), stores all data in the browser's localStorage, and is deployable via GitHub Pages. It provides an intuitive interface for tracking spending against budgets through clean, readable charts and visualizations.

## Glossary

- **Application**: The SEFC Expense & Budget Visualizer web app running in the browser.
- **User**: A person using the Application in a modern web browser.
- **Expense**: A record of a monetary amount spent, with a category, description, and date.
- **Budget**: A defined spending limit assigned to a category for a given period.
- **Category**: A named label used to group Expenses and Budgets (e.g., "Food", "Transport", "Utilities").
- **Entry**: A single Expense or Budget record created by the User.
- **LocalStorage**: The browser's built-in key-value storage used to persist data between sessions.
- **Chart**: A graphical representation of Expense or Budget data rendered in the browser.
- **Input_Form**: The UI component through which the User submits Expense or Budget data.
- **Dashboard**: The main view of the Application that displays Charts and summary data.
- **Validator**: The component responsible for checking the correctness of User-supplied input.

---

## Requirements

### Requirement 1: Expense Data Entry

**User Story:** As a User, I want to enter expense records through a form, so that I can track my spending over time.

#### Acceptance Criteria

1. THE Input_Form SHALL include required fields for expense amount, category, and date, and an optional description field.
2. WHEN the User submits the Input_Form with all required fields filled, THE Application SHALL save the Expense to LocalStorage with a unique identifier and display a confirmation message for 3 seconds.
3. WHEN the User submits the Input_Form, THE Validator SHALL verify that the amount field contains a positive numeric value between 0.01 and 999,999,999.99 inclusive.
4. WHEN the User submits the Input_Form, THE Validator SHALL verify that the date field contains a valid calendar date no earlier than 10 years before today and no later than 1 day after today.
5. IF the User submits the Input_Form with one or more required fields empty, THEN THE Validator SHALL display an inline error message identifying each missing field.
6. IF the User submits the Input_Form with an invalid amount (non-numeric, zero, negative, or out of range), THEN THE Validator SHALL display an error message stating the amount must be a positive number between 0.01 and 999,999,999.99.
7. IF the User enters a description, THEN THE Validator SHALL verify the description is at most 255 characters and SHALL display an error message if the limit is exceeded.
8. WHEN an Expense is successfully saved, THE Input_Form SHALL clear all fields.

---

### Requirement 2: Budget Data Entry

**User Story:** As a User, I want to set a budget limit for each category, so that I can monitor whether my spending stays within defined limits.

#### Acceptance Criteria

1. THE Input_Form SHALL include a budget entry mode that accepts a category and a budget limit amount between 0.01 and 999,999,999.99 inclusive.
2. WHEN the User submits a Budget entry with a valid category and a valid amount, THE Application SHALL save the Budget to LocalStorage and display a confirmation message.
3. IF the User submits a Budget entry with an amount that is not a positive numeric value between 0.01 and 999,999,999.99, THEN THE Validator SHALL display an error message stating the budget limit must be a positive number in range, and the Budget SHALL NOT be saved.
4. IF the User submits a Budget entry without selecting a category, THEN THE Validator SHALL display an error message requiring a category selection, and the Budget SHALL NOT be saved.
5. WHEN a Budget is saved for a category that already has an existing Budget, THE Application SHALL overwrite the previous Budget for that category and display a message indicating the budget was updated.

---

### Requirement 3: Data Persistence

**User Story:** As a User, I want my expense and budget data to be saved between browser sessions, so that I do not lose my records when I close or refresh the page.

#### Acceptance Criteria

1. THE Application SHALL store all Expense data under a dedicated LocalStorage key (e.g., "sefc_expenses") and all Budget data under a separate dedicated LocalStorage key (e.g., "sefc_budgets").
2. WHEN the Application loads, THE Application SHALL retrieve all previously saved Expenses and Budgets from LocalStorage and render them in the Dashboard within 500ms of page load.
3. WHILE LocalStorage is available in the browser, THE Application SHALL read and write all data exclusively to LocalStorage without requiring a backend server.
4. IF LocalStorage is unavailable or access is denied by the browser, THEN THE Application SHALL display a warning message informing the User that data cannot be saved and render the Dashboard with empty lists.
5. IF LocalStorage data for Expenses or Budgets is malformed or cannot be parsed as valid JSON, THEN THE Application SHALL discard the corrupted data, warn the User, and initialize with empty lists.
6. WHEN the Application writes Expense or Budget data to LocalStorage, THE Application SHALL complete the write operation before the save action is considered complete.

---

### Requirement 4: Expense and Budget Visualization

**User Story:** As a User, I want to see charts showing my expenses versus my budget per category, so that I can quickly understand my financial situation.

#### Acceptance Criteria

1. THE Dashboard SHALL display a Chart comparing total Expense amounts against Budget limits for each Category, showing the category name, total expense amount, and budget limit amount in the same unit of currency.
2. WHEN the User views the Dashboard, THE Application SHALL render the Chart using data loaded from LocalStorage within 2 seconds.
3. THE Dashboard SHALL display a summary showing the total amount spent across all Categories in a consistent currency unit.
4. WHEN a Category's total Expenses exceed its Budget, THE Chart SHALL visually distinguish ALL such Categories (e.g., using a different color) to indicate the overage.
5. WHEN no Expense or Budget data exists in LocalStorage, THE Dashboard SHALL display a message prompting the User to add data using the Input_Form and SHALL NOT render the Chart.
6. THE Dashboard SHALL display the remaining budget (Budget limit minus total Expenses) for each Category that has a defined Budget.

---

### Requirement 5: Expense List and Management

**User Story:** As a User, I want to view a list of all my recorded expenses and remove incorrect entries, so that I can keep my records accurate.

#### Acceptance Criteria

1. THE Dashboard SHALL display a list of all recorded Expenses, showing the amount, category, description, and date for each Entry.
2. THE Application SHALL display the Expense list sorted by date in descending order (most recent first).
3. WHEN the User selects the delete action for an Expense Entry, THE Application SHALL prompt the User to confirm the deletion with confirm and cancel options before making any changes.
4. WHEN the User confirms the deletion, THE Application SHALL remove that Entry from LocalStorage and re-render the Expense list and Chart.
5. IF the User cancels the deletion prompt, THEN THE Application SHALL retain the Entry unchanged and dismiss the prompt.
6. IF no Expenses have been recorded, THEN THE Dashboard SHALL display an empty state message in the expense list area prompting the User to add expenses.

---

### Requirement 6: Category Management

**User Story:** As a User, I want to define and reuse categories for my expenses and budgets, so that I can organize my financial data consistently.

#### Acceptance Criteria

1. THE Application SHALL provide a predefined set of default Categories (Food, Transport, Utilities, Entertainment, Other) that are available on first load and cannot be deleted by the User.
2. WHEN the User selects a Category in the Input_Form, THE Application SHALL populate the category field with the selected category name from the available Category list.
3. WHERE the User wishes to add a custom category, THE Application SHALL allow the User to enter a new Category name between 1 and 50 characters, save it to LocalStorage, and add it to the Category list.
4. IF the User attempts to save a custom Category whose name (case-insensitive) matches an existing Category name, THEN THE Validator SHALL display an error message indicating the name is already in use and SHALL NOT save the duplicate.
5. WHEN the User deletes a custom Category, THE Application SHALL remove it from LocalStorage and the Category list; existing Expenses and Budgets assigned to that Category SHALL retain their category label value unchanged.

---

### Requirement 7: User Interface and Accessibility

**User Story:** As a User, I want a simple and clean interface that works in any modern browser, so that I can use the application without difficulty.

#### Acceptance Criteria

1. THE Application SHALL be implemented using plain HTML, CSS, and JavaScript with no external frameworks or libraries beyond a single charting utility.
2. THE Application SHALL render without visual overflow, overlapping elements, or missing content in the current stable release versions of Chrome, Firefox, Edge, and Safari.
3. THE Application SHALL load and display the Dashboard as fully visible and interactive within 2 seconds of the first navigation request on a 25 Mbps broadband connection.
4. THE Application SHALL use a responsive layout that displays without horizontal scrolling on screen widths from 375px (mobile) to 1440px (desktop).
5. WHEN the Application loads, THE Application SHALL display the Dashboard as the default view with no additional user action required.
6. THE Application SHALL associate all Input_Form fields with visible text labels such that each label is programmatically linked to its field and announced on focus by a screen reader.
7. IF the Application fails to load the Dashboard within 2 seconds, THEN THE Application SHALL display a loading indicator until rendering is complete.
8. THE Application SHALL ensure all interactive touch targets are at least 44×44 pixels and all text meets a minimum WCAG 4.5:1 contrast ratio against its background.

---

### Requirement 8: Data Reset

**User Story:** As a User, I want to clear all my stored data, so that I can start fresh without manually clearing browser storage.

#### Acceptance Criteria

1. THE Application SHALL provide a reset action that removes all Expense, Budget, and custom Category data from LocalStorage.
2. WHEN the User selects the reset action, THE Application SHALL display a prompt with confirm and cancel options before clearing any data.
3. WHEN the User confirms the reset, THE Application SHALL clear all Expense, Budget, and custom Category data from LocalStorage and re-render the Dashboard showing zero expenses, zero budgets, and only the default Categories.
4. IF the User cancels the reset prompt, THEN THE Application SHALL retain all stored data unchanged and dismiss the prompt.
5. IF the LocalStorage clear operation fails, THEN THE Application SHALL display an error message informing the User that the reset could not be completed and preserve all existing data.
