import { defineStore } from 'pinia';

// Holds the whole scenario so users can move backwards in the stepper without losing input.
// Field names must match docs/API_CONTRACT.md (POST /api/compare request).
export const STEPS = ['Situation', 'Path A', 'Path B', 'Results'];

const blank = () => ({
  step: 0,
  profile: { applicants: [], cashSavings: null, monthlySavings: null, parentsAddress: null },
  choiceA: { path: 'BTO', purchaseYear: null, town: null, flatType: null, classification: 'STANDARD' },
  choiceB: { path: 'RESALE', purchaseYear: null, town: null, flatType: null },
  assumptions: { priceGrowth: null, incomeGrowth: null, horizonYears: null },
});

export const useScenarioStore = defineStore('scenario', {
  state: blank,
  actions: {
    next() {
      if (this.step < STEPS.length - 1) this.step += 1;
    },
    back() {
      if (this.step > 0) this.step -= 1;
    },
    reset() {
      Object.assign(this, blank());
    },
  },
});
