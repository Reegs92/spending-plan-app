import { useState } from 'react';
import { fmt } from '../utils/frequency';

export default function SpendAwarenessHelper({ onUse }) {
  const [timesPerWeek, setTimesPerWeek] = useState('');
  const [avgSpend, setAvgSpend] = useState('');

  const weekly = parseFloat(timesPerWeek) * parseFloat(avgSpend) || 0;
  const monthly = weekly * (52 / 12);
  const yearly = weekly * 52;

  return (
    <div className="spend-awareness">
      <div className="spend-awareness-header">Spend Awareness Helper</div>
      <div className="spend-awareness-inputs">
        <label>
          Times/week
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 3"
            value={timesPerWeek}
            onChange={e => setTimesPerWeek(e.target.value)}
            className="num-input sm"
          />
        </label>
        <span className="muted">×</span>
        <label>
          Avg spend
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 5.50"
            value={avgSpend}
            onChange={e => setAvgSpend(e.target.value)}
            className="num-input sm"
          />
        </label>
      </div>
      {weekly > 0 && (
        <div className="spend-awareness-result">
          <span><strong>{fmt(weekly)}</strong>/wk</span>
          <span className="muted">·</span>
          <span>{fmt(monthly)}/mo</span>
          <span className="muted">·</span>
          <span>{fmt(yearly)}/yr</span>
          <button
            className="btn-secondary sm"
            onClick={() => onUse(weekly)}
            title="Copy weekly figure to expense row"
          >
            Use this
          </button>
        </div>
      )}
    </div>
  );
}
