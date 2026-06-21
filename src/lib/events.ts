import { EventEmitter } from 'events';

export type EmailJobBase = {
  email: string;
  token: string;
  attempt: number;
  jobId: string;
};

export type VerificationEmailPayload = EmailJobBase & {
  type: 'verification';
};

export type PasswordResetEmailPayload = EmailJobBase & {
  type: 'password-reset';
};

export type EmailJob = VerificationEmailPayload | PasswordResetEmailPayload;

export const EMAIL_EVENTS = {
  QUEUED: 'email:queued',
  VERIFICATION_SENT: 'email:verification:sent',
  VERIFICATION_FAILED: 'email:verification:failed',
  PASSWORD_RESET_SENT: 'email:password-reset:sent',
  PASSWORD_RESET_FAILED: 'email:password-reset:failed',
} as const;

class AppEvents extends EventEmitter {}

export const appEvents = new AppEvents();
