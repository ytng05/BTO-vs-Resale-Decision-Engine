import mongoose from 'mongoose';

// The one cache for external data (data.gov.sg resale prices and RPI, OneMap lookups): one document per key.
// FRESHNESS is decided in services/cache.js (one day, so the data refreshes daily and the refresh log shows it).
// This TTL only DELETES entries after CACHE_TTL_SECONDS. Between "stale" (older than a day) and deleted
// (older than 7 days) an entry is kept on purpose: if the upstream API is down, the last good copy is served
// and marked stale instead of returning an error.
export const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;

const cacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. `${datasetId}:${town}:${flatType}:${from}..${to}`
  datasetId: { type: String, required: true }, // data.gov.sg dataset id, or 'onemap'
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, default: Date.now, expires: CACHE_TTL_SECONDS },
});

export const ResaleCache = mongoose.models.ResaleCache || mongoose.model('ResaleCache', cacheSchema);