import mongoose from 'mongoose';

// A saved scenario stores the inputs AND the ruleset version that produced the result,
// so reloading it restores identically and the UI can show which rules were used.
const scenarioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    profile: { type: mongoose.Schema.Types.Mixed, required: true },
    choiceA: { type: mongoose.Schema.Types.Mixed, required: true },
    choiceB: { type: mongoose.Schema.Types.Mixed, required: true },
    assumptions: { type: mongoose.Schema.Types.Mixed, required: true },
    result: { type: mongoose.Schema.Types.Mixed },
    rulesetVersion: { type: String, required: true },
    evaluationStartYear: { type: Number, required: true }, // the "today" the result was calculated from

  },
  { timestamps: true },
);

export const Scenario = mongoose.models.Scenario || mongoose.model('Scenario', scenarioSchema);
