import { defineStore } from 'pinia';
import { blankApplicant } from '../constants/planOptions.js';

// Holds the whole scenario so users can move backwards in the stepper without losing input.
// Field names follow server/src/engine/evaluate.contract.js (Profile / Choice / Assumptions) —
// this is the CONTRACT the plan forms bind to. If a form needs a field not listed here, add it
// here first, in a PR, so the shape stays the single source of truth (see docs/API_CONTRACT.md).
// Money is kept in DOLLARS here (monthlyIncome, cpfOaBalance, cashSavings); the client converts
// to …Cents only at the one send boundary, client/src/api/client.js's toCompareRequest() (D14).
export const STEPS = ['Situation', 'Path A', 'Path B', 'Results'];

const blank = () => ({
  step: 0,

    profile: {
    applicants: [blankApplicant()],
    cashSavings: null,
  },

  choiceA: {
    path: 'BTO',
    purchaseYear: null,
    town: null,              // TODO (seat 3): BTO towns should come from seeded BTO projects,
                              // not the resale TOWNS list — Tengah etc. currently unselectable
    flatType: null,
    classification: 'STANDARD', // 'STANDARD' | 'PLUS' | 'PRIME' — Standard is the default
    // No remainingLeaseYears here: the server always sets it (99 for BTO, D16). Never sent by the client.
  },

  choiceB: {
    path: 'RESALE',
    purchaseYear: null,
    town: null,
    flatType: null,
    livingArrangement: 'NONE',  // 'WITH' | 'NEAR' | 'NONE' — Choice.livingArrangement, for PHG (D15)
    leaseBand: null,             // e.g. '80-89' (Choice.leaseBand, D16); server derives
                                  // remainingLeaseYears from its lower bound. Never sent as remainingLeaseYears.
  },

  assumptions: {
    // Stored as FRACTIONS per the engine contract (0.03 = 3%). The form shows "3" with a %
    // add-on and converts to/from 0.03 — that conversion is the form's job, not the store's.
    priceGrowth: null,
    incomeGrowth: null,
    horizonYears: null,   // shown in the form as "Compare after … years"; sent as holdingPeriodYears
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