import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { prisma } from './database'; // adjust to match your prisma client import path

const toAuthUser = (user: {
  id: string;
  email: string;
  role: string;
  name: string;
  avatar: string | null;
}) => ({
  userId: user.id,
  email: user.email,
  role: user.role,
  name: user.name,
  avatar: user.avatar,
});

passport.use(
  new GoogleStrategy(
    // ── Part 1: Tell Google who you are ─────────────────────────
    // These credentials prove to Google that requests are coming 
    // from YOUR registered application, not someone pretending to be you
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },

    // ── Part 2: What to do after Google confirms the user ────────
    // This callback runs AFTER Google has verified the user
    // and handed us their profile. Now we decide what to do with it.
    // _accessToken and _refreshToken are Google's own tokens — we 
    // don't need them because we issue our own JWTs
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        // Google should always return an email, but we guard against it.
        // If somehow there's no email, we can't create an account.
        if (!email) {
          return done(new Error('No email returned from Google'), undefined);
        }

        // ── Scenario 1: Returning Google user ───────────────────
        // They've logged in with Google before — just find and return them
        let user = await prisma.user.findFirst({
          where: { googleId: profile.id, deletedAt: null },
        });
        if (user) return done(null, toAuthUser(user));

        // ── Scenario 2: Existing email user linking Google ──────
        // They registered with email/password first, now using Google.
        // We LINK (not duplicate) their accounts by saving googleId.
        // This prevents having two separate accounts for the same person.
        const existingByEmail = await prisma.user.findFirst({
          where: { email, deletedAt: null },
        });

        if (existingByEmail) {
          user = await prisma.user.update({
            where: { email },
            data: {
              googleId: profile.id,
              avatar: existingByEmail.avatar ?? profile.photos?.[0]?.value,
            },
          });
          return done(null, toAuthUser(user));
        }

        // ── Scenario 3: Brand new user ──────────────────────────
        // First time we've ever seen this person. Create their account.
        // isEmailVerified: true because Google already confirmed their email
        // — no need to send a verification email like you do for regular signup
        user = await prisma.user.create({
          data: {
            email,
            name: profile.displayName,
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value,
            isEmailVerified: true,
            // password intentionally omitted — it's now optional in schema
          },
        });

        return done(null, toAuthUser(user));
      } catch (error) {
        // done(error, undefined) tells Passport something went wrong
        // Passport will then trigger the failureRedirect
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport;
