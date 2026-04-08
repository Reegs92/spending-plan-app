// === STATE ===
const STORAGE_KEY = 'continuous-spending-plan';

const defaultState = () => ({
  income: { amount: 0, frequency: 'monthly', customDays: 14 },
  expenses: [],
  accounts: [{ id: genId('acc'), name: 'Main Account' }],
});

let state = loadState();
let activeModalExpenseId = null;

// === UTILS ===
function genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmt(n) {
  if (n == null || isNaN(n)) return '$0.00';
  return '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// === CONVERSION ENGINE ===
// All conversions go through yearly as the common base for precision
const toYearly = {
  weekly:      (v) => v * 52,
  fortnightly: (v) => v * 26,
  monthly:     (v) => v * 12,
  yearly:      (v) => v,
  custom:      (v, days) => days > 0 ? v * (365 / days) : 0,
};

const fromYearly = {
  weekly:      (v) => v / 52,
  fortnightly: (v) => v / 26,
  monthly:     (v) => v / 12,
  yearly:      (v) => v,
  custom:      (v, days) => days > 0 ? v / (365 / days) : 0,
};

function convertAmount(amount, fromFreq, toFreq, customDays) {
  if (!amount || isNaN(amount)) return 0;
  const yearly = toYearly[fromFreq](Number(amount), customDays);
  return fromYearly[toFreq](yearly, customDays);
}

function getExpenseInFrequency(expense, targetFreq, customDays) {
  return convertAmount(expense.amount, expense.frequency, targetFreq, customDays);
}

// Awareness period to yearly multiplier
function awarenessToYearly(timesPerPeriod, costPerTime, period) {
  const t = Number(timesPerPeriod) || 0;
  const c = Number(costPerTime) || 0;
  const total = t * c;
  const multipliers = { week: 52, fortnight: 26, month: 12, year: 1 };
  return total * (multipliers[period] || 1);
}

// === PERSISTENCE ===
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all fields exist
      return { ...defaultState(), ...parsed };
    }
  } catch (e) { /* ignore */ }
  return defaultState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// === RENDER: INCOME ===
function renderIncome() {
  const el = document.getElementById('income-amount');
  const freqEl = document.getElementById('income-frequency');
  const customField = document.getElementById('income-custom-field');
  const customDaysEl = document.getElementById('income-custom-days');

  if (document.activeElement !== el) el.value = state.income.amount || '';
  if (document.activeElement !== freqEl) freqEl.value = state.income.frequency;
  customField.style.display = state.income.frequency === 'custom' ? '' : 'none';
  if (document.activeElement !== customDaysEl) customDaysEl.value = state.income.customDays || '';

  // Conversions
  const convDiv = document.getElementById('income-conversions');
  const freqs = ['weekly', 'fortnightly', 'monthly', 'yearly'];
  const chips = freqs.map(f => {
    const val = convertAmount(state.income.amount, state.income.frequency, f, state.income.customDays);
    const isActive = f === state.income.frequency;
    return `<span class="income-chip${isActive ? ' active' : ''}">${f.charAt(0).toUpperCase() + f.slice(1)}: ${fmt(val)}</span>`;
  });
  convDiv.innerHTML = chips.join('');
}

