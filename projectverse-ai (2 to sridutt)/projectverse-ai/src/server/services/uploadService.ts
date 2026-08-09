import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { deleteCloudinaryAsset } from "../utils/cloudinaryConfig";

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: "image" | "video" | "raw";
  bytes: number;
}

export interface RollbackAssetItem {
  public_id: string;
  resource_type?: "image" | "video" | "raw";
}

/**
 * Uploads a local temporary file to Cloudinary in the designated folder,
 * extracting secure_url, public_id, format, and resource type.
 * Always guarantees temporary local file deletion after completion or failure.
 */
export async function uploadFileToCloudinary(
  filePath: string,
  folder: "projectverse/thumbnails" | "projectverse/demo-videos" | "projectverse/reels" | "projectverse/workspace",
  resourceType: "image" | "video" | "raw" | "auto" = "auto",
  originalFilename?: string
): Promise<CloudinaryUploadResponse> {
  try {
    const uploadOptions: any = {
      folder: folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false
    };

    // For raw files like ZIP or PDF reports, preservation of original filename is beneficial
    if (originalFilename && resourceType === "raw") {
      uploadOptions.public_id = `${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    }

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format || "raw",
      resource_type: (result.resource_type as any) || resourceType,
      bytes: result.bytes || 0
    };
  } catch (error: any) {
    console.error(`[UploadService Error] Failed uploading ${filePath} to Cloudinary folder ${folder}:`, error);
    throw new Error(`Cloudinary upload failed: ${error?.message || JSON.stringify(error)}`);
  } finally {
    // ALWAYS clean up temporary local files immediately after transit
    if (filePath && fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
        console.log(`[UploadService Cleanup] Deleted local temp file: ${filePath}`);
      } catch (cleanupError) {
        console.warn(`[UploadService Warning] Could not remove temp file ${filePath}:`, cleanupError);
      }
    }
  }
}

/**
 * Rollback / delete a set of Cloudinary assets if Firestore publication fails or project is rejected.
 */
export async function rollbackCloudinaryAssets(assets: RollbackAssetItem[]): Promise<{ successCount: number; failedCount: number }> {
  if (!Array.isArray(assets) || assets.length === 0) {
    return { successCount: 0, failedCount: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const item of assets) {
    if (!item.public_id) continue;
    const resType = item.resource_type || "image";
    const ok = await deleteCloudinaryAsset(item.public_id, resType as any);
    if (ok) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`[Rollback Summary] Successfully rolled back ${successCount} assets from Cloudinary (${failedCount} failures).`);
  return { successCount, failedCount };
}
