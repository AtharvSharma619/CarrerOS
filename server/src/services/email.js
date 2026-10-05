import { env } from '../config/env.js';

async function sendEmail({ to, subject, html, text }) {
  if (!env.resendApiKey) {
    const error = new Error('Email is not configured. Set RESEND_API_KEY before enabling account email.');
    error.status = 503;
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.emailFrom, to: [to], subject, html, text }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Email provider rejected the request (${response.status}).`);
}

function appLink(parameter, token) {
  const url = new URL('/', env.appBaseUrl);
  url.searchParams.set(parameter, token);
  return url.toString();
}

export async function sendPasswordResetEmail(to, token) {
  const link = appLink('token', token);
  await sendEmail({
    to,
    subject: 'Reset your CareerOS password',
    html: `<p>We received a request to reset your CareerOS password.</p><p><a href="${link}">Choose a new password</a></p><p>This one-time link expires in 30 minutes. If you did not request it, you can ignore this email.</p>`,
    text: `Reset your CareerOS password: ${link}\n\nThis one-time link expires in 30 minutes. If you did not request it, you can ignore this email.`,
  });
}

export async function sendEmailVerification(to, token) {
  const link = appLink('verify', token);
  await sendEmail({
    to,
    subject: 'Verify your CareerOS email',
    html: `<p>Welcome to CareerOS. Verify your email to finish creating your account.</p><p><a href="${link}">Verify email address</a></p><p>This one-time link expires in 24 hours.</p>`,
    text: `Verify your CareerOS email: ${link}\n\nThis one-time link expires in 24 hours.`,
  });
}
