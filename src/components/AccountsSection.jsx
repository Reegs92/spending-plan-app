import { useState } from 'react';
import { toWeekly, fmt } from '../utils/frequency';

const SWATCHES = ['#4F86F7', '#F97316', '#22C55E', '#A855F7', '#EF4444', '#EAB308'];

export default function AccountsSection({ accounts, people, expenses, onAdd, onUpdate, onRemove }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  function getWeeklyAllocation(accountId) {
    return expenses
      .filter((e) => e.accountId === accountId)
      .reduce((sum, e) => sum + toWeekly(e.amount, e.frequency, e.timesPerYear), 0);
  }

  function handleRemove(accountId) {
    const used = expenses.some((e) => e.accountId === accountId);
    if (used) {
      setConfirmDelete(accountId);
    } else {
      onRemove(accountId);
    }
  }

  function confirmRemove(accountId) {
    onRemove(accountId);
    setConfirmDelete(null);
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2>Accounts</h2>
        <button className="btn-primary" onClick={onAdd}>+ Add Account</button>
      </div>

      {accounts.length === 0 && (
        <p className="empty-hint">No accounts yet. Add one above.</p>
      )}

      <div className="accounts-grid">
        {accounts.map((acc) => {
          const person = people.find((p) => p.id === acc.ownerId);
          const weeklyAmt = getWeeklyAllocation(acc.id);

          return (
            <div
              key={acc.id}
              className="account-card"
              style={{ borderLeftColor: acc.colour }}
            >
              <div className="account-card-header">
                <input
                  className="input-text"
                  value={acc.name}
                  onChange={(e) => onUpdate(acc.id, { name: e.target.value })}
                  placeholder="Account name"
                />
                <button className="btn-danger btn-sm" onClick={() => handleRemove(acc.id)}>
                  Remove
                </button>
              </div>

              <div className="account-owner-row">
                <select
                  className="input-select"
                  value={acc.ownerId || 'joint'}
                  onChange={(e) => onUpdate(acc.id, { ownerId: e.target.value === 'joint' ? null : e.target.value })}
                >
                  <option value="joint">Joint</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <span className="owner-badge" style={{ background: acc.colour }}>
                  {person ? person.name : 'Joint'}
                </span>
              </div>

              <div className="colour-swatches">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    className={`swatch${acc.colour === c ? ' swatch-active' : ''}`}
                    style={{ background: c }}
                    onClick={() => onUpdate(acc.id, { colour: c })}
                    aria-label={c}
                  />
                ))}
              </div>

              <div className="account-allocation">
                Weekly allocation: <strong>{fmt(weeklyAmt)}</strong>
              </div>

              {confirmDelete === acc.id && (
                <div className="confirm-delete">
                  <p>Expenses are assigned to this account. Remove anyway?</p>
                  <button className="btn-danger btn-sm" onClick={() => confirmRemove(acc.id)}>
                    Yes, remove
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
