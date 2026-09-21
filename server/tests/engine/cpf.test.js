// SEAT 1. Expected values MUST come from hand-worked examples in CPF Board / HDB material
// (record the source in docs/SOURCES.md), NOT from the code under test or from AI-generated output.
import { describe, it } from 'vitest';

describe('computeAccruedInterest', () => {
  it.todo('single withdrawal, held exactly 12 months (hand-worked example)');
  it.todo('per-instalment accrual: each monthly instalment accrues from its own date');
  it.todo('grant credited to the OA accrues from the credit date');
  it.todo('compounding convention matches the ruleset (monthly vs annual)');
  it.todo('withdrawal or sale mid-month follows the documented partial-month convention');
  it.todo('refund is capped when sale proceeds cannot cover loan plus refund');
});
