import dotenv from 'dotenv';

dotenv.config();

const required = ['MONGODB_URI', 'CLIENT_ORIGIN', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  clientOrigin: process.env.CLIENT_ORIGIN,
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  jwtSecret: process.env.JWT_SECRET,
  openAiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
};

if (env.jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long.');
if (!['lax', 'strict', 'none'].includes(env.cookieSameSite)) throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
