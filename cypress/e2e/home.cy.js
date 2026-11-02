// Home page (Calm home board): the two ways in, the crossing scene, how it works, what you'll get, the costs
// people forget, the FAQ and the closing call to action.

describe('home', () => {
  it('offers Start planning and See an example, and says it takes four short steps', () => {
    cy.visit('/');
    cy.get('[data-cy=home-title]').should('contain', 'BTO or resale');
    cy.get('[data-cy=home-start-button]').should('have.attr', 'href').and('include', '/login');
    cy.get('[data-cy=home-example-button]').should('be.visible');
    cy.contains('4 short steps').should('be.visible');
  });

  it('See an example opens a full Results page with no form to fill in', () => {
    cy.visit('/');
    cy.get('[data-cy=home-example-button]').click();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-breakeven-sentence]', { timeout: 10000 }).should('be.visible');
  });

  it('asks before the example replaces a plan the user has started, and keeps it on "Keep my plan"', () => {
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

    cy.get('[data-cy=nav-brand-home]').click();
    cy.get('[data-cy=home-example-link]').scrollIntoView().click();
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

  it('lists the eight costs people forget, each opening its explanation on focus', () => {
    cy.visit('/');
    cy.get('[data-cy=home-costs]').scrollIntoView();
    cy.get('[data-cy^=home-cost-]').should('have.length', 8);
    cy.get('[data-cy=home-cost-2]').should('contain', 'Rent while you wait')
      .find('.home-tile__text').should('have.css', 'opacity', '0');
    cy.get('[data-cy=home-cost-2]').focus().find('.home-tile__text').should('have.css', 'opacity', '1');
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

  it('holds the scene still under prefers-reduced-motion', () => {
    cy.visit('/');
    // Cypress can't switch the media feature on in Electron, so check the scene's reduced-motion rule is loaded.
    cy.document().then((doc) => {
      const rules = [...doc.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } });
      const reduce = rules.filter((r) => r.media && /prefers-reduced-motion:\s*reduce/.test(r.media.mediaText));
      expect(reduce.map((r) => r.cssText).join(' ')).to.match(/cs-goR/);
    });
  });

  it('fits a 375px phone screen without sideways scrolling, bubbles hidden', () => {
    cy.viewport(375, 667);
    cy.visit('/');
    cy.get('[data-cy=hero-scene]').should('be.visible');
    cy.get('[data-cy=hero-scene] .cs-bubbles').should('have.css', 'display', 'none'); // Cypress misjudges visibility on SVG groups
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
  });
});
