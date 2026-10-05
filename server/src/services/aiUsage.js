import AiUsage from '../models/AiUsage.js';
import { env } from '../config/env.js';
import { generateCareerText } from './ai.js';

function currentPeriod(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

function usageView(count, now = new Date()) {
  const resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { used: count, limit: env.aiMonthlyRequestLimit, remaining: Math.max(0, env.aiMonthlyRequestLimit - count), resetsAt: resetAt.toISOString() };
}

export async function getAiUsage(owner) {
  const period = currentPeriod();
  const usage = await AiUsage.findOne({ owner, period }).select('count').lean();
  return usageView(usage?.count || 0);
}

async function reserve(owner) {
  const period = currentPeriod();
  let usage;
  try {
    usage = await AiUsage.findOneAndUpdate({ owner, period }, { $inc: { count: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    usage = await AiUsage.findOneAndUpdate({ owner, period }, { $inc: { count: 1 } }, { new: true });
  }
  if (usage.count > env.aiMonthlyRequestLimit) {
    await AiUsage.updateOne({ owner, period, count: { $gt: 0 } }, { $inc: { count: -1 } });
    const error = new Error('You have reached this month’s AI draft limit. It will reset next month.');
    error.status = 429;
    error.code = 'AI_USAGE_LIMIT';
    throw error;
  }
  return { period, usage: usageView(usage.count) };
}

export async function generateCareerTextForUser(owner, input) {
  const reservation = await reserve(owner);
  try {
    const result = await generateCareerText(input);
    return { result, usage: reservation.usage };
  } catch (error) {
    await AiUsage.updateOne({ owner, period: reservation.period, count: { $gt: 0 } }, { $inc: { count: -1 } }).catch(() => {});
    throw error;
  }
}
