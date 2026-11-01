// Every page fits a phone, a tablet and a laptop screen without sideways scrolling (mock data).
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.

import { completePlan } from './helpers/plan.js';

const SCREENS = [
  { name: 'phone (iPhone SE)', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
];

// Pages that open straight from a URL, each with one element that shows it has finished loading.
const PAGES = [
  { path: '/', ready: '[data-cy=home-title]' },
  { path: '/plan', ready: '[data-cy=wishes-form]' },
  { path: '/sources', ready: '[data-cy=sources-title]' },
  { path: '/login', ready: '[data-cy=login-form]' },
  { path: '/scenarios', ready: '[data-cy=scenarios-view]' },
  { path: '/dashboard', ready: '[data-cy=dashboard-empty]' },
  { path: '/scenarios/compare?a=mock-a&b=mock-b', ready: '[data-cy=compare-card-b]' },
];

function fitsWidth() {
  cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth, 'page width').to.be.at.most(doc.documentElement.clientWidth);
  });
}

describe('responsive layout', () => {
  SCREENS.forEach((screen) => {
    describe(screen.name, () => {
      beforeEach(() => cy.viewport(screen.width, screen.height));

      PAGES.forEach((page) => {
        it(`${page.path} has no sideways scrolling`, () => {
          cy.visit(page.path);
          cy.get(page.ready).should('be.visible');
          fitsWidth();
        });
      });

      it('/results and the dashboard have no sideways scrolling after a full plan', () => {
        completePlan();
        cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');
        fitsWidth();
        cy.get('[data-cy=results-dashboard-button]').click();
        cy.get('[data-cy=dashboard-headline]').should('be.visible');
        fitsWidth();
      });
    });
  });
});
