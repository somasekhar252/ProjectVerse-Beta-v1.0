import path from "path";

// Maximum allowed sizes in bytes
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_WORKSPACE_SIZE = 50 * 1024 * 1024; // 50 MB

// Allowed file extensions
export const ALLOWED_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
export const ALLOWED_VIDEO_EXTS = [".mp4", ".mov", ".webm", ".avi", ".mkv"];
export const ALLOWED_WORKSPACE_EXTS = [".zip", ".pdf", ".tar", ".gz"];

// Allowed MIME types
export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
export const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/x-matroska"];
export const ALLOWED_WORKSPACE_MIMES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/pdf",
  "application/x-tar",
  "application/gzip",
  "application/octet-stream" // common fallback for archives
];

/**
 * Sanitize filename by removing spaces and non-alphanumeric characters except dots, hyphens, and underscores.
 */
export function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const cleanedBase = base
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 50); // cap length to prevent filesystem issues
  return `${cleanedBase || "file"}_${Date.now()}${ext.toLowerCase()}`;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file sizes, extensions, and MIME types according to expected category.
 */
export function validateUploadFile(
  file: Express.Multer.File,
  expectedType: "image" | "video" | "workspace"
): ValidationResult {
  if (!file) {
    return { valid: false, error: "No file provided in request payload." };
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = file.mimetype;
  const size = file.size;

  switch (expectedType) {
    case "image": {
      if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
        return { valid: false, error: `Invalid image format (${ext}). Supported formats: JPG, PNG, WEBP, GIF, SVG.` };
      }
      if (!ALLOWED_IMAGE_MIMES.includes(mime)) {
        return { valid: false, error: `Invalid image MIME type (${mime}). Expected standard image file.` };
      }
      if (size > MAX_IMAGE_SIZE) {
        return { valid: false, error: `Image exceeds maximum allowed size of 10 MB (received ${(size / (1024 * 1024)).toFixed(1)} MB).` };
      }
      break;
    }
    case "video": {
      if (!ALLOWED_VIDEO_EXTS.includes(ext)) {
        return { valid: false, error: `Invalid video format (${ext}). Supported formats: MP4, MOV, WEBM, AVI, MKV.` };
      }
      if (size > MAX_VIDEO_SIZE) {
        return { valid: false, error: `Video exceeds maximum allowed size of 100 MB (received ${(size / (1024 * 1024)).toFixed(1)} MB).` };
      }
      break;
    }
    case "workspace": {
      if (!ALLOWED_WORKSPACE_EXTS.includes(ext)) {
        return { valid: false, error: `Invalid workspace file format (${ext}). Only ZIP and PDF archives/reports are allowed.` };
      }
      if (size > MAX_WORKSPACE_SIZE) {
        return { valid: false, error: `Workspace archive exceeds maximum allowed size of 50 MB (received ${(size / (1024 * 1024)).toFixed(1)} MB).` };
      }
      break;
    }
    default: {
      return { valid: false, error: "Unknown target resource category." };
    }
  }

  return { valid: true };
}
