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
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS || 0),
  mongoUri: process.env.MONGODB_URI,
  clientOrigin: process.env.CLIENT_ORIGIN,
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  jwtSecret: process.env.JWT_SECRET,
  openAiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  aiMonthlyRequestLimit: Number(process.env.AI_MONTHLY_REQUEST_LIMIT || 25),
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || (process.env.NODE_ENV === 'production' ? '' : 'CareerOS <onboarding@resend.dev>'),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
};

if (env.jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long.');
if (!['lax', 'strict', 'none'].includes(env.cookieSameSite)) throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
if (!Number.isInteger(env.trustProxyHops) || env.trustProxyHops < 0) throw new Error('TRUST_PROXY_HOPS must be a non-negative whole number.');
if (!Number.isInteger(env.aiMonthlyRequestLimit) || env.aiMonthlyRequestLimit < 1) throw new Error('AI_MONTHLY_REQUEST_LIMIT must be a positive whole number.');
if (env.nodeEnv === 'production') {
  if (!env.resendApiKey) throw new Error('RESEND_API_KEY is required in production so users can recover their accounts.');
  if (!env.emailFrom) throw new Error('EMAIL_FROM must use a sender address on a verified email domain in production.');
  if (!env.requireEmailVerification) throw new Error('REQUIRE_EMAIL_VERIFICATION=true is required in production.');
  if (!env.appBaseUrl.startsWith('https://') || !env.clientOrigin.startsWith('https://')) throw new Error('APP_BASE_URL and CLIENT_ORIGIN must use HTTPS in production.');
}