// === RENDER: EXPENSES ===
function renderExpenses() {
  const tbody = document.getElementById('expenses-body');
  const freqs = ['weekly', 'fortnightly', 'monthly', 'yearly'];

  if (state.expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">No expenses yet. Click "+ Add Expense" to get started.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.expenses.map(exp => {
    const amountCells = freqs.map(f => {
      const val = convertAmount(exp.amount, exp.frequency, f, state.income.customDays);
      const isSource = f === exp.frequency;
      return `<td class="col-amount">
        <div class="dollar-input">
          <input type="number" min="0" step="0.01"
            class="${isSource ? 'user-entered' : 'calculated'}"
            data-expense-id="${exp.id}" data-freq="${f}"
            value="${val ? val.toFixed(2) : ''}"
            placeholder="0.00">
        </div>
      </td>`;
    }).join('');

    const accountOptions = state.accounts.map(a =>
      `<option value="${a.id}"${a.id === exp.accountId ? ' selected' : ''}>${a.name}</option>`
    ).join('');

    // Inline awareness
    const aw = exp.awareness || {};
    const awOpen = aw._open ? ' open' : '';
    const awTimesVal = aw.timesPerPeriod != null ? aw.timesPerPeriod : '';
    const awCostVal = aw.costPerTime != null ? aw.costPerTime : '';
    const awPeriod = aw.period || 'week';
    const awTotal = (Number(aw.timesPerPeriod) || 0) * (Number(aw.costPerTime) || 0);
    const awYearly = awarenessToYearly(aw.timesPerPeriod, aw.costPerTime, awPeriod);

    const periodOptions = ['week', 'fortnight', 'month', 'year'].map(p =>
      `<option value="${p}"${p === awPeriod ? ' selected' : ''}>${p}</option>`
    ).join('');

    return `
      <tr data-expense-id="${exp.id}">
        <td class="col-name">
          <input type="text" value="${escHtml(exp.name)}" data-expense-id="${exp.id}" data-field="name" placeholder="e.g. Rent">
        </td>
        ${amountCells}
        <td class="col-account">
          <select data-expense-id="${exp.id}" data-field="accountId">${accountOptions}</select>
        </td>
        <td class="col-actions">
          <button class="btn-icon awareness-btn" data-expense-id="${exp.id}" data-action="toggle-awareness" title="Spending awareness">&#128161;</button>
          <button class="btn-icon delete-btn" data-expense-id="${exp.id}" data-action="delete-expense" title="Remove">&times;</button>
        </td>
      </tr>
      <tr class="awareness-row" data-expense-id="${exp.id}">
        <td colspan="7">
          <div class="awareness-inline${awOpen}" data-expense-id="${exp.id}">
            <div class="inline-group">
              <input type="number" min="0" step="0.5" placeholder="3" value="${awTimesVal}"
                data-expense-id="${exp.id}" data-aw-field="timesPerPeriod">
              <span>times per</span>
              <select data-expense-id="${exp.id}" data-aw-field="period">${periodOptions}</select>
              <span>@ $</span>
              <input type="number" min="0" step="0.01" placeholder="20" value="${awCostVal}"
                data-expense-id="${exp.id}" data-aw-field="costPerTime">
              <span>each</span>
            </div>
            ${awTotal > 0 ? `
              <div class="awareness-total">= ${fmt(awTotal)} per ${awPeriod}</div>
              <div class="awareness-yearly">That's ${fmt(awYearly)} per year on ${escHtml(exp.name) || 'this'}</div>
            ` : ''}
            <div class="awareness-actions">
              <button class="btn btn-primary" style="font-size:0.78rem;padding:0.3rem 0.65rem"
                data-expense-id="${exp.id}" data-action="apply-awareness">Apply Amount</button>
              <button class="btn btn-secondary" style="font-size:0.78rem;padding:0.3rem 0.65rem"
                data-expense-id="${exp.id}" data-action="open-modal">More Detail</button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Update only the calculated cells for a given expense without rebuilding the DOM
function updateCalculatedCells(expId, sourceFreq) {
  const exp = state.expenses.find(x => x.id === expId);
  if (!exp) return;
  const freqs = ['weekly', 'fortnightly', 'monthly', 'yearly'];
  freqs.forEach(f => {
    const input = document.querySelector(`input[data-expense-id="${expId}"][data-freq="${f}"]`);
    if (!input) return;
    if (f === sourceFreq) {
      input.className = 'user-entered';
    } else {
      const val = convertAmount(exp.amount, exp.frequency, f, state.income.customDays);
      input.value = val ? val.toFixed(2) : '';
      input.className = 'calculated';
    }
  });
}

// Update awareness totals display without rebuilding DOM
function updateAwarenessDisplay(expId) {
  const exp = state.expenses.find(x => x.id === expId);
  if (!exp || !exp.awareness) return;
  const aw = exp.awareness;
  const awTotal = (Number(aw.timesPerPeriod) || 0) * (Number(aw.costPerTime) || 0);
  const awYearly = awarenessToYearly(aw.timesPerPeriod, aw.costPerTime, aw.period || 'week');
  const container = document.querySelector(`.awareness-inline[data-expense-id="${expId}"]`);
  if (!container) return;
  // Update or create the total display
  let totalEl = container.querySelector('.awareness-total');
  let yearlyEl = container.querySelector('.awareness-yearly');
  if (awTotal > 0) {
    if (!totalEl) {
      totalEl = document.createElement('div');
      totalEl.className = 'awareness-total';
      container.querySelector('.inline-group').after(totalEl);
    }
    if (!yearlyEl) {
      yearlyEl = document.createElement('div');
      yearlyEl.className = 'awareness-yearly';
      totalEl.after(yearlyEl);
    }
    totalEl.textContent = `= ${fmt(awTotal)} per ${aw.period || 'week'}`;
    yearlyEl.textContent = `That's ${fmt(awYearly)} per year on ${exp.name || 'this'}`;
  } else {
    if (totalEl) totalEl.remove();
    if (yearlyEl) yearlyEl.remove();
  }
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// === RENDER: ACCOUNTS ===
function renderAccounts() {
  const list = document.getElementById('accounts-list');
  const payFreq = state.income.frequency;
  const customDays = state.income.customDays;

  list.innerHTML = state.accounts.map(acc => {
    const allocated = state.expenses
      .filter(e => e.accountId === acc.id)
      .reduce((sum, e) => sum + getExpenseInFrequency(e, payFreq, customDays), 0);

    return `
      <div class="account-row" data-account-id="${acc.id}">
        <input type="text" value="${escHtml(acc.name)}" data-account-id="${acc.id}" data-field="name" placeholder="Account name">
        <span class="account-total">Allocated: <span class="account-allocated">${fmt(allocated)}</span> / ${payFreq}</span>
        ${state.accounts.length > 1
          ? `<button class="btn-icon delete-btn" data-account-id="${acc.id}" data-action="delete-account" title="Remove">&times;</button>`
          : ''}
      </div>
    `;
  }).join('');
}

// === RENDER: SUMMARY ===
function renderSummary() {
  const viewFreq = document.getElementById('summary-frequency').value;
  const customDays = state.income.customDays;

  const totalIncome = convertAmount(state.income.amount, state.income.frequency, viewFreq, customDays);
  const totalExpenses = state.expenses.reduce((sum, e) => sum + convertAmount(e.amount, e.frequency, viewFreq, customDays), 0);
  const surplus = totalIncome - totalExpenses;

  const cardsDiv = document.getElementById('summary-cards');
  cardsDiv.innerHTML = `
    <div class="summary-card income-card">
      <div class="label">Income</div>
      <div class="value">${fmt(totalIncome)}</div>
    </div>
    <div class="summary-card expense-card">
      <div class="label">Expenses</div>
      <div class="value">${fmt(totalExpenses)}</div>
    </div>
    <div class="summary-card surplus-card ${surplus >= 0 ? 'positive' : 'negative'}">
      <div class="label">${surplus >= 0 ? 'Surplus' : 'Deficit'}</div>
      <div class="value">${fmt(Math.abs(surplus))}</div>
    </div>
  `;

  // Account breakdown
  const breakdownDiv = document.getElementById('account-breakdown');
  if (state.accounts.length === 0 || state.expenses.length === 0) {
    breakdownDiv.innerHTML = '';
    return;
  }

  const maxBar = totalIncome > 0 ? totalIncome : totalExpenses || 1;

  const rows = state.accounts.map(acc => {
    const allocated = state.expenses
      .filter(e => e.accountId === acc.id)
      .reduce((sum, e) => sum + convertAmount(e.amount, e.frequency, viewFreq, customDays), 0);
    const pct = Math.min((allocated / maxBar) * 100, 100);
    const barClass = allocated > totalIncome * 0.5 ? 'warning' : 'positive';

    return `
      <div class="breakdown-row">
        <span class="breakdown-label">${escHtml(acc.name)}</span>
        <div class="bar-wrap"><div class="bar ${barClass}" style="width:${pct}%"></div></div>
        <span class="breakdown-amount">${fmt(allocated)}</span>
      </div>
    `;
  }).join('');

  // Unallocated
  const unallocatedExpenses = state.expenses
    .filter(e => !e.accountId || !state.accounts.find(a => a.id === e.accountId))
    .reduce((sum, e) => sum + convertAmount(e.amount, e.frequency, viewFreq, customDays), 0);

  const unallocatedRow = unallocatedExpenses > 0 ? `
    <div class="breakdown-row">
      <span class="breakdown-label" style="color:var(--text-muted)">Unallocated</span>
      <div class="bar-wrap"><div class="bar over" style="width:${Math.min((unallocatedExpenses / maxBar) * 100, 100)}%"></div></div>
      <span class="breakdown-amount">${fmt(unallocatedExpenses)}</span>
    </div>
  ` : '';

  breakdownDiv.innerHTML = `<h3>By Account (${viewFreq})</h3>${rows}${unallocatedRow}`;
}

// === RENDER ALL ===
function render() {
  renderIncome();
  renderExpenses();
  renderAccounts();
  renderSummary();
}

// === EVENT HANDLERS ===

// Income
document.getElementById('income-amount').addEventListener('input', e => {
  state.income.amount = parseFloat(e.target.value) || 0;
  saveState();
  renderIncome();
  renderSummary();
});

document.getElementById('income-frequency').addEventListener('change', e => {
  state.income.frequency = e.target.value;
  document.getElementById('income-custom-field').style.display = e.target.value === 'custom' ? '' : 'none';
  saveState();
  render();
});

document.getElementById('income-custom-days').addEventListener('input', e => {
  state.income.customDays = parseInt(e.target.value) || 14;
  saveState();
  render();
});

// Expenses (event delegation)
document.getElementById('expenses-body').addEventListener('input', e => {
  const el = e.target;
  const expId = el.dataset.expenseId;
  if (!expId) return;
  const exp = state.expenses.find(x => x.id === expId);
  if (!exp) return;

  // Name field
  if (el.dataset.field === 'name') {
    exp.name = el.value;
    saveState();
    return;
  }

  // Amount in a frequency column
  if (el.dataset.freq) {
    const freq = el.dataset.freq;
    const val = parseFloat(el.value) || 0;
    exp.amount = val;
    exp.frequency = freq;
    saveState();
    // Update only the OTHER cells (not the one being typed in) to avoid destroying input
    updateCalculatedCells(expId, freq);
    renderAccounts();
    renderSummary();
    return;
  }

  // Awareness inline fields
  if (el.dataset.awField) {
    if (!exp.awareness) exp.awareness = {};
    const field = el.dataset.awField;
    if (field === 'period') {
      exp.awareness[field] = el.value;
    } else {
      exp.awareness[field] = parseFloat(el.value) || 0;
    }
    saveState();
    // Update awareness display without rebuilding DOM
    updateAwarenessDisplay(expId);
    return;
  }
});

document.getElementById('expenses-body').addEventListener('change', e => {
  const el = e.target;
  const expId = el.dataset.expenseId;
  if (!expId) return;
  const exp = state.expenses.find(x => x.id === expId);
  if (!exp) return;

  if (el.dataset.field === 'accountId') {
    exp.accountId = el.value;
    saveState();
    renderAccounts();
    renderSummary();
  }
  if (el.dataset.awField === 'period') {
    if (!exp.awareness) exp.awareness = {};
    exp.awareness.period = el.value;
    saveState();
    renderExpenses();
  }
});

// Expense & awareness button clicks
document.getElementById('expenses-body').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const expId = btn.dataset.expenseId;

  if (action === 'delete-expense') {
    state.expenses = state.expenses.filter(x => x.id !== expId);
    saveState();
    render();
  }

  if (action === 'toggle-awareness') {
    const exp = state.expenses.find(x => x.id === expId);
    if (!exp) return;
    if (!exp.awareness) exp.awareness = {};
    exp.awareness._open = !exp.awareness._open;
    saveState();
    renderExpenses();
  }

  if (action === 'apply-awareness') {
    const exp = state.expenses.find(x => x.id === expId);
    if (!exp || !exp.awareness) return;
    const aw = exp.awareness;
    const total = (Number(aw.timesPerPeriod) || 0) * (Number(aw.costPerTime) || 0);
    if (total > 0) {
      const periodToFreq = { week: 'weekly', fortnight: 'fortnightly', month: 'monthly', year: 'yearly' };
      exp.amount = total;
      exp.frequency = periodToFreq[aw.period] || 'weekly';
      saveState();
      render();
    }
  }

  if (action === 'open-modal') {
    openAwarenessModal(expId);
  }
});

