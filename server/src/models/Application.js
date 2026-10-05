import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: String, required: true, trim: true, maxlength: 120 },
  role: { type: String, required: true, trim: true, maxlength: 120 },
  url: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['Saved', 'Applied', 'In review', 'Interview', 'Offer', 'Rejected'], default: 'Applied' },
  appliedAt: { type: Date, default: Date.now },
  followUpAt: { type: Date, default: null },
  notes: { type: String, maxlength: 3000, default: '' },
  jobDescription: { type: String, maxlength: 12000, default: '' },
  coverLetter: { type: String, maxlength: 12000, default: '' },
  tailoredSuggestions: { type: String, maxlength: 12000, default: '' },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
}, { timestamps: true });

export default mongoose.model('Application', applicationSchema);
