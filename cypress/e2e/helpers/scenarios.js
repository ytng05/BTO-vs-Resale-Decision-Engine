// Shared Cypress steps for specs that need saved scenarios. Not a spec file (no .cy.js).
// They use the real API, because /api/scenarios is real even on the mock build, so they need a database.

const AUTH_KEY = 'hdb-app:auth'; // where stores/auth.js keeps the token

let users = 0;
// Registers a new user and stores the token where stores/auth.js looks for it; survives cy.visit.
export function registerFreshUser() {
  users += 1;
  cy.request('POST', '/api/auth/register', {
    name: 'E2E tester',
    email: `e2e-${Date.now()}-${users}@example.com`,
    password: 'e2e-password-123',
  }).then(({ body }) => {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify({ token: body.token, user: body.user }));
  });
}

// Saves a valid plan for the registered user: same shape as the store (dollars, growth as fractions).
export function saveScenario(name, assumptions = {}) {
  cy.then(() => {
    const { token } = JSON.parse(window.localStorage.getItem(AUTH_KEY));
    cy.request({
      method: 'POST',
      url: '/api/scenarios',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name,
        profile: {
          applicants: [
            { id: 'applicant-1', age: 30, citizenship: 'SC', firstTimer: true, monthlyIncome: 5000, cpfOaBalance: 40000 },
            { id: 'applicant-2', age: 29, citizenship: 'SC', firstTimer: true, monthlyIncome: 5000, cpfOaBalance: 40000 },
          ],
          cashSavings: 20000,
          constraints: { moveInByYear: null },
        },
        choiceA: { path: 'BTO', applicationYear: new Date().getFullYear() + 1, town: 'TAMPINES', flatType: '4 ROOM', classification: 'STANDARD' },
        choiceB: { path: 'RESALE', applicationYear: new Date().getFullYear() + 1, town: 'BEDOK', flatType: '4 ROOM', livingArrangement: 'NONE', leaseBand: '80-89' },
        assumptions: { annualPriceGrowth: 0.03, annualIncomeGrowth: 0.02, horizonYear: new Date().getFullYear() + 14, ...assumptions },
      },
    });
  });
}
