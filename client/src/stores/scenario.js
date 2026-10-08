import { defineStore } from 'pinia';

// Holds the whole scenario so users can move backwards in the stepper without losing input.
// Field names follow server/src/engine/types.js (Profile / Choice / Assumptions) — this is the
// CONTRACT kaash's forms bind to. If a form needs a field not listed here, add it here first,
// in a PR, so the shape stays the single source of truth (see docs/API_CONTRACT.md).
export const STEPS = ['Situation', 'Path A', 'Path B', 'Results'];

let nextApplicantId = 1;

// Stable id per applicant (PR #6 review note: "give each applicant a stable id instead of an
// index key") — removing Buyer 1 then re-keys Buyer 2 by id, not by array position.
function blankApplicant() {
  return {
    id: `applicant-${nextApplicantId++}`,
    age: null,
    citizenship: null,       // 'SC' | 'PR'
    firstTimer: null,        // boolean
    monthlyIncome: null,
    cpfOaBalance: null,
  };
}

const blank = () => ({
  step: 0,

  profile: {
    applicants: [blankApplicant()],   // starts with 1 buyer; form adds a 2nd
    cashSavings: null,
    monthlySavings: null,
    // Moved here from component setup (PR #6 review note) so the default is defined once,
    // not re-created every time SituationForm.vue mounts.
    livingArrangement: 'NONE',        // 'WITH' | 'NEAR' | 'NONE' — matches engine/types.js
    parentsAddress: { postal: null }, // engine/types.js: { postal?, lat?, lng? }
  },

  choiceA: {
    path: 'BTO',
    purchaseYear: null,
    town: null,              // TODO (seat 3): BTO towns should come from seeded BTO projects,
                              // not the resale TOWNS list — Tengah etc. currently unselectable
    flatType: null,
    classification: 'STANDARD', // 'STANDARD' | 'PLUS' | 'PRIME' — Standard is the default
    remainingLeaseYears: 99,    // BTO: fixed assumption per open question in PR #6 handoff
  },

  choiceB: {
    path: 'RESALE',
    purchaseYear: null,
    town: null,
    flatType: null,
    // Executive flat type is resale-only (per PR #6 manual test) — enforce in PathForm.vue's
    // flatType options for this path, not here.
    remainingLeaseYears: null,  // TODO (seat 3): derive from the resale dataset's remaining_lease
                                  // field once available; null until then — ask seat 2 what the
                                  // engine assumes when it's missing (open question, PR #6 handoff)
  },

  assumptions: {
    // Stored as FRACTIONS per engine/types.js (0.03 = 3%), matching the engine contract.
    // The form displays "3" with a % suffix and converts to/from 0.03 — that conversion is the
    // form's job (PR #6 fix #2), not the store's. Do not store "3" here.
    priceGrowth: null,
    incomeGrowth: null,
    horizonYears: null,   // label in the form is "Compare after (years)" (PR #6 fix #3)
    asOfDate: null,       // ISO date; set when the scenario is created, not on every read
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