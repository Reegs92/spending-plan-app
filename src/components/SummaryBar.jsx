import { toWeekly, fmt } from '../utils/frequency';

export default function SummaryBar({ incomeSources, expenses, accounts }) {
  const totalIncome = incomeSources.reduce((sum, s) => {
    return sum + toWeekly(s.amount, s.frequency.toLowerCase(), parseFloat(s.timesPerYear) || 0);
  }, 0);

  function getExpenseWeekly(e) {
    const amounts = e.amounts || {};
    const customTimes = parseFloat(e.timesPerYear) || 0;
    const freqs = ['weekly', 'fortnightly', 'monthly', 'yearly', 'custom'];
    for (const f of freqs) {
      if (amounts[f] !== '' && amounts[f] !== undefined) {
        return toWeekly(amounts[f], f, customTimes);
      }
    }
    return 0;
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + getExpenseWeekly(e), 0);
  const surplus = totalIncome - totalExpenses;

  // Per-account allocation
  const accountTotals = accounts.map(a => ({
    ...a,
    weekly: expenses
      .filter(e => e.accountId === a.id)
      .reduce((sum, e) => sum + getExpenseWeekly(e), 0),
  }));

  return (
    <footer className="summary-bar">
      <div className="summary-inner">
        <div className="summary-block">
          <span className="summary-label">Income</span>
          <span className="summary-value income-value">{fmt(totalIncome)}<span className="freq-tag">/wk</span></span>
        </div>
        <div className="summary-block">
          <span className="summary-label">Expenses</span>
          <span className="summary-value expense-value">{fmt(totalExpenses)}<span className="freq-tag">/wk</span></span>
        </div>
        <div className={`summary-block surplus-block ${surplus >= 0 ? 'surplus' : 'deficit'}`}>
          <span className="summary-label">{surplus >= 0 ? 'Surplus' : 'Deficit'}</span>
          <span className="summary-value">{fmt(Math.abs(surplus))}<span className="freq-tag">/wk</span></span>
        </div>

        {accountTotals.length > 0 && (
          <div className="summary-accounts">
            {accountTotals.map(a => (
              <div key={a.id} className="summary-account-chip">
                <span className="account-dot" style={{ background: a.colour }} />
                <span className="account-chip-name">{a.name || 'Unnamed'}</span>
                <span className="account-chip-val">{fmt(a.weekly)}/wk</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
