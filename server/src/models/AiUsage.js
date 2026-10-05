import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  period: { type: String, required: true },
  count: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

aiUsageSchema.index({ owner: 1, period: 1 }, { unique: true });

export default mongoose.model('AiUsage', aiUsageSchema);
