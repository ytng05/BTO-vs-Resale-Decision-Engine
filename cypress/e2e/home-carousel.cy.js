// "How it works" carousel on the home page: moves by itself, but can be paused, stops while the user is in it,
// and never auto-plays under prefers-reduced-motion.

const visitHome = (reduce = false) =>
  cy.visit('/', {
    onBeforeLoad(win) {
      const real = win.matchMedia.bind(win);
      cy.stub(win, 'matchMedia').callsFake((q) =>
        (q.includes('prefers-reduced-motion')
          ? { matches: reduce, media: q, addEventListener() {}, removeEventListener() {} }
          : real(q)));
    },
  });

describe('home: how it works', () => {
  it('moves on by itself, and stops when paused', () => {
    cy.clock(Date.now(), ['setInterval', 'clearInterval']); // only the auto-advance; Vue's transition timers run for real
    visitHome();
    cy.get('[data-cy=home-carousel-slide-1]').should('be.visible');
    cy.tick(7000);
    cy.get('[data-cy=home-carousel-slide-2]').should('exist');

    cy.get('[data-cy=home-carousel-toggle]').should('contain', 'Pause').click().should('contain', 'Play');
    cy.get('[data-cy=home-carousel-toggle]').blur();
    cy.get('[data-cy=home-carousel]').trigger('mouseleave');
    cy.tick(21000);
    cy.get('[data-cy=home-carousel-slide-2]').should('exist');
  });

  it('steps with Previous, Next and the dots, wrapping round', () => {
    visitHome();
    cy.get('[data-cy=home-carousel-prev]').click();
    cy.get('[data-cy=home-carousel-slide-4]').should('contain', 'See which ends ahead');
    cy.get('[data-cy=home-carousel-next]').click();
    cy.get('[data-cy=home-carousel-slide-1]').should('exist');
    cy.get('[data-cy=home-carousel-dot-3]').click().should('have.attr', 'aria-current', 'step');
    cy.get('[data-cy=home-carousel-slide-3]').should('have.attr', 'aria-label', '3 of 4: Pick a resale flat');
  });

  it('holds still, with no Pause button, under prefers-reduced-motion', () => {
    cy.clock(Date.now(), ['setInterval', 'clearInterval']); // only the auto-advance; Vue's transition timers run for real
    visitHome(true);
    cy.get('[data-cy=home-carousel-toggle]').should('not.exist');
    cy.tick(21000);
    cy.get('[data-cy=home-carousel-slide-1]').should('exist');
  });

  it('fits a 375px phone screen without sideways scrolling', () => {
    cy.viewport(375, 667);
    visitHome();
    cy.get('[data-cy=home-carousel]').scrollIntoView().should('be.visible');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
  });
});

describe('home: example and sources', () => {
  it('See an example opens a full Results page with no form to fill in', () => {
    cy.visit('/');
    cy.get('[data-cy=home-example-button]').click();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-breakeven-sentence]', { timeout: 10000 }).should('be.visible');
  });

  it('says where the prices come from, and links to the sources', () => {
    cy.visit('/');
    cy.get('[data-cy=home-trust]').should('contain', 'data.gov.sg');
    cy.get('[data-cy=home-sources-link]').click();
    cy.location('pathname').should('eq', '/sources');
  });
});