// Add expense
document.getElementById('btn-add-expense').addEventListener('click', () => {
  const defaultAccount = state.accounts.length > 0 ? state.accounts[0].id : '';
  state.expenses.push({
    id: genId('exp'),
    name: '',
    amount: 0,
    frequency: 'weekly',
    accountId: defaultAccount,
    awareness: { timesPerPeriod: null, costPerTime: null, period: 'week', notes: '', _open: false },
  });
  saveState();
  render();
  // Focus the new name input
  const rows = document.querySelectorAll('#expenses-body input[data-field="name"]');
  if (rows.length) rows[rows.length - 1].focus();
});

// Accounts
document.getElementById('accounts-list').addEventListener('input', e => {
  const el = e.target;
  const accId = el.dataset.accountId;
  if (!accId || el.dataset.field !== 'name') return;
  const acc = state.accounts.find(x => x.id === accId);
  if (acc) {
    acc.name = el.value;
    saveState();
    // Update dropdowns without full re-render
    document.querySelectorAll(`select[data-field="accountId"] option[value="${accId}"]`).forEach(opt => {
      opt.textContent = el.value;
    });
  }
});

document.getElementById('accounts-list').addEventListener('click', e => {
  const btn = e.target.closest('[data-action="delete-account"]');
  if (!btn) return;
  const accId = btn.dataset.accountId;
  if (state.accounts.length <= 1) return;
  // Move expenses to first remaining account
  const remaining = state.accounts.filter(a => a.id !== accId);
  state.expenses.forEach(exp => {
    if (exp.accountId === accId) exp.accountId = remaining[0].id;
  });
  state.accounts = remaining;
  saveState();
  render();
});

