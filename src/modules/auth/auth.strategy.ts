import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../../config/env';
import { upsertOAuthUser } from './auth.service';
import { syncGitHubIntegrationFromOAuthLogin } from '../integrations/githubIntegration.service';

export const configurePassport = () => {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
      },
      async (accessToken: string, _refreshToken: string, profile: any, done: Function) => {
        try {
          const user = await upsertOAuthUser({
            provider: 'github',
            providerId: String(profile.id),
            username: profile.username,
            name: profile.displayName || profile.username,
            email: profile.emails?.[0]?.value,
            avatarUrl: profile.photos?.[0]?.value,
            profileUrl: profile.profileUrl,
          });

          await syncGitHubIntegrationFromOAuthLogin({
            userId: user.id,
            accessToken,
            githubUserId: String(profile.id),
            githubUsername: profile.username,
            profileUrl: profile.profileUrl,
            avatarUrl: profile.photos?.[0]?.value,
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const user = await upsertOAuthUser({
              provider: 'google',
              providerId: profile.id,
              username: profile.emails?.[0]?.value?.split('@')[0] || profile.id,
              name: profile.displayName,
              email: profile.emails?.[0]?.value,
              avatarUrl: profile.photos?.[0]?.value,
            });
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }
};
