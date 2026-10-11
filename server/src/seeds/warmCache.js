// Fills (or refreshes) the cache ahead of time, so the first user never waits on a cold data.gov.sg fetch.
// Also the visible "daily refresh" the prof asked for: every refresh prints a log line with the figure
// and the "data as of" time, so it can be run live in the demo.
//
//   npm run warm -w server                          all 26 towns (3-, 4- and 5-room) + the RPI
//   npm run warm -w server -- TAMPINES BEDOK         only these towns
//   npm run warm -w server -- --force TAMPINES       refresh even if the cached copy is still fresh
//   npm run refresh-data                             same as warm (root package.json alias)
//
// Without MONGODB_URI it still runs and prints the log (the memory cache is thrown away at the end).
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { SUPPORTED_FLAT_TYPES, TOWNS, getResalePriceBasis } from '../services/datagov/resalePrice.js';
import { getRpiSeries } from '../services/datagov/rpi.js';

const WARM_MONTHS = 12; // must match the route's default, or the cache keys will not line up
const PAUSE_MS = 1500; // ~6 requests per 10 s, under the dev-key limit of 8
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const money = (cents) => `S$${Math.round(cents / 100).toLocaleString('en-SG')}`;

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const requested = args.filter((a) => !a.startsWith('--')).map((t) => t.toUpperCase());
  const unknown = requested.filter((t) => !TOWNS.includes(t));
  if (unknown.length) throw new Error(`Unknown town(s): ${unknown.join(', ')}`);
  const towns = requested.length ? requested : TOWNS;

  const conn = await connectDb();
  if (!conn) console.warn('[warm] MONGODB_URI is not set: fetching anyway, but nothing is kept after this run');

  let fetched = 0;
  let alreadyCached = 0;
  const failed = [];

  const rpi = await getRpiSeries({ force });
  console.log(`[warm] RPI ${rpi.latest?.quarter} = ${rpi.latest?.index}; ${rpi.cached ? 'from cache' : 'refreshed'}, data as of ${new Date(rpi.fetchedAt).toISOString()}`);
  await sleep(PAUSE_MS);

  for (const town of towns) {
    for (const flatType of SUPPORTED_FLAT_TYPES) {
      try {
        const r = await getResalePriceBasis({ town, flatType, months: WARM_MONTHS, force });
        if (r.cached) alreadyCached += 1;
        else fetched += 1;
        const figure = r.count ? `median ${money(r.medianPriceCents)} from ${r.count} sales (${r.window.from} to ${r.window.to})` : 'no sales';
        console.log(`[warm] ${town} ${flatType}: ${figure}; ${r.cached ? 'from cache' : 'refreshed'}, data as of ${new Date(r.fetchedAt).toISOString()}${r.stale ? ' (STALE: data.gov.sg unreachable)' : ''}`);
        if (!r.cached) await sleep(PAUSE_MS);
      } catch (err) {
        failed.push(`${town} ${flatType}: ${err.message}`);
      }
    }
  }

  console.log(`[warm] done: ${fetched} refreshed, ${alreadyCached} already fresh in the cache, ${failed.length} failed`);
  if (failed.length) {
    console.log(failed.join('\n'));
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(`[warm] ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());