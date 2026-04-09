import { toWeekly, fmt } from '../utils/frequency';

export default function BufferGoalCalculator({ expenses, bufferGoal, onUpdate }) {
  const colWeekly = expenses
    .filter((e) => e.isCoL)
    .reduce((sum, e) => sum + toWeekly(e.amount, e.frequency, e.timesPerYear), 0);

  const colMonthly = colWeekly * (52 / 12);

  const target =
    bufferGoal.unit === 'months'
      ? colMonthly * bufferGoal.multiplier
      : colWeekly * bufferGoal.multiplier;

  const savedSoFar = parseFloat(bufferGoal.savedSoFar) || 0;
  const progress = target > 0 ? Math.min((savedSoFar / target) * 100, 100) : 0;

  const today = new Date();

  function weeksUntil(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const diff = d - today;
    return diff > 0 ? diff / (7 * 24 * 60 * 60 * 1000) : null;
  }

  function handleSaveByDate(dateStr) {
    onUpdate({ saveByDate: dateStr });
    const weeks = weeksUntil(dateStr);
    if (weeks && target > savedSoFar) {
      const needed = (target - savedSoFar) / weeks;
      onUpdate({ saveByDate: dateStr, weeklyNeeded: needed.toFixed(2) });
    }
  }

  function handleWeeklyNeeded(val) {
    onUpdate({ weeklyNeeded: val });
    const wn = parseFloat(val) || 0;
    if (wn > 0 && target > savedSoFar) {
      const weeksNeeded = (target - savedSoFar) / wn;
      const d = new Date(today.getTime() + weeksNeeded * 7 * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      onUpdate({ weeklyNeeded: val, saveByDate: dateStr });
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2>Emergency Buffer Goal</h2>
      </div>

      <div className="col-summary">
        <span>Your cost of living: <strong>{fmt(colWeekly)}/week</strong> · <strong>{fmt(colMonthly)}/month</strong></span>
        {colWeekly === 0 && (
          <span className="hint"> (tick CoL on expenses above)</span>
        )}
      </div>

      <div className="buffer-controls">
        <label className="buffer-label">
          Multiplier
          <input
            className="input-number"
            type="number"
            min="1"
            step="0.5"
            value={bufferGoal.multiplier}
            onChange={(e) => onUpdate({ multiplier: parseFloat(e.target.value) || 1 })}
          />
        </label>

        <div className="unit-toggle">
          {['weeks', 'months'].map((u) => (
            <button
              key={u}
              className={`toggle-btn${bufferGoal.unit === u ? ' active' : ''}`}
              onClick={() => onUpdate({ unit: u })}
            >
              {u.charAt(0).toUpperCase() + u.slice(1)}
            </button>
          ))}
        </div>

        <div className="buffer-target">
          Buffer target: <strong>{fmt(target)}</strong>
        </div>
      </div>

      <div className="buffer-savings">
        <label className="buffer-label">
          Save by
          <input
            className="input-date"
            type="date"
            value={bufferGoal.saveByDate || ''}
            onChange={(e) => handleSaveByDate(e.target.value)}
          />
        </label>

        <label className="buffer-label">
          Weekly savings needed
          <input
            className="input-number"
            type="number"
            min="0"
            step="0.01"
            value={bufferGoal.weeklyNeeded || ''}
            onChange={(e) => handleWeeklyNeeded(e.target.value)}
            placeholder="Auto-calculated"
          />
        </label>

        <label className="buffer-label">
          Saved so far ($)
          <input
            className="input-number"
            type="number"
            min="0"
            step="0.01"
            value={bufferGoal.savedSoFar}
            onChange={(e) => onUpdate({ savedSoFar: parseFloat(e.target.value) || 0 })}
          />
        </label>
      </div>

      <div className="progress-wrap">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-label">{progress.toFixed(0)}% — {fmt(savedSoFar)} of {fmt(target)}</span>
      </div>

      <p className="buffer-summary">
        {bufferGoal.multiplier} {bufferGoal.unit} of living costs = <strong>{fmt(target)}</strong> target.
        {bufferGoal.weeklyNeeded && bufferGoal.saveByDate
          ? ` Save ${fmt(bufferGoal.weeklyNeeded)}/week to reach this by ${bufferGoal.saveByDate}.`
          : ' Enter a date or weekly savings amount to calculate.'}
      </p>
    </section>
  );
}
