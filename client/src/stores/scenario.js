import { defineStore } from 'pinia';
import { blankApplicant } from '../constants/planOptions.js';

// Holds the whole scenario so users can move backwards in the stepper without losing input.
// Field names follow server/src/engine/types.js (Profile / Choice / Assumptions) — this is the
// CONTRACT the plan forms bind to. If a form needs a field not listed here, add it here first,
// in a PR, so the shape stays the single source of truth (see docs/API_CONTRACT.md).
export const STEPS = ['Situation', 'Path A', 'Path B', 'Results'];

const blank = () => ({
  step: 0,

  profile: {
    // One buyer to start; the form can add a second. blankApplicant() lives in
    // constants/planOptions.js so every buyer gets the same defaults and a stable id.
    applicants: [blankApplicant()],
    cashSavings: null,
    monthlySavings: null,
    parentsAddress: null, // engine/types.js: optional { postal?, lat?, lng? }; null when blank
  },

  choiceA: {
    path: 'BTO',
    purchaseYear: null,
    town: null,              // TODO (seat 3): BTO towns should come from seeded BTO projects,
                              // not the resale TOWNS list — Tengah etc. currently unselectable
    flatType: null,
    classification: 'STANDARD', // 'STANDARD' | 'PLUS' | 'PRIME' — Standard is the default
    livingArrangement: 'NONE',  // 'WITH' | 'NEAR' | 'NONE' — a Choice field in engine/types.js (PHG)
    remainingLeaseYears: 99,    // BTO: new 99-year lease
  },

  choiceB: {
    path: 'RESALE',
    purchaseYear: null,
    town: null,
    flatType: null,
    livingArrangement: 'NONE',  // 'WITH' | 'NEAR' | 'NONE' — a Choice field in engine/types.js (PHG)
    remainingLeaseYears: null,  // TODO (seat 3): derive from the resale dataset's remaining_lease;
                                // ask seat 2 what the engine assumes while it is missing
  },

  assumptions: {
    // Stored as FRACTIONS per engine/types.js (0.03 = 3%). The form shows "3" with a % add-on
    // and converts to/from 0.03 — that conversion is the form's job, not the store's.
    priceGrowth: null,
    incomeGrowth: null,
    horizonYears: null,   // shown in the form as "Compare after … years"
    asOfDate: null,       // TODO (seats 3+4): agree where this is set — here on creation, or in the API route
  },
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
    addApplicant() {
      if (this.profile.applicants.length < 2) {
        this.profile.applicants.push(blankApplicant());
      }
    },
    removeApplicant(id) {
      this.profile.applicants = this.profile.applicants.filter((a) => a.id !== id);
    },
    reset() {
      Object.assign(this, blank());
    },
  },
});