// The results teaser (/preview) between the last plan step and Results (mock data): for the picks it has engine
// figures for, both paths side by side; no "fits better" label yet (that rule is still to be written).
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { fillPath, fillSituation, next, pickWishes } from './helpers/plan.js';

function planWith(wishes, situation = {}) {
  cy.visit('/plan');
  pickWishes(wishes);
  next();
  fillSituation(situation);
  next();
  fillPath('patha');
  next();
  fillPath('pathb', { town: 'BEDOK', living: wishes.includes('parents') ? 'NONE' : undefined });
  next();
}

describe('results teaser', () => {
  it('shows each pick with figures for both paths, lists the rest, and goes on to Results', () => {
    planWith(['moveby', 'cash', 'parents'], { moveInBy: new Date().getFullYear() + 3 });
    cy.location('pathname').should('eq', '/preview');
    // Mock keys: BTO in five years' time, resale next year; the move-in year is three years away.
    const y = new Date().getFullYear();
    cy.get('[data-cy=preview-card-moveby-bto]').should('contain', 'Keys in').and('contain', `After your ${y + 3}`);
    cy.get('[data-cy=preview-card-moveby-resale]').should('contain', 'Keys in').and('contain', `By your ${y + 3}`);
    cy.get('[data-cy=preview-card-cash-bto]').should('contain', 'S$').and('contain', 'Cash at purchase');
    cy.get('[data-cy=preview-card-monthly]').should('not.exist'); // not picked
    cy.get('[data-cy=preview-not-shown]').should('contain', 'Near my parents');
    cy.contains('fits better').should('not.exist'); // the verdict rule is not built yet
    cy.get('[data-cy=preview]').should('contain', 'Ages 30 and 29').and('contain', 'S$10,000 a month together');

    cy.get('[data-cy=preview-see-results]').click();
    cy.location('pathname').should('eq', '/results');
  });

  it('goes straight to Results when no pick has figures to show', () => {
    planWith(['space']);
    cy.location('pathname').should('eq', '/results');
  });

  it('Edit goes back to the start of the plan with the answers kept', () => {
    planWith(['monthly']);
    cy.get('[data-cy=preview-card-monthly-bto]').should('contain', 'Loan to take');
    cy.get('[data-cy=preview-edit]').click();
    cy.location('pathname').should('eq', '/plan');
    cy.get('[data-cy=wish-monthly-input]').should('be.checked');
  });
});
