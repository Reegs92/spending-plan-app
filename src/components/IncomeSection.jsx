import { toWeekly, fmt } from '../utils/frequency';

const FREQUENCIES = ['weekly', 'fortnightly', 'monthly', 'yearly', 'custom'];

export default function IncomeSection({ people, incomeSources, onAdd, onUpdate, onRemove }) {
  const totalWeekly = incomeSources.reduce(
    (sum, s) => sum + toWeekly(s.amount, s.frequency, s.timesPerYear),
    0
  );

  const personSubtotals = people.map((p) => ({
    ...p,
    weekly: incomeSources
      .filter((s) => s.personId === p.id)
      .reduce((sum, s) => sum + toWeekly(s.amount, s.frequency, s.timesPerYear), 0),
  }));

  return (
    <section className="card">
      <div className="card-header">
        <h2>Income</h2>
        <button className="btn-primary" onClick={onAdd}>+ Add Income</button>
      </div>

      {incomeSources.length === 0 && (
        <p className="empty-hint">No income sources yet. Add one above.</p>
      )}

      {incomeSources.map((src) => (
        <div key={src.id} className="income-row">
          <select
            className="input-select"
            value={src.personId}
            onChange={(e) => onUpdate(src.id, { personId: e.target.value })}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input
            className="input-text"
            value={src.name}
            onChange={(e) => onUpdate(src.id, { name: e.target.value })}
            placeholder="Source name"
          />

          <input
            className="input-number"
            type="number"
            min="0"
            step="0.01"
            value={src.amount}
            onChange={(e) => onUpdate(src.id, { amount: e.target.value })}
            placeholder="Amount"
          />

          <select
            className="input-select"
            value={src.frequency}
            onChange={(e) => onUpdate(src.id, { frequency: e.target.value })}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            ))}
          </select>

          {src.frequency === 'custom' && (
            <input
              className="input-number"
              type="number"
              min="1"
              step="1"
              value={src.timesPerYear}
              onChange={(e) => onUpdate(src.id, { timesPerYear: parseFloat(e.target.value) || 1 })}
              placeholder="Times/yr"
              title="Times per year"
            />
          )}

          <span className="income-weekly">{fmt(toWeekly(src.amount, src.frequency, src.timesPerYear))}/wk</span>

          <button className="btn-danger" onClick={() => onRemove(src.id)}>Remove</button>
        </div>
      ))}

      {incomeSources.length > 0 && (
        <div className="income-totals">
          {people.length > 1 && personSubtotals.map((p) => (
            <span key={p.id} className="subtotal-chip">
              {p.name}: {fmt(p.weekly)}/wk
            </span>
          ))}
          <strong>Total: {fmt(totalWeekly)}/wk</strong>
        </div>
      )}
    </section>
  );
}
