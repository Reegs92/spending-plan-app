// All amounts normalised to weekly
export function toWeekly(amount, frequency, timesPerYear = 1) {
  const n = parseFloat(amount) || 0;
  switch (frequency) {
    case 'weekly': return n;
    case 'fortnightly': return n / 2;
    case 'monthly': return n / (52 / 12);
    case 'yearly': return n / 52;
    case 'custom': return (n * timesPerYear) / 52;
    default: return n;
  }
}

export function fromWeekly(weekly, frequency, timesPerYear = 1) {
  const w = parseFloat(weekly) || 0;
  switch (frequency) {
    case 'weekly': return w;
    case 'fortnightly': return w * 2;
    case 'monthly': return w * (52 / 12);
    case 'yearly': return w * 52;
    case 'custom': return timesPerYear > 0 ? (w * 52) / timesPerYear : 0;
    default: return w;
  }
}

export const fmt = (n) => `$${(parseFloat(n) || 0).toFixed(2)}`;
