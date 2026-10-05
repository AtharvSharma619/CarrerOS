import mongoose from 'mongoose';
import { app } from './app.js';
import { env } from './config/env.js';

try {
  await mongoose.connect(env.mongoUri);
  app.listen(env.port, () => {
    console.log(`CareerOS API listening on port ${env.port}`);
  });
} catch (error) {
  console.error('Unable to start CareerOS API:', error.message);
  process.exit(1);
}
