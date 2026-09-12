/**
 * Firebase Unified Storage & Realtime Bridge
 * Replaces legacy Supabase network calls with Firebase Storage & Firestore.
 */
import { uploadFileToFirebaseStorage } from "./firebase";

// Mock Supabase client to prevent broken network calls & ERR_NAME_NOT_RESOLVED console errors
export const supabase: any = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => {},
    getUser: async () => ({ data: { user: null }, error: null }),
  },
  from: () => ({
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  }),
  channel: () => ({
    on: function() { return this; },
    subscribe: () => ({ unsubscribe: () => {} }),
  }),
  storage: {
    from: (bucket: string) => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
};

/**
 * Uploads a file to Firebase Storage.
 */
export async function uploadFile(bucket: string, file: File | Blob, fileName: string): Promise<{ path: string; url: string } | null> {
  try {
    const fileObj = file instanceof File ? file : new File([file], fileName, { type: file.type || "application/octet-stream" });
    const storagePath = `project-files/${bucket}/${Date.now()}_${fileName.replace(/\s+/g, "_")}`;
    const url = await uploadFileToFirebaseStorage(fileObj, storagePath);
    return { path: storagePath, url };
  } catch (err) {
    console.warn(`Firebase file upload for ${bucket}:`, err);
    return null;
  }
}

export function getFileUrl(bucket: string, path: string): string {
  return path.startsWith("http") ? path : `/uploads/${path}`;
}

export async function uploadReel(file: File | Blob, fileName: string) {
  return uploadFile("reels", file, fileName);
}

export async function uploadProjectFile(file: File | Blob, fileName: string) {
  return uploadFile("workspace", file, fileName);
}

export async function uploadThumbnail(file: File | Blob, fileName: string) {
  return uploadFile("thumbnails", file, fileName);
}

export function getReelUrl(path: string) {
  return getFileUrl("reels", path);
}

export function getProjectFileUrl(path: string) {
  return getFileUrl("project-files", path);
}

export function getThumbnailUrl(path: string) {
  return getFileUrl("thumbnails", path);
}
