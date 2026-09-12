/**
 * Production Cloudinary upload module targeting direct browser REST uploads
 * to Cloudinary API (https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload).
 */

export interface UploadAssetMetadata {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: "image" | "video" | "raw";
  size?: number;
}

export interface RollbackAssetItem {
  public_id: string;
  resource_type?: "image" | "video" | "raw";
}

/**
 * Performs a direct unsigned HTTP POST upload to Cloudinary REST API.
 * Uploads real MP4/video/image files directly into the Cloudinary Media Library.
 */
export async function uploadDirectToCloudinaryRest(
  file: File,
  endpoint: "image" | "video" | "workspace",
  onProgress?: (percent: number) => void
): Promise<UploadAssetMetadata> {
  if (!file) {
    throw new Error("No File object provided for Cloudinary upload.");
  }

  const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || "projectverse";
  const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || "projectverse_upload";
  const resourceType: "image" | "video" | "raw" = endpoint === "workspace" ? "raw" : endpoint === "video" ? "video" : "image";

  if (!cloudName) {
    throw new Error("Cloudinary configuration error: VITE_CLOUDINARY_CLOUD_NAME is not configured.");
  }
  if (!uploadPreset) {
    throw new Error("Cloudinary configuration error: VITE_CLOUDINARY_UPLOAD_PRESET is not configured.");
  }

  console.log(`[Cloudinary Upload Start] File: "${file.name}" | Size: ${(file.size / 1024 / 1024).toFixed(2)} MB | Type: "${file.type}" | Endpoint: "${resourceType}" | Cloud Name: "${cloudName}" | Preset: "${uploadPreset}"`);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  if (resourceType === "video") {
    formData.append("folder", "reels");
  } else if (resourceType === "image") {
    formData.append("folder", "thumbnails");
  } else if (resourceType === "raw") {
    formData.append("folder", "workspace");
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  console.log(`[Cloudinary Request] POSTing to ${uploadUrl} using preset "${uploadPreset}"...`);

  return new Promise<UploadAssetMetadata>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      const responseText = xhr.responseText || "";
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(responseText);
          if (data && data.secure_url) {
            console.log(`[Cloudinary SUCCESS] Asset successfully stored in Cloudinary Media Library! URL: ${data.secure_url}`);
            return resolve({
              secure_url: data.secure_url,
              public_id: data.public_id || `cloudinary_${Date.now()}`,
              format: data.format || (resourceType === "video" ? "mp4" : "png"),
              resource_type: data.resource_type || resourceType,
              size: data.bytes || file.size
            });
          }
        } catch (err) {
          return reject(new Error(`Failed to parse Cloudinary response: ${err instanceof Error ? err.message : String(err)}`));
        }
      }

      let errorDetails = responseText;
      try {
        const errJson = JSON.parse(responseText);
        if (errJson.error && errJson.error.message) {
          errorDetails = errJson.error.message;
        }
      } catch (_) {}

      console.error(`[Cloudinary Error] HTTP ${xhr.status} with preset "${uploadPreset}": ${errorDetails}`);
      reject(new Error(`Cloudinary Upload Failed (HTTP ${xhr.status}): ${errorDetails}`));
    };

    xhr.onerror = () => reject(new Error("Network error uploading to Cloudinary. Please check your internet connection."));
    xhr.ontimeout = () => reject(new Error("Cloudinary upload request timed out. Please try again."));

    xhr.open("POST", uploadUrl, true);
    xhr.send(formData);
  });
}

/**
 * Primary entry point for uploading assets to Cloudinary.
 * Directly uses Cloudinary REST API. If a local Express upload server is running,
 * optionally attempts it first before using Cloudinary REST API.
 */
export const uploadToBackendCloudinary = async (
  file: File,
  endpoint: "image" | "video" | "workspace",
  onProgress?: (percent: number) => void
): Promise<UploadAssetMetadata> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  // Attempt local server endpoint first if present
  try {
    const url = `/api/upload/${endpoint}`;
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    const serverRes = await new Promise<UploadAssetMetadata | null>((resolve) => {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        const responseText = xhr.responseText || "";
        const isHtmlResponse = responseText.trim().startsWith("<");

        if (xhr.status >= 200 && xhr.status < 300 && !isHtmlResponse) {
          try {
            const response = JSON.parse(responseText);
            if (response && response.secure_url) {
              return resolve({
                secure_url: response.secure_url,
                public_id: response.public_id,
                format: response.format || "raw",
                resource_type: response.resource_type || (endpoint === "workspace" ? "raw" : endpoint === "video" ? "video" : "image"),
                size: response.bytes || file.size
              });
            }
          } catch (err) {}
        }
        resolve(null);
      };

      xhr.onerror = () => resolve(null);
      xhr.ontimeout = () => resolve(null);
      xhr.timeout = 2000;

      xhr.open("POST", url, true);
      xhr.send(formData);
    });

    if (serverRes) return serverRes;
  } catch (err) {
    console.debug("Express upload server offline, proceeding to direct Cloudinary REST API...");
  }

  // Direct Cloudinary REST API Upload
  return await uploadDirectToCloudinaryRest(file, endpoint, onProgress);
};

/**
 * Legacy wrapper function redirecting previous direct client calls through our secured Cloudinary pipelines.
 */
export const uploadToCloudinary = (
  file: File,
  folder: "reels" | "projects" | "profiles" | "thumbnails" | "workspace" | string,
  onProgress?: (percent: number) => void
): Promise<{ secure_url: string; public_id: string; format: string; size: number }> => {
  let endpoint: "image" | "video" | "workspace" = "image";
  if (file.type.startsWith("video/") || folder === "reels") {
    endpoint = "video";
  } else if (folder === "workspace" || file.name.endsWith(".zip") || file.name.endsWith(".pdf") || file.type.includes("zip") || file.type.includes("pdf")) {
    endpoint = "workspace";
  }

  return uploadToBackendCloudinary(file, endpoint, onProgress).then(res => ({
    secure_url: res.secure_url,
    public_id: res.public_id,
    format: res.format,
    size: res.size || 0
  }));
};

/**
 * Executes a cleanup operation on Cloudinary if project publication to database fails after upload.
 */
export const rollbackUploadedAssets = async (assets: RollbackAssetItem[]): Promise<boolean> => {
  if (!assets || assets.length === 0) return true;

  try {
    const response = await fetch("/api/upload/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets })
    });

    if (response.ok) {
      console.log("[Rollback Complete] Orphaned assets cleaned up successfully.");
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};
