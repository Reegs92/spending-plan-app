# Spending Plan

A free, open-source spending plan app — vanilla HTML, CSS, and JavaScript. No build tools required to run. Installable as a PWA on Windows, Android, and iOS.

## Features

- **People** — add household members; income sources and accounts are owned by a person or marked Joint
- **Income** — multiple sources per person, any frequency (Weekly / Fortnightly / Monthly / Yearly / Custom), all normalised to weekly with per-person and combined totals
- **Expenses** — enter any frequency column, the rest auto-fill; assign to an account; mark Cost of Living (CoL) rows for the buffer calculator
- **Spend Awareness Helper** — per-row collapsible helper: times/week × avg spend → weekly / monthly / yearly breakdown with a "Use this" button
- **Accounts** — named accounts with owner (Joint or person), 6 colour options, weekly allocation total; delete prompts reassignment of affected expenses
- **Buffer Goal Calculator** — auto-sums CoL expenses; set a multiplier × Weeks or Months → buffer target; "Save by" date and "Weekly savings needed" are linked (edit one, the other calculates); progress bar toward goal
- **Summary bar** — sticky footer showing income / expenses / surplus (green) or deficit (red) / per-account chips with colour dots
- **Import / Export CSV** — portable data
- **Auto-save** — all data persists in `localStorage`
- **Offline-ready PWA** — installable, works without internet

## Frequency Conversions

| Frequency | To weekly |
|---|---|
| Weekly | ÷ 1 |
| Fortnightly | ÷ 2 |
| Monthly | ÷ (52/12) |
| Yearly | ÷ 52 |
| Custom | × timesPerYear ÷ 52 |

## Getting Started

Just open `index.html` in any modern browser — no server or build step needed.

```bash
# Optional: build a single self-contained HTML file
node build.js
# → dist/spending-plan.html
```

## File Structure

```
index.html       Main app shell
style.css        All styles
app.js           All logic (vanilla JS, ~500 lines)
build.js         Bundles into dist/spending-plan.html
sw.js            Service worker (offline / PWA)
manifest.json    PWA manifest
icons/           SVG app icons
dist/            Built single-file output (git-ignored)
```

## License

MIT — use it, fork it, improve it.
