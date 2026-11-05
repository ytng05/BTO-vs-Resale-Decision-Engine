// Every page fits a phone, a tablet and a laptop screen, upright and on its side, without sideways scrolling; on a
// short landscape screen, bars pinned to the top or bottom leave at least half the height for the page (mock data).
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.

import { next, fillSituation, fillPath, seeResults } from './helpers/plan.js';

const SCREENS = [
  { name: 'phone (iPhone SE)', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'Bootstrap XL (1200)', width: 1200, height: 800 },
  { name: 'desktop landscape', width: 1440, height: 900 },
  { name: 'phone landscape', width: 667, height: 375 },
  { name: 'tablet landscape', width: 1024, height: 768 },
];

// Pages that open straight from a URL, each with one element that shows it has finished loading.
const PAGES = [
  { path: '/', ready: '[data-cy=home-title]' },
  { path: '/plan', ready: '[data-cy=wishes-form]' },
  { path: '/preview', ready: '[data-cy=preview-empty]' },
  { path: '/sources', ready: '[data-cy=sources-title]' },
  { path: '/login', ready: '[data-cy=login-choice-register]' },
  { path: '/scenarios', ready: '[data-cy=scenarios-view]' },
  { path: '/dashboard', ready: '[data-cy=dashboard-empty]' },
  { path: '/scenarios/compare?a=mock-a&b=mock-b', ready: '[data-cy=compare-card-b]' },
];

function fitsWidth() {
  cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth, 'page width').to.be.at.most(doc.documentElement.clientWidth);
  });
}

// Bars pinned across the screen (position fixed or sticky, e.g. the compare bar) together take at most half the height.
// A pinned side column (the dashboard's What-if panel) sits beside the content, not over it, so it does not count.
// Measured at the top of the page only, so a bar that appears only after scrolling is not checked. Retries, in case a
// bar is still animating in.
function leavesRoomToRead() {
  cy.window().should((win) => {
    const pinned = [...win.document.body.querySelectorAll('*')].filter((el) => {
      const { position } = win.getComputedStyle(el);
      if (position !== 'fixed' && position !== 'sticky') return false;
      const rect = el.getBoundingClientRect();
      return rect.height > 0 && rect.bottom > 0 && rect.top < win.innerHeight && rect.width >= win.innerWidth * 0.8;
    });
    // Count only the outermost pinned elements, so a pinned bar inside another is not counted twice.
    const outermost = pinned.filter((el) => !pinned.some((other) => other !== el && other.contains(el)));
    const height = outermost.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0);
    expect(height, 'height of pinned bars').to.be.at.most(win.innerHeight / 2);
  });
}

describe('responsive layout', () => {
  SCREENS.forEach((screen) => {
    describe(screen.name, () => {
      beforeEach(() => cy.viewport(screen.width, screen.height));

      PAGES.forEach((page) => {
        it(`${page.path} fits the screen`, () => {
          cy.visit(page.path);
          cy.get(page.ready).should('be.visible');
          fitsWidth();
          leavesRoomToRead();
        });
      });

      it('/preview, /results and the dashboard fit the screen after a full plan', () => {
        cy.visit('/plan');
        next();
        fillSituation();
        next();
        fillPath('patha');
        next();
        fillPath('pathb', { town: 'BEDOK' });
        next();
        cy.get('[data-cy=preview-see-results]', { timeout: 10000 }).should('be.visible');
        fitsWidth();
        leavesRoomToRead();
        seeResults();
        cy.location('pathname').should('eq', '/results');
        cy.get('[data-cy=results-confidence-headline]').should('be.visible');
        fitsWidth();
        leavesRoomToRead();
        cy.get('[data-cy=results-dashboard-button]').click();
        cy.get('[data-cy=dashboard-headline]').should('be.visible');
        fitsWidth();
        leavesRoomToRead();
      });
    });
  });
});
