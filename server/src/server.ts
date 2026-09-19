import app from "./app";
import {env} from "./config/env";
import { startRagScheduler } from "./modules/rag/rag.scheduler";
import { promoteConfiguredAdmins } from "./modules/user/admin.bootstrap";
import { ensureDefaultAiAdvocate } from "./modules/advocate/advocate.service";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startRagScheduler();

  // Startup data setup must never take the API down if the DB is briefly unavailable.
  promoteConfiguredAdmins().catch((err) => console.error("Admin bootstrap failed:", err));
  ensureDefaultAiAdvocate().catch((err) => console.error("Default AI advocate setup failed:", err));

});

