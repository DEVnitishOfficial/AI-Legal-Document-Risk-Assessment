import app from "./app";
import {env} from "./config/env";
import { startRagScheduler } from "./modules/rag/rag.scheduler";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startRagScheduler();
});