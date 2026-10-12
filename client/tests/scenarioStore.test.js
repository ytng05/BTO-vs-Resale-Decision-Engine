import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useScenarioStore, STEPS } from '../src/stores/scenario.js';

describe('scenario store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('starts on the first step and cannot go back', () => {
    const s = useScenarioStore();
    s.back();
    expect(s.step).toBe(0);
  });

  it('never advances past the last step', () => {
    const s = useScenarioStore();
    for (let i = 0; i < 10; i++) s.next();
    expect(s.step).toBe(STEPS.length - 1);
  });

  it('reset restores the blank scenario', () => {
    const s = useScenarioStore();
    s.next();
    s.reset();
    expect(s.step).toBe(0);
  });
});

describe('scenario store: saved scenarios', () => {
  beforeEach(() => setActivePinia(createPinia()));

  function fill(s) {
    s.profile.applicants[0].age = 30;
    s.profile.applicants[0].monthlyIncome = 5000;
    s.profile.cashSavings = 20000;
    s.choiceA.town = 'TAMPINES';
    s.choiceA.flatType = '4 ROOM';
    s.choiceB.town = 'BEDOK';
    s.choiceB.flatType = '4 ROOM';
    s.choiceB.leaseBand = '80-89';
    s.assumptions.annualPriceGrowth = 0.03;
  }

  it('savePayload carries the name and the four input parts, not the step', () => {
    const s = useScenarioStore();
    fill(s);
    s.next();
    const p = s.savePayload('Tampines BTO vs Bedok resale');
    expect(Object.keys(p).sort()).toEqual(['assumptions', 'choiceA', 'choiceB', 'name', 'profile']);
    expect(p.name).toBe('Tampines BTO vs Bedok resale');
    expect(p.profile.cashSavings).toBe(20000);
    expect(p.choiceB.leaseBand).toBe('80-89');
    expect(p.assumptions.annualPriceGrowth).toBe(0.03);
  });

  it('savePayload adds the result only when there is one', () => {
    const s = useScenarioStore();
    expect(s.savePayload('x', { rulesetVersion: '2026-08-24' }).result).toEqual({ rulesetVersion: '2026-08-24' });
    expect('result' in s.savePayload('x')).toBe(false);
  });

  it('savePayload is a copy: later edits do not change a payload already built', () => {
    const s = useScenarioStore();
    fill(s);
    const p = s.savePayload('x');
    s.choiceA.town = 'WOODLANDS';
    s.profile.applicants[0].age = 40;
    expect(p.choiceA.town).toBe('TAMPINES');
    expect(p.profile.applicants[0].age).toBe(30);
  });

  it('loadSaved round-trips a saved scenario and lands on the last input step', () => {
    const a = useScenarioStore();
    fill(a);
    const saved = JSON.parse(JSON.stringify(a.savePayload('x')));

    a.reset();
    a.loadSaved(saved);
    expect(a.step).toBe(STEPS.length - 2);
    expect(a.choiceA.town).toBe('TAMPINES');
    expect(a.choiceB.leaseBand).toBe('80-89');
    expect(a.profile.cashSavings).toBe(20000);
    expect(a.profile.applicants[0].monthlyIncome).toBe(5000);
    expect(a.assumptions.annualPriceGrowth).toBe(0.03);
  });

  it('loadSaved fills fields a scenario was saved without from the blank defaults', () => {
    const s = useScenarioStore();
    s.loadSaved({
      profile: { applicants: [{ age: 31 }], cashSavings: 1000 },
      choiceA: { town: 'TAMPINES' },
      choiceB: { town: 'BEDOK' },
      assumptions: {},
    });
    expect(s.choiceA.classification).toBe('STANDARD');
    expect(s.choiceB.livingArrangement).toBe('NONE');
    expect(s.assumptions.monthlyHousingCostWhileWaiting).toBe(0);
    expect(s.profile.constraints).toEqual({ moveInByYear: null });
    expect(s.profile.applicants[0]).toMatchObject({ age: 31, citizenship: 'SC', firstTimer: true });
  });

  it('loadSaved gives buyers new ids, so one added afterwards cannot clash', () => {
    const s = useScenarioStore();
    s.loadSaved({ profile: { applicants: [{ id: 'applicant-1', age: 30 }] }, choiceA: {}, choiceB: {}, assumptions: {} });
    s.addApplicant();
    const ids = s.profile.applicants.map((a) => a.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids).not.toContain('applicant-1');
  });
});
