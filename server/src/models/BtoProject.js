import mongoose from 'mongoose';

// ~20 hand-seeded BTO projects. Every record must cite its source and the date it was accessed.
const btoProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  town: { type: String, required: true, uppercase: true, trim: true, index: true }, // index makes filtering by town fast
  classification: { type: String, enum: ['STANDARD', 'PLUS', 'PRIME'], required: true },
  mopYears: { type: Number, required: true },
  subsidyRecoveryRate: { type: Number, default: 0, min: 0, max: 1 },  // mix/max rejects typos
  launchDate: { type: Date },
  estimatedCompletion: { type: Date },
  estimatedWaitMonths: { type: Number, min: 0 }, // from launch data; seat 1 uses it for when CPF interest starts accruing
  flats: [
    {
      flatType: {type: String, required: true, uppercase: true, trim: true},
      indicativePriceLow: { type: Number, min: 0 },
      indicativePriceHigh: { type: Number, min: 0 },
    },
  ],
  sourceName: { type: String, required: true },
  sourceUrl: { type: String },
  sourceAccessed: { type: Date, required: true },
});

export const BtoProject = mongoose.models.BtoProject || mongoose.model('BtoProject', btoProjectSchema);
