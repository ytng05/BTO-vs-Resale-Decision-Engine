import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 100 }, // shown in the UI; collected at register
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }, // bcrypt hash only, never the password
  },
  { timestamps: true },
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
