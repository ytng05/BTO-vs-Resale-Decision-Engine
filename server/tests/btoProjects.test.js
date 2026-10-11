// Tests for the BTO seed data and GET /api/data/bto-projects (Vitest + Supertest).
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { BTO_PROJECTS } from '../src/seeds/btoProjects.js';
import { btoTowns, checkSeed, findBtoProjects, getBtoProject, latestLaunch } from '../src/services/btoProjects.js';
import { createApp } from '../src/app.js';

const app = createApp();

describe('BTO seed data', () => {
  it('has the four launches and no problems (ids, towns, units add up, ranges, source links)', () => {
    expect(BTO_PROJECTS.length).toBe(31);
    expect(checkSeed()).toEqual([]);
  });

  it('catches a project whose flat units do not add up to its total', () => {
    const broken = [{ ...BTO_PROJECTS[0], totalUnits: 1 }];
    expect(checkSeed(broken)[0]).toMatch(/add up to/);
  });

  it('uses the same town and flat type spelling as the resale data', () => {
    for (const p of BTO_PROJECTS) {
      expect(p.town).toMatch(/^[A-Z][A-Z /'-]+$/);
      for (const f of p.flats) expect(f.flatType).toMatch(/^(2 ROOM|3 ROOM|4 ROOM|5 ROOM|MULTI-GENERATION)$/);
    }
  });
});

describe('launch totals match the totals HDB announced', () => {
  it('adds up to 5,547 (Jul 2025), 9,144 (Oct 2025), 4,692 (Feb 2026) and 6,952 (Jun 2026) BTO flats', () => {
    const total = (launch) => BTO_PROJECTS.filter((p) => p.launch === launch).reduce((s, p) => s + p.totalUnits, 0);
    expect([total('2025-07'), total('2025-10'), total('2026-02'), total('2026-06')]).toEqual([5547, 9144, 4692, 6952]);
  });
});

describe('subsidy recovery and source dates (D18)', () => {
  it('has a subsidy recovery rate on every project: 0 for Standard, more for Plus and Prime', () => {
    for (const p of findBtoProjects()) {
      if (p.classification === 'STANDARD') expect(p.subsidyRecoveryRate).toBe(0);
      else expect(p.subsidyRecoveryRate).toBeGreaterThan(0);
    }
    expect(getBtoProject('berlayar-rise').subsidyRecoveryRate).toBe(0.14);
    expect(getBtoProject('oak-ville-amk').subsidyRecoveryRate).toBe(0.07);
  });

  it('date-stamps every project with when its figures were taken', () => {
    expect(findBtoProjects().every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.sourceAccessed))).toBe(true);
    const missingDate = [{ ...BTO_PROJECTS[0], sourceAccessed: undefined }];
    expect(checkSeed(missingDate)[0]).toMatch(/sourceAccessed/);
  });

  it('flags a Standard project with a clawback, or a Prime one without', () => {
    const std = BTO_PROJECTS.find((p) => p.classification === 'STANDARD');
    expect(checkSeed([{ ...std, subsidyRecoveryRate: 0.06 }])[0]).toMatch(/Standard projects have no subsidy recovery/);
  });
});

describe('scope and price basis (D26, D27)', () => {
  it('only serves 3-, 4- and 5-room flats, though the seed keeps every type HDB listed', () => {
    const served = findBtoProjects().flatMap((p) => p.flats.map((f) => f.flatType));
    expect(new Set(served)).toEqual(new Set(['3 ROOM', '4 ROOM', '5 ROOM']));
    expect(BTO_PROJECTS.some((p) => p.flats.some((f) => f.flatType === '2 ROOM'))).toBe(true);
    expect(getBtoProject('ping-yi-court').flats.map((f) => f.flatType)).toEqual(['3 ROOM', '4 ROOM', '5 ROOM']);
  });

  it('marks every project as priced before grants, and refuses any project that is not', () => {
    expect(findBtoProjects().every((p) => p.priceBasis === 'BEFORE_GRANTS')).toBe(true);
    const netOfGrants = [{ ...BTO_PROJECTS[0], priceBasis: 'AFTER_GRANTS' }];
    expect(findBtoProjects({}, netOfGrants)).toEqual([]);
    expect(checkSeed(netOfGrants)[0]).toMatch(/priceBasis must be BEFORE_GRANTS/);
  });
});

describe('findBtoProjects', () => {
  it('filters by town, flat type and classification, and trims flats to the type asked for', () => {
    const found = findBtoProjects({ town: 'YISHUN', flatType: '5 ROOM' });
    expect(found.map((p) => p.id)).toEqual(['chencharu-grove']); // Yishun Glade has no 5-room
    expect(found[0].flats.every((f) => f.flatType === '5 ROOM')).toBe(true);
    expect(findBtoProjects({ classification: 'PLUS' }).every((p) => p.classification === 'PLUS')).toBe(true);
  });

  it('gives the btoProjectA/B shape at the top level when one flat type is asked for', () => {
    const [p] = findBtoProjects({ town: 'TAMPINES', flatType: '4 ROOM', classification: 'STANDARD' });
    expect(p).toMatchObject({ id: 'tampines-bliss', name: 'Tampines Bliss', launch: '2026-02', waitMonths: 23,
      priceMinCents: 48_100_000, priceMaxCents: 60_000_000 });
    expect(p.sourceUrl).toMatch(/^https:\/\/www\.hdb\.gov\.sg/);
  });

  it('returns prices in cents and floor area as min/max', () => {
    const [p] = findBtoProjects({ town: 'BEDOK', flatType: '4 ROOM' });
    expect(p.flats[0]).toMatchObject({ priceMinCents: 49_800_000, priceMaxCents: 62_400_000, floorAreaSqm: { min: 93, max: 93 } });
  });

  it('lists newest launch first, plus towns and the latest launch month', () => {
    const all = findBtoProjects();
    expect(all[0].launch >= all.at(-1).launch).toBe(true);
    expect(btoTowns()).toContain('TAMPINES');
    expect(latestLaunch()).toBe('2026-06');
    expect(getBtoProject('nope')).toBeNull();
  });
});

describe('GET /api/data/bto-projects', () => {
  it('returns matching projects with towns and a data-as-of month', async () => {
    const res = await request(app).get('/api/data/bto-projects').query({ town: 'tampines', flatType: '4 ROOM' });
    expect(res.status).toBe(200);
    expect(res.body.projects.map((p) => p.id)).toEqual(['tampines-bliss', 'tampines-nova', 'simei-symphony']); // newest first
    expect(res.body.projects[0]).toMatchObject({ classification: 'STANDARD', waitMonths: 23 });
    expect(res.body.dataAsOf).toBe('2026-06');
    expect(res.body.towns.length).toBeGreaterThan(5);
  });

  it('refuses 2-room and 3Gen as a flat type filter', async () => {
    const res = await request(app).get('/api/data/bto-projects').query({ flatType: '2 ROOM' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/3 ROOM, 4 ROOM, 5 ROOM/);
  });

  it('rejects a bad filter with a plain message', async () => {
    const res = await request(app).get('/api/data/bto-projects').query({ classification: 'LUXURY' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/STANDARD, PLUS, PRIME/);
  });

  it('returns one project by id, or 404', async () => {
    expect((await request(app).get('/api/data/bto-projects/teban-heights')).body.town).toBe('JURONG EAST');
    expect((await request(app).get('/api/data/bto-projects/nope')).status).toBe(404);
  });
});