/**
 * Utility functions for generating responsive, optimized Cloudinary media streaming URLs.
 */

export function isCloudinaryUrl(url?: string): boolean {
  return !!url && url.includes("cloudinary.com") && url.includes("/upload/");
}

/**
 * Transforms a standard Cloudinary image URL into an automatically compressed, size-adapted URL.
 * Injects formatting parameter flags (/f_auto,q_auto,c_limit/) directly into the URL path.
 */
export function getOptimizedImageUrl(url?: string, width = 1000): string {
  if (!url || !isCloudinaryUrl(url)) return url || "";
  if (url.includes("/f_auto") || url.includes("/q_auto")) return url;

  const transformation = `f_auto,q_auto,w_${width}`;
  return url.replace("/upload/", `/upload/${transformation}/`);
}

/**
 * Transforms a Cloudinary video URL to utilize progressive web streaming and automatic video codec selection.
 */
export function getOptimizedVideoUrl(url?: string): string {
  if (!url || !isCloudinaryUrl(url)) return url || "";
  if (url.includes("/vc_auto") || url.includes("/fl_progressive")) return url;

  const transformation = "f_auto,q_auto,vc_auto,fl_progressive";
  return url.replace("/upload/", `/upload/${transformation}/`);
}

/**
 * Generates an automated thumbnail URL preview directly from an uploaded Cloudinary video stream.
 */
export function getVideoThumbnailUrl(videoUrl?: string): string {
  if (!videoUrl || !isCloudinaryUrl(videoUrl)) return "";
  
  // Replace file extension with jpg and extract first second frame
  const transformation = "f_jpg,q_auto,w_800,so_0";
  return videoUrl.replace("/upload/", `/upload/${transformation}/`).replace(/\.[^/.]+$/, ".jpg");
}
