import { useState } from 'react';
import { fmt } from '../utils/frequency';

export default function SpendAwarenessHelper({ onUse, onClose }) {
  const [timesPerWeek, setTimesPerWeek] = useState('');
  const [avgSpend, setAvgSpend] = useState('');

  const tpw = parseFloat(timesPerWeek) || 0;
  const avg = parseFloat(avgSpend) || 0;
  const weekly = tpw * avg;
  const monthly = weekly * (52 / 12);
  const yearly = weekly * 52;

  return (
    <div className="awareness-helper">
      <div className="awareness-row">
        <label>
          Times/week
          <input
            className="input-number"
            type="number"
            min="0"
            step="0.5"
            value={timesPerWeek}
            onChange={(e) => setTimesPerWeek(e.target.value)}
          />
        </label>
        <label>
          Avg spend ($)
          <input
            className="input-number"
            type="number"
            min="0"
            step="0.01"
            value={avgSpend}
            onChange={(e) => setAvgSpend(e.target.value)}
          />
        </label>
      </div>
      {weekly > 0 && (
        <div className="awareness-result">
          <span>{fmt(weekly)}/wk</span>
          <span>{fmt(monthly)}/mo</span>
          <span>{fmt(yearly)}/yr</span>
          <button className="btn-primary btn-sm" onClick={() => onUse(weekly)}>
            Use this
          </button>
        </div>
      )}
      <button className="btn-ghost btn-sm" onClick={onClose}>Close</button>
    </div>
  );
}
