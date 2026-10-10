// SEAT 3. Reads the BTO seed data (src/seeds/btoProjects.js) and shapes it for the API.
// Money leaves here in integer cents, like every other API response (API_CONTRACT.md, D14).
// No policy figures: waiting times and prices are facts about each project, copied from HDB's launch.
import { BTO_PROJECTS } from '../seeds/btoProjects.js';

export const CLASSIFICATIONS = ['STANDARD', 'PLUS', 'PRIME'];

const toCents = (dollars) => Math.round(dollars * 100);

/** One project in API shape: price ranges in cents, floor area as { min, max }. */
export function toApiProject(project, flats = project.flats) {
  return {
    id: project.id,
    name: project.name,
    town: project.town,
    classification: project.classification,
    launch: project.launch,
    waitMonths: project.waitMonths,
    totalUnits: project.totalUnits,
    flats: flats.map((f) => ({
      flatType: f.flatType,
      ...(f.variant ? { variant: f.variant } : {}),
      units: f.units,
      floorAreaSqm: { min: f.floorAreaSqm[0], max: f.floorAreaSqm[1] },
      priceMinCents: toCents(f.priceRange[0]),
      priceMaxCents: toCents(f.priceRange[1]),
    })),
    sourceUrl: project.sourceUrl,
    verified: project.verified,
  };
}

/**
 * Projects matching the filters. A flatType filter also trims each project's flats to that type,
 * and drops projects that don't offer it. Newest launch first, then by name.
 */
export function findBtoProjects({ town, flatType, classification } = {}, projects = BTO_PROJECTS) {
  return projects
    .filter((p) => !town || p.town === town)
    .filter((p) => !classification || p.classification === classification)
    .map((p) => ({ p, flats: flatType ? p.flats.filter((f) => f.flatType === flatType) : p.flats }))
    .filter(({ flats }) => flats.length > 0)
    .sort((a, b) => b.p.launch.localeCompare(a.p.launch) || a.p.name.localeCompare(b.p.name))
    .map(({ p, flats }) => toApiProject(p, flats));
}

export function getBtoProject(id, projects = BTO_PROJECTS) {
  const p = projects.find((x) => x.id === id);
  return p ? toApiProject(p) : null;
}

/** Towns that have at least one seeded project (for the Path A town dropdown). */
export function btoTowns(projects = BTO_PROJECTS) {
  return [...new Set(projects.map((p) => p.town))].sort();
}

/** Latest launch month in the seed, shown as "data as of". */
export function latestLaunch(projects = BTO_PROJECTS) {
  return projects.map((p) => p.launch).sort().at(-1) ?? null;
}

/** Problems with the seed data, as plain sentences. Empty array = all good. Used by the tests. */
export function checkSeed(projects = BTO_PROJECTS) {
  const problems = [];
  const ids = new Set();
  for (const p of projects) {
    const where = p.id ?? p.name ?? '(no id)';
    if (!p.id || ids.has(p.id)) problems.push(`${where}: missing or duplicate id`);
    ids.add(p.id);
    if (!p.name || !p.town) problems.push(`${where}: needs a name and a town`);
    if (!CLASSIFICATIONS.includes(p.classification)) problems.push(`${where}: classification must be one of ${CLASSIFICATIONS.join(', ')}`);
    if (!/^\d{4}-\d{2}$/.test(p.launch ?? '')) problems.push(`${where}: launch must be YYYY-MM`);
    if (p.waitMonths !== null && !(Number.isInteger(p.waitMonths) && p.waitMonths > 0)) problems.push(`${where}: waitMonths must be a whole number of months or null`);
    if (!/^https:\/\//.test(p.sourceUrl ?? '')) problems.push(`${where}: needs a sourceUrl`);
    const units = (p.flats ?? []).reduce((s, f) => s + f.units, 0) + (p.excludedUnits ?? 0);
    if (units !== p.totalUnits) problems.push(`${where}: flat units add up to ${units}, but totalUnits is ${p.totalUnits}`);
    for (const f of p.flats ?? []) {
      const [aMin, aMax] = f.floorAreaSqm ?? [];
      const [pMin, pMax] = f.priceRange ?? [];
      if (!(aMin > 0 && aMax >= aMin)) problems.push(`${where} ${f.flatType}: floor area range is wrong`);
      if (!(pMin > 0 && pMax >= pMin)) problems.push(`${where} ${f.flatType}: price range is wrong`);
    }
  }
  return problems;
}