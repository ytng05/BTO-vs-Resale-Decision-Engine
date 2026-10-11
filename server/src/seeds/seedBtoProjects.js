import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { BtoProject } from '../models/BtoProject.js';
import { btoProjects } from './btoProjects.template.js';

async function main() {
  if (btoProjects.length === 0) {
    console.warn('[seed] btoProjects list is empty: nothing to seed');
    return;
  }

  // Validate every record before touching the DB, so one bad entry never leaves a half-seeded collection.
  // toObject() also applies the schema's setters (uppercase town/flatType) and defaults.
  const docs = [];
  const errors = [];
  btoProjects.forEach((p, i) => {
    const doc = new BtoProject(p);
    const err = doc.validateSync();
    if (err) errors.push(`#${i} ${p.name ?? '(no name)'}: ${Object.keys(err.errors).join(', ')}`);
    const { _id, ...plain } = doc.toObject(); // drop the generated _id so existing records keep theirs
    docs.push(plain);
  });
  if (errors.length) throw new Error(`Invalid seed records:\n${errors.join('\n')}`);

  const conn = await connectDb();
  if (!conn) throw new Error('MONGODB_URI is not set, so there is nothing to seed into');

  const result = await BtoProject.bulkWrite(
    docs.map((d) => ({ replaceOne: { filter: { name: d.name }, replacement: d, upsert: true } })),
  );
  console.log(`[seed] inserted ${result.upsertedCount}, updated ${result.modifiedCount}`);

  if (process.argv.includes('--prune')) {
    const { deletedCount } = await BtoProject.deleteMany({ name: { $nin: docs.map((d) => d.name) } });
    console.log(`[seed] pruned ${deletedCount}`);
  }
}

main()
  .catch((err) => {
    console.error(`[seed] ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());