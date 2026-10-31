// Login page (mock data): Home's "Start planning" leads here; "I have an account" or "I'm new here", then the form,
// or "Plan without an account" straight to the plan.
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`. Login and register are
// mocked in that build, so nothing is written to a database.

describe('login page', () => {
  it('Start planning on Home leads to the three choices, with no form yet', () => {
    cy.visit('/');
    cy.get('[data-cy=home-start-button]').click();
    cy.location('pathname').should('eq', '/login');
    cy.get('[data-cy=login-choice-login]').should('contain', 'Log in');
    cy.get('[data-cy=login-choice-register]').should('contain', 'Create account');
    cy.get('[data-cy=login-choice-guest]').should('contain', 'Plan without an account');
    cy.get('[data-cy=login-bubble-login]').should('contain', 'see your saved scenarios');
    cy.get('[data-cy=login-bubble-register]').should('contain', 'Create a free account');
    cy.get('[data-cy=login-bubble-guest]').should('contain', "won't be saved");
    cy.get('[data-cy^=login-choice-]').should('have.length', 3);
    cy.get('[data-cy=login-form]').should('not.exist');
  });

  it("I'm new here asks for name, email and password, checks them, and Back returns to the choices", () => {
    cy.visit('/login');
    cy.get('[data-cy=login-choice-register]').click();
    cy.get('[data-cy=login-title]').should('contain', 'Create your account');
    cy.get('[data-cy=login-name-input]').should('be.visible');
    cy.get('[data-cy=login-email-input]').should('be.visible');
    cy.get('[data-cy=login-password-input]').should('be.visible');

    cy.get('[data-cy=login-submit-button]').click();
    cy.get('[data-cy=login-name-error]').should('contain', 'Enter your name');
    cy.get('[data-cy=login-password-input]').type('short');
    cy.get('[data-cy=login-submit-button]').click();
    cy.get('[data-cy=login-password-error]').should('contain', 'at least 8 characters');
    cy.get('[data-cy=login-back-button]').click();
    cy.get('[data-cy=login-form]').should('not.exist');
    cy.get('[data-cy^=login-choice-]').should('have.length', 3);
  });

  it('I have an account asks for email and password only', () => {
    cy.visit('/login');
    cy.get('[data-cy=login-choice-login]').click();
    cy.get('[data-cy=login-title]').should('contain', 'Welcome back');
    cy.get('[data-cy=login-name-input]').should('not.exist');
    cy.get('[data-cy=login-email-input]').should('be.visible');
    cy.get('[data-cy=login-password-input]').should('be.visible');
  });

  it('Plan without an account goes straight to the plan, with nothing to fill in', () => {
    cy.visit('/');
    cy.get('[data-cy=home-start-button]').click();
    cy.get('[data-cy=login-choice-guest]').click();
    cy.location('pathname').should('eq', '/plan');
  });

    it('the navbar Log in link opens the log-in form straight away', () => {
    cy.visit('/');
    cy.get('[data-cy=nav-login-link]').click({ force: true }); // force: on phones the link sits in the closed menu
    cy.get('[data-cy=login-title]').should('contain', 'Welcome back');
    cy.get('[data-cy=login-email-input]').should('be.visible');
    cy.get('[data-cy^=login-choice-]').should('not.exist');
  });

  it('creating an account goes on to the plan', () => {
    cy.visit('/login?redirect=/plan');
    cy.get('[data-cy=login-choice-register]').click();
    cy.get('[data-cy=login-name-input]').type('Test Buyer');
    cy.get('[data-cy=login-email-input]').type('buyer@example.com');
    cy.get('[data-cy=login-password-input]').type('a-long-password');
    cy.get('[data-cy=login-submit-button]').click();
    cy.location('pathname').should('eq', '/plan');
  });

  it('someone already logged in goes straight to the plan', () => {
    cy.visit('/login?redirect=/plan', {
      onBeforeLoad(win) {
        win.localStorage.setItem('hdb-app:auth', JSON.stringify({ token: 'mock-token', user: { name: 'Test Buyer', email: 'buyer@example.com' } }));
      },
    });
    cy.location('pathname').should('eq', '/plan');
  });
});