document.getElementById('btn-add-account').addEventListener('click', () => {
  state.accounts.push({ id: genId('acc'), name: 'New Account' });
  saveState();
  render();
  const inputs = document.querySelectorAll('#accounts-list input[data-field="name"]');
  if (inputs.length) { const last = inputs[inputs.length - 1]; last.focus(); last.select(); }
});

// Summary frequency
document.getElementById('summary-frequency').addEventListener('change', () => renderSummary());

// === AWARENESS MODAL ===
function openAwarenessModal(expId) {
  const exp = state.expenses.find(x => x.id === expId);
  if (!exp) return;
  activeModalExpenseId = expId;
  const aw = exp.awareness || {};

  document.getElementById('modal-title').textContent = `Spending Awareness: ${exp.name || 'Expense'}`;
  document.getElementById('modal-times').value = aw.timesPerPeriod || '';
  document.getElementById('modal-cost').value = aw.costPerTime || '';
  document.getElementById('modal-period').value = aw.period || 'week';
  document.getElementById('modal-notes').value = aw.notes || '';

  const times = Number(aw.timesPerPeriod) || 0;
  document.getElementById('modal-whatif-times').value = times;
  document.getElementById('modal-whatif-times').max = Math.max(times * 3, 20);
  document.getElementById('modal-whatif-label').textContent = `${times} times`;

  updateModalResult();
  updateModalWhatIf();

  document.getElementById('awareness-modal').style.display = '';
}

