import { useState, useEffect } from 'react';
import { loadState, saveState } from './utils/storage';
import { defaultState, uid } from './utils/defaults';
import PeopleSection from './components/PeopleSection';
import IncomeSection from './components/IncomeSection';
import ExpenseTable from './components/ExpenseTable';
import AccountsSection from './components/AccountsSection';
import BufferGoalCalculator from './components/BufferGoalCalculator';
import SummaryBar from './components/SummaryBar';

function init() {
  return loadState() || defaultState();
}

export default function App() {
  const [state, setState] = useState(init);

  useEffect(() => {
    saveState(state);
  }, [state]);

  function patch(key, updater) {
    setState((s) => ({ ...s, [key]: updater(s[key]) }));
  }

  // People
  function addPerson() {
    patch('people', (p) => [...p, { id: uid(), name: 'Person ' + (p.length + 1) }]);
  }
  function updatePerson(id, name) {
    patch('people', (p) => p.map((x) => x.id === id ? { ...x, name } : x));
  }
  function removePerson(id) {
    setState((s) => ({
      ...s,
      people: s.people.filter((p) => p.id !== id),
      incomeSources: s.incomeSources.filter((src) => src.personId !== id),
      accounts: s.accounts.map((a) => a.ownerId === id ? { ...a, ownerId: null } : a),
    }));
  }

  // Income
  function addIncome() {
    const personId = state.people[0]?.id || '';
    patch('incomeSources', (s) => [
      ...s,
      { id: uid(), personId, name: '', amount: '', frequency: 'weekly', timesPerYear: 1 },
    ]);
  }
  function updateIncome(id, changes) {
    patch('incomeSources', (s) => s.map((x) => x.id === id ? { ...x, ...changes } : x));
  }
  function removeIncome(id) {
    patch('incomeSources', (s) => s.filter((x) => x.id !== id));
  }

  // Expenses
  function addExpense() {
    patch('expenses', (s) => [
      ...s,
      { id: uid(), name: '', amount: '', frequency: 'weekly', timesPerYear: 1, accountId: null, isCoL: false },
    ]);
  }
  function updateExpense(id, changes) {
    patch('expenses', (s) => s.map((x) => x.id === id ? { ...x, ...changes } : x));
  }
  function removeExpense(id) {
    patch('expenses', (s) => s.filter((x) => x.id !== id));
  }

  // Accounts
  function addAccount() {
    patch('accounts', (s) => [
      ...s,
      { id: uid(), name: 'New Account', ownerId: null, colour: '#4F86F7' },
    ]);
  }
  function updateAccount(id, changes) {
    patch('accounts', (s) => s.map((x) => x.id === id ? { ...x, ...changes } : x));
  }
  function removeAccount(id) {
    setState((s) => ({
      ...s,
      accounts: s.accounts.filter((a) => a.id !== id),
      expenses: s.expenses.map((e) => e.accountId === id ? { ...e, accountId: null } : e),
    }));
  }

  // Buffer goal
  function updateBufferGoal(changes) {
    patch('bufferGoal', (bg) => ({ ...bg, ...changes }));
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Spending Plan</h1>
        <p className="app-subtitle">Plan your finances, track your goals</p>
      </header>

      <main className="app-main">
        <PeopleSection
          people={state.people}
          onAdd={addPerson}
          onUpdate={updatePerson}
          onRemove={removePerson}
        />

        <IncomeSection
          people={state.people}
          incomeSources={state.incomeSources}
          onAdd={addIncome}
          onUpdate={updateIncome}
          onRemove={removeIncome}
        />

        <ExpenseTable
          expenses={state.expenses}
          accounts={state.accounts}
          onAdd={addExpense}
          onUpdate={updateExpense}
          onRemove={removeExpense}
        />

        <AccountsSection
          accounts={state.accounts}
          people={state.people}
          expenses={state.expenses}
          onAdd={addAccount}
          onUpdate={updateAccount}
          onRemove={removeAccount}
        />

        <BufferGoalCalculator
          expenses={state.expenses}
          bufferGoal={state.bufferGoal}
          onUpdate={updateBufferGoal}
        />
      </main>

      <SummaryBar
        incomeSources={state.incomeSources}
        expenses={state.expenses}
        accounts={state.accounts}
      />
    </div>
  );
}
