import mongoose from 'mongoose';
import { env } from './env.js';

// Connects only when MONGODB_URI is set, so the app (and CI smoke tests) run without a database.
export async function connectDb() {
  if (!env.mongoUri) {
    console.warn('[db] MONGODB_URI not set: running without a database');
    return null;
  }
  await mongoose.connect(env.mongoUri);
  console.log('[db] connected');
  return mongoose.connection;
}
