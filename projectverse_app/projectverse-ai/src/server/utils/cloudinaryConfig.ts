import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

/**
 * Configure Cloudinary securely for server-side operations only.
 * Never exposes API Secret to client/frontend.
 */
export function initCloudinary(): void {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("[Cloudinary Config Warning] Missing Cloudinary API credentials in server .env file. Cloudinary uploads will fail unless variables are provided.");
  } else {
    console.log(`[Cloudinary Config] Successfully initialized Cloudinary SDK for cloud_name: "${cloudName}". API_SECRET is isolated on server.`);
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

/**
 * Utility to delete an asset from Cloudinary by its public_id and resource_type.
 * Used for rolling back uploads when database persistence fails or deleting projects.
 */
export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image"
): Promise<boolean> {
  try {
    if (!publicId) return false;
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`[Cloudinary Cleanup] Destroyed asset (${resourceType}): ${publicId}`, res);
    return res?.result === "ok" || res?.result === "not found";
  } catch (err) {
    console.error(`[Cloudinary Cleanup Error] Failed to delete asset ${publicId}:`, err);
    return false;
  }
}
