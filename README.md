# Spending Plan

A clean, open-source personal finance web app built with React + Vite. No external UI libraries. All data persists in `localStorage`.

## Features

| Section | What it does |
|---|---|
| **People** | Add/remove people. Feeds into income and account ownership. |
| **Income** | Track income sources per person with frequency normalisation to weekly. Per-person and combined totals. |
| **Expenses** | Enter amounts in any frequency column (weekly/fortnightly/monthly/yearly/custom) — the rest auto-calculate. Assign expenses to accounts. Mark Cost of Living rows (CoL). |
| **Spend Awareness Helper** | Per-row helper: times-per-week × avg-spend → weekly/monthly/yearly projection with a "Use this" button. |
| **Accounts** | Named accounts with owner (Joint or a specific person) and colour. Shows weekly allocation total. |
| **Buffer Goal Calculator** | Auto-sums CoL expenses. Set a multiplier + Weeks/Months unit to calculate a buffer target. "Save by" date and "weekly savings needed" are linked — edit one, the other calculates. Progress bar toward goal. |
| **Summary Bar** | Sticky footer showing total income/week, total expenses/week, surplus/deficit, and per-account breakdown. |

## Frequency Conversions

| Frequency | To weekly |
|---|---|
| Weekly | ÷ 1 |
| Fortnightly | ÷ 2 |
| Monthly | ÷ (52/12) |
| Yearly | ÷ 52 |
| Custom | × timesPerYear ÷ 52 |

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Project Structure

```
src/
  App.jsx                         # Root state, localStorage sync
  App.css                         # All styles (fintech light-mode)
  components/
    PeopleSection.jsx
    IncomeSection.jsx
    ExpenseTable.jsx
    ExpenseRow.jsx
    SpendAwarenessHelper.jsx
    AccountsSection.jsx
    BufferGoalCalculator.jsx
    SummaryBar.jsx
  utils/
    frequency.js                  # toWeekly / fromWeekly helpers
    storage.js                    # localStorage load/save/clear
```

## Tech Stack

- [React 19](https://react.dev/)
- [Vite 8](https://vite.dev/)
- No external UI libraries
- `localStorage` for persistence

## License

MIT
