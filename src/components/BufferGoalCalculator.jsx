import { toWeekly, fmt } from '../utils/frequency';

export default function BufferGoalCalculator({ expenses, bufferGoal, setBufferGoal }) {
  // Auto-sum Cost of Living expenses
  const colWeekly = expenses
    .filter(e => e.isCoL)
    .reduce((sum, e) => {
      const amounts = e.amounts || {};
      const customTimes = parseFloat(e.timesPerYear) || 0;
      const freqs = ['weekly', 'fortnightly', 'monthly', 'yearly', 'custom'];
      for (const f of freqs) {
        if (amounts[f] !== '' && amounts[f] !== undefined) {
          return sum + toWeekly(amounts[f], f, customTimes);
        }
      }
      return sum;
    }, 0);

  const multiplier = parseFloat(bufferGoal.multiplier) || 0;
  const unit = bufferGoal.unit || 'Weeks';
  const savedSoFar = parseFloat(bufferGoal.savedSoFar) || 0;

  // Buffer target
  const periodWeeks = unit === 'Months' ? multiplier * (52 / 12) : multiplier;
  const bufferTarget = colWeekly * periodWeeks;

  // Weekly savings needed ↔ save-by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function weeksUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = target - today;
    if (diff <= 0) return null;
    return diff / (1000 * 60 * 60 * 24 * 7);
  }

  function dateFromWeeklyNeeded(weeklyNeeded) {
    if (!weeklyNeeded || weeklyNeeded <= 0) return '';
    const remaining = bufferTarget - savedSoFar;
    if (remaining <= 0) return '';
    const weeksNeeded = remaining / parseFloat(weeklyNeeded);
    const d = new Date(today.getTime() + weeksNeeded * 7 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  }

  const weeksLeft = weeksUntil(bufferGoal.saveByDate);
  const remaining = Math.max(0, bufferTarget - savedSoFar);
  const weeklyNeededFromDate = weeksLeft ? remaining / weeksLeft : null;

  const progress = bufferTarget > 0 ? Math.min(1, savedSoFar / bufferTarget) : 0;

  function handleSaveByChange(dateStr) {
    setBufferGoal(prev => ({ ...prev, saveByDate: dateStr }));
    // Recalculate weeklyNeeded from date
    const wks = weeksUntil(dateStr);
    if (wks && bufferTarget > 0) {
      const needed = Math.max(0, bufferTarget - savedSoFar) / wks;
      setBufferGoal(prev => ({
        ...prev,
        saveByDate: dateStr,
        weeklyNeeded: parseFloat(needed.toFixed(2)),
      }));
    }
  }

  function handleWeeklyNeededChange(val) {
    setBufferGoal(prev => ({
      ...prev,
      weeklyNeeded: val,
      saveByDate: val ? dateFromWeeklyNeeded(parseFloat(val)) : prev.saveByDate,
    }));
  }

  const weeklyNeeded = bufferGoal.weeklyNeeded !== undefined
    ? bufferGoal.weeklyNeeded
    : (weeklyNeededFromDate ? parseFloat(weeklyNeededFromDate.toFixed(2)) : '');

  const weeksToReach = weeklyNeeded && parseFloat(weeklyNeeded) > 0
    ? Math.ceil(remaining / parseFloat(weeklyNeeded))
    : null;

  const monthsToReach = weeksToReach ? (weeksToReach / (52 / 12)).toFixed(1) : null;

  return (
    <section className="card" id="buffer-section">
      <h2>Buffer Goal Calculator</h2>
      <p className="section-hint">
        Based on your <strong>Cost of Living</strong> expenses: <strong>{fmt(colWeekly)}/wk</strong>
        {colWeekly === 0 && ' — tick CoL on expenses above to include them here.'}
      </p>

      <div className="buffer-grid">
        <div className="buffer-control">
          <label>Multiplier</label>
          <div className="buffer-multi-row">
            <input
              type="number"
              min="0"
              step="0.5"
              value={bufferGoal.multiplier}
              onChange={e => setBufferGoal(prev => ({ ...prev, multiplier: e.target.value }))}
              className="num-input"
            />
            <div className="toggle-group">
              {['Weeks', 'Months'].map(u => (
                <button
                  key={u}
                  className={`toggle-btn${unit === u ? ' active' : ''}`}
                  onClick={() => setBufferGoal(prev => ({ ...prev, unit: u }))}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="buffer-control">
          <label>Save by</label>
          <input
            type="date"
            value={bufferGoal.saveByDate || ''}
            onChange={e => handleSaveByChange(e.target.value)}
          />
        </div>

        <div className="buffer-control">
          <label>Weekly savings needed</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 200"
            value={weeklyNeeded}
            onChange={e => handleWeeklyNeededChange(e.target.value)}
            className="num-input"
          />
        </div>

        <div className="buffer-control">
          <label>Saved so far</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={bufferGoal.savedSoFar}
            onChange={e => setBufferGoal(prev => ({ ...prev, savedSoFar: e.target.value }))}
            className="num-input"
          />
        </div>
      </div>

      {bufferTarget > 0 && (
        <div className="buffer-summary">
          <div className="buffer-headline">
            {multiplier} {unit.toLowerCase()} of living costs = <strong>{fmt(bufferTarget)}</strong>
            {weeklyNeeded && parseFloat(weeklyNeeded) > 0 && monthsToReach && (
              <span>. Save <strong>{fmt(weeklyNeeded)}/wk</strong> to reach this in <strong>{monthsToReach} months</strong>.</span>
            )}
          </div>

          <div className="progress-wrap">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(progress * 100).toFixed(1)}%` }}
              />
            </div>
            <div className="progress-labels">
              <span>{fmt(savedSoFar)} saved</span>
              <span>{(progress * 100).toFixed(0)}%</span>
              <span>{fmt(bufferTarget)} goal</span>
            </div>
          </div>

          {savedSoFar >= bufferTarget && (
            <div className="buffer-achieved">Goal reached! Your buffer is fully funded.</div>
          )}
        </div>
      )}
    </section>
  );
}
