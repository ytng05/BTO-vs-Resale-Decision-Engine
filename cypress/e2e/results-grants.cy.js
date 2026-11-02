// Results page, grant eligibility (mock data): each grant is listed once with a single status, and every
// test under it keeps its own reason. Same setup as results.cy.js (`VITE_USE_MOCK=true npm run build`,
// `npm start`, `npm run test:e2e`).
import { completePlan } from './helpers/plan.js';

describe('results page: grants', () => {
  it('lists each grant once with one status, and every test keeps its reason', () => {
    completePlan();
    ['results-patha', 'results-pathb'].forEach((p) => {
      cy.get(`[data-cy^=${p}-eligibility-grant-status-]`).should('have.length.greaterThan', 0).each(($pill) => {
        cy.wrap($pill).invoke('text').should('match', /Eligible|Not eligible/);
      });
      cy.get(`[data-cy^=${p}-eligibility-item-]`).each(($item) => {
        cy.wrap($item).find('[data-cy*=-eligibility-reason-]').invoke('text').should('not.be.empty');
      });
    });
  });

  it('says in one line why a grant fails, with its official source, even when there is only one check', () => {
    completePlan();
    // Mock Path A (BTO): the Family Grant fails its single "resale only" check, so it has no "Why" toggle.
    cy.get('[data-cy=results-patha-eligibility-more-family]').should('not.exist');
    cy.get('[data-cy=results-patha-eligibility-why-not-family]').should('not.be.empty');
    cy.get('[data-cy=results-patha-eligibility-why-not-source-family]')
      .should('have.attr', 'href').and('match', /^https:\/\//);
    cy.get('[data-cy=results-patha-eligibility-why-not-source-family]')
      .should('have.attr', 'target', '_blank').and('have.attr', 'rel', 'noopener noreferrer');
  });

  it('names the best application year in the timing takeaway once it has loaded', () => {
    completePlan();
    cy.get('[data-cy=results-section-timing]').should('contain', 'Which application year');
    cy.get('[data-cy=results-section-timing] > summary').click();
    cy.get('[data-cy=results-timing-headline]').should('be.visible');
    cy.get('[data-cy=results-section-timing] > summary').invoke('text').should('match', /Applying in \d{4} ends with the highest/);
  });
});
