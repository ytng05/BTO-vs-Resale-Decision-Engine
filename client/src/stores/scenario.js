import { defineStore } from 'pinia';
import { blankApplicant } from '../constants/planOptions.js';

// Holds the whole scenario so users can move backwards in the stepper without losing input.
// Field names follow server/src/engine/evaluate.contract.js's CompareRequest (RequestChoice /
// RequestAssumptions / Profile) — that file is the CONTRACT the plan forms bind to, and it is
// FROZEN (D25): a field added or renamed here needs a PR approved by seat 1 and every seat whose
// code reads it. If a form needs a field not listed here, add it here first (see docs/API_CONTRACT.md).
// Money is kept in DOLLARS here; the API client converts to …Cents when sending (D14). Fields the
// SERVER resolves and the client never sends (purchasePriceCents, marketValueAtKeysCents,
// remainingLeaseYears, evaluationStartYear) are deliberately absent from this shape.
export const STEPS = ['Situation', 'Path A', 'Path B', 'Results'];

const blank = () => ({
  step: 0,

  profile: {
    // One buyer to start; the form can add a second. blankApplicant() lives in
    // constants/planOptions.js so every buyer gets the same defaults and a stable id.
    applicants: [blankApplicant()],
    cashSavings: null, // dollars; household cash held TODAY (D19) — no monthlySavings field (removed)
    constraints: {
      moveInByYear: null, // optional "must move in by" year; null = no deadline
    },
  },

  choiceA: {
    path: 'BTO',
    applicationYear: null,
    town: null,              // TODO (seat 3): BTO towns should come from seeded BTO projects,
                              // not the resale TOWNS list — Tengah etc. currently unselectable
    flatType: null,          // '3 ROOM' | '4 ROOM' | '5 ROOM' only (D27) — see planOptions.js fix below
    classification: 'STANDARD', // 'STANDARD' | 'PLUS' | 'PRIME' — Standard is the default
    btoProjectId: null,      // optional: id from GET /api/data/bto-projects, filtered by town + flatType;
                              // sets the price range and the wait. Null = route picks the town's newest project
    btoPrice: null,          // dollars; optional slider override, must lie within the project's price
                              // range (D26). Null = server uses the range midpoint
    btoWaitMonths: null,     // optional override. Null = project's/town's/ruleset default
    renovation: 0,           // dollars; default 0
    // No livingArrangement here — PHG is resale-only (D15). No remainingLeaseYears — BTO is
    // always a fresh 99-year lease, set server-side.
  },

  choiceB: {
    path: 'RESALE',
    applicationYear: null,
    town: null,
    flatType: null,          // '3 ROOM' | '4 ROOM' | '5 ROOM' only (D27)
    livingArrangement: 'NONE', // 'WITH' | 'NEAR' | 'NONE' — resale only (D15), for PHG
    leaseBand: null,         // e.g. '80-89' (D16); server derives remainingLeaseYears from this
    renovation: 0,           // dollars; default 0
    // No classification — null for resale, not modelled here.
  },

  assumptions: {
    // Stored as FRACTIONS per the contract (0.03 = 3%). The form shows "3" with a % add-on
    // and converts to/from 0.03 — that conversion is the form's job, not the store's.
    annualPriceGrowth: null,
    annualIncomeGrowth: null,
    horizonYear: null,       // optional; null = later key year + 10 (server default)
    monthlyHousingCostWhileWaiting: 0, // dollars; rent until keys, BOTH paths; default 0 (D1) — defaulting
                              // to 0 favours BTO, the UI must show this prominently with a sourced rental guide
    loanTenureYears: null,   // optional; server default if omitted
    loanType: null,          // 'HDB' | 'BANK'; optional; server default if omitted
    legalFees: null,         // dollars; optional; server default if omitted (D17)
    agentFees: null,         // dollars; optional; server default if omitted (D17)
    // No evaluationStartYear — the server sets it; the client never supplies it.
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
    // Body for POST /api/scenarios: the inputs in this store's own shape (dollars), so loading one
    // refills the forms directly (docs/API_CONTRACT.md "Saved scenarios"). `step` is UI state, not saved.
    savePayload(name, result = null) {
      const copy = (v) => JSON.parse(JSON.stringify(v));
      const payload = {
        name,
        profile: copy(this.profile),
        choiceA: copy(this.choiceA),
        choiceB: copy(this.choiceB),
        assumptions: copy(this.assumptions),
      };
      if (result) payload.result = result;
      return payload;
    },
    // Refills the store from a saved scenario. Each part is laid over the blank one, so a scenario saved
    // before a field existed still loads, with that field's default. Lands on the last input step, as
    // after "See results", so "Change inputs" opens Path B.
    loadSaved(saved) {
      const fresh = blank();
      Object.assign(this, {
        step: STEPS.length - 2,
        profile: {
          ...fresh.profile,
          ...saved.profile,
          // New ids: a saved id came from another session's counter and could clash with one added now.
          applicants: (saved.profile?.applicants ?? fresh.profile.applicants).map((a) => {
            const b = blankApplicant();
            return { ...b, ...a, id: b.id };
          }),
          constraints: { ...fresh.profile.constraints, ...saved.profile?.constraints },
        },
        choiceA: { ...fresh.choiceA, ...saved.choiceA },
        choiceB: { ...fresh.choiceB, ...saved.choiceB },
        assumptions: { ...fresh.assumptions, ...saved.assumptions },
      });
    },
  },
});