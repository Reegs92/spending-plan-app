import { useState } from 'react';
import { toWeekly, fmt, FREQUENCIES } from '../utils/frequency';

function blankSource(people) {
  return {
    id: crypto.randomUUID(),
    personId: people[0]?.id || '',
    name: '',
    amount: '',
    frequency: 'Monthly',
    timesPerYear: '',
  };
}

export default function IncomeSection({ people, incomeSources, setIncomeSources }) {
  function addSource() {
    setIncomeSources(prev => [...prev, blankSource(people)]);
  }

  function removeSource(id) {
    setIncomeSources(prev => prev.filter(s => s.id !== id));
  }

  function updateSource(id, field, value) {
    setIncomeSources(prev =>
      prev.map(s => s.id === id ? { ...s, [field]: value } : s)
    );
  }

  const perPerson = {};
  let combinedWeekly = 0;
  for (const s of incomeSources) {
    const w = toWeekly(s.amount, s.frequency.toLowerCase(), parseFloat(s.timesPerYear) || 0);
    combinedWeekly += w;
    perPerson[s.personId] = (perPerson[s.personId] || 0) + w;
  }

  return (
    <section className="card" id="income-section">
      <h2>Income</h2>
      <p className="section-hint">All amounts normalised to weekly. Edit any source and the totals update instantly.</p>

      {incomeSources.length === 0 && (
        <p className="empty-state">No income sources yet. Add one below.</p>
      )}

      <div className="income-table-wrap">
        {incomeSources.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Source Name</th>
                <th>Amount</th>
                <th>Frequency</th>
                <th>Times/yr</th>
                <th className="col-weekly">Weekly</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {incomeSources.map(s => {
                const weekly = toWeekly(
                  s.amount,
                  s.frequency.toLowerCase(),
                  parseFloat(s.timesPerYear) || 0
                );
                return (
                  <tr key={s.id}>
                    <td>
                      <select
                        value={s.personId}
                        onChange={e => updateSource(s.id, 'personId', e.target.value)}
                      >
                        {people.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="e.g. Salary"
                        value={s.name}
                        onChange={e => updateSource(s.id, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={s.amount}
                        onChange={e => updateSource(s.id, 'amount', e.target.value)}
                        className="num-input"
                      />
                    </td>
                    <td>
                      <select
                        value={s.frequency}
                        onChange={e => updateSource(s.id, 'frequency', e.target.value)}
                      >
                        {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </td>
                    <td>
                      {s.frequency === 'Custom' ? (
                        <input
                          type="number"
                          placeholder="e.g. 26"
                          min="1"
                          step="1"
                          value={s.timesPerYear}
                          onChange={e => updateSource(s.id, 'timesPerYear', e.target.value)}
                          className="num-input"
                        />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="col-weekly amount-cell">{fmt(weekly)}</td>
                    <td>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => removeSource(s.id)}
                        title="Remove"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="add-row">
        <button className="btn-primary" onClick={addSource}>+ Add Income Source</button>
      </div>

      {incomeSources.length > 0 && (
        <div className="income-totals">
          <div className="income-totals-grid">
            {people.map(p => (
              <div key={p.id} className="income-total-card">
                <span className="person-avatar sm">{p.name.charAt(0).toUpperCase()}</span>
                <div>
                  <div className="total-label">{p.name}</div>
                  <div className="total-value">{fmt(perPerson[p.id] || 0)}<span className="freq-tag">/wk</span></div>
                </div>
              </div>
            ))}
            <div className="income-total-card combined">
              <span className="person-avatar sm">∑</span>
              <div>
                <div className="total-label">Combined</div>
                <div className="total-value">{fmt(combinedWeekly)}<span className="freq-tag">/wk</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
