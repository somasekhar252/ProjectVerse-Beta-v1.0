import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://lakeuaetvrriyoszcowq.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_OdI4jY9kK37LOYyYyOudMw_kVIVOMHO";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to a specific Supabase storage bucket.
 * @param {string} bucket - The name of the bucket (reels, project-files, thumbnails).
 * @param {File|Blob} file - The file object to upload.
 * @param {string} fileName - The desired name for the file.
 * @returns {Promise<{path: string, url: string}|null>}
 */
export async function uploadFile(bucket, file, fileName) {
  try {
    const fileExt = fileName.split('.').pop();
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(uniqueName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error(`Error uploading file to ${bucket}:`, error.message);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(uniqueName);

    return { path: data.path, url: publicUrl };
  } catch (err) {
    console.error(`Upload failed for bucket ${bucket}:`, err);
    return null;
  }
}

/**
 * Retrieves the public URL of a file from a specific bucket and path.
 * @param {string} bucket - The bucket name (reels, project-files, thumbnails).
 * @param {string} path - The path of the file in the bucket.
 * @returns {string} The public URL.
 */
export function getFileUrl(bucket, path) {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  return publicUrl;
}

// Storage-specific upload helpers
export async function uploadReel(file, fileName) {
  return uploadFile("reels", file, fileName);
}

export async function uploadProjectFile(file, fileName) {
  return uploadFile("project-files", file, fileName);
}

export async function uploadThumbnail(file, fileName) {
  return uploadFile("thumbnails", file, fileName);
}

// Storage-specific retrieval helpers
export function getReelUrl(path) {
  return getFileUrl("reels", path);
}

export function getProjectFileUrl(path) {
  return getFileUrl("project-files", path);
}

export function getThumbnailUrl(path) {
  return getFileUrl("thumbnails", path);
}
