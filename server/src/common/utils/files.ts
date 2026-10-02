import fs from "fs";
import path from "path";
import { logger } from "../../config/logger";

const UPLOADS_DIR = path.resolve("uploads");

// Best-effort removal of a stored upload. Never throws: the database row is
// the source of truth, and a missing/locked file must not fail the request.
// Only paths inside the uploads directory are ever touched.
export const removeUploadedFile = async (filePath?: string | null) => {
  if (!filePath) return;

  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) return;

  try {
    await fs.promises.unlink(resolved);
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      logger.warn({ err, file: resolved }, "Could not remove uploaded file");
    }
  }
};
