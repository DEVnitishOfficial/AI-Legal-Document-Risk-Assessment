import cron from "node-cron";
import { ingestFromQueries } from "./rag.ingest";
import { logger } from "../../config/logger";

// Daily at 03:00 server time — off-peak, and Firecrawl/embedding calls
// aren't latency-sensitive for this. Manual `POST /rag/ingest` still works
// for on-demand runs; this just keeps the knowledge base from going stale
// without someone remembering to trigger it.
const SCHEDULE = "0 3 * * *";

export const startRagScheduler = () => {
    cron.schedule(SCHEDULE, async () => {
        logger.info("[rag-scheduler] Starting scheduled ingestion run...");
        try {
            const results = await ingestFromQueries();
            const ok = results.filter((r) => r.status === "ok").length;
            const failed = results.filter((r) => r.status === "failed").length;
            logger.info({ ok, failed }, "[rag-scheduler] Ingestion run complete");
        } catch (err) {
            // A failed scheduled run must never take down the server —
            // log and let the next scheduled tick try again.
            logger.error({ err }, "[rag-scheduler] Ingestion run failed");
        }
    });

    logger.info({ schedule: SCHEDULE }, "[rag-scheduler] Scheduled RAG ingestion");
};
