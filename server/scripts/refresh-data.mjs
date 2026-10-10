#!/usr/bin/env node
// SEAT 3. Manual refresh of cached data.gov.sg resale prices, for demos and for a scheduled daily job.
//
//   npm run refresh-data -w server                       # refresh the default demo towns
//   npm run refresh-data -w server -- TAMPINES "4 ROOM"  # refresh one town + flat type
//
// With MONGODB_URI set, results are saved to the dataCache collection, so the running server
// serves them immediately with the new "data as of" time. Without it, this only shows that the
// fetch works (nothing is kept after the command exits).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { getResalePrice } from '../src/services/datagov/resalePrices.js';

const here = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.resolve(here, '../../.env')); // Node 20.12+; .env sits at the repo root
} catch {
  // No .env file: fall back to whatever is already in the environment.
}

const DEFAULTS = [
  ['TAMPINES', '4 ROOM'],
  ['BEDOK', '4 ROOM'],
  ['PUNGGOL', '4 ROOM'],
];

const args = process.argv.slice(2);
const targets = args.length >= 2 ? [[args[0].toUpperCase(), args[1].toUpperCase()]] : DEFAULTS;
const money = (n) => `S$${Math.round(n).toLocaleString('en-SG')}`;

async function main() {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.info('[refresh] connected to MongoDB: results will be saved to dataCache');
  } else {
    console.info('[refresh] MONGODB_URI not set: fetching only, nothing will be saved');
  }

  let failures = 0;
  for (const [town, flatType] of targets) {
    try {
      const { data, fetchedAt } = await getResalePrice(town, flatType, { force: true });
      if (!data) {
        console.info(`[refresh] ${town} ${flatType}: no sales in the last 12 months`);
        continue;
      }
      console.info(
        `[refresh] ${town} ${flatType}: median ${money(data.medianPrice)}, ` +
        `${data.medianFloorAreaSqm} m², ${data.medianRemainingLeaseYears} years lease left, ` +
        `${data.transactions} sales (${data.fromMonth} to ${data.toMonth}); data as of ${fetchedAt}`,
      );
    } catch (err) {
      failures++;
      console.error(`[refresh] ${town} ${flatType} failed: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  process.exitCode = failures ? 1 : 0;
}

main().catch(async (err) => {
  console.error(`[refresh] ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});