// My scenarios filter bar: which saved scenarios match the search, the dropdowns and the price range.
// Works on the `summary` each scenario has in GET /api/scenarios (docs/API_CONTRACT.md); no extra requests.
import { toTitleCase } from '../constants/planOptions.js';

// The filters when nothing is picked. Prices are in dollars, as typed; '' means no limit.
export function emptyFilters() {
  return { search: '', town: '', flatType: '', ahead: '', minPrice: '', maxPrice: '' };
}

// True when at least one filter is set (so "Clear filters" has something to clear).
export function hasFilters(filters) {
  const empty = emptyFilters();
  for (const key in empty) {
    if (String(filters[key]).trim() !== '') {
      return true;
    }
  }
  return false;
}

// A scenario saved before summaries existed has none: treat every field as not saved.
function summaryOf(scenario) {
  if (scenario.summary) {
    return scenario.summary;
  }
  return {};
}

// Dollars typed in a box -> cents, or null when the box is empty or not a number.
function toCents(text) {
  const trimmed = String(text).trim();
  if (trimmed === '') {
    return null;
  }
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars)) {
    return null;
  }
  return Math.round(dollars * 100);
}

// A note under the price boxes when the range cannot match anything, or '' when it is fine.
export function priceRangeProblem(filters) {
  const minCents = toCents(filters.minPrice);
  const maxCents = toCents(filters.maxPrice);
  if ((minCents !== null && minCents < 0) || (maxCents !== null && maxCents < 0)) {
    return 'Prices cannot be negative.';
  }
  if (minCents !== null && maxCents !== null && minCents > maxCents) {
    return '"Price from" is higher than "Price up to", so no scenario can match.';
  }
  return '';
}

// A price is in range when it is at least the minimum and at most the maximum (either can be left out).
function priceInRange(priceCents, minCents, maxCents) {
  if (typeof priceCents !== 'number') {
    return false;
  }
  if (minCents !== null && priceCents < minCents) {
    return false;
  }
  if (maxCents !== null && priceCents > maxCents) {
    return false;
  }
  return true;
}

export function matchesFilters(scenario, filters) {
  const s = summaryOf(scenario);

  const search = filters.search.trim().toLowerCase();
  if (search !== '' && !scenario.name.toLowerCase().includes(search)) {
    return false;
  }

  // Town and flat type match either path, BTO or resale.
  if (filters.town !== '' && s.btoTown !== filters.town && s.resaleTown !== filters.town) {
    return false;
  }
  if (filters.flatType !== '' && s.btoFlatType !== filters.flatType && s.resaleFlatType !== filters.flatType) {
    return false;
  }

  // 'A' (BTO ahead), 'B' (resale ahead), 'TIE', or 'NONE' for scenarios saved without a result.
  if (filters.ahead !== '') {
    let ahead = 'NONE';
    if (s.ahead) {
      ahead = s.ahead;
    }
    if (ahead !== filters.ahead) {
      return false;
    }
  }

  // Price range: kept when the BTO price or the resale price is inside it.
  const minCents = toCents(filters.minPrice);
  const maxCents = toCents(filters.maxPrice);
  if (minCents !== null || maxCents !== null) {
    const btoOk = priceInRange(s.btoPriceCents, minCents, maxCents);
    const resaleOk = priceInRange(s.resalePriceCents, minCents, maxCents);
    if (!btoOk && !resaleOk) {
      return false;
    }
  }

  return true;
}

export function filterScenarios(scenarios, filters) {
  const matches = [];
  for (const scenario of scenarios) {
    if (matchesFilters(scenario, filters)) {
      matches.push(scenario);
    }
  }
  return matches;
}

// The dropdown options: only the towns and flat types that appear in the user's own scenarios, A to Z.
function optionsFrom(scenarios, keyA, keyB, makeLabel) {
  const values = [];
  for (const scenario of scenarios) {
    const s = summaryOf(scenario);
    for (const value of [s[keyA], s[keyB]]) {
      if (value && !values.includes(value)) {
        values.push(value);
      }
    }
  }
  values.sort();
  const options = [];
  for (const value of values) {
    options.push({ value: value, label: makeLabel(value) });
  }
  return options;
}

// '4 ROOM' -> '4-room'
function flatTypeLabel(value) {
  return value.toLowerCase().replace(/\s+/g, '-');
}

export function townOptions(scenarios) {
  return optionsFrom(scenarios, 'btoTown', 'resaleTown', toTitleCase);
}

export function flatTypeOptions(scenarios) {
  return optionsFrom(scenarios, 'btoFlatType', 'resaleFlatType', flatTypeLabel);
}

// After the list changes (e.g. a delete), a town or flat type that no scenario has any more is not in its dropdown,
// so the select would look blank. Reset those to "Any".
function hasOption(options, value) {
  for (const option of options) {
    if (option.value === value) {
      return true;
    }
  }
  return false;
}

export function keepValidFilters(filters, scenarios) {
  const kept = { ...filters };
  if (kept.town !== '' && !hasOption(townOptions(scenarios), kept.town)) {
    kept.town = '';
  }
  if (kept.flatType !== '' && !hasOption(flatTypeOptions(scenarios), kept.flatType)) {
    kept.flatType = '';
  }
  return kept;
}

// One line under each scenario's name: "Tampines 4-room BTO vs Bedok 5-room resale · BTO ahead".
export function summaryLine(scenario) {
  const s = summaryOf(scenario);
  const parts = [];
  if (s.btoTown && s.resaleTown) {
    let bto = toTitleCase(s.btoTown);
    if (s.btoFlatType) {
      bto = bto + ' ' + flatTypeLabel(s.btoFlatType);
    }
    let resale = toTitleCase(s.resaleTown);
    if (s.resaleFlatType) {
      resale = resale + ' ' + flatTypeLabel(s.resaleFlatType);
    }
    parts.push(bto + ' BTO vs ' + resale + ' resale');
  }
  if (s.ahead === 'A') {
    parts.push('BTO ahead');
  } else if (s.ahead === 'B') {
    parts.push('Resale ahead');
  } else if (s.ahead === 'TIE') {
    parts.push('Level');
  } else {
    parts.push('Not calculated');
  }
  return parts.join(' · ');
}
