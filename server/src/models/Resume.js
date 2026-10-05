import mongoose from 'mongoose';

const experienceEntrySchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 120, default: '' },
  company: { type: String, trim: true, maxlength: 120, default: '' },
  location: { type: String, trim: true, maxlength: 120, default: '' },
  startDate: { type: String, trim: true, maxlength: 30, default: '' },
  endDate: { type: String, trim: true, maxlength: 30, default: '' },
  achievements: { type: String, maxlength: 3000, default: '' },
});

const educationEntrySchema = new mongoose.Schema({
  institution: { type: String, trim: true, maxlength: 150, default: '' },
  degree: { type: String, trim: true, maxlength: 150, default: '' },
  location: { type: String, trim: true, maxlength: 120, default: '' },
  startDate: { type: String, trim: true, maxlength: 30, default: '' },
  endDate: { type: String, trim: true, maxlength: 30, default: '' },
  details: { type: String, maxlength: 2000, default: '' },
});

const resumeSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  content: {
    fullName: { type: String, trim: true, maxlength: 100, default: '' },
    email: { type: String, trim: true, maxlength: 254, default: '' },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    location: { type: String, trim: true, maxlength: 100, default: '' },
    website: { type: String, trim: true, maxlength: 200, default: '' },
    headline: { type: String, trim: true, maxlength: 160, default: '' },
    summary: { type: String, trim: true, maxlength: 2000, default: '' },
    experience: { type: String, maxlength: 10000, default: '' },
    education: { type: String, maxlength: 5000, default: '' },
    experienceEntries: { type: [experienceEntrySchema], default: [] },
    educationEntries: { type: [educationEntrySchema], default: [] },
    skills: { type: String, maxlength: 2000, default: '' },
    projects: { type: String, maxlength: 5000, default: '' },
  },
  template: { type: String, enum: ['classic', 'modern'], default: 'classic' },
}, { timestamps: true });

export default mongoose.model('Resume', resumeSchema);
