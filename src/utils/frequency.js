/**
 * Normalise any amount+frequency combination to a weekly figure.
 * @param {number} amount
 * @param {'weekly'|'fortnightly'|'monthly'|'yearly'|'custom'} frequency
 * @param {number} [timesPerYear] – required when frequency === 'custom'
 * @returns {number} weekly amount
 */
export function toWeekly(amount, frequency, timesPerYear = 0) {
  if (!amount || isNaN(amount)) return 0;
  const n = parseFloat(amount);
  switch (frequency) {
    case 'weekly':      return n;
    case 'fortnightly': return n / 2;
    case 'monthly':     return n / (52 / 12);
    case 'yearly':      return n / 52;
    case 'custom':      return timesPerYear ? (n * timesPerYear) / 52 : 0;
    default:            return 0;
  }
}

/**
 * Given a weekly amount, convert it to any frequency.
 */
export function fromWeekly(weeklyAmount, targetFrequency, timesPerYear = 0) {
  if (!weeklyAmount || isNaN(weeklyAmount)) return 0;
  const w = parseFloat(weeklyAmount);
  switch (targetFrequency) {
    case 'weekly':      return w;
    case 'fortnightly': return w * 2;
    case 'monthly':     return w * (52 / 12);
    case 'yearly':      return w * 52;
    case 'custom':      return timesPerYear ? (w * 52) / timesPerYear : 0;
    default:            return 0;
  }
}

export const FREQUENCIES = ['Weekly', 'Fortnightly', 'Monthly', 'Yearly', 'Custom'];

export function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '$0.00';
  return '$' + parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function fmtShort(n) {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
