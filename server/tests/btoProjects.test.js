// Tests for the BTO seed data and GET /api/data/bto-projects (Vitest + Supertest).
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { BTO_PROJECTS } from '../src/seeds/btoProjects.js';
import { btoTowns, checkSeed, findBtoProjects, getBtoProject, latestLaunch } from '../src/services/btoProjects.js';
import { createDataRouter } from '../src/routes/data.js';

const app = express().use('/api/data', createDataRouter());

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

describe('findBtoProjects', () => {
  it('filters by town, flat type and classification, and trims flats to the type asked for', () => {
    const found = findBtoProjects({ town: 'YISHUN', flatType: '5 ROOM' });
    expect(found.map((p) => p.id)).toEqual(['chencharu-grove']); // Yishun Glade has no 5-room
    expect(found[0].flats.every((f) => f.flatType === '5 ROOM')).toBe(true);
    expect(findBtoProjects({ classification: 'PLUS' }).every((p) => p.classification === 'PLUS')).toBe(true);
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