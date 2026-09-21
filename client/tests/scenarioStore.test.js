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
