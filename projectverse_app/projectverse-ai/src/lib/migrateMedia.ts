import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { firebaseDb } from "./firebase";
import { uploadDirectToCloudinaryRest, CloudinaryUploadEndpoint } from "./cloudinary";

export interface MediaReportItem {
  collectionName: "projects" | "reels";
  documentId: string;
  field: string;
  oldUrl: string;
  status: "detected" | "accessible" | "migrated" | "unavailable";
  newUrl?: string;
  error?: string;
}

export interface MigrationReport {
  totalDocumentsScanned: number;
  oldUrlsFound: number;
  accessibleUrls: number;
  unavailableUrls: number;
  migratedUrls: number;
  items: MediaReportItem[];
}

/**
 * Utility to detect whether a media URL belongs to an old/legacy Cloudinary environment.
 */
export function isLegacyCloudinaryUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const targetCloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || "projectverse";
  
  // Checks if URL is a Cloudinary URL but does NOT match the new target cloud name
  const isCloudinary = url.includes("cloudinary.com");
  const isOldCloud = isCloudinary && !url.includes(`/v1_1/${targetCloudName}/`) && !url.includes(`/${targetCloudName}/`);
  const isVo4ufzoi = url.includes("vo4ufzoi");

  return isCloudinary && (isOldCloud || isVo4ufzoi);
}

/**
 * Checks if a remote URL is currently accessible over network (HTTP 200).
 */
