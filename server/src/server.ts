import app from "./app";
import {env} from "./config/env";
import { startRagScheduler } from "./modules/rag/rag.scheduler";
import { promoteConfiguredAdmins } from "./modules/user/admin.bootstrap";
import { ensureDefaultAiAdvocate } from "./modules/advocate/advocate.service";
import { recoverStaleSessions, shutdownAll } from "./modules/consultation/consultation.realtime";
import { attachHub } from "./modules/human/human.hub";
import { startSweeper } from "./modules/human/human.service";
import { startAnalysisWorker, shutdownAnalysisWorker } from "./modules/analysis/analysis.worker";

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startRagScheduler();

  // Startup data setup must never take the API down if the DB is briefly unavailable.
  promoteConfiguredAdmins().catch((err) => console.error("Admin bootstrap failed:", err));
  ensureDefaultAiAdvocate().catch((err) => console.error("Default AI advocate setup failed:", err));

  // Live calls keep running (and billing) at OpenAI if this process dies, so hang up any left over.
  recoverStaleSessions().catch((err) => console.error("Consultation recovery failed:", err));

  // Live calls with real advocates: the realtime hub (WebSocket on this port) and the timeout sweeper.
  startSweeper();

  // Document analysis (text extraction incl. OCR fallback, the OpenAI call)
  // runs in the background via BullMQ — this process both serves the API
  // and consumes the queue, which is all one deployment needs at this scale.
  startAnalysisWorker();
});
attachHub(server);

// End live calls / stop taking new analysis jobs cleanly on a normal
// shutdown; a crash is covered by the recovery above.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    Promise.all([shutdownAll(), shutdownAnalysisWorker()]).finally(() => process.exit(0));
  });
}
