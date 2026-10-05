import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
