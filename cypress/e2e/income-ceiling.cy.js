// A household above HDB's new-flat income ceiling can't buy the BTO (D36). The engine still works out its figures, so
// every page has to say so: no verdict on the preview (D43), and a banner first on Results and on the Dashboard.
// Mock data; the mock raises the warning above S$16,000 a month.
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { fillAges, fillIncomes, fillPath, fillSavings, next, nextYear, pickWishes } from './helpers/plan.js';

function planWithIncomes(incomes) {
  cy.visit('/plan');
  pickWishes(['cash']);
  next();
  fillAges();
  next();
  next(); // citizenship and first-timer: the defaults
  fillIncomes(incomes);
  next();
  fillSavings();
  next();
  fillPath('patha');
  next();
  fillPath('pathb', { town: 'BEDOK' });
  next();
}

describe('above the new-flat income ceiling', () => {
  it('gives no verdict on the preview, and Results opens with the warning, above the answer', () => {
    planWithIncomes(['12000', '12000']);
    cy.get('[data-cy=preview-verdict-title]').should('have.text', "We can't compare these here");
    cy.get('[data-cy=preview-verdict-summary]').should('contain', 'above the ceiling for a new flat');
    cy.get('[data-cy=preview-card-cash-detail]').should('have.text', 'See the full comparison');

    cy.get('[data-cy=preview-see-results]').click();
    cy.get('[data-cy=dashboard-critical]')
      .should('be.visible')
      .and('contain', `You couldn't buy this BTO in ${nextYear}`)
      .and('contain', 'what it would look like if you could')
      .then(($banner) => {
        cy.get('[data-cy=results-verdict-headline]').then(($headline) => {
          expect($banner[0].getBoundingClientRect().top).to.be.lessThan($headline[0].getBoundingClientRect().top);
        });
      });
    cy.get('[data-cy=dashboard-critical-sources]').should('have.attr', 'href', '/sources#income-eligibility');
  });

  it('keeps the warning on the Dashboard, where "Try a later year" leads', () => {
    planWithIncomes(['12000', '12000']);
    cy.get('[data-cy=preview-see-results]').click();
    cy.get('[data-cy=dashboard-critical-whatif]').click();
    cy.location('pathname').should('eq', '/dashboard');
    cy.get('[data-cy=dashboard-headline]').should('be.visible');
    cy.get('[data-cy=dashboard-critical]').should('be.visible');
  });

  it('says nothing at or below the ceiling', () => {
    planWithIncomes(['8000', '8000']); // exactly at the ceiling passes (D36)
    cy.get('[data-cy=preview-verdict-title]').should('not.contain', "can't compare");
    cy.get('[data-cy=preview-see-results]').click();
    cy.get('[data-cy=results-verdict-headline]').should('be.visible');
    cy.get('[data-cy=dashboard-critical]').should('not.exist');
  });
});
