// "See an example" on Home: a ready-made plan, in the saved-scenario shape that store.loadSaved() takes, so a
// visitor can see a full Results page before filling anything in. A first-time couple (the J1 kind) choosing
// between a Tampines BTO and a Tampines resale flat; Tampines has launches in both the live and the mock data.
// Everything not set here keeps the store's defaults (next year's application, 3% / 2% growth).
export const EXAMPLE_PLAN = {
  profile: {
    applicants: [
      { age: 29, citizenship: 'SC', firstTimer: true, monthlyIncome: 4200, cpfOaBalance: 90000 },
      { age: 30, citizenship: 'SC', firstTimer: true, monthlyIncome: 3800, cpfOaBalance: 80000 },
    ],
    cashSavings: 60000,
  },
  choiceA: { path: 'BTO', town: 'TAMPINES', flatType: '4 ROOM' },
  choiceB: { path: 'RESALE', town: 'TAMPINES', flatType: '4 ROOM', leaseBand: '80-89', livingArrangement: 'NONE' },
};
