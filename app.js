// ============================================================
// UTILS
// ============================================================

function uid() { return Math.random().toString(36).slice(2, 10); }

function toWeekly(amount, frequency, timesPerYear) {
  const n = parseFloat(amount) || 0;
  const t = parseFloat(timesPerYear) || 1;
  switch (frequency) {
    case 'weekly':      return n;
    case 'fortnightly': return n / 2;
    case 'monthly':     return n / (52 / 12);
    case 'yearly':      return n / 52;
    case 'custom':      return t > 0 ? (n * t) / 52 : 0;
    default:            return n;
  }
}

function fromWeekly(weekly, frequency, timesPerYear) {
  const w = parseFloat(weekly) || 0;
  const t = parseFloat(timesPerYear) || 1;
  switch (frequency) {
    case 'weekly':      return w;
    case 'fortnightly': return w * 2;
    case 'monthly':     return w * (52 / 12);
    case 'yearly':      return w * 52;
    case 'custom':      return t > 0 ? (w * 52) / t : 0;
    default:            return w;
  }
}

function fmt(n) { return '$' + Math.abs(parseFloat(n) || 0).toFixed(2); }

function fmtNum(n) {
  const v = parseFloat(n) || 0;
  return v === 0 ? '' : v.toFixed(2);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// STATE
// ============================================================

const STORAGE_KEY = 'spending-plan-v3';

let state = {
  people: [{ id: uid(), name: 'Me' }],
  incomeSources: [],
  expenses: [],
  accounts: [],
  bufferGoal: { multiplier: 3, unit: 'weeks', savedSoFar: '', weeklyNeeded: '', saveByDate: '' }
};

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) state = saved;
  } catch (e) {}
}

// UI-only state (not persisted)
const expandedAwareness = new Set();

// ============================================================
// RENDER — PEOPLE
// ============================================================

function renderPeople() {
  const el = document.getElementById('people-section');
  const rows = state.people.map(function(p) {
    return '<div class="person-row">' +
      '<input class="input" value="' + esc(p.name) + '" onchange="updatePerson(\'' + p.id + '\', this.value)" placeholder="Name">' +
      '<button class="btn btn-danger" onclick="removePerson(\'' + p.id + '\')" ' + (state.people.length <= 1 ? 'disabled' : '') + '>Remove</button>' +
      '</div>';
  }).join('');

  el.innerHTML =
    '<div class="card">' +
      '<div class="section-header">' +
        '<h2 class="section-title">People</h2>' +
        '<button class="btn btn-primary" onclick="addPerson()">+ Add Person</button>' +
      '</div>' +
      '<div class="people-list">' + rows + '</div>' +
    '</div>';
}

// ============================================================
// RENDER — INCOME
// ============================================================

