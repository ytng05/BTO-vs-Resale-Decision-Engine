import mongoose from 'mongoose';

// Cache for data.gov.sg responses. TTL keeps entries for CACHE_TTL_SECONDS (data updates monthly, so
// a longer TTL than one day is fine). Pre-warm on deploy so graders never trigger a cold fetch.
export const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;

const cacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. `${datasetId}:${town}:${flatType}`
  datasetId: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, default: Date.now, expires: CACHE_TTL_SECONDS },
});

export const ResaleCache = mongoose.models.ResaleCache || mongoose.model('ResaleCache', cacheSchema);
