import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import passport from "passport";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./common/middleware/error.middleware";
import routes from "./routes";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { PHOTO_DIR } from "./modules/advocate/advocate.service";
import { openApiDocument } from "./docs/openapi";

const app = express();

// Interactive API docs, mounted BEFORE helmet: swagger-ui-express's bundled
// HTML page relies on an inline <script>, which helmet's default
// Content-Security-Policy (script-src 'self', no 'unsafe-inline') would
// otherwise silently block — not a hypothetical, it leaves a blank page
// with a CSP violation in the console. Everywhere else in this app is a
// JSON API that a response-level CSP header is inert for anyway, so this
// ordering trick keeps the header's actual protection everywhere it
// matters instead of disabling it app-wide for one HTML page.
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/api-docs.json", (req, res) => res.json(openApiDocument));

app.use(
  helmet({
    // Advocate photos (served below, /uploads/advocates) are loaded
    // cross-origin by the client (a different port in dev, a different
    // domain in production) via plain <img> tags — helmet's default
    // same-origin resource policy would make the browser block exactly
    // that. This is a pure JSON API plus one static-file directory, not an
    // HTML app, so there's no first-party page for the stricter default to
    // protect.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(pinoHttp({ logger }));
app.use(cors({
  origin: [env.CLIENT_URL, env.SERVER_URL],
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());
// Only the advocate-photos directory is public. The rest of uploads/ (client
// documents, voice recordings) is never served statically.
app.use("/uploads/advocates", express.static(PHOTO_DIR, { maxAge: "1h", index: false }));
logger.info("Express app initialized (helmet, request logging, CORS, JSON parsing)");
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
  logger.error({ err }, "Unhandled error reached the global error handler");
  res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
});

export default app;
