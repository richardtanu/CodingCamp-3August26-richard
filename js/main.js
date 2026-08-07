/**
 * SEFC Expense & Budget Visualizer — main.js
 * Single-file vanilla JS application (no build step, no frameworks).
 * Sections: storage → validation → categories → expenses → budgets →
 *           UI rendering → chart → theme → app wiring.
 */

(function () {
  'use strict';

  // ===========================================================================
  // Storage — safe localStorage wrapper
  // ===========================================================================

  const STORAGE_KEYS = {
    expenses: 'sefc_expenses',
    budgets: 'sefc_budgets',
    categories: 'sefc_categories',
    theme: 'sefc_theme',
  };

  const Storage = {
    isAvailable() {
      try {
        localStorage.setItem('__sefc_test__', '1');
        localStorage.removeItem('__sefc_test__');
        return true;
      } catch {
        return false;
      }
    },
    read(key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    },
    clear(keys) {
      try {
        for (const key of keys) localStorage.removeItem(key);
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    },
  };

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  // ===========================================================================
  // Validation — pure functions
  // ===========================================================================

  const Validator = {
    isValidAmount(value) {
      const normalised = typeof value === 'string' ? value.trim() : value;
      if (normalised === '' || normalised === null || normalised === undefined) return false;
      const num = parseFloat(normalised);
      if (!isFinite(num) || isNaN(num)) return false;
      if (num < 0.01 || num > 999_999_999.99) return false;
      const str = String(normalised);
      const dotIndex = str.indexOf('.');
      if (dotIndex !== -1 && str.length - dotIndex - 1 > 2) return false;
      return true;
    },

    isValidDate(dateStr) {
      if (!dateStr) return false;
      const timestamp = Date.parse(dateStr);
      if (isNaN(timestamp)) return false;
      const parsed = new Date(timestamp);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const minDate = new Date(today);
      minDate.setFullYear(minDate.getFullYear() - 10);

      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 1);
      maxDate.setHours(23, 59, 59, 999);

      return parsed >= minDate && parsed <= maxDate;
    },

    validateExpense({ name, amount, categoryId, date, description }) {
      const errors = {};

      if (!name || typeof name !== 'string' || name.trim() === '') {
        errors.name = 'Item name is required.';
      } else if (name.trim().length > 100) {
        errors.name = 'Item name must be 100 characters or fewer.';
      }

      if (!this.isValidAmount(amount)) {
        errors.amount = 'Amount must be a number between 0.01 and 999,999,999.99 with at most 2 decimal places.';
      }

      if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
        errors.categoryId = 'Please select a category.';
      }

      if (!this.isValidDate(date)) {
        errors.date = 'Date must be a valid date no earlier than 10 years ago and no later than tomorrow.';
      }

      if (description !== undefined && description !== null && description !== '') {
        if (String(description).length > 255) {
          errors.description = 'Description must be 255 characters or fewer.';
        }
      }

      return Object.keys(errors).length > 0
        ? { valid: false, errors }
        : { valid: true, errors: {} };
    },

    validateBudget({ amount, categoryId }) {
      const errors = {};

      if (!this.isValidAmount(amount)) {
        errors.amount = 'Amount must be a number between 0.01 and 999,999,999.99 with at most 2 decimal places.';
      }
      if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
        errors.categoryId = 'Please select a category.';
      }

      return Object.keys(errors).length > 0
        ? { valid: false, errors }
        : { valid: true, errors: {} };
    },

    validateCategoryName(name, existingNames) {
      const trimmed = typeof name === 'string' ? name.trim() : '';

      if (trimmed.length < 1) return { valid: false, error: 'Category name must be at least 1 character.' };
      if (trimmed.length > 50) return { valid: false, error: 'Category name must be 50 characters or fewer.' };

      const normalised = trimmed.toLowerCase();
      const isDuplicate = Array.isArray(existingNames) &&
        existingNames.some((existing) => typeof existing === 'string' && existing.trim().toLowerCase() === normalised);

      if (isDuplicate) return { valid: false, error: `A category named "${trimmed}" already exists.` };
      return { valid: true };
    },
  };

  // ===========================================================================
  // Categories — Food, Transport, Fun (defaults) + custom
  // ===========================================================================

  const DEFAULT_CATEGORIES = [
    { id: 'cat-food', name: 'Food', isDefault: true },
    { id: 'cat-transport', name: 'Transport', isDefault: true },
    { id: 'cat-fun', name: 'Fun', isDefault: true },
  ];

  const Categories = {
    getAll() {
      const stored = Storage.read(STORAGE_KEYS.categories);
      const custom = Array.isArray(stored) ? stored : [];
      return [...DEFAULT_CATEGORIES, ...custom];
    },

    addCustom(name) {
      const existing = this.getAll();
      const validation = Validator.validateCategoryName(name, existing.map((c) => c.name));
      if (!validation.valid) return { ok: false, error: validation.error };

      const category = { id: generateId(), name: name.trim(), isDefault: false };
      const stored = Storage.read(STORAGE_KEYS.categories);
      const currentCustom = Array.isArray(stored) ? stored : [];
      const result = Storage.write(STORAGE_KEYS.categories, [...currentCustom, category]);
      if (!result.ok) return { ok: false, error: 'Could not save — storage write failed.' };
      return { ok: true, category };
    },

    deleteCustom(id) {
      if (DEFAULT_CATEGORIES.some((c) => c.id === id)) {
        return { ok: false, error: 'Default categories cannot be deleted.' };
      }
      const stored = Storage.read(STORAGE_KEYS.categories);
      const currentCustom = Array.isArray(stored) ? stored : [];
      if (!currentCustom.some((c) => c.id === id)) return { ok: false, error: 'Category not found.' };

      const result = Storage.write(STORAGE_KEYS.categories, currentCustom.filter((c) => c.id !== id));
      if (!result.ok) return { ok: false, error: 'Could not save — storage write failed.' };
      return { ok: true };
    },

    findById(id) {
      return this.getAll().find((c) => c.id === id) ?? null;
    },

    isDefault(id) {
      return DEFAULT_CATEGORIES.some((c) => c.id === id);
    },
  };

  // ===========================================================================
  // Expenses (transactions)
  // ===========================================================================

  function compareByDateDesc(a, b) {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    if (a.createdAt < b.createdAt) return 1;
    if (a.createdAt > b.createdAt) return -1;
    return 0;
  }

  const Expenses = {
    getAll() {
      const stored = Storage.read(STORAGE_KEYS.expenses);
      const expenses = Array.isArray(stored) ? stored : [];
      return [...expenses].sort(compareByDateDesc);
    },

    add(data) {
      const category = Categories.findById(data.categoryId);
      const expense = {
        id: generateId(),
        name: data.name.trim(),
        amount: data.amount,
        categoryId: data.categoryId,
        categoryLabel: category ? category.name : '',
        date: data.date,
        description: (data.description ?? '').trim(),
        createdAt: new Date().toISOString(),
      };

      const stored = Storage.read(STORAGE_KEYS.expenses);
      const current = Array.isArray(stored) ? stored : [];
      const result = Storage.write(STORAGE_KEYS.expenses, [...current, expense]);
      if (!result.ok) return { ok: false };
      return { ok: true, expense };
    },

    remove(id) {
      const stored = Storage.read(STORAGE_KEYS.expenses);
      const current = Array.isArray(stored) ? stored : [];
      const result = Storage.write(STORAGE_KEYS.expenses, current.filter((e) => e.id !== id));
      if (!result.ok) return { ok: false };
      return { ok: true };
    },
  };

  function sortExpenses(expenses, mode) {
    const list = [...expenses];
    switch (mode) {
      case 'amount-desc':
        return list.sort((a, b) => Number(b.amount) - Number(a.amount));
      case 'category-asc':
        return list.sort((a, b) => {
          const cmp = (a.categoryLabel || '').localeCompare(b.categoryLabel || '');
          return cmp !== 0 ? cmp : compareByDateDesc(a, b);
        });
      case 'date-desc':
      default:
        return list.sort(compareByDateDesc);
    }
  }

  // ===========================================================================
  // Budgets — per-category spending limit
  // ===========================================================================

  const Budgets = {
    getAll() {
      return Storage.read(STORAGE_KEYS.budgets) ?? [];
    },

    getByCategory(categoryId) {
      return this.getAll().find((b) => b.categoryId === categoryId) ?? null;
    },

    set(data) {
      const category = Categories.findById(data.categoryId);
      const stored = Storage.read(STORAGE_KEYS.budgets);
      const current = Array.isArray(stored) ? stored : [];
      const existingIndex = current.findIndex((b) => b.categoryId === data.categoryId);
      const isUpdate = existingIndex !== -1;

      const budget = {
        id: isUpdate ? current[existingIndex].id : generateId(),
        categoryId: data.categoryId,
        categoryLabel: category ? category.name : '',
        amount: data.amount,
        updatedAt: new Date().toISOString(),
      };

      const updated = isUpdate
        ? current.map((b, i) => (i === existingIndex ? budget : b))
        : [...current, budget];

      const result = Storage.write(STORAGE_KEYS.budgets, updated);
      if (!result.ok) return { ok: false };
      return { ok: true, budget, isUpdate };
    },
  };

  // ===========================================================================
  // Formatting helpers
  // ===========================================================================

  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function formatCurrency(value) {
    return currencyFormatter.format(value);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function formatMonthLabel(yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, 1));
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', timeZone: 'UTC' });
  }

  function todayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  }

  function buildSpentByCategory(expenses) {
    const map = new Map();
    for (const expense of expenses) {
      const prev = map.get(expense.categoryId) ?? 0;
      map.set(expense.categoryId, prev + (Number(expense.amount) || 0));
    }
    return map;
  }

  // ===========================================================================
  // UI — rendering & interaction helpers
  // ===========================================================================

  const UI = {
    renderTotalSummary(expenses) {
      const container = document.querySelector('.summary-total');
      if (!container) return;
      const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      container.innerHTML = `<span class="label">Total Balance</span>${formatCurrency(total)}`;
    },

    renderBudgetSummary(budgets, expenses, categories) {
      const tbody = document.getElementById('budget-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (budgets.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.className = 'empty-state-cell';
        cell.textContent = 'No budgets set. Use "Set Budget" to define spending limits.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
      }

      const spentByCategory = buildSpentByCategory(expenses);

      for (const budget of budgets) {
        const spent = spentByCategory.get(budget.categoryId) ?? 0;
        const remaining = budget.amount - spent;
        const row = document.createElement('tr');
        if (spent > budget.amount) row.classList.add('over-budget');

        row.innerHTML = `
          <td>${escapeHtml(budget.categoryLabel)}</td>
          <td>${formatCurrency(budget.amount)}</td>
          <td>${formatCurrency(spent)}</td>
          <td class="${remaining < 0 ? 'over-budget' : ''}">${formatCurrency(remaining)}</td>
        `;
        tbody.appendChild(row);
      }
    },

    renderExpenseList(expenses) {
      const container = document.querySelector('.expense-list');
      if (!container) return;

      const header = container.querySelector('.expense-list-header');
      container.innerHTML = '';
      if (header) container.appendChild(header);

      if (expenses.length === 0) {
        UI.renderEmptyState(container, 'No transactions yet. Use "Add Transaction" to record your first entry.');
        return;
      }

      const list = document.createElement('ul');
      list.className = 'expense-items';
      list.setAttribute('aria-label', 'Recorded transactions');
      list.style.listStyle = 'none';

      for (const expense of expenses) {
        const item = document.createElement('li');
        item.className = 'expense-item';
        item.dataset.id = expense.id;

        item.innerHTML = `
          <div class="expense-item__info">
            <p class="expense-item__name">${escapeHtml(expense.name || '')}</p>
            <p class="expense-item__amount">${formatCurrency(expense.amount)}</p>
            <span class="expense-item__category-badge">${escapeHtml(expense.categoryLabel || '')}</span>
            <p class="expense-item__date">${formatDate(expense.date)}</p>
            ${expense.description ? `<p class="expense-item__description">${escapeHtml(expense.description)}</p>` : ''}
          </div>
          <button type="button" class="btn-delete-expense" data-id="${expense.id}" aria-label="Delete transaction: ${escapeHtml(expense.name || '')}">Delete</button>
        `;
        list.appendChild(item);
      }
      container.appendChild(list);
    },

    renderMonthlySummary(expenses) {
      const tbody = document.getElementById('monthly-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (expenses.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.className = 'empty-state-cell';
        cell.textContent = 'No transactions yet.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
      }

      const totals = new Map();
      for (const expense of expenses) {
        const key = (expense.date || '').slice(0, 7);
        if (!key) continue;
        const entry = totals.get(key) ?? { total: 0, count: 0 };
        entry.total += Number(expense.amount) || 0;
        entry.count += 1;
        totals.set(key, entry);
      }

      const sortedMonths = Array.from(totals.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

      for (const month of sortedMonths) {
        const { total, count } = totals.get(month);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${formatMonthLabel(month)}</td>
          <td>${count}</td>
          <td>${formatCurrency(total)}</td>
        `;
        tbody.appendChild(row);
      }
    },

    renderEmptyState(containerEl, message) {
      if (!containerEl) return;
      const existing = containerEl.querySelector('.empty-state-message');
      if (existing) existing.remove();
      const p = document.createElement('p');
      p.className = 'empty-state-message';
      p.textContent = message;
      containerEl.appendChild(p);
    },

    showConfirmDialog(message) {
      return new Promise((resolve) => {
        const overlay = document.getElementById('dialog-overlay');
        const messageEl = document.getElementById('dialog-message');
        const confirmBtn = document.getElementById('dialog-confirm');
        const cancelBtn = document.getElementById('dialog-cancel');

        if (!overlay || !messageEl || !confirmBtn || !cancelBtn) {
          resolve(window.confirm(message));
          return;
        }

        messageEl.textContent = message;
        overlay.hidden = false;
        cancelBtn.focus();

        const dialogCard = overlay.querySelector('.dialog-card') ?? overlay;
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const getFocusable = () => Array.from(dialogCard.querySelectorAll(focusableSelectors));

        function trapFocus(event) {
          if (event.key !== 'Tab') return;
          const focusable = getFocusable();
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey) {
            if (document.activeElement === first) { event.preventDefault(); last.focus(); }
          } else {
            if (document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }

        function handleKeydown(event) {
          if (event.key === 'Escape') settle(false);
        }

        overlay.addEventListener('keydown', trapFocus);
        overlay.addEventListener('keydown', handleKeydown);

        function settle(result) {
          overlay.removeEventListener('keydown', trapFocus);
          overlay.removeEventListener('keydown', handleKeydown);
          confirmBtn.removeEventListener('click', onConfirm);
          cancelBtn.removeEventListener('click', onCancel);
          overlay.hidden = true;
          resolve(result);
        }

        function onConfirm() { settle(true); }
        function onCancel() { settle(false); }

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
      });
    },

    showConfirmation(message, durationMs) {
      const toastEl = document.getElementById('toast');
      if (!toastEl) return;

      // Anchor below the sticky header, which can wrap to two rows depending
      // on viewport width and whether the storage warning banner is shown.
      const header = document.querySelector('header');
      const topOffset = header ? header.getBoundingClientRect().bottom + 16 : 16;
      toastEl.style.top = `${topOffset}px`;

      toastEl.textContent = message;
      toastEl.classList.add('is-visible');

      if (toastEl._dismissTimer) clearTimeout(toastEl._dismissTimer);
      toastEl._dismissTimer = setTimeout(() => {
        toastEl.classList.remove('is-visible');
        toastEl._dismissTimer = null;
      }, durationMs);
    },

    showError(fieldEl, message) {
      if (!fieldEl) return;
      const describedById = fieldEl.getAttribute('aria-describedby');
      let errorEl = describedById ? document.getElementById(describedById) : null;

      if (!errorEl) {
        const parent = fieldEl.closest('.form-group') ?? fieldEl.parentElement;
        errorEl = parent ? parent.querySelector('[role="alert"]') : null;
      }
      if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.setAttribute('role', 'alert');
        errorEl.className = 'form-error';
        const insertAfter = fieldEl.closest('.form-group') ?? fieldEl;
        insertAfter.insertAdjacentElement('afterend', errorEl);
      }
      errorEl.textContent = message;
    },

    clearErrors(formEl) {
      if (!formEl) return;
      formEl.querySelectorAll('[role="alert"]').forEach((el) => { el.textContent = ''; });
    },

    setLoadingState(isLoading) {
      const indicator = document.getElementById('loading-indicator');
      if (indicator) indicator.hidden = !isLoading;
    },
  };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }

  // ===========================================================================
  // Chart — pie chart of spending by category (Chart.js)
  // ===========================================================================

  // Ordered for maximum contrast between adjacent slices when assigned by
  // position — a hash-based assignment can put visually similar hues next
  // to each other when only 2-3 categories are in play.
  const CHART_PALETTE = ['#4A90D9', '#ED8936', '#48BB78', '#9F7AEA', '#F56565', '#38B2AC', '#ECC94B', '#667EEA', '#ED64A6', '#4FD1C5'];

  const ChartModule = (function () {
    let chart = null;
    let canvasEl = null;

    function getContainer() {
      return canvasEl ? canvasEl.closest('.chart-container') : null;
    }

    function showCanvas() {
      if (!canvasEl) return;
      canvasEl.hidden = false;
      canvasEl.style.display = '';
      const container = getContainer();
      if (!container) return;
      const emptyMsg = container.querySelector('.chart-empty-message');
      const unavailableMsg = container.querySelector('.chart-unavailable-message');
      if (emptyMsg) emptyMsg.hidden = true;
      if (unavailableMsg) unavailableMsg.hidden = true;
    }

    function showEmptyState() {
      if (!canvasEl) return;
      canvasEl.hidden = true;
      canvasEl.style.display = 'none';
      const container = getContainer();
      if (!container) return;
      const emptyMsg = container.querySelector('.chart-empty-message');
      const unavailableMsg = container.querySelector('.chart-unavailable-message');
      if (emptyMsg) emptyMsg.hidden = false;
      if (unavailableMsg) unavailableMsg.hidden = true;
    }

    function showUnavailable() {
      if (!canvasEl) return;
      canvasEl.hidden = true;
      canvasEl.style.display = 'none';
      const container = getContainer();
      if (!container) return;
      const emptyMsg = container.querySelector('.chart-empty-message');
      const unavailableMsg = container.querySelector('.chart-unavailable-message');
      if (emptyMsg) emptyMsg.hidden = true;
      if (unavailableMsg) {
        unavailableMsg.textContent = 'Chart unavailable — could not load charting library';
        unavailableMsg.hidden = false;
      }
    }

    return {
      init(canvas) {
        canvasEl = canvas;
        if (typeof window === 'undefined' || typeof window.Chart === 'undefined') {
          showUnavailable();
          return;
        }
        if (chart !== null) return;

        chart = new window.Chart(canvas, {
          type: 'pie',
          data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`,
                },
              },
            },
          },
        });
      },

      update(expenses, categories) {
        if (chart === null) {
          if (typeof window === 'undefined' || typeof window.Chart === 'undefined') showUnavailable();
          return;
        }

        if (expenses.length === 0) {
          showEmptyState();
          return;
        }
        showCanvas();

        const spentByCategory = buildSpentByCategory(expenses);
        const labelById = new Map(categories.map((c) => [c.id, c.name]));

        const categoryIds = Array.from(spentByCategory.keys())
          .filter((id) => spentByCategory.get(id) > 0)
          .sort((a, b) => (labelById.get(a) ?? a).localeCompare(labelById.get(b) ?? b));

        chart.data.labels = categoryIds.map((id) => labelById.get(id) ?? id);
        chart.data.datasets[0].data = categoryIds.map((id) => spentByCategory.get(id));
        chart.data.datasets[0].backgroundColor = categoryIds.map((_, index) => CHART_PALETTE[index % CHART_PALETTE.length]);
        chart.update();
      },

      destroy() {
        if (chart !== null) { chart.destroy(); chart = null; }
      },
    };
  })();

  // ===========================================================================
  // Theme — dark / light mode toggle
  // ===========================================================================

  const Theme = {
    apply(theme) {
      document.documentElement.dataset.theme = theme;
      const btn = document.getElementById('btn-theme-toggle');
      if (btn) {
        const isDark = theme === 'dark';
        btn.setAttribute('aria-pressed', String(isDark));
        btn.querySelector('.theme-toggle-icon').textContent = isDark ? '☀️' : '🌙';
        btn.querySelector('.theme-toggle-label').textContent = isDark ? 'Light Mode' : 'Dark Mode';
      }
    },
    init() {
      const saved = Storage.read(STORAGE_KEYS.theme);
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.apply(saved === 'dark' || saved === 'light' ? saved : (prefersDark ? 'dark' : 'light'));
    },
    toggle() {
      const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      this.apply(next);
      Storage.write(STORAGE_KEYS.theme, next);
    },
  };

  // ===========================================================================
  // App — rendering orchestration, view routing, event wiring
  // ===========================================================================

  let currentSort = 'date-desc';
  const RESET_KEYS = [STORAGE_KEYS.expenses, STORAGE_KEYS.budgets, STORAGE_KEYS.categories];

  function renderDashboard() {
    const allExpenses = Expenses.getAll();
    const allBudgets = Budgets.getAll();
    const allCategories = Categories.getAll();

    UI.renderTotalSummary(allExpenses);
    UI.renderBudgetSummary(allBudgets, allExpenses, allCategories);
    UI.renderExpenseList(sortExpenses(allExpenses, currentSort));
    UI.renderMonthlySummary(allExpenses);
    ChartModule.update(allExpenses, allCategories);
  }

  function populateCategorySelects() {
    const all = Categories.getAll();
    const selects = [document.getElementById('expense-category'), document.getElementById('budget-category')];

    for (const select of selects) {
      if (!select) continue;
      const currentValue = select.value;
      while (select.options.length > 1) select.remove(1);
      for (const category of all) {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
      }
      if (currentValue && all.some((c) => c.id === currentValue)) select.value = currentValue;
    }
  }

  function renderCategoryList() {
    const listEl = document.getElementById('custom-category-list');
    const emptyEl = document.getElementById('custom-categories-empty');
    if (!listEl) return;

    const custom = Categories.getAll().filter((c) => !c.isDefault);
    listEl.innerHTML = '';

    if (custom.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    for (const category of custom) {
      const item = document.createElement('li');
      item.dataset.id = category.id;
      item.innerHTML = `
        <span>${escapeHtml(category.name)}</span>
        <button type="button" class="btn-delete-category" data-id="${category.id}" aria-label="Delete category: ${escapeHtml(category.name)}">Delete</button>
      `;
      listEl.appendChild(item);
    }
  }

  function showView(viewId) {
    document.querySelectorAll('.view').forEach((section) => {
      const isTarget = section.id === viewId;
      section.hidden = !isTarget;
      section.classList.toggle('view--active', isTarget);
    });
    document.querySelectorAll('nav a').forEach((link) => {
      const target = link.getAttribute('href')?.slice(1);
      if (target === viewId) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    if (viewId === 'view-add-expense') {
      const dateInput = document.getElementById('expense-date');
      if (dateInput && !dateInput.value) dateInput.value = todayISO();
    }
  }

  function handleExpenseSubmit(event) {
    event.preventDefault();
    const form = event.target;
    UI.clearErrors(form);

    const data = {
      name: form.elements.name.value,
      amount: form.elements.amount.value,
      categoryId: form.elements.categoryId.value,
      date: form.elements.date.value,
      description: form.elements.description.value,
    };

    const result = Validator.validateExpense(data);
    if (!result.valid) {
      for (const [field, message] of Object.entries(result.errors)) UI.showError(form.elements[field], message);
      return;
    }

    const addResult = Expenses.add({
      name: data.name,
      amount: parseFloat(data.amount),
      categoryId: data.categoryId,
      date: data.date,
      description: data.description,
    });

    if (!addResult.ok) {
      UI.showError(form.elements.amount, 'Could not save — storage is full or unavailable.');
      return;
    }

    UI.showConfirmation('Transaction added!', 3000);
    form.reset();
    document.getElementById('expense-date').value = todayISO();
    renderDashboard();
  }

  function handleBudgetSubmit(event) {
    event.preventDefault();
    const form = event.target;
    UI.clearErrors(form);

    const data = { amount: form.elements.amount.value, categoryId: form.elements.categoryId.value };
    const result = Validator.validateBudget(data);
    if (!result.valid) {
      for (const [field, message] of Object.entries(result.errors)) UI.showError(form.elements[field], message);
      return;
    }

    const setResult = Budgets.set({ amount: parseFloat(data.amount), categoryId: data.categoryId });
    if (!setResult.ok) {
      UI.showError(form.elements.amount, 'Could not save — storage is full or unavailable.');
      return;
    }

    UI.showConfirmation(setResult.isUpdate ? 'Budget updated!' : 'Budget set!', 3000);
    renderDashboard();
  }

  function handleAddCategory(event) {
    event.preventDefault();
    const form = event.target;
    UI.clearErrors(form);

    const result = Categories.addCustom(form.elements.name.value);
    if (!result.ok) {
      UI.showError(form.elements.name, result.error);
      return;
    }

    UI.showConfirmation('Category added!', 3000);
    form.reset();
    renderCategoryList();
    populateCategorySelects();
  }

  async function handleDeleteExpense(id) {
    const confirmed = await UI.showConfirmDialog('Delete this transaction?');
    if (!confirmed) return;
    const result = Expenses.remove(id);
    if (result.ok) renderDashboard();
  }

  async function handleDeleteCategory(id) {
    const confirmed = await UI.showConfirmDialog('Delete this category?');
    if (!confirmed) return;
    const result = Categories.deleteCustom(id);
    if (result.ok) {
      renderCategoryList();
      populateCategorySelects();
    }
  }

  async function handleReset() {
    const confirmed = await UI.showConfirmDialog(
      'This will permanently delete all transactions, budgets, and custom categories. This action cannot be undone. Are you sure?'
    );
    if (!confirmed) return;

    const result = Storage.clear(RESET_KEYS);
    if (!result.ok) {
      window.alert('Reset failed. Your data is unchanged.');
      return;
    }

    renderDashboard();
    renderCategoryList();
    populateCategorySelects();
  }

  function attachEventListeners() {
    document.querySelectorAll('nav a').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        showView(link.getAttribute('href').slice(1));
      });
    });

    document.getElementById('form-expense')?.addEventListener('submit', handleExpenseSubmit);
    document.getElementById('form-budget')?.addEventListener('submit', handleBudgetSubmit);
    document.getElementById('form-add-category')?.addEventListener('submit', handleAddCategory);

    document.querySelector('.expense-list')?.addEventListener('click', (event) => {
      const btn = event.target.closest('.btn-delete-expense');
      if (btn) handleDeleteExpense(btn.dataset.id);
    });

    document.getElementById('custom-category-list')?.addEventListener('click', (event) => {
      const btn = event.target.closest('.btn-delete-category');
      if (btn) handleDeleteCategory(btn.dataset.id);
    });

    document.getElementById('btn-reset')?.addEventListener('click', handleReset);
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => Theme.toggle());

    document.getElementById('sort-select')?.addEventListener('change', (event) => {
      currentSort = event.target.value;
      UI.renderExpenseList(sortExpenses(Expenses.getAll(), currentSort));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    UI.setLoadingState(true);
    Theme.init();

    if (!Storage.isAvailable()) {
      const warningEl = document.getElementById('storage-warning');
      if (warningEl) warningEl.hidden = false;
    }

    const dateInput = document.getElementById('expense-date');
    if (dateInput) dateInput.value = todayISO();

    populateCategorySelects();
    renderCategoryList();

    ChartModule.init(document.getElementById('main-chart'));
    renderDashboard();

    attachEventListeners();
    UI.setLoadingState(false);
  });
})();