function closeModal() {
  document.getElementById('awareness-modal').style.display = 'none';
  activeModalExpenseId = null;
}

function updateModalResult() {
  const times = parseFloat(document.getElementById('modal-times').value) || 0;
  const cost = parseFloat(document.getElementById('modal-cost').value) || 0;
  const period = document.getElementById('modal-period').value;
  const total = times * cost;
  const yearly = awarenessToYearly(times, cost, period);
  const incomeYearly = toYearly[state.income.frequency](state.income.amount, state.income.customDays);
  const pct = incomeYearly > 0 ? ((yearly / incomeYearly) * 100).toFixed(1) : '0.0';

  const resultDiv = document.getElementById('modal-result');
  if (total > 0) {
    const exp = state.expenses.find(x => x.id === activeModalExpenseId);
    const name = exp ? exp.name || 'this' : 'this';
    resultDiv.innerHTML = `
      <strong>${fmt(total)}</strong> per ${period} on ${escHtml(name)}<br>
      That's <strong>${fmt(yearly)} per year</strong> &mdash; ${pct}% of your income
    `;
  } else {
    resultDiv.innerHTML = '<span style="color:var(--text-muted)">Enter frequency and cost to see the breakdown</span>';
  }
}

function updateModalWhatIf() {
  const newTimes = parseFloat(document.getElementById('modal-whatif-times').value) || 0;
  const cost = parseFloat(document.getElementById('modal-cost').value) || 0;
  const period = document.getElementById('modal-period').value;
  const origTimes = parseFloat(document.getElementById('modal-times').value) || 0;

  document.getElementById('modal-whatif-label').textContent = `${newTimes} times per ${period}`;

  const origYearly = awarenessToYearly(origTimes, cost, period);
  const newYearly = awarenessToYearly(newTimes, cost, period);
  const diff = origYearly - newYearly;

  const resultDiv = document.getElementById('modal-whatif-result');
  if (cost > 0 && origTimes > 0) {
    if (diff > 0) {
      resultDiv.innerHTML = `Reducing to ${newTimes} times would save <strong>${fmt(diff)} per year</strong>`;
    } else if (diff < 0) {
      resultDiv.innerHTML = `Increasing to ${newTimes} times would cost an extra <strong>${fmt(Math.abs(diff))} per year</strong>`;
    } else {
      resultDiv.innerHTML = 'No change from current frequency';
    }
  } else {
    resultDiv.innerHTML = '';
  }
}

