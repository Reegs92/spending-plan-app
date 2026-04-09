export const uid = () => Math.random().toString(36).slice(2, 10);

export const defaultState = () => ({
  people: [{ id: uid(), name: 'Me' }],
  incomeSources: [],
  expenses: [],
  accounts: [],
  bufferGoal: { multiplier: 3, unit: 'months', savedSoFar: 0, saveByDate: '' },
});
