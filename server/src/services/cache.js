
// With no database the fetch still works, just uncached, so the app still runs without MONGODB_URI.
import mongoose from 'mongoose';
import { ResaleCache } from '../models/ResaleCache.js';



export async function cached(key, datasetId, fetcher) {
  const dbUp = mongoose.connection.readyState === 1;

  if (dbUp) {
    const hit = await ResaleCache.findOne({ key }).lean();
    if (hit) return { payload: hit.payload, fetchedAt: hit.fetchedAt, cached: true };
  }

  const payload = await fetcher();
  const fetchedAt = new Date();
  const isEmpty = Array.isArray(payload) && payload.length === 0;
  if (dbUp && !isEmpty) {
    await ResaleCache.updateOne({ key }, { key, datasetId, payload, fetchedAt }, { upsert: true });
  }
  return { payload, fetchedAt, cached: false };
}
