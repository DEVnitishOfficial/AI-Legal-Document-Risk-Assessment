import cron from "node-cron";
import { ingestFromQueries } from "./rag.ingest";

// Daily at 03:00 server time — off-peak, and Firecrawl/embedding calls
// aren't latency-sensitive for this. Manual `POST /rag/ingest` still works
// for on-demand runs; this just keeps the knowledge base from going stale
// without someone remembering to trigger it.
const SCHEDULE = "0 3 * * *";

export const startRagScheduler = () => {
    cron.schedule(SCHEDULE, async () => {
        console.log("[rag-scheduler] Starting scheduled ingestion run...");
        try {
            const results = await ingestFromQueries();
            const ok = results.filter((r) => r.status === "ok").length;
            const failed = results.filter((r) => r.status === "failed").length;
            console.log(`[rag-scheduler] Ingestion run complete: ${ok} ok, ${failed} failed.`);
        } catch (err) {
            // A failed scheduled run must never take down the server —
            // log and let the next scheduled tick try again.
            console.error("[rag-scheduler] Ingestion run failed:", err);
        }
    });

    console.log(`[rag-scheduler] Scheduled RAG ingestion (cron: "${SCHEDULE}")`);
};