async function checkUrlAccessibility(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return true;
    // Fallback GET check if HEAD is blocked by CORS/CDN
    const getRes = await fetch(url, { method: "GET" });
    return getRes.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Downloads media from accessible URL and re-uploads to the new Cloudinary account.
 */
async function reuploadToNewCloudinary(
  url: string,
  targetEndpoint: CloudinaryUploadEndpoint
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch original media asset: HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const filename = url.split("/").pop() || `migrated_asset_${Date.now()}`;
  const isVideo = targetEndpoint.includes("video");
  const isRaw = targetEndpoint.includes("file") || targetEndpoint === "workspace";
  const file = new File([blob], filename, { type: blob.type || (isVideo ? "video/mp4" : isRaw ? "application/zip" : "image/png") });

  const result = await uploadDirectToCloudinaryRest(file, targetEndpoint);
  return result.secure_url;
}

/**
 * Safely inspects and optionally migrates legacy Cloudinary URLs in Firestore.
 * 
 * @param dryRun If true (default), scans database and returns a report WITHOUT modifying Firestore.
 *               If false, performs idempotently safe re-uploading and non-destructive merge updates in Firestore.
 */
export async function runCloudinaryMediaMigration(dryRun: boolean = true): Promise<MigrationReport> {
  console.log(`[Media Migration] Starting Cloudinary media scan (Dry Run Mode: ${dryRun})...`);

  const report: MigrationReport = {
    totalDocumentsScanned: 0,
    oldUrlsFound: 0,
    accessibleUrls: 0,
    unavailableUrls: 0,
    migratedUrls: 0,
    items: []
  };

  try {
    // 1. Scan /projects collection
    const projectsRef = collection(firebaseDb, "projects");
    const projectsSnap = await getDocs(projectsRef);

    for (const docSnap of projectsSnap.docs) {
      report.totalDocumentsScanned++;
      const data = docSnap.data();
      const mediaFields: { field: string; targetEndpoint: CloudinaryUploadEndpoint; legacyField: string }[] = [
        { field: "thumbnailUrl", targetEndpoint: "project-thumbnail", legacyField: "legacyThumbnailUrl" },
        { field: "demoVideoUrl", targetEndpoint: "project-video", legacyField: "legacyDemoVideoUrl" },
        { field: "workspaceFileUrl", targetEndpoint: "project-file", legacyField: "legacyWorkspaceFileUrl" }
      ];

      for (const { field, targetEndpoint, legacyField } of mediaFields) {
        const val = data[field];
        if (val && typeof val === "string" && isLegacyCloudinaryUrl(val)) {
          report.oldUrlsFound++;
          const item: MediaReportItem = {
            collectionName: "projects",
            documentId: docSnap.id,
            field,
            oldUrl: val,
            status: "detected"
          };

          const accessible = await checkUrlAccessibility(val);
          if (accessible) {
            report.accessibleUrls++;
            item.status = "accessible";

            if (!dryRun) {
              try {
                const newUrl = await reuploadToNewCloudinary(val, targetEndpoint);
                item.newUrl = newUrl;
                item.status = "migrated";
                report.migratedUrls++;

                // Safely update only the media field + preserve legacy URL
                const docRef = doc(firebaseDb, "projects", docSnap.id);
                await setDoc(docRef, {
                  [field]: newUrl,
                  [legacyField]: val,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
                console.log(`[Media Migration SUCCESS] Migrated project ${docSnap.id} ${field} -> ${newUrl}`);
              } catch (err: any) {
                item.status = "unavailable";
                item.error = err?.message || "Re-upload failed";
                report.unavailableUrls++;
              }
            }
          } else {
            report.unavailableUrls++;
            item.status = "unavailable";
            item.error = "ASSET_UNAVAILABLE_ORIGINAL_REQUIRED: Old Cloudinary asset returned non-200 status.";
          }

          report.items.push(item);
        }
      }
    }

    // 2. Scan /reels collection
    const reelsRef = collection(firebaseDb, "reels");
    const reelsSnap = await getDocs(reelsRef);

    for (const docSnap of reelsSnap.docs) {
      report.totalDocumentsScanned++;
      const data = docSnap.data();
      const mediaFields: { field: string; targetEndpoint: CloudinaryUploadEndpoint; legacyField: string }[] = [
        { field: "videoUrl", targetEndpoint: "reel-video", legacyField: "legacyVideoUrl" },
        { field: "thumbnail", targetEndpoint: "reel-thumbnail", legacyField: "legacyThumbnail" }
      ];

      for (const { field, targetEndpoint, legacyField } of mediaFields) {
        const val = data[field];
        if (val && typeof val === "string" && isLegacyCloudinaryUrl(val)) {
          report.oldUrlsFound++;
          const item: MediaReportItem = {
            collectionName: "reels",
            documentId: docSnap.id,
            field,
            oldUrl: val,
            status: "detected"
          };

          const accessible = await checkUrlAccessibility(val);
          if (accessible) {
            report.accessibleUrls++;
            item.status = "accessible";

            if (!dryRun) {
              try {
                const newUrl = await reuploadToNewCloudinary(val, targetEndpoint);
                item.newUrl = newUrl;
                item.status = "migrated";
                report.migratedUrls++;

                const docRef = doc(firebaseDb, "reels", docSnap.id);
                await setDoc(docRef, {
                  [field]: newUrl,
                  [legacyField]: val,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
                console.log(`[Media Migration SUCCESS] Migrated reel ${docSnap.id} ${field} -> ${newUrl}`);
              } catch (err: any) {
                item.status = "unavailable";
                item.error = err?.message || "Re-upload failed";
                report.unavailableUrls++;
              }
            }
          } else {
            report.unavailableUrls++;
            item.status = "unavailable";
            item.error = "ASSET_UNAVAILABLE_ORIGINAL_REQUIRED: Old Cloudinary asset returned non-200 status.";
          }

          report.items.push(item);
        }
      }
    }
  } catch (error: any) {
    console.error("[Media Migration Error]:", error);
  }

  console.log(`[Media Migration Summary] Mode: ${dryRun ? "DRY RUN" : "LIVE MIGRATION"} | Scanned: ${report.totalDocumentsScanned} | Old URLs: ${report.oldUrlsFound} | Accessible: ${report.accessibleUrls} | Unavailable: ${report.unavailableUrls} | Migrated: ${report.migratedUrls}`);
  return report;
}
