/**
 * Unified Firebase Database Service
 * Seamlessly replaces legacy Supabase database calls with Firebase Firestore.
 */
import { User, Project, Reel } from "../types";
import { 
  saveUserToFirestore, 
  fetchUserFromFirestore,
  saveProjectToFirestore,
  fetchProjectsFromFirestore,
  saveReelToFirestore,
  fetchReelsFromFirestore,
  firebaseDb
} from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// ==========================================
// 1. AUTHENTICATION & USER PROFILE SYNC
// ==========================================

export async function syncUserProfile(user: any): Promise<User> {
  if (!user) {
    return {
      id: "guest",
      name: "Guest Student",
      email: "",
      collegeName: "Indian Institute of Science",
      role: "Syllabus Architect",
      badges: ["Guest"]
    };
  }

  const email = user.email || "";
  const name = user.displayName || user.name || (email ? email.split("@")[0] : "Student Innovator");
  const avatarUrl = user.photoURL || user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id || user.uid}`;
  const userId = user.uid || user.id;

  const profile: User = {
    id: userId,
    name,
    email,
    avatarUrl,
    collegeName: user.collegeName || user.college || "Indian Institute of Science",
    role: user.role || "Syllabus Architect",
    badges: user.badges || ["Blueprint Pioneer", "Firebase Synced"],
    followersCount: user.followersCount || 0,
    followingCount: user.followingCount || 0,
    bio: user.bio || "Full Stack Engineering Student",
    github: user.github || "",
    linkedin: user.linkedin || "",
    portfolioLink: user.portfolioLink || ""
  };

  // Persist to Firestore
  await saveUserToFirestore(profile);
  return profile;
}

export async function updateUserProfile(userId: string, profileUpdates: Partial<User>): Promise<User | null> {
  try {
    // 1. Save to Firestore
    await saveUserToFirestore({ id: userId, ...profileUpdates });

    // 2. Sync with Express REST Server endpoint
    const res = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": userId
      },
      body: JSON.stringify(profileUpdates)
    });

    if (res.ok) {
      const data = await res.json();
      return data.user;
    }
  } catch (err) {
    console.warn("User profile update warning:", err);
  }

  return { id: userId, ...profileUpdates } as User;
}

// ==========================================
// 2. REELS API & FIRESTORE INTERACTIONS
// ==========================================

export async function fetchReelsFromSupabase(): Promise<Reel[]> {
  try {
    const firestoreReels = await fetchReelsFromFirestore();
    if (firestoreReels && firestoreReels.length > 0) {
      return firestoreReels as Reel[];
    }
  } catch (err) {
    console.warn("Firestore Reels fetch warning:", err);
  }

  // Fallback to Express REST server
  try {
    const res = await fetch("/api/reels");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.warn("Express Reels fetch warning:", e);
  }
  return [];
}

export async function insertReelToSupabase(reel: Omit<Reel, "id" | "createdDate">): Promise<Reel> {
  const newReel: Reel = {
    ...reel,
    id: "reel_" + Date.now(),
    createdDate: new Date().toISOString(),
    likes: [],
    saves: [],
    comments: []
  };

  await saveReelToFirestore(newReel);
  return newReel;
}

export async function likeReelInSupabase(reelId: string, userId: string): Promise<string[]> {
  try {
    const docRef = doc(firebaseDb, "reels", reelId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      let likes: string[] = data.likes || [];
      if (likes.includes(userId)) {
        likes = likes.filter(id => id !== userId);
      } else {
        likes.push(userId);
      }
      await updateDoc(docRef, { likes });
      return likes;
    }
  } catch (err) {
    console.warn("Like reel Firestore warning:", err);
  }
  return [];
}

export async function saveReelInSupabase(reelId: string, userId: string): Promise<string[]> {
  try {
    const docRef = doc(firebaseDb, "reels", reelId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      let saves: string[] = data.saves || [];
      if (saves.includes(userId)) {
        saves = saves.filter(id => id !== userId);
      } else {
        saves.push(userId);
      }
      await updateDoc(docRef, { saves });
      return saves;
    }
  } catch (err) {
    console.warn("Save reel Firestore warning:", err);
  }
  return [];
}

export async function addCommentToReelInSupabase(reelId: string, comment: any): Promise<any[]> {
  try {
    const docRef = doc(firebaseDb, "reels", reelId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const comments = data.comments || [];
      const updatedComments = [...comments, comment];
      await updateDoc(docRef, { comments: updatedComments });
      return updatedComments;
    }
  } catch (err) {
    console.warn("Add comment reel Firestore warning:", err);
  }
  return [];
}

export async function uploadFileToSupabase(
  bucketName: string,
  file: File | Blob,
  fileName: string
): Promise<string | null> {
  try {
    const fileObj = file instanceof File ? file : new File([file], fileName, { type: file.type || "application/octet-stream" });
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: fileObj.name,
        fileType: fileObj.type,
        base64Data: await fileToBase64(fileObj)
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
  } catch (e) {
    console.warn("File upload warning:", e);
  }
  return `/uploads/${Date.now()}_${fileName}`;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res.split(",")[1] || res);
    };
    reader.onerror = err => reject(err);
  });
};

// ==========================================
// 3. PROJECTS API & FIRESTORE INTERACTIONS
// ==========================================

export async function fetchProjectsFromSupabase(): Promise<Project[]> {
  try {
    const firestoreProjects = await fetchProjectsFromFirestore();
    if (firestoreProjects && firestoreProjects.length > 0) {
      return firestoreProjects as Project[];
    }
  } catch (err) {
    console.warn("Firestore projects fetch warning:", err);
  }

  // Fallback to Express REST server
  try {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.warn("Express Projects fetch warning:", e);
  }
  return [];
}

export async function insertProjectToSupabase(project: any): Promise<Project> {
  await saveProjectToFirestore(project);
  return project;
}

export async function likeProjectInSupabase(projectId: string, userId: string): Promise<string[]> {
  try {
    const docRef = doc(firebaseDb, "projects", projectId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      let likes: string[] = data.likes || [];
      if (likes.includes(userId)) {
        likes = likes.filter(id => id !== userId);
      } else {
        likes.push(userId);
      }
      await updateDoc(docRef, { likes });
      return likes;
    }
  } catch (err) {
    console.warn("Like project Firestore warning:", err);
  }
  return [];
}

export async function addCommentToProjectInSupabase(projectId: string): Promise<boolean> {
  try {
    const docRef = doc(firebaseDb, "projects", projectId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const count = (data.commentsCount || 0) + 1;
      await updateDoc(docRef, { commentsCount: count });
      return true;
    }
  } catch (err) {
    console.warn("Add comment project Firestore warning:", err);
  }
  return false;
}

export function subscribeToTable() {
  return { unsubscribe: () => {} };
}
