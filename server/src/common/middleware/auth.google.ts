import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as userRepo from "../../modules/user/user.repository";
import { generateToken } from "../utils/jwt";
import { env } from "../../config/env";

console.log("Google Strategy Loading");

try {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.SERVER_URL}/api/v1/auth/google/callback`, // this url consist the code that google sends back after successful login, we will exchange that code for access token and user info
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;
          const profilePicture = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error("No email found in Google profile"), undefined);
          }

          //1. Find user
          let user = await userRepo.findUserByEmail(email);

          //2. If not found → create user
          if (!user) {
            // Google users don't need password → store random string
            user = await userRepo.createUser({
              name,
              email,
              password: "GOOGLE_AUTH_USER",
            });
          }

          //3. Generate JWT
          const token = generateToken({
            id: user.id,
            email: user.email,
          });

          //pass both user + token forward
          return done(null, { user, token } as unknown as Express.User);
        } catch (err) {
          return done(err, undefined);
        }
      }
    )
  );
  console.log("Google Strategy Loaded Successfully");
} catch (err) {
  console.error("Failed to initialize Google Strategy:", err);
}