import express from "express";
import cors from "cors";
import passport from "passport";
import { errorHandler } from "./common/middleware/error.middleware";
import routes from "./routes";
import { env } from "./config/env";
import { PHOTO_DIR } from "./modules/advocate/advocate.service";

const app = express();

app.use(cors({
  origin: [env.CLIENT_URL, env.SERVER_URL],
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());
// Only the advocate-photos directory is public. The rest of uploads/ (client
// documents, voice recordings) is never served statically.
app.use("/uploads/advocates", express.static(PHOTO_DIR, { maxAge: "1h", index: false }));
console.log("Express app initialized with CORS and JSON parsing");
app.use("/api/v1", routes);
app.use(errorHandler);

app.get("/health", (req, res) => {
  res.json({ message: "Server is running" });
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global error handler:", err);
  res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
});

export default app;