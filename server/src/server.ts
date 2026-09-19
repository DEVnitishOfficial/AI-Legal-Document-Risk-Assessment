import app from "./app";
import {env} from "./config/env";
import { startRagScheduler } from "./modules/rag/rag.scheduler";
import { promoteConfiguredAdmins } from "./modules/user/admin.bootstrap";
import { ensureDefaultAiAdvocate } from "./modules/advocate/advocate.service";
import { recoverStaleSessions, shutdownAll } from "./modules/consultation/consultation.realtime";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startRagScheduler();

  // Startup data setup must never take the API down if the DB is briefly unavailable.
  promoteConfiguredAdmins().catch((err) => console.error("Admin bootstrap failed:", err));
  ensureDefaultAiAdvocate().catch((err) => console.error("Default AI advocate setup failed:", err));

  // Live calls keep running (and billing) at OpenAI if this process dies, so hang up any left over.
  recoverStaleSessions().catch((err) => console.error("Consultation recovery failed:", err));
});

// End live calls cleanly on a normal shutdown; a crash is covered by the recovery above.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    shutdownAll().finally(() => process.exit(0));
  });
}
