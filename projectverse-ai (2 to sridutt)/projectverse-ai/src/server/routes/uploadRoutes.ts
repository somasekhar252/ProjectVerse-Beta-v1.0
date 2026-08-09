import express, { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import { sanitizeFilename, MAX_VIDEO_SIZE } from "../validation/uploadValidation";
import {
  uploadImageHandler,
  uploadVideoHandler,
  uploadWorkspaceHandler,
  rollbackHandler
} from "../controllers/uploadController";

const router: Router = express.Router();

// Detailed logging middleware for every upload request
router.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  console.log(`[Upload Route Logger] -> ${req.method} ${req.originalUrl || req.url} | Content-Type: ${req.headers["content-type"] || "unknown"} | Content-Length: ${req.headers["content-length"] || 0} bytes`);
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(`[Upload Route Logger] <- ${req.method} ${req.originalUrl || req.url} | Status: ${res.statusCode} | Duration: ${duration}ms`);
  });
  next();
});

// Configure disk storage inside OS temporary directory to prevent local workspace pollution
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const cleanName = sanitizeFilename(file.originalname || "upload.dat");
    cb(null, `pv_${Date.now()}_${cleanName}`);
  }
});

// Setup Multer uploader with global maximum video allowance (specific type constraints validated in controllers)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // 100 MB max ceiling across all endpoints
    files: 1
  }
});

// Define upload routes matching required specifications
router.post("/image", upload.single("file") as any, uploadImageHandler as any);
router.post("/video", upload.single("file") as any, uploadVideoHandler as any);
router.post("/workspace", upload.single("file") as any, uploadWorkspaceHandler as any);
router.post("/rollback", express.json(), rollbackHandler as any);

// Middleware for intercepting Multer size overflow or formatting errors
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "File exceeds the maximum allowable upload volume ceiling (100 MB)." });
      return;
    }
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }
  if (err) {
    res.status(500).json({ error: `Server error during file staging: ${err.message}` });
    return;
  }
  next();
});

// Return structured JSON error instead of generic 404 for unmatched upload requests
router.use("*", (req: Request, res: Response) => {
  console.warn(`[Upload Route Error] 404 Unmatched endpoint: ${req.method} ${req.originalUrl || req.url}`);
  res.status(404).json({
    error: `Upload endpoint '${req.originalUrl || req.url}' not found. Supported endpoints are /api/upload/image, /api/upload/video, /api/upload/workspace, and /api/upload/rollback.`
  });
});

export default router;
