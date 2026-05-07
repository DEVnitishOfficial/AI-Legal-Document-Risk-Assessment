import { Router } from "express";
import passport from "passport";

const router = Router();

// Step 1: Redirect to Google
router.get("/google", (req, res, next) => {
  console.log("Google route hit");
  next();
}, passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    console.log("ERR:", err);
    console.log("USER:", user);
    console.log("INFO:", info);

    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: "No user returned" });
    }

    const { token } = user;
    res.redirect(`http://localhost:5173/oauth-success?token=${token}`);
  })(req, res, next);
});

export default router;