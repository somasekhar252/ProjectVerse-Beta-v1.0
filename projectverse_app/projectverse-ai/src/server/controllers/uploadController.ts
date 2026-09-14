import { Request, Response } from "express";
import fs from "fs";
import { validateUploadFile } from "../validation/uploadValidation";
import { uploadFileToCloudinary, rollbackCloudinaryAssets, RollbackAssetItem, UploadTargetFolder } from "../services/uploadService";

/**
 * Helper to remove temporary local file if validation fails before transit to Cloudinary.
 */
async function cleanFailedUpload(file?: Express.Multer.File) {
  if (file && file.path && fs.existsSync(file.path)) {
    try {
      await fs.promises.unlink(file.path);
    } catch (e) {
      console.warn(`Could not clean up failed upload file ${file.path}:`, e);
    }
  }
}

/**
 * Controller to handle Image uploads (Thumbnails, avatars, screenshots).
 */
export async function uploadImageHandler(req: Request, res: Response): Promise<void> {
  const file = req.file;
  try {
    const validation = validateUploadFile(file as any, "image");
    if (!validation.valid || !file) {
      await cleanFailedUpload(file);
      res.status(400).json({ error: validation.error || "Invalid file." });
      return;
    }

    const isReelThumbnail = req.query.target === "reel-thumbnail" || req.body?.target === "reel-thumbnail";
    const targetFolder: UploadTargetFolder = isReelThumbnail ? "reels/thumbnails" : "projects/thumbnails";

    const result = await uploadFileToCloudinary(file.path, targetFolder, "image", file.originalname);
    res.status(200).json({
      success: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      asset_id: result.asset_id,
      folder: result.folder,
      original_filename: result.original_filename
    });
  } catch (err: any) {
    await cleanFailedUpload(file);
    console.error("[uploadImageHandler Error]:", err);
    res.status(500).json({ error: err?.message || "Failed to upload image to Cloudinary." });
  }
}

/**
 * Controller to handle Video uploads (Demo videos and Reels).
 */
export async function uploadVideoHandler(req: Request, res: Response): Promise<void> {
  const file = req.file;
  const isReel = req.query.target === "reel" || req.body?.target === "reel";
  const targetFolder: UploadTargetFolder = isReel ? "reels/videos" : "projects/demo-videos";

  try {
    const validation = validateUploadFile(file as any, "video");
    if (!validation.valid || !file) {
      await cleanFailedUpload(file);
      res.status(400).json({ error: validation.error || "Invalid video file." });
      return;
    }

    const result = await uploadFileToCloudinary(file.path, targetFolder, "video", file.originalname);
    res.status(200).json({
      success: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      asset_id: result.asset_id,
      folder: result.folder,
      original_filename: result.original_filename
    });
  } catch (err: any) {
    await cleanFailedUpload(file);
    console.error("[uploadVideoHandler Error]:", err);
    res.status(500).json({ error: err?.message || "Failed to upload video to Cloudinary." });
  }
}

/**
 * Controller to handle Workspace archive/report uploads (ZIP or PDF).
 */
export async function uploadWorkspaceHandler(req: Request, res: Response): Promise<void> {
  const file = req.file;
  try {
    const validation = validateUploadFile(file as any, "workspace");
    if (!validation.valid || !file) {
      await cleanFailedUpload(file);
      res.status(400).json({ error: validation.error || "Invalid workspace archive file." });
      return;
    }

    // Always treat workspace ZIP/PDF files as 'raw' resource type in Cloudinary to preserve structure and ensure downloadability
    const result = await uploadFileToCloudinary(file.path, "projects/files", "raw", file.originalname);
    res.status(200).json({
      success: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format || "raw",
      resource_type: "raw",
      bytes: result.bytes,
      asset_id: result.asset_id,
      folder: result.folder,
      original_filename: result.original_filename
    });
  } catch (err: any) {
    await cleanFailedUpload(file);
    console.error("[uploadWorkspaceHandler Error]:", err);
    res.status(500).json({ error: err?.message || "Failed to upload workspace archive to Cloudinary." });
  }
}

/**
 * Controller to handle rollback / cleanup when project publication to Firestore fails.
 */
export async function rollbackHandler(req: Request, res: Response): Promise<void> {
  try {
    const assets: RollbackAssetItem[] = req.body?.assets;
    if (!Array.isArray(assets) || assets.length === 0) {
      res.status(400).json({ error: "Invalid payload: 'assets' array is required." });
      return;
    }

    const result = await rollbackCloudinaryAssets(assets);
    res.status(200).json({
      success: true,
      message: "Rollback operations completed.",
      summary: result
    });
  } catch (err: any) {
    console.error("[rollbackHandler Error]:", err);
    res.status(500).json({ error: err?.message || "Failed to execute rollback cleanup." });
  }
}
