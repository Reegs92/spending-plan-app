import { useState } from 'react';
import { toWeekly, fromWeekly } from '../utils/frequency';
import SpendAwarenessHelper from './SpendAwarenessHelper';

export default function ExpenseRow({ expense, accounts, onUpdate, onRemove }) {
  const [helperOpen, setHelperOpen] = useState(false);

  const weekly = toWeekly(expense.amount, expense.frequency, expense.timesPerYear);

  function handleFreqChange(freq, val) {
    const newWeekly = toWeekly(val, freq, expense.timesPerYear);
    onUpdate(expense.id, {
      amount: val,
      frequency: freq,
      weekly: newWeekly,
    });
  }

  function handleColumnInput(freq, val) {
    const newWeekly = toWeekly(val, freq, expense.timesPerYear);
    onUpdate(expense.id, {
      amount: val,
      frequency: freq,
      weekly: newWeekly,
    });
  }

  function handleTimesPerYear(val) {
    const tpy = parseFloat(val) || 1;
    onUpdate(expense.id, { timesPerYear: tpy });
  }

  function handleUseAwareness(weeklyVal) {
    onUpdate(expense.id, {
      amount: weeklyVal.toFixed(2),
      frequency: 'weekly',
      weekly: weeklyVal,
    });
    setHelperOpen(false);
  }

  const fmtCol = (freq) => {
    const val = fromWeekly(weekly, freq, expense.timesPerYear);
    return isNaN(val) ? '' : val.toFixed(2);
  };

  return (
    <div className={`expense-row${expense.isCoL ? ' col-row' : ''}`}>
      <div className="expense-main">
        <input
          className="input-text expense-name"
          value={expense.name}
          onChange={(e) => onUpdate(expense.id, { name: e.target.value })}
          placeholder="Expense name"
        />

        <div className="freq-grid">
          <label className="freq-label">
            Weekly
            <input
              className="input-number"
              type="number"
              min="0"
              step="0.01"
              value={expense.frequency === 'weekly' ? expense.amount : fmtCol('weekly')}
              onChange={(e) => handleColumnInput('weekly', e.target.value)}
            />
          </label>
          <label className="freq-label">
            Fortnightly
            <input
              className="input-number"
              type="number"
              min="0"
              step="0.01"
              value={expense.frequency === 'fortnightly' ? expense.amount : fmtCol('fortnightly')}
              onChange={(e) => handleColumnInput('fortnightly', e.target.value)}
            />
          </label>
          <label className="freq-label">
            Monthly
            <input
              className="input-number"
              type="number"
              min="0"
              step="0.01"
              value={expense.frequency === 'monthly' ? expense.amount : fmtCol('monthly')}
              onChange={(e) => handleColumnInput('monthly', e.target.value)}
            />
          </label>
          <label className="freq-label">
            Yearly
            <input
              className="input-number"
              type="number"
              min="0"
              step="0.01"
              value={expense.frequency === 'yearly' ? expense.amount : fmtCol('yearly')}
              onChange={(e) => handleColumnInput('yearly', e.target.value)}
            />
          </label>
          <label className="freq-label">
            Custom ($)
            <input
              className="input-number"
              type="number"
              min="0"
              step="0.01"
              value={expense.frequency === 'custom' ? expense.amount : fmtCol('custom')}
              onChange={(e) => handleColumnInput('custom', e.target.value)}
            />
          </label>
          <label className="freq-label">
            Times/yr
            <input
              className="input-number"
              type="number"
              min="1"
              step="1"
              value={expense.timesPerYear}
              onChange={(e) => handleTimesPerYear(e.target.value)}
            />
          </label>
        </div>

        <div className="expense-controls">
          <select
            className="input-select"
            value={expense.accountId || ''}
            onChange={(e) => onUpdate(expense.id, { accountId: e.target.value || null })}
          >
            <option value="">No account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <label className="col-check">
            <input
              type="checkbox"
              checked={expense.isCoL}
              onChange={(e) => onUpdate(expense.id, { isCoL: e.target.checked })}
            />
            CoL
          </label>

          <button
            className="btn-ghost btn-sm"
            onClick={() => setHelperOpen(!helperOpen)}
            title="Spend Awareness Helper"
          >
            {helperOpen ? '▾' : '▸'} Awareness
          </button>

          <button className="btn-danger btn-sm" onClick={() => onRemove(expense.id)}>
            Remove
          </button>
        </div>
      </div>

      {helperOpen && (
        <SpendAwarenessHelper
          onUse={handleUseAwareness}
          onClose={() => setHelperOpen(false)}
        />
      )}
    </div>
  );
}
