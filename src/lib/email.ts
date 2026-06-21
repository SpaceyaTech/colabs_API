import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { randomUUID } from 'crypto';
import dns from 'node:dns';
import { env } from '../config/env';
import { appEvents, EMAIL_EVENTS, EmailJob } from './events';
import { redis } from './redis';

dns.setDefaultResultOrder('ipv4first');

const EMAIL_QUEUE_KEY = 'email:pending';
const EMAIL_RETRY_KEY = 'email:retry';

export type VerificationEmailJob = Extract<EmailJob, { type: 'verification' }>;
export type PasswordResetEmailJob = Extract<EmailJob, { type: 'password-reset' }>;

const isSmtpConfigured = () =>
  Boolean(env.SMTP_HOST?.trim() && env.SMTP_USER?.trim() && env.SMTP_PASS?.trim());

const getTransporter = () => {
  const secure = env.SMTP_SECURE || env.SMTP_PORT === 465;
  const pass = env.SMTP_PASS!.replace(/\s+/g, '');

  const options: SMTPTransport.Options = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure,
    requireTLS: !secure && env.SMTP_PORT === 587,
    auth: {
      user: env.SMTP_USER!,
      pass,
    },
  };

  return nodemailer.createTransport(options);
};

const sendHtmlEmail = async (to: string, subject: string, html: string) => {
  if (!isSmtpConfigured()) return false;

  const from = env.SMTP_FROM?.trim() || env.SMTP_USER!;
  await getTransporter().sendMail({ from, to, subject, html });
  return true;
};

export const buildVerificationEmail = (token: string) => {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  const html = `
    <h2>Verify your Colabs account</h2>
    <p>Thanks for signing up. Click the link below to confirm your email address:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>This link expires in 24 hours.</p>
  `;

  return { verifyUrl, html, subject: 'Verify your Colabs account' };
};

export const buildPasswordResetEmail = (token: string) => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = `
    <h2>Reset your Colabs password</h2>
    <p>Click the link below to choose a new password:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
  `;

  return { resetUrl, html, subject: 'Reset your Colabs password' };
};

export const logDevVerificationLink = (email: string, token: string) => {
  if (env.NODE_ENV !== 'development') return;
  const { verifyUrl } = buildVerificationEmail(token);
  console.log(`\n📧 Dev verification link for ${email}:\n   ${verifyUrl}\n`);
};

export const logDevPasswordResetLink = (email: string, token: string) => {
  if (env.NODE_ENV !== 'development') return;
  const { resetUrl } = buildPasswordResetEmail(token);
  console.log(`\n📧 Dev password reset link for ${email}:\n   ${resetUrl}\n`);
};

const deliverVerificationEmail = async (email: string, token: string) => {
  const { html, subject, verifyUrl } = buildVerificationEmail(token);

  const sent = await sendHtmlEmail(email, subject, html);
  if (!sent) {
    console.log('\n📧 Verification email (SMTP not configured — dev mode):');
    console.log(`   To: ${email}`);
    console.log(`   Link: ${verifyUrl}\n`);
  }
};

const deliverPasswordResetEmail = async (email: string, token: string) => {
  const { html, subject, resetUrl } = buildPasswordResetEmail(token);

  const sent = await sendHtmlEmail(email, subject, html);
  if (!sent) {
    console.log('\n📧 Password reset email (SMTP not configured — dev mode):');
    console.log(`   To: ${email}`);
    console.log(`   Link: ${resetUrl}\n`);
  }
};

const retryDelayMs = (attempt: number) =>
  env.EMAIL_RETRY_BASE_MS * Math.pow(2, Math.max(0, attempt - 1));

const enqueueEmailJob = async (job: EmailJob) => {
  await redis.lPush(EMAIL_QUEUE_KEY, JSON.stringify(job));
  appEvents.emit(EMAIL_EVENTS.QUEUED, job);
};

export const enqueueVerificationEmail = async (email: string, token: string) => {
  await enqueueEmailJob({
    type: 'verification',
    jobId: randomUUID(),
    email,
    token,
    attempt: 1,
  });
};

export const enqueuePasswordResetEmail = async (email: string, token: string) => {
  await enqueueEmailJob({
    type: 'password-reset',
    jobId: randomUUID(),
    email,
    token,
    attempt: 1,
  });
};

export const sendVerificationEmail = enqueueVerificationEmail;

const scheduleEmailRetry = async (job: EmailJob) => {
  if (job.attempt >= env.EMAIL_MAX_RETRIES) {
    console.error(
      `❌ ${job.type} email permanently failed for ${job.email} after ${job.attempt} attempts (job ${job.jobId})`,
    );
    if (job.type === 'verification') {
      logDevVerificationLink(job.email, job.token);
      appEvents.emit(EMAIL_EVENTS.VERIFICATION_FAILED, job);
    } else {
      logDevPasswordResetLink(job.email, job.token);
      appEvents.emit(EMAIL_EVENTS.PASSWORD_RESET_FAILED, job);
    }
    return;
  }

  const nextJob: EmailJob = { ...job, attempt: job.attempt + 1 };
  const runAt = Date.now() + retryDelayMs(nextJob.attempt);
  await redis.zAdd(EMAIL_RETRY_KEY, { score: runAt, value: JSON.stringify(nextJob) });

  console.warn(
    `⏳ ${job.type} email retry scheduled for ${job.email} (attempt ${nextJob.attempt}/${env.EMAIL_MAX_RETRIES})`,
  );
};

export const drainDueEmailRetries = async () => {
  const now = Date.now();
  const due = await redis.zRangeByScore(EMAIL_RETRY_KEY, 0, now);

  for (const raw of due) {
    await redis.lPush(EMAIL_QUEUE_KEY, raw);
    await redis.zRem(EMAIL_RETRY_KEY, raw);
  }

  return due.length;
};

export const popEmailJob = async (): Promise<EmailJob | null> => {
  const raw = await redis.rPop(EMAIL_QUEUE_KEY);
  return raw ? (JSON.parse(raw) as EmailJob) : null;
};

export const popVerificationEmailJob = popEmailJob;

export const processEmailJob = async (job: EmailJob) => {
  try {
    if (job.type === 'verification') {
      await deliverVerificationEmail(job.email, job.token);
      console.log(`📧 Verification email sent to ${job.email} (job ${job.jobId})`);
      appEvents.emit(EMAIL_EVENTS.VERIFICATION_SENT, job);
    } else {
      await deliverPasswordResetEmail(job.email, job.token);
      console.log(`📧 Password reset email sent to ${job.email} (job ${job.jobId})`);
      appEvents.emit(EMAIL_EVENTS.PASSWORD_RESET_SENT, job);
    }
  } catch (err) {
    console.error(
      `❌ ${job.type} email failed for ${job.email} (attempt ${job.attempt}, job ${job.jobId}):`,
      err,
    );
    await scheduleEmailRetry(job);
  }
};

export const processVerificationEmailJob = processEmailJob;
