// The plan's error summary: each validation error (planValidation.js, keyed like 'applicants.0.age' or 'town')
// as a line that names its field ("Your partner's age: Enter an age.") and the field to move focus to.
// Pure, so it is unit-tested; ErrorSummary.vue renders it.

const BUYER_FIELDS = {
  age: { label: 'age', cy: 'age-input' },
  citizenship: { label: 'citizenship', cy: 'citizenship-SC' },
  firstTimer: { label: 'first-timer answer', cy: 'first-timer-switch' },
  monthlyIncome: { label: 'monthly income', cy: 'income-input' },
  cpfOaBalance: { label: 'CPF Ordinary Account balance', cy: 'cpf-input' },
};

const OTHER_FIELDS = {
  applicants: { label: 'Buyers', cy: 'situation-buyer-1-citizenship-SC' },
  cashSavings: { label: 'Cash savings', cy: 'situation-cash-savings-input' },
  moveInByYear: { label: 'Move-in year', cy: 'situation-move-in-by-input' },
};

// Path steps: '{prefix}' is patha (Your BTO) or pathb (Resale flat), as PathForm's data-cy attributes.
const PATH_FIELDS = {
  town: { label: 'Town', cy: '{prefix}-town-select' },
  classification: { label: 'Launch', cy: '{prefix}-project' },
  flatType: { label: 'Flat type', cy: '{prefix}-flat-type' },
  leaseBand: { label: 'Remaining lease', cy: '{prefix}-lease-band' },
  resalePrice: { label: 'Asking price', cy: '{prefix}-asking-price-input' },
  livingArrangement: { label: 'Your parents', cy: '{prefix}-living' },
};

// step: the plan step (1 About you, 2 Your BTO, 3 Resale flat). Returns [{ key, label, message, cy }],
// cy null when the error has no field on this step (it is still listed, without a link).
export function summariseErrors(step, errors) {
  const prefix = step === 2 ? 'patha' : 'pathb';
  return Object.entries(errors ?? {}).map(([key, message]) => {
    const buyer = /^applicants\.(\d+)\.(\w+)$/.exec(key);
    if (buyer) {
      const n = Number(buyer[1]) + 1;
      const field = BUYER_FIELDS[buyer[2]];
      // Buyer 1 is the person filling in the plan, buyer 2 their partner, as the About you questions say.
      const whose = n === 1 ? 'Your' : "Your partner's";
      return {
        key,
        label: `${whose} ${field?.label ?? buyer[2]}`,
        message,
        cy: field ? `situation-buyer-${n}-${field.cy}` : null,
      };
    }
    const field = step === 1 ? OTHER_FIELDS[key] : PATH_FIELDS[key];
    return {
      key,
      label: field?.label ?? null,
      message,
      cy: field ? field.cy.replace('{prefix}', prefix) : null,
    };
  });
}
