// Home page: the two ways in with the city illustration, how it works (timeline), what you'll get (feature grid),
// the costs people forget (a moving strip with back / pause / next), the FAQ and the closing call to action.

describe('home', () => {
  it('offers Start planning and See an example', () => {
    cy.visit('/');
    cy.get('[data-cy=home-title]').should('contain', 'BTO or resale');
    cy.get('[data-cy=home-start-button]').should('have.attr', 'href').and('include', '/login');
    cy.get('[data-cy=home-example-button]').should('be.visible');
  });

  it('See an example opens a full Results page with no form to fill in', () => {
    cy.visit('/');
    cy.get('[data-cy=home-example-button]').click();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-confidence-headline]', { timeout: 10000 }).should('be.visible');
  });

  it('asks before the example replaces a plan the user has started, keeps it on "Keep my plan", replaces it on "Show the example"', () => {
    cy.visit('/plan');
    cy.get('[data-cy=wish-parents]').click();
    cy.get('[data-cy=plan-step-next]').click();
    cy.get('[data-cy=situation-buyer-1-age-input]').type('31');
    cy.get('[data-cy=nav-brand-home]').click(); // in-app navigation: the plan lives in memory, not across reloads
    cy.get('[data-cy=home-example-button]').click();
    cy.get('[data-cy=home-example-confirm]').should('contain', 'replaces what you');
    cy.focused().should('have.attr', 'data-cy', 'home-example-confirm-yes');
    cy.get('[data-cy=home-example-confirm-no]').click();
    cy.get('[data-cy=home-example-confirm]').should('not.exist');
    cy.location('pathname').should('eq', '/');
    cy.get('[data-cy=nav-plan-link]').click({ force: true });
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '31');

    // "Show the example" goes ahead and opens it.
    cy.get('[data-cy=nav-brand-home]').click();
    cy.get('[data-cy=home-example-button]').click();
    cy.get('[data-cy=home-example-confirm-yes]').click();
    cy.location('pathname').should('eq', '/results');
  });

  it('lists the four plan steps, each with what to have to hand', () => {
    cy.visit('/');
    cy.get('[data-cy^=home-step-]').should('have.length', 4);
    ['What matters', 'About you', 'Your BTO', 'Resale flat'].forEach((t, i) => {
      cy.get(`[data-cy=home-step-${i + 1}]`).scrollIntoView().should('contain', t);
    });
  });

  it('lists the eight costs people forget, each with its explanation showing', () => {
    cy.visit('/');
    cy.get('[data-cy=home-costs]').scrollIntoView();
    cy.get('[data-cy^=home-cost-]').should('have.length', 8); // the looping copy has no data-cy, so it isn't counted
    cy.get('[data-cy=home-cost-2]').should('contain', 'Rent while you wait')
      .find('[data-cy=home-tile-text]').should('contain', 'keys').and('have.css', 'opacity', '1');
  });

  it('lets the user pause the moving costs and step through them one by one', () => {
    cy.visit('/');
    cy.get('[data-cy=home-costs]').scrollIntoView();
    cy.get('[data-cy=home-costs-toggle]').should('have.attr', 'aria-label', 'Pause the moving tiles').click();
    cy.get('[data-cy=home-costs-toggle]').should('have.attr', 'aria-label', 'Play the moving tiles');
    cy.get('[data-cy=home-costs-strip]').then(($s) => {
      const start = $s[0].scrollLeft;
      cy.get('[data-cy=home-costs-next]').click();
      cy.get('[data-cy=home-costs-strip]').should(($m) => expect($m[0].scrollLeft).to.be.greaterThan(start));
    });
    cy.get('[data-cy=home-costs-prev]').click();
    cy.get('[data-cy=home-costs-toggle]').click().should('have.attr', 'aria-label', 'Pause the moving tiles');
  });

  it('opens and closes the FAQ answers, the first one open', () => {
    cy.visit('/');
    cy.get('[data-cy=home-faq-1]').should('have.attr', 'open');
    cy.get('[data-cy=home-faq-2]').should('not.have.attr', 'open');
    cy.get('[data-cy=home-faq-2] summary').scrollIntoView().click();
    cy.get('[data-cy=home-faq-2]').should('have.attr', 'open');
    cy.get('[data-cy=home-sources-link]').click();
    cy.location('pathname').should('eq', '/sources');
  });

  it('keeps the costs strip still under prefers-reduced-motion', () => {
    // Cypress can't switch the media feature on in Electron, so answer that one media query as "reduce".
    cy.visit('/', {
      onBeforeLoad(win) {
        const real = win.matchMedia.bind(win);
        win.matchMedia = (q) => (/prefers-reduced-motion:\s*reduce/.test(q)
          ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
          : real(q));
      },
    });
    cy.get('[data-cy=home-costs]').scrollIntoView();
    cy.get('[data-cy=home-costs-toggle]').should('have.attr', 'aria-label', 'Play the moving tiles');
    // and the page's reduced-motion rules are loaded (hover lifts and transitions switched off)
    cy.document().then((doc) => {
      const rules = [...doc.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } });
      const reduce = rules.filter((r) => r.media && /prefers-reduced-motion:\s*reduce/.test(r.media.mediaText));
      expect(reduce.map((r) => r.cssText).join(' ')).to.match(/home-tile/);
    });
  });

  it('fits a 375px phone screen without sideways scrolling, the illustration under the buttons', () => {
    cy.viewport(375, 667);
    cy.visit('/');
    cy.get('[data-cy=hero-scene]').scrollIntoView().should('be.visible');
    cy.get('[data-cy=home-start-button]').then(($b) => {
      cy.get('[data-cy=hero-scene]').then(($s) => {
        expect($s[0].getBoundingClientRect().top).to.be.greaterThan($b[0].getBoundingClientRect().top);
      });
    });
    cy.get('[data-cy=home-costs-next]').scrollIntoView().should('be.visible');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
  });
});