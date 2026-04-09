import { toWeekly, fmt } from '../utils/frequency';

export default function SummaryBar({ incomeSources, expenses, accounts }) {
  const totalIncome = incomeSources.reduce(
    (sum, s) => sum + toWeekly(s.amount, s.frequency, s.timesPerYear),
    0
  );
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + toWeekly(e.amount, e.frequency, e.timesPerYear),
    0
  );
  const difference = totalIncome - totalExpenses;

  const accountChips = accounts.map((acc) => {
    const weekly = expenses
      .filter((e) => e.accountId === acc.id)
      .reduce((sum, e) => sum + toWeekly(e.amount, e.frequency, e.timesPerYear), 0);
    return { ...acc, weekly };
  });

  return (
    <footer className="summary-bar">
      <div className="summary-main">
        <div className="summary-item">
          <span className="summary-label">Income</span>
          <span className="summary-value">{fmt(totalIncome)}/wk</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Expenses</span>
          <span className="summary-value">{fmt(totalExpenses)}/wk</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Difference</span>
          <span className={`summary-value ${difference >= 0 ? 'surplus' : 'deficit'}`}>
            {difference >= 0 ? '+' : ''}{fmt(difference)}/wk
          </span>
        </div>
      </div>

      {accountChips.length > 0 && (
        <div className="account-chips">
          {accountChips.map((acc) => (
            <span key={acc.id} className="account-chip" style={{ borderColor: acc.colour }}>
              <span className="chip-dot" style={{ background: acc.colour }} />
              {acc.name} {fmt(acc.weekly)}/wk
            </span>
          ))}
        </div>
      )}
    </footer>
  );
}
