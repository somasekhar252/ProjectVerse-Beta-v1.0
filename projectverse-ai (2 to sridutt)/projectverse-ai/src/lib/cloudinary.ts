/**
 * Production-ready frontend Cloudinary helper communicating exclusively with secure server endpoints.
 * Prevents exposure of API Secrets and implements real-time upload progress and rollback support.
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
 * Uploads a file via secure Express backend endpoints (/api/upload/image, /api/upload/video, /api/upload/workspace).
 * Utilizes XMLHttpRequest for reliable percentage progress calculations.
 */
export const uploadToBackendCloudinary = (
  file: File,
  endpoint: "image" | "video" | "workspace",
  onProgress?: (percent: number) => void
): Promise<UploadAssetMetadata> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file provided for upload."));
    }

    const url = `/api/upload/${endpoint}`;
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            secure_url: response.secure_url,
            public_id: response.public_id,
            format: response.format || "raw",
            resource_type: response.resource_type || (endpoint === "workspace" ? "raw" : endpoint === "video" ? "video" : "image"),
            size: response.bytes || file.size
          });
        } catch (err) {
          reject(new Error("Failed to parse backend upload response"));
        }
      } else {
        let errorMsg = `Upload failed (${xhr.status})`;
        try {
          const resObj = JSON.parse(xhr.responseText);
          if (resObj.error) errorMsg = resObj.error;
        } catch {}
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network connection lost during upload to backend server."));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out. Please verify your internet connection speed."));
    };

    xhr.timeout = 300000; // 5-minute maximum window for large media transfers
    xhr.open("POST", url, true);
    xhr.send(formData);
  });
};

/**
 * Legacy wrapper function redirecting previous direct client calls through our secured backend pipelines.
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
      console.log("[Rollback Complete] Orphaned assets cleaned up from Cloudinary successfully.");
      return true;
    }
    console.warn("[Rollback Warning] Server responded with error during cleanup.");
    return false;
  } catch (err) {
    console.error("[Rollback Error] Could not contact backend to remove orphaned assets:", err);
    return false;
  }
};
