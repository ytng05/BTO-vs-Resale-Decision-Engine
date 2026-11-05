// Every page fits a phone, a tablet and a laptop screen, upright and on its side, without sideways scrolling; on a
// short landscape screen, bars pinned to the top or bottom leave at least half the height for the page (mock data).
// Also logged in (the navbar is wider then), and that the plan's step labels are not cut off.
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.

import { completePlan, fillAges, next } from './helpers/plan.js';

const SCREENS = [
  { name: 'phone (iPhone SE)', width: 375, height: 667 },
  { name: 'phone (iPhone 15)', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'phone landscape', width: 667, height: 375 },
  { name: 'tablet landscape', width: 1024, height: 768 },
  { name: 'tablet landscape (iPad Air)', width: 1180, height: 820 },
];

// Pages that open straight from a URL, each with one element that shows it has finished loading.
const PAGES = [
  { path: '/', ready: '[data-cy=home-title]' },
  { path: '/plan', ready: '[data-cy=wishes-form]' },
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

// No visible label is cut short with an ellipsis (its text is wider than its box).
function notCutOff(selector) {
  cy.get(selector).each(($el) => {
    const el = $el[0];
    if (!el.getClientRects().length) return; // hidden at this width
    expect(el.scrollWidth, `${selector} "${el.textContent.trim()}" fits`).to.be.at.most(el.clientWidth + 1);
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

      it('fits the screen when logged in', () => {
        // A stored token and a stubbed list: the navbar shows My scenarios and the avatar instead of Log in.
        const scenarios = [1, 2, 3].map((n) => ({ id: `s${n}`, name: `Plan ${n}`, rulesetVersion: '2026-08-24', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', summary: {} }));
        cy.intercept('GET', '/api/scenarios', { body: { scenarios } });
        cy.visit('/scenarios', {
          onBeforeLoad(win) {
            win.localStorage.setItem('hdb-app:auth', JSON.stringify({ token: 'stub-token', user: { name: 'Test Buyer', email: 'buyer@example.com' } }));
          },
        });
        cy.get('[data-cy=nav-account-toggle]').should('be.visible');
        fitsWidth();
      });

      it('shows the plan steps without cutting off their names', () => {
        cy.visit('/plan');
        next();
        fillAges();
        next();
        next(); // About you's incomes screen: its card sits beside a picture, so the labels have the least room
        notCutOff('[data-cy=stepper] .seg-track__label');
      });

      it('/results and the dashboard fit the screen after a full plan', () => {
        completePlan();
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

  // A chart drawn at desktop width must not hold a dashboard pop-up open when the screen gets narrower (rotating a
  // tablet, resizing a window): Price history's chart kept the pop-up 880px wide, its close button off the screen.
  it('the Price history pop-up shrinks with the screen', () => {
    cy.viewport(1280, 800);
    completePlan();
    cy.get('[data-cy=results-dashboard-button]').click();
    cy.get('[data-cy=dashboard-headline]').should('be.visible');
    cy.get('[data-cy=dashboard-explore-rpi]').click();
    cy.get('[data-cy=results-rpi-card] canvas').should('be.visible');
    [[820, 1180], [375, 667]].forEach(([width, height]) => {
      cy.viewport(width, height);
      cy.window().should((win) => {
        const box = win.document.querySelector('.dash-modal__box').getBoundingClientRect();
        expect(box.right, `pop-up right edge at ${width}px`).to.be.at.most(win.innerWidth);
        expect(box.left, `pop-up left edge at ${width}px`).to.be.at.least(0);
      });
    });
    cy.get('[data-cy=dashboard-modal-close]').click();
  });
});
