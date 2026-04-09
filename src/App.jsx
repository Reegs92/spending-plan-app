import { useState, useEffect, useCallback } from 'react';
import { loadState, saveState } from './utils/storage';
import PeopleSection from './components/PeopleSection';
import IncomeSection from './components/IncomeSection';
import ExpenseTable from './components/ExpenseTable';
import AccountsSection from './components/AccountsSection';
import BufferGoalCalculator from './components/BufferGoalCalculator';
import SummaryBar from './components/SummaryBar';
import './App.css';

const DEFAULT_STATE = {
  people: [{ id: 'default-person', name: 'Me' }],
  incomeSources: [],
  expenses: [],
  accounts: [],
  bufferGoal: {
    multiplier: '3',
    unit: 'Months',
    savedSoFar: '',
    saveByDate: '',
    weeklyNeeded: '',
  },
};

function getInitialState() {
  const saved = loadState();
  if (saved) return saved;
  return DEFAULT_STATE;
}

export default function App() {
  const initial = getInitialState();
  const [people, setPeople] = useState(initial.people);
  const [incomeSources, setIncomeSources] = useState(initial.incomeSources);
  const [expenses, setExpenses] = useState(initial.expenses);
  const [accounts, setAccounts] = useState(initial.accounts);
  const [bufferGoal, setBufferGoal] = useState(initial.bufferGoal);

  // Persist on every state change
  useEffect(() => {
    saveState({ people, incomeSources, expenses, accounts, bufferGoal });
  }, [people, incomeSources, expenses, accounts, bufferGoal]);

  // When a person is removed, clean up orphaned personId refs
  const handleSetPeople = useCallback((updater) => {
    setPeople(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const ids = new Set(next.map(p => p.id));
      setIncomeSources(s => s.map(src =>
        ids.has(src.personId) ? src : { ...src, personId: next[0]?.id || '' }
      ));
      setAccounts(a => a.map(acc =>
        acc.owner === 'joint' || ids.has(acc.owner) ? acc : { ...acc, owner: 'joint' }
      ));
      return next;
    });
  }, []);

  const NAV_ITEMS = [
    { href: '#people-section', label: 'People' },
    { href: '#income-section', label: 'Income' },
    { href: '#expenses-section', label: 'Expenses' },
    { href: '#accounts-section', label: 'Accounts' },
    { href: '#buffer-section', label: 'Buffer Goal' },
  ];

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">💰</span>
            <span className="logo-text">Spending Plan</span>
          </div>
          <nav className="top-nav">
            {NAV_ITEMS.map(item => (
              <a key={item.href} href={item.href} className="nav-link">{item.label}</a>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <PeopleSection people={people} setPeople={handleSetPeople} />
        <IncomeSection
          people={people}
          incomeSources={incomeSources}
          setIncomeSources={setIncomeSources}
        />
        <ExpenseTable
          expenses={expenses}
          setExpenses={setExpenses}
          accounts={accounts}
        />
        <AccountsSection
          accounts={accounts}
          setAccounts={setAccounts}
          people={people}
          expenses={expenses}
          setExpenses={setExpenses}
        />
        <BufferGoalCalculator
          expenses={expenses}
          bufferGoal={bufferGoal}
          setBufferGoal={setBufferGoal}
        />
      </main>

      <SummaryBar
        incomeSources={incomeSources}
        expenses={expenses}
        accounts={accounts}
      />
    </div>
  );
}
