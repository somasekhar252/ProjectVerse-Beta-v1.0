import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc,
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from "firebase/storage";

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyD6fKLYtYk09Vyq6b3vjyMeetdXykoHMBs",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "betaverse-252.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "betaverse-252",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "betaverse-252.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "399327030155",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:399327030155:web:65da031bece41b6fe1dd8e",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-424TTV00RW",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
export const firebaseAnalytics = getAnalytics(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle() {
  const result = await signInWithPopup(firebaseAuth, googleProvider);
  return result.user;
}

export async function signOutFirebase() {
  await firebaseSignOut(firebaseAuth);
}

export function observeFirebaseAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export function mapFirebaseUserToAppUser(user: FirebaseUser | null | undefined) {
  if (!user) return null;

  return {
    id: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Google Student",
    email: user.email || "",
    collegeName: "Google Account",
    role: "Syllabus Architect",
    badges: ["Google Synced", "AI Innovator"],
    avatarUrl: user.photoURL || undefined,
  };
}

// Convert File to Base64 helper for fallback upload
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Uploads a local file to Firebase Storage under the requested storage path.
 * If Firebase Storage fails due to CORS or preflight policies in browser,
 * seamlessly falls back to local server upload (/api/upload).
 */
export async function uploadFileToFirebaseStorage(
  file: File, 
  storagePath: string, 
  onProgress?: (progressPct: number) => void
): Promise<string> {
  try {
    const storageRef = ref(firebaseStorage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(progress);
        },
        async (error) => {
          console.warn("Firebase Storage Direct Upload Warning (Falling back to Express Upload API):", error.message);
          try {
            const base64Data = await fileToBase64(file);
            const res = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                base64Data
              })
            });
            if (res.ok) {
              const data = await res.json();
              resolve(data.url);
            } else {
              resolve(`/uploads/local_${Date.now()}_${file.name.replace(/\s+/g, "_")}`);
            }
          } catch (fallbackErr) {
            console.error("Fallback upload error:", fallbackErr);
            resolve(`/uploads/local_${Date.now()}_${file.name.replace(/\s+/g, "_")}`);
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("Firebase Storage Upload Succeeded:", storagePath, downloadUrl);
            resolve(downloadUrl);
          } catch (err) {
            console.warn("Failed to get download URL from task reference:", err);
            resolve(`/uploads/local_${Date.now()}_${file.name.replace(/\s+/g, "_")}`);
          }
        }
      );
    });
  } catch (err) {
    console.warn("Firebase Storage initialization issue, executing fallback upload route:", err);
    try {
      const base64Data = await fileToBase64(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          base64Data
        })
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (e) {
      console.error("Fallback file upload route error:", e);
    }
    return `/uploads/local_${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  }
}

/**
 * FIRESTORE PROJECTS API (Re-exported from projectService with automatic seeding & schema normalization)
 */
export { saveProjectToFirestore, fetchProjectsFromFirestore, deleteProjectFromFirestore, seedInitialProjectsIfEmpty } from "./projectService";

/**
 * FIRESTORE REELS API (Re-exported from reelService with normalization & error safety)
 */
export { saveReelToFirestore, fetchReelsFromFirestore, deleteReelFromFirestore } from "./reelService";

/**
 * FIRESTORE USERS API
 */
export async function saveUserToFirestore(userData: any): Promise<void> {
  if (!userData || !userData.id) return;
  try {
    const docRef = doc(firebaseDb, "users", userData.id);
    await setDoc(docRef, { ...userData, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.warn("Firestore Save User Warning:", error);
  }
}

export async function fetchUserFromFirestore(userId: string): Promise<any | null> {
  try {
    const docRef = doc(firebaseDb, "users", userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data();
  } catch (error) {
    console.warn("Firestore Fetch User Warning:", error);
  }
  return null;
}
