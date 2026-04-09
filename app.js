// =============================================================
// SPENDING PLAN v2 — Vanilla JS
// =============================================================

// === CONSTANTS ===
const STORAGE_KEY = 'spending-plan-v2';
const ACCOUNT_COLOURS = ['#4A90E2', '#5CB85C', '#9B59B6', '#E67E22', '#E91E8C', '#1ABC9C'];
const COLOUR_LABELS   = ['Blue',    'Green',  'Purple',  'Orange',  'Pink',    'Teal'];
const FREQS = ['weekly', 'fortnightly', 'monthly', 'yearly', 'custom'];

// === STATE ===
const defaultState = () => ({
  people: [{ id: 'p_default', name: 'Me' }],
  incomeSources: [],
  expenses: [],
  accounts: [],
  bufferGoal: { multiplier: '3', unit: 'months', savedSoFar: '', saveByDate: '', weeklyNeeded: '' },
});

let state = loadState();

// pending account deletion (id awaiting reassign)
let pendingDeleteAccountId = null;

// =============================================================
// UTILS
// =============================================================
function genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmt(n) {
  if (n == null || isNaN(n)) return '$0.00';
  return '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// Convert amount + frequency → weekly
function toWeekly(amount, freq, timesPerYear) {
  if (!amount || isNaN(amount)) return 0;
  const n = parseFloat(amount);
  switch (freq) {
    case 'weekly':      return n;
    case 'fortnightly': return n / 2;
    case 'monthly':     return n / (52 / 12);
    case 'yearly':      return n / 52;
    case 'custom':      return (timesPerYear && parseFloat(timesPerYear) > 0)
                          ? (n * parseFloat(timesPerYear)) / 52 : 0;
    default:            return 0;
  }
}

// Convert weekly → any frequency
function fromWeekly(weekly, freq, timesPerYear) {
  if (!weekly || isNaN(weekly)) return 0;
  const w = parseFloat(weekly);
  switch (freq) {
    case 'weekly':      return w;
    case 'fortnightly': return w * 2;
    case 'monthly':     return w * (52 / 12);
    case 'yearly':      return w * 52;
    case 'custom':      return (timesPerYear && parseFloat(timesPerYear) > 0)
                          ? (w * 52) / parseFloat(timesPerYear) : 0;
    default:            return 0;
  }
}

function getExpenseWeekly(exp) {
  return toWeekly(exp.amount, exp.frequency, exp.timesPerYear);
}

function getColWeekly() {
  return state.expenses
    .filter(e => e.isCoL)
    .reduce((sum, e) => sum + getExpenseWeekly(e), 0);
}

// =============================================================
// PERSISTENCE
// =============================================================
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    }
  } catch (e) { /* ignore */ }
  return defaultState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// =============================================================
// RENDER: PEOPLE
// =============================================================
function renderPeople() {
  const list = document.getElementById('people-list');
  list.innerHTML = state.people.map(p => `
    <li class="person-chip">
      <span class="person-avatar">${escHtml(p.name.charAt(0).toUpperCase())}</span>
      <span class="person-name">${escHtml(p.name)}</span>
      ${state.people.length > 1
        ? `<button class="btn-icon delete-btn" data-person-id="${p.id}" data-action="delete-person" title="Remove">&times;</button>`
        : ''}
    </li>
  `).join('');
}