function renderIncome() {
  var el = document.getElementById('income-section');

  var rows = state.incomeSources.map(function(s) {
    var weekly = toWeekly(s.amount, s.frequency, s.timesPerYear);
    var personOpts = state.people.map(function(p) {
      return '<option value="' + p.id + '"' + (s.personId === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    }).join('');
    var freqs = ['weekly', 'fortnightly', 'monthly', 'yearly', 'custom'];
    var freqOpts = freqs.map(function(f) {
      return '<option value="' + f + '"' + (s.frequency === f ? ' selected' : '') + '>' + f.charAt(0).toUpperCase() + f.slice(1) + '</option>';
    }).join('');
    var customInput = s.frequency === 'custom'
      ? '<input class="input input-sm" type="number" min="1" value="' + (s.timesPerYear || 1) + '" onchange="updateIncome(\'' + s.id + '\', \'timesPerYear\', parseFloat(this.value)||1)" placeholder="x/yr">'
      : '';
    return '<div class="income-row">' +
      '<select class="input" onchange="updateIncome(\'' + s.id + '\', \'personId\', this.value)">' + personOpts + '</select>' +
      '<input class="input" value="' + esc(s.name) + '" onchange="updateIncome(\'' + s.id + '\', \'name\', this.value)" placeholder="Income name">' +
      '<input class="input" type="number" min="0" step="0.01" value="' + (s.amount || '') + '" onchange="updateIncome(\'' + s.id + '\', \'amount\', this.value)" placeholder="Amount">' +
      '<select class="input" onchange="updateIncome(\'' + s.id + '\', \'frequency\', this.value)">' + freqOpts + '</select>' +
      customInput +
      '<span class="income-weekly">' + fmt(weekly) + '/wk</span>' +
      '<button class="btn btn-danger" onclick="removeIncome(\'' + s.id + '\')">&#x2715;</button>' +
      '</div>';
  }).join('');

  var totalsHtml = '';
  if (state.incomeSources.length > 0) {
    var combined = state.incomeSources.reduce(function(sum, s) { return sum + toWeekly(s.amount, s.frequency, s.timesPerYear); }, 0);
    var perPerson = state.people.map(function(p) {
      var w = state.incomeSources.filter(function(s) { return s.personId === p.id; })
        .reduce(function(sum, s) { return sum + toWeekly(s.amount, s.frequency, s.timesPerYear); }, 0);
      return w > 0 ? '<span class="income-subtotal">' + esc(p.name) + ': <strong>' + fmt(w) + '/wk</strong></span>' : '';
    }).join('');
    totalsHtml = '<div class="income-totals">' + perPerson + '<span class="income-combined">Combined: <strong>' + fmt(combined) + '/wk</strong></span></div>';
  }

  el.innerHTML =
    '<div class="card">' +
      '<div class="section-header">' +
        '<h2 class="section-title">Income</h2>' +
        '<button class="btn btn-primary" onclick="addIncome()">+ Add Income</button>' +
      '</div>' +
      '<div class="income-list">' + (rows || '<p class="empty-state">No income sources yet.</p>') + '</div>' +
      totalsHtml +
    '</div>';
}

// ============================================================
// RENDER — EXPENSES
// ============================================================

function renderAwarenessHelper(expenseId) {
  return '<div class="awareness-helper">' +
    '<div class="awareness-title">Spend Awareness</div>' +
    '<div class="awareness-inputs">' +
      '<label>Times per week<input class="input" type="number" min="0" step="0.1" id="aw-times-' + expenseId + '" oninput="calcAwareness(\'' + expenseId + '\')" placeholder="e.g. 3"></label>' +
      '<label>Avg $ per occasion<input class="input" type="number" min="0" step="0.01" id="aw-avg-' + expenseId + '" oninput="calcAwareness(\'' + expenseId + '\')" placeholder="e.g. 6.50"></label>' +
    '</div>' +
    '<div id="aw-result-' + expenseId + '" class="awareness-results"></div>' +
  '</div>';
}

function renderExpenses() {
  var el = document.getElementById('expenses-section');

  var rows = state.expenses.map(function(e) {
    var weekly = toWeekly(e.amount, e.frequency, e.timesPerYear);
    var wVal = e.frequency === 'weekly'      ? (e.amount || '') : fmtNum(fromWeekly(weekly, 'weekly'));
    var fVal = e.frequency === 'fortnightly' ? (e.amount || '') : fmtNum(fromWeekly(weekly, 'fortnightly'));
    var mVal = e.frequency === 'monthly'     ? (e.amount || '') : fmtNum(fromWeekly(weekly, 'monthly'));
    var yVal = e.frequency === 'yearly'      ? (e.amount || '') : fmtNum(fromWeekly(weekly, 'yearly'));
    var cVal = e.frequency === 'custom'      ? (e.amount || '') : '';

    var acctOpts = '<option value="">— None —</option>' + state.accounts.map(function(a) {
      return '<option value="' + a.id + '"' + (e.accountId === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>';
    }).join('');

    var isOpen = expandedAwareness.has(e.id);

    return '<div class="expense-row' + (e.isCoL ? ' col-row' : '') + '">' +
      '<div class="expense-row-main">' +
        '<input class="input expense-name" value="' + esc(e.name) + '" onchange="updateExpense(\'' + e.id + '\', \'name\', this.value)" placeholder="Expense name">' +
        '<div class="freq-inputs">' +
          '<label class="freq-label"><span>Weekly</span><input class="input" type="number" min="0" step="0.01" value="' + wVal + '" onchange="updateExpenseFreq(\'' + e.id + '\', \'weekly\', this.value)" placeholder="0.00"></label>' +
          '<label class="freq-label"><span>Fortnightly</span><input class="input" type="number" min="0" step="0.01" value="' + fVal + '" onchange="updateExpenseFreq(\'' + e.id + '\', \'fortnightly\', this.value)" placeholder="0.00"></label>' +
          '<label class="freq-label"><span>Monthly</span><input class="input" type="number" min="0" step="0.01" value="' + mVal + '" onchange="updateExpenseFreq(\'' + e.id + '\', \'monthly\', this.value)" placeholder="0.00"></label>' +
          '<label class="freq-label"><span>Yearly</span><input class="input" type="number" min="0" step="0.01" value="' + yVal + '" onchange="updateExpenseFreq(\'' + e.id + '\', \'yearly\', this.value)" placeholder="0.00"></label>' +
          '<label class="freq-label"><span>Custom ($)</span><input class="input" type="number" min="0" step="0.01" value="' + cVal + '" onchange="updateExpenseFreq(\'' + e.id + '\', \'custom\', this.value)" placeholder="0.00"></label>' +
          '<label class="freq-label"><span>Times/yr</span><input class="input" type="number" min="1" value="' + (e.timesPerYear || '') + '" onchange="updateExpenseTimesPerYear(\'' + e.id + '\', this.value)" placeholder="e.g. 12"></label>' +
        '</div>' +
        '<div class="expense-row-controls">' +
          '<select class="input account-select" onchange="updateExpense(\'' + e.id + '\', \'accountId\', this.value || null)">' + acctOpts + '</select>' +
          '<label class="col-label"><input type="checkbox"' + (e.isCoL ? ' checked' : '') + ' onchange="updateExpense(\'' + e.id + '\', \'isCoL\', this.checked)"> CoL</label>' +
          '<button class="btn btn-icon" onclick="toggleAwareness(\'' + e.id + '\')" title="Spend Awareness Helper">' + (isOpen ? '&#9662;' : '&#9656;') + '</button>' +
          '<button class="btn btn-danger btn-sm" onclick="removeExpense(\'' + e.id + '\')">&#x2715;</button>' +
        '</div>' +
      '</div>' +
      (isOpen ? renderAwarenessHelper(e.id) : '') +
    '</div>';
  }).join('');

  var total = state.expenses.reduce(function(sum, e) { return sum + toWeekly(e.amount, e.frequency, e.timesPerYear); }, 0);

  el.innerHTML =
    '<div class="card">' +
      '<div class="section-header">' +
        '<h2 class="section-title">Expenses</h2>' +
        '<button class="btn btn-primary" onclick="addExpense()">+ Add Expense</button>' +
      '</div>' +
      '<div class="expense-list">' + (rows || '<p class="empty-state">No expenses yet.</p>') + '</div>' +
      (state.expenses.length > 0 ? '<div class="section-total">Total expenses: <strong>' + fmt(total) + '/week</strong></div>' : '') +
    '</div>';
}

function calcAwareness(expenseId) {
  var timesEl  = document.getElementById('aw-times-' + expenseId);
  var avgEl    = document.getElementById('aw-avg-'   + expenseId);
  var resultEl = document.getElementById('aw-result-' + expenseId);
  if (!timesEl || !avgEl || !resultEl) return;
  var times  = parseFloat(timesEl.value) || 0;
  var avg    = parseFloat(avgEl.value)   || 0;
  var weekly = times * avg;
  if (weekly <= 0) { resultEl.innerHTML = ''; return; }
  var monthly = weekly * (52 / 12);
  var yearly  = weekly * 52;
  resultEl.innerHTML =
    '<span>' + fmt(weekly) + '/week</span>' +
    '<span>' + fmt(monthly) + '/month</span>' +
    '<span>' + fmt(yearly) + '/year</span>' +
    '<button class="btn btn-primary btn-sm" onclick="useAwareness(\'' + expenseId + '\', ' + weekly + ')">Use this &#x2192;</button>';
}

function useAwareness(expenseId, weeklyAmount) {
  expandedAwareness.delete(expenseId);
  updateExpenseFreq(expenseId, 'weekly', weeklyAmount);
}

function toggleAwareness(expenseId) {
  if (expandedAwareness.has(expenseId)) {
    expandedAwareness.delete(expenseId);
  } else {
    expandedAwareness.add(expenseId);
  }
  renderExpenses();
}

// ============================================================
// RENDER — ACCOUNTS
// ============================================================

var COLOURS = ['#4F86F7', '#F97316', '#22C55E', '#A855F7', '#EF4444', '#EAB308'];

function renderAccounts() {
  var el = document.getElementById('accounts-section');

  var cards = state.accounts.map(function(acc) {
    var allocated = state.expenses
      .filter(function(e) { return e.accountId === acc.id; })
      .reduce(function(sum, e) { return sum + toWeekly(e.amount, e.frequency, e.timesPerYear); }, 0);

    var ownerPerson = state.people.find(function(p) { return p.id === acc.owner; });
    var ownerLabel  = acc.owner === 'joint' ? 'Joint' : (ownerPerson ? ownerPerson.name : 'Joint');

    var ownerOpts = '<option value="joint"' + (acc.owner === 'joint' ? ' selected' : '') + '>Joint</option>' +
      state.people.map(function(p) {
        return '<option value="' + p.id + '"' + (acc.owner === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>';
      }).join('');

    var swatches = COLOURS.map(function(c) {
      return '<button class="colour-swatch' + (acc.colour === c ? ' active' : '') + '" style="background:' + c + '" onclick="updateAccount(\'' + acc.id + '\', \'colour\', \'' + c + '\')" title="' + c + '"></button>';
    }).join('');

    return '<div class="account-card" style="border-left: 4px solid ' + acc.colour + '">' +
      '<div class="account-card-top">' +
        '<input class="input account-name-input" value="' + esc(acc.name) + '" onchange="updateAccount(\'' + acc.id + '\', \'name\', this.value)" placeholder="Account name">' +
        '<select class="input" onchange="updateAccount(\'' + acc.id + '\', \'owner\', this.value)">' + ownerOpts + '</select>' +
        '<button class="btn btn-danger btn-sm" onclick="removeAccount(\'' + acc.id + '\')">&#x2715;</button>' +
      '</div>' +
      '<div class="account-card-bottom">' +
        '<div class="colour-swatches">' + swatches + '</div>' +
        '<div class="account-meta">' +
          '<span class="owner-pill">' + esc(ownerLabel) + '</span>' +
          '<span class="allocated-label">Allocated: <strong>' + fmt(allocated) + '/wk</strong></span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="card">' +
      '<div class="section-header">' +
        '<h2 class="section-title">Accounts</h2>' +
        '<button class="btn btn-primary" onclick="addAccount()">+ Add Account</button>' +
      '</div>' +
      (cards || '<p class="empty-state">No accounts yet.</p>') +
    '</div>';
}

// ============================================================
// RENDER — BUFFER GOAL
// ============================================================

function renderBufferGoal() {
  var el = document.getElementById('buffer-section');
  var bg = state.bufferGoal;

  var colWeekly  = state.expenses.filter(function(e) { return e.isCoL; })
    .reduce(function(sum, e) { return sum + toWeekly(e.amount, e.frequency, e.timesPerYear); }, 0);
  var colMonthly = colWeekly * (52 / 12);

  var multiplier   = bg.multiplier != null ? bg.multiplier : 3;
  var unit         = bg.unit || 'weeks';
  var bufferTarget = unit === 'weeks' ? colWeekly * multiplier : colMonthly * multiplier;
  var savedSoFar   = parseFloat(bg.savedSoFar) || 0;
  var progress     = bufferTarget > 0 ? Math.min(100, (savedSoFar / bufferTarget) * 100) : 0;

  var summaryText = (savedSoFar > 0 && bufferTarget > 0)
    ? fmt(savedSoFar) + ' saved of ' + fmt(bufferTarget) + ' target (' + progress.toFixed(0) + '%)'
    : 'Enter your saved amount to track progress.';

  el.innerHTML =
    '<div class="card">' +
      '<div class="section-header">' +
        '<h2 class="section-title">Emergency Buffer Goal</h2>' +
      '</div>' +
      '<div class="buffer-col-info">Cost of living: <strong>' + fmt(colWeekly) + '/week &middot; ' + fmt(colMonthly) + '/month</strong></div>' +
      '<div class="buffer-controls">' +
        '<label>Multiplier<input class="input" type="number" min="1" step="0.5" value="' + multiplier + '" onchange="updateBufferGoal(\'multiplier\', parseFloat(this.value)||1)"></label>' +
        '<div class="unit-toggle">' +
          '<button class="btn ' + (unit === 'weeks'  ? 'btn-primary' : 'btn-outline') + '" onclick="updateBufferGoal(\'unit\',\'weeks\')">Weeks</button>' +
          '<button class="btn ' + (unit === 'months' ? 'btn-primary' : 'btn-outline') + '" onclick="updateBufferGoal(\'unit\',\'months\')">Months</button>' +
        '</div>' +
      '</div>' +
      '<div class="buffer-target">Buffer target: <strong>' + fmt(bufferTarget) + '</strong><span class="buffer-subtitle">(' + multiplier + ' ' + unit + ' of CoL)</span></div>' +
      '<div class="buffer-savings">' +
        '<label>Save by<input class="input" type="date" value="' + (bg.saveByDate || '') + '" onchange="updateBufferSaveBy(this.value)"></label>' +
        '<label>Weekly savings needed<input class="input" type="number" min="0" step="0.01" value="' + (bg.weeklyNeeded || '') + '" onchange="updateBufferWeeklyNeeded(this.value)" placeholder="0.00"></label>' +
        '<label>Saved so far ($)<input class="input" type="number" min="0" step="0.01" value="' + (bg.savedSoFar || '') + '" onchange="updateBufferGoal(\'savedSoFar\', this.value)" placeholder="0.00"></label>' +
      '</div>' +
      '<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + progress + '%"></div></div>' +
      '<p class="buffer-summary">' + summaryText + '</p>' +
    '</div>';
}

// ============================================================
// RENDER — SUMMARY BAR
// ============================================================

function renderSummaryBar() {
  var el = document.getElementById('summary-bar');
  var totalIncome   = state.incomeSources.reduce(function(sum, s) { return sum + toWeekly(s.amount, s.frequency, s.timesPerYear); }, 0);
  var totalExpenses = state.expenses.reduce(function(sum, e) { return sum + toWeekly(e.amount, e.frequency, e.timesPerYear); }, 0);
  var diff      = totalIncome - totalExpenses;
  var isSurplus = diff >= 0;

  var chips = state.accounts.map(function(acc) {
    var allocated = state.expenses
      .filter(function(e) { return e.accountId === acc.id; })
      .reduce(function(sum, e) { return sum + toWeekly(e.amount, e.frequency, e.timesPerYear); }, 0);
    return '<span class="account-chip"><span class="colour-dot" style="background:' + acc.colour + '"></span>' + esc(acc.name) + ' ' + fmt(allocated) + '/wk</span>';
  }).join('');

  el.innerHTML =
    '<div class="summary-bar">' +
      '<div class="summary-main">' +
        '<span class="summary-item">Income: <strong>' + fmt(totalIncome) + '/wk</strong></span>' +
        '<span class="summary-item">Expenses: <strong>' + fmt(totalExpenses) + '/wk</strong></span>' +
        '<span class="summary-item ' + (isSurplus ? 'surplus' : 'deficit') + '">' + (isSurplus ? 'Surplus' : 'Deficit') + ': <strong>' + fmt(Math.abs(diff)) + '/wk</strong></span>' +
      '</div>' +
      (chips ? '<div class="account-chips">' + chips + '</div>' : '') +
    '</div>';
}

// ============================================================
// RENDER ALL
// ============================================================

function renderAll() {
  renderPeople();
  renderIncome();
  renderExpenses();
  renderAccounts();
  renderBufferGoal();
  renderSummaryBar();
}

// ============================================================
// ACTIONS — PEOPLE
// ============================================================

function addPerson() {
  state.people.push({ id: uid(), name: 'Person ' + (state.people.length + 1) });
  saveState();
  renderPeople();
  renderIncome();
}

function updatePerson(id, name) {
  var p = state.people.find(function(p) { return p.id === id; });
  if (p) p.name = name;
  saveState();
  renderPeople();
  renderIncome();
  renderAccounts();
  renderSummaryBar();
}

function removePerson(id) {
  if (state.people.length <= 1) return;
  state.people        = state.people.filter(function(p) { return p.id !== id; });
  state.incomeSources = state.incomeSources.filter(function(s) { return s.personId !== id; });
  state.accounts      = state.accounts.map(function(a) {
    return a.owner === id ? Object.assign({}, a, { owner: 'joint' }) : a;
  });
  saveState();
  renderAll();
}

// ============================================================
// ACTIONS — INCOME
// ============================================================

function addIncome() {
  state.incomeSources.push({ id: uid(), personId: state.people[0].id, name: '', amount: '', frequency: 'weekly', timesPerYear: 1 });
  saveState();
  renderIncome();
  renderSummaryBar();
}

function updateIncome(id, field, value) {
  var s = state.incomeSources.find(function(s) { return s.id === id; });
  if (s) s[field] = value;
  saveState();
  renderIncome();
  renderSummaryBar();
}

function removeIncome(id) {
  state.incomeSources = state.incomeSources.filter(function(s) { return s.id !== id; });
  saveState();
  renderIncome();
  renderSummaryBar();
}

// ============================================================
// ACTIONS — EXPENSES
// ============================================================

function addExpense() {
  state.expenses.push({ id: uid(), name: '', amount: '', frequency: 'weekly', timesPerYear: 1, accountId: null, isCoL: false });
  saveState();
  renderExpenses();
  renderAccounts();
  renderBufferGoal();
  renderSummaryBar();
}

function updateExpense(id, field, value) {
  var e = state.expenses.find(function(e) { return e.id === id; });
  if (e) e[field] = value;
  saveState();
  renderExpenses();
  renderAccounts();
  renderBufferGoal();
  renderSummaryBar();
}

function updateExpenseFreq(id, frequency, value) {
  var e = state.expenses.find(function(e) { return e.id === id; });
  if (!e) return;
  e.amount    = parseFloat(value) || 0;
  e.frequency = frequency;
  saveState();
  renderExpenses();
  renderAccounts();
  renderBufferGoal();
  renderSummaryBar();
}

function updateExpenseTimesPerYear(id, value) {
  var e = state.expenses.find(function(e) { return e.id === id; });
  if (!e) return;
  e.timesPerYear = parseFloat(value) || 1;
  saveState();
  if (e.frequency === 'custom') {
    renderExpenses();
    renderAccounts();
    renderBufferGoal();
    renderSummaryBar();
  }
}

function removeExpense(id) {
  expandedAwareness.delete(id);
  state.expenses = state.expenses.filter(function(e) { return e.id !== id; });
  saveState();
  renderExpenses();
  renderAccounts();
  renderBufferGoal();
  renderSummaryBar();
}

// ============================================================
// ACTIONS — ACCOUNTS
// ============================================================

function addAccount() {
  state.accounts.push({ id: uid(), name: '', owner: 'joint', colour: '#4F86F7' });
  saveState();
  renderAccounts();
  renderExpenses();
  renderSummaryBar();
}

function updateAccount(id, field, value) {
  var a = state.accounts.find(function(a) { return a.id === id; });
  if (a) a[field] = value;
  saveState();
  renderAccounts();
  renderExpenses();
  renderSummaryBar();
}

function removeAccount(id) {
  var hasExpenses = state.expenses.some(function(e) { return e.accountId === id; });
  if (hasExpenses && !confirm('This account has expenses assigned. Remove anyway? (expenses will be unassigned)')) return;
  state.accounts = state.accounts.filter(function(a) { return a.id !== id; });
  state.expenses = state.expenses.map(function(e) {
    return e.accountId === id ? Object.assign({}, e, { accountId: null }) : e;
  });
  saveState();
  renderAll();
}

// ============================================================
// ACTIONS — BUFFER GOAL
// ============================================================

function getBufferTarget() {
  var bg        = state.bufferGoal;
  var colWeekly = state.expenses.filter(function(e) { return e.isCoL; })
    .reduce(function(sum, e) { return sum + toWeekly(e.amount, e.frequency, e.timesPerYear); }, 0);
  var colMonthly = colWeekly * (52 / 12);
  var multiplier = bg.multiplier != null ? bg.multiplier : 3;
  return (bg.unit === 'weeks' ? colWeekly : colMonthly) * multiplier;
}

function updateBufferGoal(field, value) {
  state.bufferGoal[field] = value;
  saveState();
  renderBufferGoal();
}

function updateBufferSaveBy(val) {
  var bg = state.bufferGoal;
  bg.saveByDate = val;
  if (val) {
    var target     = getBufferTarget();
    var savedSoFar = parseFloat(bg.savedSoFar) || 0;
    var weeks      = Math.max(1, (new Date(val) - new Date()) / (1000 * 60 * 60 * 24 * 7));
    if (target > 0) bg.weeklyNeeded = Math.max(0, (target - savedSoFar) / weeks).toFixed(2);
  }
  saveState();
  renderBufferGoal();
}

function updateBufferWeeklyNeeded(val) {
  var bg = state.bufferGoal;
  bg.weeklyNeeded = val;
  var w = parseFloat(val) || 0;
  if (w > 0) {
    var target     = getBufferTarget();
    var savedSoFar = parseFloat(bg.savedSoFar) || 0;
    if (target > 0) {
      var weeksNeeded = (target - savedSoFar) / w;
      var date = new Date();
      date.setDate(date.getDate() + Math.ceil(weeksNeeded * 7));
      bg.saveByDate = date.toISOString().slice(0, 10);
    }
  }
  saveState();
  renderBufferGoal();
}

// ============================================================
// INIT
// ============================================================

loadState();
renderAll();
