import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';

export const configurePassport = () => {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: Function) => {
        try {
          const user = await prisma.user.upsert({
            where: { githubId: String(profile.id) },
            update: {
              username: profile.username,
              name: profile.displayName || profile.username,
              email: profile.emails?.[0]?.value,
              avatarUrl: profile.photos?.[0]?.value,
              githubUrl: profile.profileUrl,
            },
            create: {
              githubId: String(profile.id),
              username: profile.username,
              name: profile.displayName || profile.username,
              email: profile.emails?.[0]?.value,
              avatarUrl: profile.photos?.[0]?.value,
              githubUrl: profile.profileUrl,
            },
          });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
};
