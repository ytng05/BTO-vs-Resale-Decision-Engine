// this is so that the cache is alr filled with data ahead of time, first user to ask wont faace issue of slow response
// to run: npm run warm -w server                  (all 26 towns)
//        npm run warm -w server -- TAMPINES BEDOK (only these towns)
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { TOWNS, getResalePriceBasis } from '../services/datagov/resalePrice.js';
import { getRpiSeries } from '../services/datagov/rpi.js';

const WARM_FLAT_TYPES = ['3 ROOM', '4 ROOM', '5 ROOM']; // the types the app is mostly used for
const WARM_MONTHS = 12; // must match the route's default, or the cache keys will not line up
const PAUSE_MS = 1500; // ~6 requests per 10 s, under the dev-key limit of 8
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


async function main() {
  const conn = await connectDb();
  if (!conn) throw new Error('MONGODB_URI is not set, so there is no cache to warm');

  const requested = process.argv.slice(2).map((t) => t.toUpperCase());
  const unknown = requested.filter((t) => !TOWNS.includes(t));
  if (unknown.length) throw new Error(`Unknown town(s): ${unknown.join(', ')}`);
  const towns = requested.length ? requested : TOWNS;

  let fetched = 0;
  let alreadyCached = 0;
  const failed = [];

  await getRpiSeries();
  await sleep(PAUSE_MS);

  for (const town of towns) {
    for (const flatType of WARM_FLAT_TYPES) {
      try {
        const r = await getResalePriceBasis({ town, flatType, months: WARM_MONTHS });
        if (r.cached) alreadyCached += 1;
        else fetched += 1;
        await sleep(PAUSE_MS);
      } catch (err) {
        failed.push(`${town} ${flatType}: ${err.message}`);
      }
    }
  }

  console.log(`[warm] RPI ok; resale: ${fetched} fetched, ${alreadyCached} already cached, ${failed.length} failed`);
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
