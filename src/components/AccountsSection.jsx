import { useState } from 'react';
import { toWeekly, fmt } from '../utils/frequency';

export const ACCOUNT_COLOURS = [
  { label: 'Blue',   value: '#4A90E2' },
  { label: 'Green',  value: '#5CB85C' },
  { label: 'Purple', value: '#9B59B6' },
  { label: 'Orange', value: '#E67E22' },
  { label: 'Pink',   value: '#E91E8C' },
  { label: 'Teal',   value: '#1ABC9C' },
];

function blankAccount(people) {
  return {
    id: crypto.randomUUID(),
    name: '',
    owner: 'joint',
    colour: ACCOUNT_COLOURS[0].value,
  };
}

export default function AccountsSection({ accounts, setAccounts, people, expenses, setExpenses }) {
  const [pendingDelete, setPendingDelete] = useState(null); // accountId awaiting reassign

  function addAccount() {
    setAccounts(prev => [...prev, blankAccount(people)]);
  }

  function updateAccount(id, field, value) {
    setAccounts(prev =>
      prev.map(a => a.id === id ? { ...a, [field]: value } : a)
    );
  }

  function requestDelete(id) {
    const inUse = expenses.some(e => e.accountId === id);
    if (inUse) {
      setPendingDelete(id);
    } else {
      setAccounts(prev => prev.filter(a => a.id !== id));
    }
  }

  function confirmDelete(reassignTo) {
    setExpenses(prev =>
      prev.map(e => e.accountId === pendingDelete ? { ...e, accountId: reassignTo } : e)
    );
    setAccounts(prev => prev.filter(a => a.id !== pendingDelete));
    setPendingDelete(null);
  }

  function getWeeklyTotal(accountId) {
    const freqs = ['weekly', 'fortnightly', 'monthly', 'yearly', 'custom'];
    return expenses
      .filter(e => e.accountId === accountId)
      .reduce((sum, e) => {
        const amounts = e.amounts || {};
        const customTimes = parseFloat(e.timesPerYear) || 0;
        for (const f of freqs) {
          if (amounts[f] !== '' && amounts[f] !== undefined) {
            return sum + toWeekly(amounts[f], f, customTimes);
          }
        }
        return sum;
      }, 0);
  }

  function getOwnerLabel(account) {
    if (account.owner === 'joint') return 'Joint';
    const person = people.find(p => p.id === account.owner);
    return person ? person.name : 'Unknown';
  }

  const pendingAccount = pendingDelete ? accounts.find(a => a.id === pendingDelete) : null;

  return (
    <section className="card" id="accounts-section">
      <h2>Accounts</h2>
      <p className="section-hint">Accounts group expenses. Joint = shared. Assign a colour for the summary bar.</p>

      {accounts.length === 0 && (
        <p className="empty-state">No accounts yet. Add one below.</p>
      )}

      <div className="accounts-grid">
        {accounts.map(a => {
          const weeklyTotal = getWeeklyTotal(a.id);
          return (
            <div key={a.id} className="account-card" style={{ borderTopColor: a.colour }}>
              <div className="account-card-header">
                <div className="colour-swatch-row">
                  {ACCOUNT_COLOURS.map(c => (
                    <button
                      key={c.value}
                      className={`colour-swatch${a.colour === c.value ? ' selected' : ''}`}
                      style={{ background: c.value }}
                      title={c.label}
                      onClick={() => updateAccount(a.id, 'colour', c.value)}
                    />
                  ))}
                </div>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => requestDelete(a.id)}
                  title="Delete account"
                >
                  ×
                </button>
              </div>
              <input
                type="text"
                placeholder="Account name"
                value={a.name}
                onChange={e => updateAccount(a.id, 'name', e.target.value)}
                className="account-name-input"
              />
              <div className="account-meta">
                <select
                  value={a.owner}
                  onChange={e => updateAccount(a.id, 'owner', e.target.value)}
                >
                  <option value="joint">Joint</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <span
                  className={`owner-badge${a.owner === 'joint' ? ' joint' : ''}`}
                  style={a.owner !== 'joint' ? { background: '#e8f0fe', color: '#2563eb' } : {}}
                >
                  {getOwnerLabel(a)}
                </span>
              </div>
              <div className="account-allocation">
                <span className="account-alloc-label">Weekly allocation</span>
                <span className="account-alloc-value">{fmt(weeklyTotal)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="add-row">
        <button className="btn-primary" onClick={addAccount}>+ Add Account</button>
      </div>

      {pendingDelete && pendingAccount && (
        <div className="modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reassign Expenses</h3>
            <p>
              <strong>{pendingAccount.name}</strong> is used by some expenses.
              Reassign them to:
            </p>
            <div className="modal-actions">
              {accounts
                .filter(a => a.id !== pendingDelete)
                .map(a => (
                  <button
                    key={a.id}
                    className="btn-secondary"
                    onClick={() => confirmDelete(a.id)}
                  >
                    {a.name || 'Unnamed'}
                  </button>
                ))}
              <button
                className="btn-secondary"
                onClick={() => confirmDelete('')}
              >
                None (unassign)
              </button>
              <button
                className="btn-ghost"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
