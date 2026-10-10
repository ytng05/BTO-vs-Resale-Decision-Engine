// SEAT 3. Cached responses from external APIs (data.gov.sg, OneMap), one document per cache key.
// Mongoose (MIT). Kept after expiry on purpose: if the external API is down, the last good copy is served
// (marked stale) instead of an error. `fetchedAt` is the "data as of" time shown in the app.
import mongoose from 'mongoose';

const dataCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    fetchedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'dataCache', versionKey: false },
);

export const DataCache = mongoose.models.DataCache || mongoose.model('DataCache', dataCacheSchema);