// The two buyers on the 'About you' step (step 2, D38; mock data). The app models exactly two buyers, at least one a
// Singapore Citizen (D21), so both are always shown and there are no add/remove buttons. About you asks one question
// per screen: ages, who is buying (citizenship, first-timer), incomes, then CPF, cash and the move-in year.
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { back, backTimes, fillAges, fillIncomes, fillPath, fillSavings, fillSituation, next, seeResults } from './helpers/plan.js';

// Citizenship is a two-option choice: pick(n, 'PR') ticks it, citizenship(n, 'SC') gets that option's radio.
const citizenship = (n, value) => cy.get(`[data-cy=situation-buyer-${n}-citizenship-${value}]`);
const pick = (n, value) => citizenship(n, value).check({ force: true });
// The error message shown under one buyer's field (field: age, citizenship, income or cpf).
const fieldError = (n, field) => cy.get(`[data-cy=situation-buyer-${n}-${field}-error]`);
const onScreen = (part) => cy.get(`[data-cy=about-part-${part}]`).should('be.visible');

describe('buyers on the About you step', () => {
  beforeEach(() => {
    cy.visit('/plan');
    next(); // step 1 (what matters most) is optional
    // The form can take a moment to appear on a slow CI machine: wait longer for this one element only.
    cy.get('[data-cy=situation-buyer-2]', { timeout: 10000 }).should('exist');
  });

  it('asks one question per screen, in order, and the track fills as it goes', () => {
    onScreen('ages');
    fillAges();
    next();
    onScreen('buyers');
    cy.get('[data-cy=situation-buyer-1-age-input]').should('not.exist');
    next();
    onScreen('incomes');
    fillIncomes();
    cy.get('[data-cy=income-scene-total]').should('contain', 'S$10,000 a month together');
    next();
    onScreen('savings');
    back();
    onScreen('incomes');
  });

  it('always shows exactly two buyers, both Singapore Citizens by default, with no add or remove buttons', () => {
    cy.get('[data-cy^=situation-buyer-][data-cy$=-age-input]').should('have.length', 2);
    cy.get('[data-cy=situation-buyer-3]').should('not.exist');
    cy.get('[data-cy=situation-add-buyer-button]').should('not.exist');
    cy.get('[data-cy$=-remove-button]').should('not.exist');
    fillAges();
    next();
    citizenship(1, 'SC').should('be.checked');
    citizenship(2, 'SC').should('be.checked');
  });

  it('blocks two Permanent Residents with a message, then lets the user continue once one is a citizen', () => {
    fillAges();
    next();
    pick(1, 'PR');
    cy.get('[data-cy=situation-applicants-error]').should('be.empty');
    pick(2, 'PR'); // shows straight away, before Next
    cy.get('[data-cy=situation-applicants-error]').should('contain', 'At least one of you needs to be a Singapore Citizen.');
    next();
    cy.get('[data-cy=situation-applicants-error]').should('contain', 'At least one of you needs to be a Singapore Citizen.');
    onScreen('buyers'); // did not move on

    pick(1, 'SC');
    cy.get('[data-cy=situation-applicants-error]').should('be.empty'); // cleared straight away
    next();
    onScreen('incomes'); // moved on
  });

  it('"Who is buying?": radio buttons, a Yes / No switch, a "Why we ask" tooltip and no illustration', () => {
    fillAges();
    next();
    onScreen('buyers');
    cy.get('[data-cy=plan-step-art]').should('not.exist');
    // Keyboard order: You (citizenship, switch), The other buyer (citizenship, switch), Why we ask, Next. Each radio
    // group is one tab stop (only its checked radio), and arrow keys move within it, as native radios do.
    cy.get('[data-cy=plan-form]').then(($form) => {
      const stops = [...$form[0].querySelectorAll('input, button')]
        .filter((el) => el.type !== 'radio' || el.checked)
        .map((el) => el.dataset.cy);
      // First Back and the stepper's link to the step already reached (What matters), then the form.
      expect(stops.slice(0, 2)).to.deep.equal(['plan-step-back', 'stepper-go-1']);
      expect(stops.slice(2)).to.deep.equal([
        'situation-buyer-1-citizenship-SC', 'situation-buyer-1-first-timer-switch',
        'situation-buyer-2-citizenship-SC', 'situation-buyer-2-first-timer-switch',
        'about-why', 'plan-step-next',
      ]);
    });
    // The switch: on by default, named by its "First-timer" label, its state also in words.
    cy.get('[data-cy=situation-buyer-1-first-timer-switch]')
      .should('be.checked').and('have.attr', 'role', 'switch')
      .invoke('attr', 'aria-labelledby').then((id) => cy.get(`#${id}`).should('have.text', 'First-timer'));
    cy.get('[data-cy=situation-buyer-1] .switch__state').should('have.text', 'Yes');
    cy.get('[data-cy=situation-buyer-1] .switch').click();
    cy.get('[data-cy=situation-buyer-1-first-timer-switch]').should('not.be.checked');
    cy.get('[data-cy=situation-buyer-1] .switch__state').should('have.text', 'No');
    // Why we ask: a click opens it in the page (Next moves down, never covered), a second click closes it, Esc too.
    cy.get('[data-cy=about-why-tip]').should('not.be.visible');
    cy.get('[data-cy=about-why]').should('have.attr', 'aria-expanded', 'false').click();
    cy.get('[data-cy=about-why]').should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-cy=about-why-tip]').should('be.visible').and('contain', 'which grants you can get');
    cy.get('[data-cy=about-why]').click();
    cy.get('[data-cy=about-why-tip]').should('not.be.visible');
    cy.get('[data-cy=about-why]').click().type('{esc}');
    cy.get('[data-cy=about-why-tip]').should('not.be.visible'); // Esc closes it too
  });

  it('"Who is buying?" stacks on a 390px phone with no sideways scrolling, "Singapore Citizen" on one line', () => {
    cy.viewport(390, 844);
    fillAges();
    next();
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth));
    cy.get('[data-cy=situation-buyer-1]').then(($you) => {
      cy.get('[data-cy=situation-buyer-2]').should(($partner) => {
        expect($partner[0].getBoundingClientRect().top).to.be.greaterThan($you[0].getBoundingClientRect().bottom - 1);
      });
    });
    cy.get('[data-cy=situation-buyer-1-citizenship-SC]').parent().find('.cit__face').should(($face) => {
      expect($face[0].scrollWidth).to.be.at.most($face[0].clientWidth + 1);
      expect($face.height()).to.be.lessThan(60); // one line
    });
  });

  it('keeps the cents in money amounts (45,123.67 stays 45,123.67, not 4,512,367), and whole numbers in ages', () => {
    cy.get('[data-cy=situation-buyer-1-age-input]').clear().type('30.5');
    cy.get('[data-cy=situation-buyer-1-age-input]').blur().should('have.value', '30'); // the .5 goes, not joined on
    fillAges();
    next();
    next(); // who is buying: the defaults
    cy.get('[data-cy=situation-buyer-1-income-input]').clear().type('5,123.67');
    cy.get('[data-cy=situation-buyer-1-income-input]').should('have.value', '5,123.67');
    fillIncomes();
    next();
    cy.get('[data-cy=situation-buyer-1-cpf-input]').clear().type('45,123.67');
    cy.get('[data-cy=situation-buyer-1-cpf-input]').should('have.value', '45,123.67');
  });

  it('uses one box size across the plan on a phone: About you, Your BTO and the resale flat', () => {
    cy.viewport(375, 667);
    const is56 = ($el) => expect($el[0].getBoundingClientRect().height).to.equal(56);
    cy.get('[data-cy=situation-buyer-1-age-input]').closest('.big-box').should(is56);
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.css', 'font-size', '19px');
    fillSituation();
    next();
    cy.get('[data-cy=patha-town-select]').should(is56);
    fillPath('patha');
    next();
    cy.get('[data-cy=pathb-town-select]').should(is56);
    cy.get('[data-cy=pathb-asking-price-input]').closest('.pf__box').should(is56);
    cy.get('[data-cy=pathb-asking-price-input]').should('have.css', 'font-size', '19px');
  });

  it('accepts a citizen with a Permanent Resident', () => {
    fillAges();
    next();
    pick(2, 'PR');
    next();
    fillIncomes();
    next();
    fillSavings();
    next();
    cy.get('[data-cy=plan-step-3-panel]').should('exist');
  });

  it('checks each buyer separately and says which field is wrong', () => {
    fillAges();
    cy.get('[data-cy=situation-buyer-2-age-input]').clear(); // buyer 2: age missing
    next();
    cy.get('[data-cy=plan-step-errors]').should('not.exist'); // a short screen: messages under the boxes only
    cy.focused().should('have.attr', 'data-cy', 'situation-buyer-2-age-input'); // the cursor in the box to fix
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.class', 'is-invalid');
    fieldError(2, 'age').should('contain', 'Enter an age.');
    cy.get('[data-cy=situation-buyer-1-age-input]').should('not.have.class', 'is-invalid');

    cy.get('[data-cy=situation-buyer-2-age-input]').type('29');
    next();
    next();
    fillIncomes(['120000', '5000']); // buyer 1: a yearly figure
    next();
    onScreen('incomes');
    cy.get('[data-cy=situation-buyer-1-income-input]').should('have.class', 'is-invalid');
    fieldError(1, 'income').should('contain', 'yearly figure');
    cy.get('[data-cy=situation-buyer-2-income-input]').should('not.have.class', 'is-invalid');
  });

  it('keeps both buyers’ answers when going back, including from Results', () => {
    fillAges(); // buyer 1 is 30, buyer 2 is 29
    next();
    pick(2, 'PR');
    next();
    fillIncomes();
    next();
    fillSavings();
    next();
    back(); // Your BTO -> the last About you screen
    onScreen('savings');
    backTimes(3);
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '30');
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.value', '29');
    next();
    citizenship(2, 'PR').should('be.checked');

    next();
    next();
    next();
    fillPath('patha');
    next();
    fillPath('pathb', { town: 'BEDOK' });
    next();
    seeResults();
    cy.location('pathname').should('eq', '/results');

    cy.get('[data-cy=results-edit-button]').click();
    cy.get('[data-cy=plan-step-4-panel]').should('exist'); // back on the resale step
    backTimes(5);
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '30');
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.value', '29');
    next();
    citizenship(2, 'PR').should('be.checked');
  });

  it('checks an age once the box is left, then as the user types, and Enter acts as Next', () => {
    cy.get('[data-cy=situation-buyer-1-age-input]').type('2');
    cy.get('[data-cy=situation-buyer-1-age-error]').should('not.exist'); // not mid-typing
    cy.get('[data-cy=situation-buyer-2-age-input]').focus(); // Tab order: You, then The other buyer
    cy.get('[data-cy=situation-buyer-1-age-error]').should('contain', 'Enter an age between 21 and 99.');
    cy.get('[data-cy=situation-buyer-1-age-input]').type('7'); // now 27
    cy.get('[data-cy=situation-buyer-1-age-error]').should('not.exist');
    cy.get('[data-cy=situation-buyer-1-age-input]').clear().type('abc');
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', ''); // digits only
    cy.get('[data-cy=situation-buyer-1-age-input]').type('30');
    cy.get('[data-cy=situation-buyer-2-age-input]').type('29{enter}');
    onScreen('buyers');
  });

  it('above the BTO income limit in the year they apply, says so instead of the EHG estimate (D36)', () => {
    fillAges();
    next();
    next();
    fillIncomes(['8000', '8000']); // S$16,000 now: at the S$16,000 limit; about S$16,320 next year at 2%
    cy.get('[data-cy=situation-ceiling-hint]')
      .should('contain', 'above the S$16,000 a month limit for buying a BTO flat')
      .and('contain', 'about S$16,320 a month together')
      .and('contain', 'resale flats, which have no income limit')
      .and('contain', 'bank loan');
    cy.get('[data-cy=situation-ehg-hint]').should('not.exist');
    fillIncomes(['7000', '7000']);
    cy.get('[data-cy=situation-ceiling-hint]').should('not.exist');
  });

  it('adds commas as incomes are typed and shows the total', () => {
    fillAges();
    next();
    next();
    cy.get('[data-cy=situation-buyer-1-income-input]').type('4200').should('have.value', '4,200');
    cy.get('[data-cy=situation-income-total]').should('not.exist'); // only once both are in
    cy.get('[data-cy=situation-buyer-2-income-input]').type('3600');
    cy.get('[data-cy=situation-income-total]').should('have.text', 'Together: S$7,800 a month');
  });

  it('asks to double-check a CPF balance far above normal for the age, without blocking Next', () => {
    fillAges(['25', '29']);
    next();
    next();
    fillIncomes();
    next();
    cy.get('[data-cy=situation-buyer-1-cpf-input]').type('400000').should('have.value', '400,000');
    cy.get('[data-cy=situation-buyer-1-cpf-high]').should('contain', 'higher than usual');
    cy.get('[data-cy=situation-buyer-2-cpf-input]').type('40000');
    cy.get('[data-cy=situation-buyer-2-cpf-high]').should('not.exist');
    next(); // cash left empty
    cy.get('[data-cy=situation-cash-savings-input]').should('have.class', 'is-invalid').and('be.focused');
    cy.contains('Enter an amount, or 0 if none.').should('be.visible');
    cy.get('[data-cy=situation-cash-savings-input]').type('0');
    next();
    cy.get('[data-cy=plan-step-3-panel]').should('exist'); // moved on to Your BTO
  });

  it('shows a six-figure CPF balance in full on a phone', () => {
    cy.viewport(390, 844);
    fillAges();
    next();
    next();
    fillIncomes();
    next();
    cy.get('[data-cy=situation-buyer-1-cpf-input]').type('190000');
    // The text fits its box: nothing is scrolled out of view. 1px of slack: the box sits in a flex row, so its width
    // can be fractional, and scrollWidth rounds up where clientWidth rounds down.
    cy.get('[data-cy=situation-buyer-1-cpf-input]').should(($el) => {
      expect($el[0].scrollWidth, 'text width').to.be.at.most($el[0].clientWidth + 1);
    });
  });
});
