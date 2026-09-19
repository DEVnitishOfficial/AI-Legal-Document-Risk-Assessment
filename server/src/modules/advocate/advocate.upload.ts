import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../../common/errors/AppError";
import { PHOTO_DIR } from "./advocate.service";

fs.mkdirSync(PHOTO_DIR, { recursive: true });

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PHOTO_DIR),
    // Server-chosen name and extension — never the client's filename.
    filename: (_req, file, cb) => cb(null, `${crypto.randomBytes(16).toString("hex")}${EXT_BY_MIME[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXT_BY_MIME[file.mimetype]) return cb(null, true);
    cb(new AppError("Photo must be a JPEG, PNG or WebP image", 400));
  },
});

// Turns multer's own errors (e.g. file too large) into clean 400s instead of a 500.
export const advocatePhotoUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single("photo")(req, res, (err: any) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return next(new AppError("Photo must be 2 MB or smaller", 400));
    if (err instanceof multer.MulterError) return next(new AppError("Invalid photo upload", 400));
    next(err);
  });
};