// =============================================================
// RENDER: INCOME
// =============================================================
function renderIncome() {
  const tbody = document.getElementById('income-body');

  if (state.incomeSources.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">No income sources yet. Click "+ Add Income Source" to get started.</td></tr>`;
  } else {
    tbody.innerHTML = state.incomeSources.map(s => {
      const weekly = toWeekly(s.amount, s.frequency, s.timesPerYear);
      const personOpts = state.people.map(p =>
        `<option value="${p.id}"${p.id === s.personId ? ' selected' : ''}>${escHtml(p.name)}</option>`
      ).join('');
      const freqOpts = FREQS.map(f =>
        `<option value="${f}"${f === s.frequency ? ' selected' : ''}>${f.charAt(0).toUpperCase() + f.slice(1)}</option>`
      ).join('');

      return `
        <tr data-source-id="${s.id}">
          <td><select data-source-id="${s.id}" data-field="personId">${personOpts}</select></td>
          <td><input type="text" value="${escHtml(s.name)}" placeholder="e.g. Salary"
            data-source-id="${s.id}" data-field="name"></td>
          <td class="col-amount">
            <div class="dollar-input">
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value="${s.amount || ''}" data-source-id="${s.id}" data-field="amount">
            </div>
          </td>
          <td><select data-source-id="${s.id}" data-field="frequency">${freqOpts}</select></td>
          <td>
            ${s.frequency === 'custom'
              ? `<input type="number" min="1" step="1" placeholder="e.g. 26"
                  class="times-per-year-input" value="${s.timesPerYear || ''}"
                  data-source-id="${s.id}" data-field="timesPerYear">`
              : `<span class="muted-dash">—</span>`}
          </td>
          <td class="col-weekly-h"><span class="calculated-weekly">${fmt(weekly)}</span></td>
          <td>
            <button class="btn-icon delete-btn" data-source-id="${s.id}"
              data-action="delete-source" title="Remove">&times;</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  updateIncomeTotals();
}

function updateIncomeTotals() {
  const totals = {};
  let combinedWeekly = 0;
  state.incomeSources.forEach(s => {
    const w = toWeekly(s.amount, s.frequency, s.timesPerYear);
    totals[s.personId] = (totals[s.personId] || 0) + w;
    combinedWeekly += w;
  });

  const div = document.getElementById('income-totals');
  if (state.incomeSources.length === 0) { div.style.display = 'none'; return; }

  div.innerHTML = state.people.map(p => `
    <div class="income-total-chip">
      <span class="person-avatar sm">${escHtml(p.name.charAt(0).toUpperCase())}</span>
      <div>
        <div class="chip-label">${escHtml(p.name)}</div>
        <div class="chip-value">${fmt(totals[p.id] || 0)}<span class="per-wk">/wk</span></div>
      </div>
    </div>
  `).join('') + `
    <div class="income-total-chip combined">
      <span class="person-avatar sm">&#8721;</span>
      <div>
        <div class="chip-label">Combined</div>
        <div class="chip-value">${fmt(combinedWeekly)}<span class="per-wk">/wk</span></div>
      </div>
    </div>
  `;
  div.style.display = '';
}

// =============================================================
// RENDER: EXPENSES
// =============================================================
function renderExpenses() {
  const tbody = document.getElementById('expenses-body');

  if (state.expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">No expenses yet. Click "+ Add Expense" to get started.</td></tr>`;
    document.getElementById('expenses-footer-total').innerHTML = '';
    renderSummaryBar();
    renderBufferGoal();
    return;
  }

  tbody.innerHTML = state.expenses.map(exp => buildExpenseRow(exp)).join('');

  // Footer totals
  const totalWeekly = state.expenses.reduce((s, e) => s + getExpenseWeekly(e), 0);
  document.getElementById('expenses-footer-total').innerHTML =
    `Total: <strong>${fmt(totalWeekly)}/wk</strong> &nbsp;&#183;&nbsp; ${fmt(totalWeekly * (52 / 12))}/mo &nbsp;&#183;&nbsp; ${fmt(totalWeekly * 52)}/yr`;

  renderSummaryBar();
  renderBufferGoal();
}

function buildExpenseRow(exp) {
  const weekly = getExpenseWeekly(exp);

  const amountCells = ['weekly', 'fortnightly', 'monthly', 'yearly'].map(f => {
    const isSource = f === exp.frequency;
    const val = isSource ? (exp.amount || '') : (weekly ? fromWeekly(weekly, f).toFixed(2) : '');
    return `<td class="col-amount">
      <div class="dollar-input">
        <input type="number" min="0" step="0.01" placeholder="—"
          class="${isSource ? 'user-entered' : 'calculated'}"
          value="${val}"
          data-expense-id="${exp.id}" data-freq="${f}">
      </div>
    </td>`;
  }).join('');

  // Custom column: per-occasion amount + ×/yr
  const isCustomSource = exp.frequency === 'custom';
  const customDisplayVal = isCustomSource
    ? (exp.amount || '')
    : (exp.timesPerYear && weekly ? fromWeekly(weekly, 'custom', exp.timesPerYear).toFixed(2) : '');

  const customCell = `<td class="col-custom">
    <div class="custom-cell">
      <input type="number" min="0" step="0.01" placeholder="—"
        class="${isCustomSource ? 'user-entered' : 'calculated'}"
        value="${customDisplayVal}"
        data-expense-id="${exp.id}" data-freq="custom">
      <input type="number" min="1" step="1" placeholder="&#215;/yr"
        class="times-yr-input"
        value="${exp.timesPerYear || ''}"
        data-expense-id="${exp.id}" data-field="timesPerYear">
    </div>
  </td>`;

  const accountOpts = ['<option value="">&#8212; none &#8212;</option>',
    ...state.accounts.map(a =>
      `<option value="${a.id}"${a.id === exp.accountId ? ' selected' : ''}>${escHtml(a.name || 'Unnamed')}</option>`)
  ].join('');

  // Awareness helper
  const aw = exp.awareness || {};
  const awWeekly = (parseFloat(aw.timesPerWeek) || 0) * (parseFloat(aw.avgSpend) || 0);
  const awMonthly = awWeekly * (52 / 12);
  const awYearly  = awWeekly * 52;
  const awOpen = aw._open ? ' open' : '';

  const awarenessResultHtml = awWeekly > 0 ? `
    <div class="awareness-result-row">
      <span><strong>${fmt(awWeekly)}/wk</strong></span>
      <span class="sep">&#183;</span>
      <span>${fmt(awMonthly)}/mo</span>
      <span class="sep">&#183;</span>
      <span>${fmt(awYearly)}/yr</span>
      <button class="btn btn-primary use-this-btn"
        data-expense-id="${exp.id}" data-weekly="${awWeekly.toFixed(4)}"
        data-action="use-awareness">Use this</button>
    </div>
  ` : '';

  const awarenessRow = `
    <tr class="awareness-row${awOpen}" data-expense-id="${exp.id}">
      <td colspan="9">
        <div class="awareness-inline">
          <span class="awareness-label">Spend Awareness</span>
          <div class="awareness-inputs">
            <input type="number" min="0" step="0.5" placeholder="times/wk"
              value="${aw.timesPerWeek || ''}"
              data-expense-id="${exp.id}" data-aw-field="timesPerWeek">
            <span class="aw-times">&#215;</span>
            <span class="aw-dollar">$</span>
            <input type="number" min="0" step="0.01" placeholder="avg spend"
              value="${aw.avgSpend || ''}"
              data-expense-id="${exp.id}" data-aw-field="avgSpend">
          </div>
          ${awarenessResultHtml}
        </div>
      </td>
    </tr>
  `;

  return `
    <tr class="expense-row${exp.isCoL ? ' col-row' : ''}" data-expense-id="${exp.id}">
      <td class="col-name">
        <input type="text" value="${escHtml(exp.name)}" placeholder="e.g. Rent"
          data-expense-id="${exp.id}" data-field="name">
      </td>
      ${amountCells}
      ${customCell}
      <td class="col-account">
        <select data-expense-id="${exp.id}" data-field="accountId">${accountOpts}</select>
      </td>
      <td class="col-col">
        <input type="checkbox" ${exp.isCoL ? 'checked' : ''}
          data-expense-id="${exp.id}" data-field="isCoL" title="Cost of Living">
      </td>
      <td class="col-actions">
        <button class="btn-icon awareness-btn" data-expense-id="${exp.id}"
          data-action="toggle-awareness" title="Spend Awareness">&#8776;</button>
        <button class="btn-icon delete-btn" data-expense-id="${exp.id}"
          data-action="delete-expense" title="Remove">&times;</button>
      </td>
    </tr>
    ${awarenessRow}
  `;
}

// Targeted update: recalculate cells for one expense without rebuilding DOM
function updateExpenseCalculatedCells(expId, sourceFreq) {
  const exp = state.expenses.find(x => x.id === expId);
  if (!exp) return;
  const weekly = getExpenseWeekly(exp);

  ['weekly', 'fortnightly', 'monthly', 'yearly'].forEach(f => {
    const input = document.querySelector(`input[data-expense-id="${expId}"][data-freq="${f}"]`);
    if (!input) return;
    if (f === sourceFreq) {
      input.className = 'user-entered';
    } else {
      input.value = weekly ? fromWeekly(weekly, f).toFixed(2) : '';
      input.className = 'calculated';
    }
  });

  const customInput = document.querySelector(`input[data-expense-id="${expId}"][data-freq="custom"]`);
  if (customInput) {
    if (sourceFreq === 'custom') {
      customInput.className = 'user-entered';
    } else if (exp.timesPerYear && weekly) {
      customInput.value = fromWeekly(weekly, 'custom', exp.timesPerYear).toFixed(2);
      customInput.className = 'calculated';
    } else {
      customInput.value = '';
      customInput.className = 'calculated';
    }
  }

  // Update footer total
  const totalWeekly = state.expenses.reduce((s, e) => s + getExpenseWeekly(e), 0);
  document.getElementById('expenses-footer-total').innerHTML =
    `Total: <strong>${fmt(totalWeekly)}/wk</strong> &nbsp;&#183;&nbsp; ${fmt(totalWeekly * (52 / 12))}/mo &nbsp;&#183;&nbsp; ${fmt(totalWeekly * 52)}/yr`;
}

// Update awareness result row without rebuilding expense DOM
function updateAwarenessDisplay(expId) {
  const exp = state.expenses.find(x => x.id === expId);
  if (!exp) return;
  const aw = exp.awareness || {};
  const awWeekly = (parseFloat(aw.timesPerWeek) || 0) * (parseFloat(aw.avgSpend) || 0);
  const awMonthly = awWeekly * (52 / 12);
  const awYearly  = awWeekly * 52;

  const awRow = document.querySelector(`.awareness-row[data-expense-id="${expId}"]`);
  if (!awRow) return;
  let resultRow = awRow.querySelector('.awareness-result-row');

  if (awWeekly > 0) {
    if (!resultRow) {
      resultRow = document.createElement('div');
      resultRow.className = 'awareness-result-row';
      awRow.querySelector('.awareness-inline').appendChild(resultRow);
    }
    resultRow.innerHTML = `
      <span><strong>${fmt(awWeekly)}/wk</strong></span>
      <span class="sep">&#183;</span>
      <span>${fmt(awMonthly)}/mo</span>
      <span class="sep">&#183;</span>
      <span>${fmt(awYearly)}/yr</span>
      <button class="btn btn-primary use-this-btn"
        data-expense-id="${expId}" data-weekly="${awWeekly.toFixed(4)}"
        data-action="use-awareness">Use this</button>
    `;
  } else {
    if (resultRow) resultRow.remove();
  }
}

// =============================================================
// RENDER: ACCOUNTS
// =============================================================
function renderAccounts() {
  const container = document.getElementById('accounts-container');

  if (state.accounts.length === 0) {
    container.innerHTML = `<p class="section-hint" style="margin:0">No accounts yet. Add one below.</p>`;
    return;
  }

  container.innerHTML = state.accounts.map(acc => {
    const weeklyTotal = state.expenses
      .filter(e => e.accountId === acc.id)
      .reduce((sum, e) => sum + getExpenseWeekly(e), 0);

    const ownerPerson = acc.owner !== 'joint' ? state.people.find(p => p.id === acc.owner) : null;
    const ownerLabel  = acc.owner === 'joint' ? 'Joint' : (ownerPerson ? ownerPerson.name : 'Unknown');
    const isJoint     = acc.owner === 'joint';

    const ownerOpts = [
      `<option value="joint"${isJoint ? ' selected' : ''}>Joint</option>`,
      ...state.people.map(p =>
        `<option value="${p.id}"${p.id === acc.owner ? ' selected' : ''}>${escHtml(p.name)}</option>`)
    ].join('');

    const colour = acc.colour || ACCOUNT_COLOURS[0];

    const swatches = ACCOUNT_COLOURS.map((c, i) =>
      `<button class="colour-swatch${c === colour ? ' selected' : ''}"
        style="background:${c}"
        data-account-id="${acc.id}" data-colour="${c}" data-action="set-colour"
        title="${COLOUR_LABELS[i]}"></button>`
    ).join('');

    return `
      <div class="account-card" style="border-top-color:${colour}" data-account-id="${acc.id}">
        <div class="account-card-header">
          <div class="colour-swatches">${swatches}</div>
          <button class="btn-icon delete-btn" data-account-id="${acc.id}"
            data-action="delete-account" title="Delete">&times;</button>
        </div>
        <input type="text" class="account-name-input" value="${escHtml(acc.name)}"
          placeholder="Account name" data-account-id="${acc.id}" data-field="name">
        <div class="account-meta">
          <select data-account-id="${acc.id}" data-field="owner">${ownerOpts}</select>
          <span class="owner-badge${isJoint ? ' joint' : ''}">${escHtml(ownerLabel)}</span>
        </div>
        <div class="account-alloc">
          <span class="alloc-label">Weekly allocation</span>
          <span class="alloc-value">${fmt(weeklyTotal)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================
// RENDER: BUFFER GOAL
// =============================================================
function renderBufferGoal() {
  const bg        = state.bufferGoal;
  const colWeekly = getColWeekly();

  document.getElementById('bg-col-weekly').textContent = fmt(colWeekly) + '/wk';
  document.getElementById('bg-col-hint').textContent =
    colWeekly === 0 ? ' — tick CoL on expenses above to include them here.' : '';

  const multiplier  = parseFloat(bg.multiplier) || 0;
  const unit        = bg.unit || 'months';
  const periodWeeks = unit === 'months' ? multiplier * (52 / 12) : multiplier;
  const target      = colWeekly * periodWeeks;
  const savedSoFar  = parseFloat(bg.savedSoFar) || 0;
  const remaining   = Math.max(0, target - savedSoFar);
  const weeklyNeeded = parseFloat(bg.weeklyNeeded) || 0;

  // Progress
  const progress = target > 0 ? Math.min(1, savedSoFar / target) : 0;
  document.getElementById('bg-progress-fill').style.width = (progress * 100).toFixed(1) + '%';
  document.getElementById('bg-progress-label').textContent = (progress * 100).toFixed(0) + '%';
  document.getElementById('bg-saved-label').textContent = fmt(savedSoFar) + ' saved';
  document.getElementById('bg-goal-label').textContent  = fmt(target) + ' goal';

  // Headline
  let headline = '';
  if (target > 0) {
    if (savedSoFar >= target) {
      headline = `${multiplier} ${unit} of living costs = <strong>${fmt(target)}</strong>. <span style="color:var(--success)">Goal reached!</span>`;
    } else if (weeklyNeeded > 0) {
      const weeksNeeded  = remaining / weeklyNeeded;
      const monthsNeeded = (weeksNeeded / (52 / 12)).toFixed(1);
      headline = `${multiplier} ${unit} of living costs = <strong>${fmt(target)}</strong>. Save <strong>${fmt(weeklyNeeded)}/wk</strong> to reach this in <strong>${monthsNeeded} months</strong>.`;
    } else {
      headline = `${multiplier} ${unit} of living costs = <strong>${fmt(target)}</strong>.`;
    }
  } else {
    headline = '<span style="color:var(--text-muted)">Enter a multiplier and mark some expenses as CoL to calculate your buffer target.</span>';
  }
  document.getElementById('bg-headline').innerHTML = headline;
  document.getElementById('bg-achieved').style.display = (savedSoFar >= target && target > 0) ? '' : 'none';

  // Unit toggle active state
  document.querySelectorAll('.unit-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === unit);
  });
}

// =============================================================
// RENDER: SUMMARY BAR
// =============================================================
function renderSummaryBar() {
  const totalIncome   = state.incomeSources.reduce((s, src) =>
    s + toWeekly(src.amount, src.frequency, src.timesPerYear), 0);
  const totalExpenses = state.expenses.reduce((s, e) => s + getExpenseWeekly(e), 0);
  const surplus       = totalIncome - totalExpenses;

  document.getElementById('bar-income').textContent   = fmt(totalIncome);
  document.getElementById('bar-expenses').textContent = fmt(totalExpenses);
  document.getElementById('bar-surplus').textContent  = fmt(Math.abs(surplus));
  document.getElementById('bar-surplus').className    = 'bar-value ' + (surplus >= 0 ? 'positive' : 'negative');
  document.getElementById('bar-surplus-label').textContent = surplus >= 0 ? 'Surplus' : 'Deficit';

  document.getElementById('bar-accounts').innerHTML = state.accounts.map(acc => {
    const w = state.expenses
      .filter(e => e.accountId === acc.id)
      .reduce((s, e) => s + getExpenseWeekly(e), 0);
    return `
      <div class="bar-account-chip">
        <span class="account-dot" style="background:${acc.colour || ACCOUNT_COLOURS[0]}"></span>
        <span class="chip-acct-name">${escHtml(acc.name || 'Unnamed')}</span>
        <span class="chip-acct-val">${fmt(w)}/wk</span>
      </div>
    `;
  }).join('');
}

// =============================================================
// FULL RENDER
// =============================================================
function render() {
  renderPeople();
  renderIncome();
  renderExpenses();
  renderAccounts();
  renderBufferGoal();
  renderSummaryBar();
}

// =============================================================
// EVENT: PEOPLE
// =============================================================
document.getElementById('people-list').addEventListener('click', e => {
  const btn = e.target.closest('[data-action="delete-person"]');
  if (!btn) return;
  if (state.people.length <= 1) return;
  const personId = btn.dataset.personId;
  state.people = state.people.filter(p => p.id !== personId);
  const firstId = state.people[0].id;
  state.incomeSources.forEach(s => { if (s.personId === personId) s.personId = firstId; });
  state.accounts.forEach(a    => { if (a.owner === personId) a.owner = 'joint'; });
  saveState();
  render();
});

document.getElementById('btn-add-person').addEventListener('click', () => {
  const input = document.getElementById('new-person-name');
  const name  = input.value.trim();
  if (!name) return;
  state.people.push({ id: genId('p'), name });
  input.value = '';
  saveState();
  render();
});

document.getElementById('new-person-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-add-person').click();
});

// =============================================================
// EVENT: INCOME
// =============================================================
document.getElementById('income-body').addEventListener('input', e => {
  const el       = e.target;
  const sourceId = el.dataset.sourceId;
  if (!sourceId) return;
  const src = state.incomeSources.find(s => s.id === sourceId);
  if (!src) return;

  const field = el.dataset.field;
  if (field === 'name')   { src.name = el.value; }
  if (field === 'amount') { src.amount = parseFloat(el.value) || 0; }
  if (field === 'timesPerYear') { src.timesPerYear = el.value; }

  if (field === 'amount' || field === 'timesPerYear') {
    // Update weekly cell in this row without rebuilding
    const row = el.closest('tr');
    if (row) {
      const weeklyEl = row.querySelector('.calculated-weekly');
      if (weeklyEl) weeklyEl.textContent = fmt(toWeekly(src.amount, src.frequency, src.timesPerYear));
    }
    updateIncomeTotals();
    renderSummaryBar();
    renderBufferGoal();
  }
  saveState();
});

document.getElementById('income-body').addEventListener('change', e => {
  const el       = e.target;
  const sourceId = el.dataset.sourceId;
  if (!sourceId) return;
  const src = state.incomeSources.find(s => s.id === sourceId);
  if (!src) return;

  const field = el.dataset.field;
  if (field === 'personId')  { src.personId  = el.value; updateIncomeTotals(); renderSummaryBar(); saveState(); }
  if (field === 'frequency') { src.frequency = el.value; saveState(); renderIncome(); renderSummaryBar(); renderBufferGoal(); }
});

document.getElementById('income-body').addEventListener('click', e => {
  const btn = e.target.closest('[data-action="delete-source"]');
  if (!btn) return;
  state.incomeSources = state.incomeSources.filter(s => s.id !== btn.dataset.sourceId);
  saveState();
  renderIncome();
  renderSummaryBar();
  renderBufferGoal();
});

document.getElementById('btn-add-income').addEventListener('click', () => {
  state.incomeSources.push({
    id: genId('inc'),
    personId: state.people[0]?.id || '',
    name: '',
    amount: 0,
    frequency: 'monthly',
    timesPerYear: '',
  });
  saveState();
  renderIncome();
  // Focus new name input
  const rows = document.querySelectorAll('#income-body input[data-field="name"]');
  if (rows.length) rows[rows.length - 1].focus();
});

// =============================================================
// EVENT: EXPENSES
// =============================================================
document.getElementById('expenses-body').addEventListener('input', e => {
  const el    = e.target;
  const expId = el.dataset.expenseId;
  if (!expId) return;
  const exp = state.expenses.find(x => x.id === expId);
  if (!exp) return;

  // Name field
  if (el.dataset.field === 'name') { exp.name = el.value; saveState(); return; }

  // timesPerYear sub-field in custom column
  if (el.dataset.field === 'timesPerYear') {
    exp.timesPerYear = el.value;
    saveState();
    updateExpenseCalculatedCells(expId, exp.frequency);
    renderSummaryBar();
    renderBufferGoal();
    renderAccounts();
    return;
  }

  // Amount frequency cell
  if (el.dataset.freq) {
    const freq = el.dataset.freq;
    exp.amount    = parseFloat(el.value) || 0;
    exp.frequency = freq;
    saveState();
    updateExpenseCalculatedCells(expId, freq);
    renderSummaryBar();
    renderBufferGoal();
    renderAccounts();
    return;
  }

  // Awareness inline fields
  if (el.dataset.awField) {
    if (!exp.awareness) exp.awareness = {};
    const f = el.dataset.awField;
    exp.awareness[f] = (f === 'timesPerWeek' || f === 'avgSpend')
      ? (el.value) : el.value;
    saveState();
    updateAwarenessDisplay(expId);
    return;
  }
});

document.getElementById('expenses-body').addEventListener('change', e => {
  const el    = e.target;
  const expId = el.dataset.expenseId;
  if (!expId) return;
  const exp = state.expenses.find(x => x.id === expId);
  if (!exp) return;

  if (el.dataset.field === 'accountId') {
    exp.accountId = el.value;
    saveState();
    renderAccounts();
    renderSummaryBar();
    return;
  }
  if (el.dataset.field === 'isCoL') {
    exp.isCoL = el.checked;
    saveState();
    // Toggle row highlight
    const row = document.querySelector(`.expense-row[data-expense-id="${expId}"]`);
    if (row) row.classList.toggle('col-row', exp.isCoL);
    renderBufferGoal();
    return;
  }
});

document.getElementById('expenses-body').addEventListener('click', e => {
  const btn   = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const expId  = btn.dataset.expenseId;

  if (action === 'delete-expense') {
    state.expenses = state.expenses.filter(x => x.id !== expId);
    saveState();
    renderExpenses();
    renderAccounts();
    return;
  }

  if (action === 'toggle-awareness') {
    const exp = state.expenses.find(x => x.id === expId);
    if (!exp) return;
    if (!exp.awareness) exp.awareness = {};
    exp.awareness._open = !exp.awareness._open;
    saveState();
    const awRow = document.querySelector(`.awareness-row[data-expense-id="${expId}"]`);
    if (awRow) awRow.classList.toggle('open', exp.awareness._open);
    return;
  }

  if (action === 'use-awareness') {
    const exp = state.expenses.find(x => x.id === expId);
    if (!exp) return;
    const weeklyVal = parseFloat(btn.dataset.weekly) || 0;
    if (!weeklyVal) return;
    exp.amount    = weeklyVal;
    exp.frequency = 'weekly';
    saveState();
    updateExpenseCalculatedCells(expId, 'weekly');
    renderSummaryBar();
    renderBufferGoal();
    renderAccounts();
    return;
  }
});

document.getElementById('btn-add-expense').addEventListener('click', () => {
  const defaultAccount = state.accounts.length > 0 ? state.accounts[0].id : '';
  state.expenses.push({
    id: genId('exp'),
    name: '',
    amount: 0,
    frequency: 'weekly',
    timesPerYear: '',
    accountId: defaultAccount,
    isCoL: false,
    awareness: { timesPerWeek: '', avgSpend: '', _open: false },
  });
  saveState();
  renderExpenses();
  renderAccounts();
  const rows = document.querySelectorAll('#expenses-body input[data-field="name"]');
  if (rows.length) rows[rows.length - 1].focus();
});

// =============================================================
// EVENT: ACCOUNTS
// =============================================================
document.getElementById('accounts-container').addEventListener('input', e => {
  const el    = e.target;
  const accId = el.dataset.accountId;
  if (!accId) return;
  const acc = state.accounts.find(a => a.id === accId);
  if (!acc) return;

  if (el.dataset.field === 'name') {
    acc.name = el.value;
    saveState();
    // Update account dropdowns in expenses without full rebuild
    document.querySelectorAll(`select[data-field="accountId"] option[value="${accId}"]`).forEach(opt => {
      opt.textContent = el.value || 'Unnamed';
    });
    // Update summary bar chips
    renderSummaryBar();
    return;
  }
});

document.getElementById('accounts-container').addEventListener('change', e => {
  const el    = e.target;
  const accId = el.dataset.accountId;
  if (!accId) return;
  const acc = state.accounts.find(a => a.id === accId);
  if (!acc) return;

  if (el.dataset.field === 'owner') {
    acc.owner = el.value;
    saveState();
    // Update owner badge without full rebuild
    const card = el.closest('.account-card');
    if (card) {
      const badge  = card.querySelector('.owner-badge');
      const person = state.people.find(p => p.id === acc.owner);
      const label  = acc.owner === 'joint' ? 'Joint' : (person ? person.name : 'Unknown');
      if (badge) {
        badge.textContent = label;
        badge.className   = 'owner-badge' + (acc.owner === 'joint' ? ' joint' : '');
      }
    }
    return;
  }
});

document.getElementById('accounts-container').addEventListener('click', e => {
  const btn   = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const accId  = btn.dataset.accountId;

  if (action === 'set-colour') {
    const acc = state.accounts.find(a => a.id === accId);
    if (!acc) return;
    acc.colour = btn.dataset.colour;
    saveState();
    // Update card border and swatch selection
    const card = btn.closest('.account-card');
    if (card) {
      card.style.borderTopColor = acc.colour;
      card.querySelectorAll('.colour-swatch').forEach(sw => {
        sw.classList.toggle('selected', sw.dataset.colour === acc.colour);
      });
    }
    renderSummaryBar();
    return;
  }

  if (action === 'delete-account') {
    const inUse = state.expenses.some(e => e.accountId === accId);
    if (inUse) {
      // Show reassign modal
      pendingDeleteAccountId = accId;
      const acc      = state.accounts.find(a => a.id === accId);
      const others   = state.accounts.filter(a => a.id !== accId);
      const msgEl    = document.getElementById('reassign-modal-msg');
      const optsEl   = document.getElementById('reassign-options');
      msgEl.textContent = `"${acc ? acc.name || 'Unnamed' : ''}" is used by some expenses. Reassign them to:`;
      optsEl.innerHTML = [
        ...others.map(a => `<button class="btn btn-secondary" data-reassign-to="${a.id}">${escHtml(a.name || 'Unnamed')}</button>`),
        `<button class="btn btn-secondary" data-reassign-to="">None (unassign)</button>`,
        `<button class="btn btn-ghost" data-reassign-to="cancel">Cancel</button>`,
      ].join('');
      document.getElementById('reassign-modal').style.display = '';
    } else {
      state.accounts = state.accounts.filter(a => a.id !== accId);
      saveState();
      renderAccounts();
      renderSummaryBar();
    }
    return;
  }
});

document.getElementById('btn-add-account').addEventListener('click', () => {
  // Pick a colour not yet used, or cycle
  const usedColours = new Set(state.accounts.map(a => a.colour));
  const colour = ACCOUNT_COLOURS.find(c => !usedColours.has(c)) || ACCOUNT_COLOURS[state.accounts.length % ACCOUNT_COLOURS.length];
  state.accounts.push({
    id: genId('acc'),
    name: '',
    owner: 'joint',
    colour,
  });
  saveState();
  renderAccounts();
  renderSummaryBar();
  // Focus new account name input
  const inputs = document.querySelectorAll('#accounts-container .account-name-input');
  if (inputs.length) { const last = inputs[inputs.length - 1]; last.focus(); last.select(); }
});

// Reassign modal
document.getElementById('reassign-options').addEventListener('click', e => {
  const btn = e.target.closest('[data-reassign-to]');
  if (!btn) return;
  const reassignTo = btn.dataset.reassignTo;
  if (reassignTo === 'cancel') {
    pendingDeleteAccountId = null;
    document.getElementById('reassign-modal').style.display = 'none';
    return;
  }
  if (pendingDeleteAccountId) {
    state.expenses.forEach(exp => {
      if (exp.accountId === pendingDeleteAccountId) exp.accountId = reassignTo;
    });
    state.accounts = state.accounts.filter(a => a.id !== pendingDeleteAccountId);
    pendingDeleteAccountId = null;
    saveState();
    document.getElementById('reassign-modal').style.display = 'none';
    renderExpenses();
    renderAccounts();
    renderSummaryBar();
  }
});

document.getElementById('reassign-modal-close').addEventListener('click', () => {
  pendingDeleteAccountId = null;
  document.getElementById('reassign-modal').style.display = 'none';
});

document.getElementById('reassign-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) {
    pendingDeleteAccountId = null;
    document.getElementById('reassign-modal').style.display = 'none';
  }
});

// =============================================================
// EVENT: BUFFER GOAL
// =============================================================
document.getElementById('bg-multiplier').addEventListener('input', e => {
  state.bufferGoal.multiplier = e.target.value;
  saveState();
  renderBufferGoal();
});

document.querySelectorAll('.unit-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.bufferGoal.unit = btn.dataset.unit;
    saveState();
    renderBufferGoal();
  });
});

document.getElementById('bg-saved-so-far').addEventListener('input', e => {
  state.bufferGoal.savedSoFar = e.target.value;
  saveState();
  renderBufferGoal();
});

// "Save by" date → recalculate weeklyNeeded
document.getElementById('bg-save-by').addEventListener('change', e => {
  state.bufferGoal.saveByDate = e.target.value;
  if (e.target.value) {
    const colWeekly   = getColWeekly();
    const multiplier  = parseFloat(state.bufferGoal.multiplier) || 0;
    const unit        = state.bufferGoal.unit || 'months';
    const periodWeeks = unit === 'months' ? multiplier * (52 / 12) : multiplier;
    const target      = colWeekly * periodWeeks;
    const savedSoFar  = parseFloat(state.bufferGoal.savedSoFar) || 0;
    const remaining   = Math.max(0, target - savedSoFar);

    const today   = new Date(); today.setHours(0,0,0,0);
    const saveBy  = new Date(e.target.value); saveBy.setHours(0,0,0,0);
    const diffMs  = saveBy - today;
    if (diffMs > 0 && remaining > 0) {
      const weeksLeft    = diffMs / (1000 * 60 * 60 * 24 * 7);
      const weeklyNeeded = remaining / weeksLeft;
      state.bufferGoal.weeklyNeeded = weeklyNeeded.toFixed(2);
      document.getElementById('bg-weekly-needed').value = state.bufferGoal.weeklyNeeded;
    }
  }
  saveState();
  renderBufferGoal();
});

// "Weekly needed" → recalculate save-by date
document.getElementById('bg-weekly-needed').addEventListener('input', e => {
  state.bufferGoal.weeklyNeeded = e.target.value;
  const weeklyNeeded = parseFloat(e.target.value) || 0;
  if (weeklyNeeded > 0) {
    const colWeekly   = getColWeekly();
    const multiplier  = parseFloat(state.bufferGoal.multiplier) || 0;
    const unit        = state.bufferGoal.unit || 'months';
    const periodWeeks = unit === 'months' ? multiplier * (52 / 12) : multiplier;
    const target      = colWeekly * periodWeeks;
    const savedSoFar  = parseFloat(state.bufferGoal.savedSoFar) || 0;
    const remaining   = Math.max(0, target - savedSoFar);

    if (remaining > 0) {
      const weeksNeeded = remaining / weeklyNeeded;
      const saveByDate  = new Date();
      saveByDate.setDate(saveByDate.getDate() + Math.ceil(weeksNeeded * 7));
      const dateStr = saveByDate.toISOString().split('T')[0];
      state.bufferGoal.saveByDate = dateStr;
      document.getElementById('bg-save-by').value = dateStr;
    }
  }
  saveState();
  renderBufferGoal();
});

// =============================================================
// RESET
// =============================================================
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Reset all data? This cannot be undone.')) {
    state = defaultState();
    saveState();
    render();
    document.getElementById('bg-multiplier').value   = state.bufferGoal.multiplier;
    document.getElementById('bg-save-by').value      = '';
    document.getElementById('bg-weekly-needed').value= '';
    document.getElementById('bg-saved-so-far').value = '';
  }
});

// =============================================================
// CSV EXPORT / IMPORT
// =============================================================
function escapeCsv(val) {
  const str = String(val == null ? '' : val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseCsvRow(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  fields.push(cur);
  return fields;
}

document.getElementById('btn-export').addEventListener('click', () => {
  const rows = [];
  rows.push(['Section','Key','Value1','Value2','Value3','Value4','Value5'].map(escapeCsv).join(','));

  // People
  state.people.forEach(p => {
    rows.push(['Person', p.id, p.name, '', '', '', ''].map(escapeCsv).join(','));
  });

  // Income
  state.incomeSources.forEach(s => {
    rows.push(['Income', s.id, s.personId, s.name, s.amount, s.frequency, s.timesPerYear || ''].map(escapeCsv).join(','));
  });

  // Expenses
  state.expenses.forEach(exp => {
    const accName = (state.accounts.find(a => a.id === exp.accountId) || {}).name || '';
    rows.push(['Expense', exp.id, exp.name, exp.amount, exp.frequency,
      exp.timesPerYear || '', exp.isCoL ? '1' : '0', accName].map(escapeCsv).join(','));
  });

  // Accounts
  state.accounts.forEach(acc => {
    rows.push(['Account', acc.id, acc.name, acc.owner, acc.colour, '', ''].map(escapeCsv).join(','));
  });

  // Buffer goal
  const bg = state.bufferGoal;
  rows.push(['BufferGoal', 'goal', bg.multiplier, bg.unit, bg.savedSoFar, bg.saveByDate, bg.weeklyNeeded].map(escapeCsv).join(','));

  const csv  = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
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
      const newState = defaultState();
      newState.people        = [];
      newState.incomeSources = [];
      newState.expenses      = [];
      newState.accounts      = [];
      const accountNameToId  = {};

      // First pass: build people + accounts + buffer goal
      for (let i = 1; i < lines.length; i++) {
        const cols    = parseCsvRow(lines[i]);
        const section = cols[0];
        if (section === 'Person')      { newState.people.push({ id: cols[1], name: cols[2] }); }
        if (section === 'Account')     { newState.accounts.push({ id: cols[1], name: cols[2], owner: cols[3], colour: cols[4] }); accountNameToId[cols[2]] = cols[1]; }
        if (section === 'BufferGoal')  { newState.bufferGoal = { multiplier: cols[2], unit: cols[3], savedSoFar: cols[4], saveByDate: cols[5], weeklyNeeded: cols[6] }; }
      }

      if (newState.people.length === 0) newState.people = [{ id: 'p_default', name: 'Me' }];
      if (newState.accounts.length === 0) newState.accounts = [];

      // Second pass: income + expenses
      for (let i = 1; i < lines.length; i++) {
        const cols    = parseCsvRow(lines[i]);
        const section = cols[0];
        if (section === 'Income') {
          newState.incomeSources.push({ id: cols[1], personId: cols[2], name: cols[3], amount: parseFloat(cols[4]) || 0, frequency: cols[5] || 'monthly', timesPerYear: cols[6] || '' });
        }
        if (section === 'Expense') {
          const accId = accountNameToId[cols[7]] || '';
          newState.expenses.push({ id: cols[1], name: cols[2], amount: parseFloat(cols[3]) || 0, frequency: cols[4] || 'weekly', timesPerYear: cols[5] || '', isCoL: cols[6] === '1', accountId: accId, awareness: {} });
        }
      }

      state = newState;
      saveState();
      render();
      // Sync buffer goal inputs
      document.getElementById('bg-multiplier').value    = state.bufferGoal.multiplier || '3';
      document.getElementById('bg-save-by').value       = state.bufferGoal.saveByDate || '';
      document.getElementById('bg-weekly-needed').value = state.bufferGoal.weeklyNeeded || '';
      document.getElementById('bg-saved-so-far').value  = state.bufferGoal.savedSoFar || '';
    } catch (err) {
      alert('Could not read CSV. Please use a file exported from this app.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// =============================================================
// PWA: SERVICE WORKER & INSTALL PROMPT
// =============================================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('btn-install').style.display = '';
});

document.getElementById('btn-install').addEventListener('click', () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(() => {
    deferredInstallPrompt = null;
    document.getElementById('btn-install').style.display = 'none';
  });
});

window.addEventListener('appinstalled', () => {
  document.getElementById('btn-install').style.display = 'none';
  deferredInstallPrompt = null;
});

// Close modal on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    pendingDeleteAccountId = null;
    document.getElementById('reassign-modal').style.display = 'none';
  }
});

// =============================================================
// INIT — sync inputs from persisted state then render
// =============================================================
document.getElementById('bg-multiplier').value    = state.bufferGoal.multiplier || '3';
document.getElementById('bg-save-by').value       = state.bufferGoal.saveByDate || '';
document.getElementById('bg-weekly-needed').value = state.bufferGoal.weeklyNeeded || '';
document.getElementById('bg-saved-so-far').value  = state.bufferGoal.savedSoFar || '';

render();
