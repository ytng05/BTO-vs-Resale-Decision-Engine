// Results: "What to do next" (official steps with their links) and "Print or save as PDF" (the browser's
// print dialog, with a print layout: no nav or buttons, a header naming what was compared).
import { completePlan } from './helpers/plan.js';

const media = (type) => Cypress.automation('remote:debugger:protocol', {
  command: 'Emulation.setEmulatedMedia',
  params: { media: type },
});

describe('results: next steps and print', () => {
  beforeEach(() => completePlan());
  afterEach(() => media(''));

  it('lists what to do next, each step linking to an official page in a new tab', () => {
    cy.get('[data-cy=results-next-steps]').scrollIntoView().should('contain', 'HDB Flat Eligibility (HFE) letter');
    cy.get('[data-cy=results-next-steps] a').should('have.length', 5).each(($a) => {
      expect($a.attr('href')).to.match(/^https:\/\/www\.(hdb|cpf|moneysense|mynicehome)\.gov\.sg\//);
      expect($a.attr('target')).to.eq('_blank');
      expect($a.attr('rel')).to.contain('noopener');
    });
  });

  it('opens the print dialog, and prints the results without the nav or the buttons', () => {
    cy.window().then((win) => cy.stub(win, 'print').as('print'));
    cy.get('[data-cy=results-print-button]').click();
    cy.get('@print').should('have.been.calledOnce');
    // The chart and heatmap only draw once opened: printing opens them first.
    cy.get('[data-cy=results-section-chart]').should('have.attr', 'open');
    cy.get('[data-cy=results-section-heatmap]').should('have.attr', 'open');

    cy.get('[data-cy=results-print-header]').should('not.be.visible');
    cy.wrap(null).then(() => media('print'));
    cy.get('[data-cy=results-print-header]').should('be.visible').and('contain', 'compared with').and('contain', 'resale');
    cy.get('[data-cy=nav-bar]').should('not.be.visible');
    cy.get('[data-cy=results-print-button]').should('not.be.visible');
    cy.get('[data-cy=results-save]').should('not.be.visible');
    cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');
    cy.get('[data-cy=results-next-steps]').should('be.visible');
  });
});