document.getElementById('modal-times').addEventListener('input', () => {
  updateModalResult();
  const times = parseFloat(document.getElementById('modal-times').value) || 0;
  const slider = document.getElementById('modal-whatif-times');
  slider.value = times;
  slider.max = Math.max(times * 3, 20);
  updateModalWhatIf();
});
document.getElementById('modal-cost').addEventListener('input', () => { updateModalResult(); updateModalWhatIf(); });
document.getElementById('modal-period').addEventListener('change', () => { updateModalResult(); updateModalWhatIf(); });
document.getElementById('modal-whatif-times').addEventListener('input', updateModalWhatIf);

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('awareness-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

document.getElementById('modal-apply').addEventListener('click', () => {
  if (!activeModalExpenseId) return;
  const exp = state.expenses.find(x => x.id === activeModalExpenseId);
  if (!exp) return;

  const times = parseFloat(document.getElementById('modal-times').value) || 0;
  const cost = parseFloat(document.getElementById('modal-cost').value) || 0;
  const period = document.getElementById('modal-period').value;
  const notes = document.getElementById('modal-notes').value;

  exp.awareness = {
    timesPerPeriod: times,
    costPerTime: cost,
    period: period,
    notes: notes,
    _open: true,
  };

  const total = times * cost;
  if (total > 0) {
    const periodToFreq = { week: 'weekly', fortnight: 'fortnightly', month: 'monthly', year: 'yearly' };
    exp.amount = total;
    exp.frequency = periodToFreq[period] || 'weekly';
  }

  saveState();
  closeModal();
  render();
});

// === CSV HELPERS ===
function escapeCsv(val) {
  const str = String(val == null ? '' : val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseCsvRow(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// === IMPORT / EXPORT (CSV) ===
document.getElementById('btn-export').addEventListener('click', () => {
  const customDays = state.income.customDays;
  const rows = [];

  // Header row
  rows.push([
    'Section', 'Name', 'Weekly', 'Fortnightly', 'Monthly', 'Yearly',
    'Input Frequency', 'Input Amount', 'Account',
    'Awareness Times', 'Awareness Cost', 'Awareness Period', 'Awareness Notes'
  ].map(escapeCsv).join(','));

  // Income row
  const inc = state.income;
  rows.push([
    'Income', 'Income',
    convertAmount(inc.amount, inc.frequency, 'weekly', customDays).toFixed(2),
    convertAmount(inc.amount, inc.frequency, 'fortnightly', customDays).toFixed(2),
    convertAmount(inc.amount, inc.frequency, 'monthly', customDays).toFixed(2),
    convertAmount(inc.amount, inc.frequency, 'yearly', customDays).toFixed(2),
    inc.frequency, inc.amount,
    '', '', '', '', ''
  ].map(escapeCsv).join(','));

  // Expense rows
  state.expenses.forEach(exp => {
    const aw = exp.awareness || {};
    const accName = (state.accounts.find(a => a.id === exp.accountId) || {}).name || '';
    rows.push([
      'Expense', exp.name,
      convertAmount(exp.amount, exp.frequency, 'weekly', customDays).toFixed(2),
      convertAmount(exp.amount, exp.frequency, 'fortnightly', customDays).toFixed(2),
      convertAmount(exp.amount, exp.frequency, 'monthly', customDays).toFixed(2),
      convertAmount(exp.amount, exp.frequency, 'yearly', customDays).toFixed(2),
      exp.frequency, exp.amount,
      accName,
      aw.timesPerPeriod || '', aw.costPerTime || '', aw.period || '', aw.notes || ''
    ].map(escapeCsv).join(','));
  });

  // Account rows
  state.accounts.forEach(acc => {
    rows.push([
      'Account', acc.name,
      '', '', '', '', '', '', '', '', '', '', ''
    ].map(escapeCsv).join(','));
  });

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `spending-plan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('file-import').click();
});

document.getElementById('file-import').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const lines = reader.result.split('\n').filter(l => l.trim());
      if (lines.length < 2) { alert('CSV file is empty or invalid.'); return; }

      const header = parseCsvRow(lines[0]);
      if (!header.includes('Section') || !header.includes('Name')) {
        alert('Invalid CSV format. Please use a file exported from this app.');
        return;
      }

      const newState = defaultState();
      newState.accounts = [];
      newState.expenses = [];

      // Build accounts first so we can map names to IDs
      const accountMap = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvRow(lines[i]);
        if (cols[0] === 'Account') {
          const id = genId('acc');
          const name = cols[1] || 'Account';
          newState.accounts.push({ id, name });
          accountMap[name] = id;
        }
      }
      // Ensure at least one account
      if (newState.accounts.length === 0) {
        const id = genId('acc');
        newState.accounts.push({ id, name: 'Main Account' });
        accountMap['Main Account'] = id;
      }

      // Parse income and expenses
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvRow(lines[i]);
        const section = cols[0];

        if (section === 'Income') {
          newState.income.frequency = cols[6] || 'monthly';
          newState.income.amount = parseFloat(cols[7]) || 0;
        }

        if (section === 'Expense') {
          const accName = cols[8] || '';
          const accId = accountMap[accName] || newState.accounts[0].id;
          newState.expenses.push({
            id: genId('exp'),
            name: cols[1] || '',
            amount: parseFloat(cols[7]) || 0,
            frequency: cols[6] || 'weekly',
            accountId: accId,
            awareness: {
              timesPerPeriod: parseFloat(cols[9]) || null,
              costPerTime: parseFloat(cols[10]) || null,
              period: cols[11] || 'week',
              notes: cols[12] || '',
              _open: false,
            },
          });
        }
      }

      state = newState;
      saveState();
      render();
    } catch (err) {
      alert('Could not read CSV file. Please check the format and try again.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
    state = defaultState();
    saveState();
    render();
  }
});

// === KEYBOARD: Escape closes modal ===
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// === INIT ===
render();
