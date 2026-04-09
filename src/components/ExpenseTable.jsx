import { toWeekly, fmt } from '../utils/frequency';
import ExpenseRow from './ExpenseRow';

export default function ExpenseTable({ expenses, accounts, onAdd, onUpdate, onRemove }) {
  const totalWeekly = expenses.reduce(
    (sum, e) => sum + toWeekly(e.amount, e.frequency, e.timesPerYear),
    0
  );

  return (
    <section className="card">
      <div className="card-header">
        <h2>Expenses</h2>
        <button className="btn-primary" onClick={onAdd}>+ Add Expense</button>
      </div>

      {expenses.length === 0 && (
        <p className="empty-hint">No expenses yet. Add one above.</p>
      )}

      <div className="expenses-list">
        {expenses.map((e) => (
          <ExpenseRow
            key={e.id}
            expense={e}
            accounts={accounts}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </div>

      {expenses.length > 0 && (
        <div className="section-total">
          Total expenses: <strong>{fmt(totalWeekly)}/wk</strong>
        </div>
      )}
    </section>
  );
}
