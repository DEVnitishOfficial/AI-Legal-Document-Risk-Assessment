import { Router } from "express";
import passport from "passport";
import { env } from "../../config/env";

const router = Router();

// Step 1: Redirect to Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user) => {
    // This is a browser navigation, not an API call, so a failure must land the person back
    // on the sign-in page (which explains it) rather than on a page of raw JSON.
    if (err || !user) {
      if (err) console.error("Google sign-in failed:", err.message);
      return res.redirect(`${env.CLIENT_URL}/login?error=google`);
    }

    const { token } = user;
    res.redirect(`${env.CLIENT_URL}/oauth-success?token=${token}`);
  })(req, res, next);
});

export default router;