// Plain-English definitions of the housing and finance terms the app uses. One list feeds both the
// <Term> pop-ups next to the words and the Glossary on the Sources page (/sources#glossary-<id>).
// `section` links to the Sources rule section with the figures and official sources, where there is one.
// Figures quoted here match the ruleset of 24 Aug 2026; the Sources page shows the live values.
export const GLOSSARY = [
  {
    id: 'ehg',
    term: 'Enhanced CPF Housing Grant (EHG)',
    definition: 'A grant for households with at least one first-timer, buying a new or resale HDB flat: up to $120,000 for families earning up to $9,000 a month (less for a first-timer and second-timer couple). The lower your income, the bigger the grant. It goes into your CPF account and pays towards the flat.',
    section: 'ehg',
  },
  {
    id: 'family-grant',
    term: 'CPF Housing Grant (Family)',
    definition: 'A grant for first-timer families buying a resale flat. The amount depends on the flat size and whether you are citizens or permanent residents. At least one buyer must be a Singapore Citizen, and household income must be up to $16,000 a month.',
    section: 'family-grant',
  },
  {
    id: 'phg',
    term: 'Proximity Housing Grant (PHG)',
    definition: 'A grant for buying a resale flat to live with your parents or child, or within 4 km of them. Living with them gives the larger amount. Second-timers can get it too. HDB checks the 4 km distance itself.',
    section: 'phg',
  },
  {
    id: 'mop',
    term: 'Minimum occupation period (MOP)',
    definition: 'How long you must live in the flat before you can sell it or rent out the whole flat: 5 years for a Standard flat, 10 years for Plus and Prime flats. It counts from when you get the keys.',
    section: 'flat-types',
  },
  {
    id: 'clawback',
    term: 'Subsidy clawback',
    definition: 'Plus and Prime flats are sold with extra subsidies. When you sell one, you pay back a share of the resale price to HDB. The share is set for each project when it launches.',
    section: 'flat-types',
  },
  {
    id: 'ltv',
    term: 'Loan-to-value limit (LTV)',
    definition: 'The most you can borrow, as a share of the price or the valuation, whichever is lower: up to 75% for an HDB loan. A lease that will not last until the youngest buyer is 95 lowers it.',
    section: 'loans',
  },
  {
    id: 'valuation',
    term: 'Valuation',
    definition: "HDB's view of what a resale flat is worth. Your loan and CPF use are based on the lower of the price and the valuation. We use the median of recent sales as the valuation.",
    section: 'loans',
  },
  {
    id: 'cov',
    term: 'Cash over valuation (COV)',
    definition: 'The part of a resale price above the valuation. It must be paid in cash: not from CPF and not with the loan.',
  },
  {
    id: 'bsd',
    term: "Buyer's Stamp Duty (BSD)",
    definition: 'A tax on buying property, worked out in tiers on the price or the valuation, whichever is higher. It is due soon after you sign and can be paid from CPF.',
    section: 'costs',
  },
  {
    id: 'oa',
    term: 'CPF Ordinary Account (OA)',
    definition: 'The part of your CPF savings you can use for housing. Money left in it earns at least 2.5% a year.',
    section: 'cpf',
  },
  {
    id: 'accrued-interest',
    term: 'CPF accrued interest',
    definition: 'The interest your Ordinary Account would have earned on the CPF you used for the flat. When you sell, you put back the CPF you used plus this interest into your own CPF account.',
    section: 'cpf',
  },
  {
    id: 'remaining-lease',
    term: 'Remaining lease',
    definition: 'HDB flats come with a 99-year lease. A resale flat has fewer years left, which can limit your loan and how much CPF you can use.',
    section: 'loans',
  },
  {
    id: 'net-position',
    term: 'Your total position',
    definition: "One number for how you stand in the comparison year, without selling. Start with what the flat is worth, then take off the loan you still owe, the CPF savings you used (plus the interest they would have earned), any subsidy clawback, and the cash you put in: down payment, rent, fees and renovation. A higher number means you are better off. Grants are not taken off, because they would go back into your own CPF. The formal name is net financial position.",
  },
  {
    id: 'break-even',
    term: 'Break-even line',
    definition: "The flat price growth at which both paths end level in the comparison year. Above it one path is ahead, below it the other. It's a what-if line, not a price forecast. Where it falls depends on how fast your income grows. Not the same as the break-even price, which is about the BTO price.",
  },
  {
    id: 'break-even-price',
    term: 'Break-even price (BTO)',
    definition: "The BTO price at which both paths end level in the comparison year, with everything else in your plan unchanged. Below it BTO comes out ahead; above it, resale. We look for it within HDB's price range for the launch, and the BTO price slider on the Dashboard marks it. Not the same as the break-even line, which is about price growth.",
  },
];

export const GLOSSARY_BY_ID = Object.fromEntries(GLOSSARY.map((g) => [g.id, g]));
