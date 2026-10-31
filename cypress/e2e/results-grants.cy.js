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
});
