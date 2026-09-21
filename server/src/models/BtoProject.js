import mongoose from 'mongoose';

// ~20 hand-seeded BTO projects. Every record must cite its source and the date it was accessed.
const btoProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  town: { type: String, required: true },
  classification: { type: String, enum: ['STANDARD', 'PLUS', 'PRIME'], required: true },
  mopYears: { type: Number, required: true },
  subsidyRecoveryRate: { type: Number, default: 0 }, // per project, from HDB launch material
  launchDate: { type: Date },
  estimatedCompletion: { type: Date },
  flats: [
    {
      flatType: String,
      indicativePriceLow: Number,
      indicativePriceHigh: Number,
    },
  ],
  sourceName: { type: String, required: true },
  sourceUrl: { type: String },
  sourceAccessed: { type: Date, required: true },
});

export const BtoProject = mongoose.models.BtoProject || mongoose.model('BtoProject', btoProjectSchema);
