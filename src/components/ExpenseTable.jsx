import ExpenseRow from './ExpenseRow';
import { toWeekly, fmt } from '../utils/frequency';

function blankExpense() {
  return {
    id: crypto.randomUUID(),
    name: '',
    amounts: { weekly: '', fortnightly: '', monthly: '', yearly: '', custom: '' },
    timesPerYear: '',
    accountId: '',
    isCoL: false,
  };
}

export default function ExpenseTable({ expenses, setExpenses, accounts }) {
  function addExpense() {
    setExpenses(prev => [...prev, blankExpense()]);
  }

  function deleteExpense(id) {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  function updateExpense(id, changes) {
    setExpenses(prev =>
      prev.map(e => e.id === id ? { ...e, ...changes } : e)
    );
  }

  function getWeekly(exp) {
    const amounts = exp.amounts || {};
    const customTimes = parseFloat(exp.timesPerYear) || 0;
    const freqs = ['weekly', 'fortnightly', 'monthly', 'yearly', 'custom'];
    for (const f of freqs) {
      if (amounts[f] !== '' && amounts[f] !== undefined && amounts[f] !== null) {
        return toWeekly(amounts[f], f, customTimes);
      }
    }
    return 0;
  }

  const totalWeekly = expenses.reduce((sum, e) => sum + getWeekly(e), 0);

  return (
    <section className="card" id="expenses-section">
      <div className="section-header-row">
        <h2>Expenses</h2>
        <span className="section-total">{fmt(totalWeekly)}<span className="freq-tag">/wk</span></span>
      </div>
      <p className="section-hint">
        Enter an amount in any frequency column — the rest auto-fill. Tick <strong>CoL</strong> to include in your Buffer Goal.
        Click <strong>≈</strong> to open the Spend Awareness Helper for that row.
      </p>

      {expenses.length === 0 ? (
        <p className="empty-state">No expenses yet. Add one below.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table expense-table">
            <thead>
              <tr>
                <th className="col-name">Name</th>
                <th>Weekly</th>
                <th>Fortnightly</th>
                <th>Monthly</th>
                <th>Yearly</th>
                <th>Custom</th>
                <th>Account</th>
                <th title="Cost of Living">CoL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <ExpenseRow
                  key={exp.id}
                  expense={exp}
                  accounts={accounts}
                  onUpdate={changes => updateExpense(exp.id, changes)}
                  onDelete={() => deleteExpense(exp.id)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={9} className="total-right">
                  Total: <strong>{fmt(totalWeekly)}/wk</strong>
                  &nbsp;·&nbsp;
                  {fmt(totalWeekly * (52 / 12))}/mo
                  &nbsp;·&nbsp;
                  {fmt(totalWeekly * 52)}/yr
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="add-row">
        <button className="btn-primary" onClick={addExpense}>+ Add Expense</button>
      </div>
    </section>
  );
}
