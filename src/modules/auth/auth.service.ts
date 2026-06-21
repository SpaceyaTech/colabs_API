import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import {
  generateUsernameFromEmail,
  generateVerificationToken,
} from '../../lib/authTokens';
import { enqueueVerificationEmail, enqueuePasswordResetEmail, logDevVerificationLink, logDevPasswordResetLink } from '../../lib/email';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email: email.toLowerCase() } });

export const createEmailUser = async (email: string, password: string, name?: string) => {
  const normalizedEmail = email.toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);

  if (existing?.passwordHash) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = generateVerificationToken();
  const verificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);

  let username = generateUsernameFromEmail(normalizedEmail);
  while (await prisma.user.findUnique({ where: { username } })) {
    username = generateUsernameFromEmail(normalizedEmail);
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          name: name ?? existing.name,
          emailVerified: false,
          emailVerifiedAt: null,
          emailVerificationToken: verificationToken,
          emailVerificationExpires: verificationExpires,
        },
      })
    : await prisma.user.create({
        data: {
          email: normalizedEmail,
          username,
          name: name ?? normalizedEmail.split('@')[0],
          passwordHash,
          emailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpires: verificationExpires,
        },
      });

  void enqueueVerificationEmail(normalizedEmail, verificationToken);
  logDevVerificationLink(normalizedEmail, verificationToken);
  return user;
};

export const requestPasswordReset = async (email: string) => {
  const user = await findUserByEmail(email.toLowerCase());

  if (!user?.passwordHash || !user.email) {
    return;
  }

  const resetToken = generateVerificationToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpires: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  void enqueuePasswordResetEmail(user.email, resetToken);
  logDevPasswordResetLink(user.email, resetToken);
};

export const resetPasswordWithToken = async (token: string, password: string) => {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset link', 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.passwordHash) {
    throw new AppError('Password login is not enabled for this account', 400);
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError('Current password is incorrect', 401);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
};

export const verifyEmailToken = async (token: string) => {
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired verification link', 400);
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });
};

export const resendVerificationEmail = async (email: string) => {
  const user = await findUserByEmail(email.toLowerCase());

  if (!user || !user.passwordHash || user.emailVerified) {
    return;
  }

  const verificationToken = generateVerificationToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });

  void enqueueVerificationEmail(user.email!, verificationToken);
  logDevVerificationLink(user.email!, verificationToken);
};

export const validateEmailLogin = async (email: string, password: string) => {
  const user = await findUserByEmail(email.toLowerCase());

  if (!user?.passwordHash) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.emailVerified) {
    throw new AppError('Please verify your email before signing in', 403);
  }

  return user;
};

export const upsertOAuthUser = async (params: {
  provider: 'github' | 'google';
  providerId: string;
  username: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  profileUrl?: string;
}) => {
  const { provider, providerId, username, name, email, avatarUrl, profileUrl } = params;
  const providerField = provider === 'github' ? 'githubId' : 'googleId';

  const existingByProvider = await prisma.user.findFirst({
    where: { [providerField]: providerId },
  });
  if (existingByProvider) {
    return prisma.user.update({
      where: { id: existingByProvider.id },
      data: {
        username,
        name: name ?? existingByProvider.name,
        email: email ?? existingByProvider.email,
        avatarUrl: avatarUrl ?? existingByProvider.avatarUrl,
        githubUrl: provider === 'github' ? profileUrl : existingByProvider.githubUrl,
        emailVerified: true,
        emailVerifiedAt: existingByProvider.emailVerifiedAt ?? new Date(),
      },
    });
  }

  if (email) {
    const existingByEmail = await findUserByEmail(email);
    if (existingByEmail) {
      return prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          [providerField]: providerId,
          username: existingByEmail.username || username,
          name: name ?? existingByEmail.name,
          avatarUrl: avatarUrl ?? existingByEmail.avatarUrl,
          githubUrl: provider === 'github' ? profileUrl : existingByEmail.githubUrl,
          emailVerified: true,
          emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
        },
      });
    }
  }

  let uniqueUsername = username;
  let attempt = 0;
  while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
    uniqueUsername = `${username}_${++attempt}`;
  }

  return prisma.user.create({
    data: {
      [providerField]: providerId,
      username: uniqueUsername,
      name: name ?? uniqueUsername,
      email,
      avatarUrl,
      githubUrl: provider === 'github' ? profileUrl : undefined,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
};
