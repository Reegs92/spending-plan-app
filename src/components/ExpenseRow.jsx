import { useState } from 'react';
import { toWeekly, fromWeekly, fmt } from '../utils/frequency';
import SpendAwarenessHelper from './SpendAwarenessHelper';

const FREQ_KEYS = ['weekly', 'fortnightly', 'monthly', 'yearly', 'custom'];
const FREQ_LABELS = { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly', yearly: 'Yearly', custom: 'Custom' };

export default function ExpenseRow({ expense, accounts, onUpdate, onDelete }) {
  const [helperOpen, setHelperOpen] = useState(false);

  const amounts = expense.amounts || {};
  const customTimes = expense.timesPerYear || '';

  // Derive all frequency values from whichever was last edited
  // We store amounts[freq] as entered values, but maintain a canonical weekly
  function getWeekly() {
    // Use the stored weekly if present, otherwise try to derive from another freq
    for (const f of FREQ_KEYS) {
      if (amounts[f] !== '' && amounts[f] !== undefined && amounts[f] !== null) {
        return toWeekly(amounts[f], f, parseFloat(customTimes) || 0);
      }
    }
    return 0;
  }

  const weeklyValue = getWeekly();

  function handleAmountChange(freq, value) {
    // When user edits one cell, clear all others and set only that one
    const newAmounts = {};
    FREQ_KEYS.forEach(f => { newAmounts[f] = ''; });
    newAmounts[freq] = value;
    onUpdate({ amounts: newAmounts });
  }

  function getDisplayValue(freq) {
    if (amounts[freq] !== '' && amounts[freq] !== undefined && amounts[freq] !== null) {
      return amounts[freq];
    }
    if (weeklyValue === 0) return '';
    const derived = fromWeekly(weeklyValue, freq, parseFloat(customTimes) || 0);
    return derived ? parseFloat(derived.toFixed(4)) : '';
  }

  function handleUseWeekly(w) {
    const newAmounts = {};
    FREQ_KEYS.forEach(f => { newAmounts[f] = ''; });
    newAmounts['weekly'] = parseFloat(w.toFixed(2));
    onUpdate({ amounts: newAmounts });
    setHelperOpen(false);
  }

  const hasAccount = accounts.length > 0;

  return (
    <>
      <tr className={`expense-row${expense.isCoL ? ' col-row' : ''}`}>
        <td>
          <input
            type="text"
            placeholder="Expense name"
            value={expense.name}
            onChange={e => onUpdate({ name: e.target.value })}
            className="expense-name-input"
          />
        </td>
        {FREQ_KEYS.map(freq => (
          <td key={freq}>
            {freq === 'custom' ? (
              <div className="custom-cell">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="—"
                  value={getDisplayValue(freq)}
                  onChange={e => handleAmountChange(freq, e.target.value)}
                  className="num-input sm"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="×/yr"
                  value={customTimes}
                  onChange={e => onUpdate({ timesPerYear: e.target.value })}
                  className="num-input xs"
                  title="Times per year"
                />
              </div>
            ) : (
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="—"
                value={getDisplayValue(freq)}
                onChange={e => handleAmountChange(freq, e.target.value)}
                className="num-input sm"
              />
            )}
          </td>
        ))}
        <td>
          {hasAccount ? (
            <select
              value={expense.accountId || ''}
              onChange={e => onUpdate({ accountId: e.target.value })}
            >
              <option value="">— none —</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          ) : (
            <span className="muted">No accounts</span>
          )}
        </td>
        <td className="col-center">
          <input
            type="checkbox"
            checked={!!expense.isCoL}
            onChange={e => onUpdate({ isCoL: e.target.checked })}
            title="Cost of Living"
          />
        </td>
        <td>
          <div className="row-actions">
            <button
              className={`btn-icon${helperOpen ? ' active' : ''}`}
              onClick={() => setHelperOpen(o => !o)}
              title="Spend Awareness Helper"
            >
              ≈
            </button>
            <button
              className="btn-icon btn-danger"
              onClick={onDelete}
              title="Delete expense"
            >
              ×
            </button>
          </div>
        </td>
      </tr>
      {helperOpen && (
        <tr className="helper-row">
          <td colSpan={9}>
            <SpendAwarenessHelper onUse={handleUseWeekly} />
          </td>
        </tr>
      )}
    </>
  );
}
