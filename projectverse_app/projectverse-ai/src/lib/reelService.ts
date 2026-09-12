import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import { Reel, sanitizeReel } from "../types";

export const DEFAULT_ENGINEERING_REELS: Reel[] = [
  {
    id: "reel_bus_tracking",
    title: "ESP32 Live GPS Map Synchronizer",
    description: "Watch real-time campus bus tracking ESP32 updates synchronize seamlessly to our React Native client with zero delay! Problem -> Solution -> Demo.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    problem: "Campus students have no visibility on active shuttle bus routes, leading to long wait times and missed lectures.",
    solution: "ESP32 microcontroller with a NEO-6M GPS module relays location coordinates over a secure Socket.io connection to an interactive client.",
    demoType: "simulation",
    techStack: ["React Native", "ESP32", "Socket.io", "MongoDB"],
    technologyStack: ["React Native", "ESP32", "Socket.io", "MongoDB"],
    results: "Reduced average student bus wait times by 68% and eliminated shuttle route congestion.",
    likes: ["user_priya", "user_suryasekhar"],
    saves: ["user_suryasekhar"],
    comments: [
      { id: "rc1", userId: "user_priya", userName: "Priya Sharma", text: "The latency is impressively low! How did you handle network reconnection issues on the ESP32?", timestamp: "2026-07-05T09:12:00Z" }
    ],
    sharesCount: 14,
    ownerName: "Arjun Patel",
    ownerId: "user_arjun",
    creatorName: "Arjun Patel",
    creatorId: "user_arjun",
    projectId: "project_smart_bus",
    category: "Internet of Things",
    createdDate: "2026-07-05T09:12:00Z"
  },
  {
    id: "reel_code_collab",
    title: "Y.js CRDT Document Sync Pipeline",
    description: "Remote code pair editing session with cursor overlay running concurrently. See how Conflict-free Replicated Data Types (CRDTs) handle high-frequency edits without conflicts.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    problem: "Traditional text sync locks files or causes messy Git-style conflicts when developers program concurrently.",
    solution: "Y.js engine binds Monaco Editor edits, representing text as mathematical trees that merge automatically over WebSockets.",
    demoType: "canvas",
    techStack: ["React", "Y.js", "WebSockets", "Monaco Editor"],
    technologyStack: ["React", "Y.js", "WebSockets", "Monaco Editor"],
    results: "Zero sync conflicts across 100 concurrent edits, with latency mapping at under 45ms.",
    likes: ["user_arjun", "user_suryasekhar"],
    saves: ["user_suryasekhar"],
    comments: [
      { id: "rc2", userId: "user_arjun", userName: "Arjun Patel", text: "This looks exactly like Figma's architecture but for code! Masterfully built.", timestamp: "2026-07-06T14:22:00Z" }
    ],
    sharesCount: 32,
    ownerName: "Priya Sharma",
    ownerId: "user_priya",
    creatorName: "Priya Sharma",
    creatorId: "user_priya",
    projectId: "project_code_editor",
    category: "Software Engineering",
    createdDate: "2026-07-06T14:22:00Z"
  },
  {
    id: "reel_resume_analyzer",
    title: "NLP Resume ATS Parser Model",
    description: "Deep dive into our keyword parsing NLP models that evaluate and refine resumes against job posting vectors. Watch the keyword overlay scores update live.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreet.mp4",
    problem: "Up to 75% of engineering student resumes are filtered out by robotic Applicant Tracking Systems (ATS) due to poor formatting or missing keywords.",
    solution: "Spacy NLP engine pre-processes resumes, parses sentence chunks, calculates cosine similarity index vectors, and suggests optimal synonyms.",
    demoType: "simulation",
    techStack: ["Python", "FastAPI", "SpaCy", "scikit-learn"],
    technologyStack: ["Python", "FastAPI", "SpaCy", "scikit-learn"],
    results: "Participating students experienced a 3x increase in first-round tech interview callbacks.",
    likes: ["user_suryasekhar"],
    saves: [],
    comments: [],
    sharesCount: 22,
    ownerName: "Sneha Kapoor",
    ownerId: "user_sneha",
    creatorName: "Sneha Kapoor",
    creatorId: "user_sneha",
    projectId: "project_resume_analyzer",
    category: "Artificial Intelligence",
    createdDate: "2026-07-07T11:00:00Z"
  }
];

let isSeeding = false;

/**
 * Seed initial engineering reels to Cloud Firestore if the collection is empty.
 */
export async function seedInitialReelsIfEmpty(): Promise<void> {
  if (isSeeding) return;
  isSeeding = true;
  try {
    console.log("[Reel Service] Firestore /reels collection empty — Seeding default engineering reels...");
    for (const reel of DEFAULT_ENGINEERING_REELS) {
      await saveReelToFirestore(reel);
    }
    console.log("[Reel Service] Successfully seeded default reels to Cloud Firestore!");
  } catch (err) {
    console.warn("[Reel Service] Seeding error:", err);
  } finally {
    isSeeding = false;
  }
}

/**
 * Real-time listener for published Reels in Firestore.
 * Subscribes to the /reels collection and normalizes every document.
 */
export function subscribeToReelsFromFirestore(
  onReelsChanged: (reels: Reel[]) => void,
  onError?: (error: any) => void
): () => void {
  try {
    const reelsRef = collection(firebaseDb, "reels");
    
    return onSnapshot(
      reelsRef,
      (snapshot) => {
        const reelsList: Reel[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const title = (data.title || "").toLowerCase();
          
          // Automatically purge old junk test reels from earlier test uploads
          if (title === "hthth" || title === "dfy") {
            deleteReelFromFirestore(docSnap.id).catch(() => {});
            return;
          }

          const sanitized = sanitizeReel(data, docSnap.id);
          reelsList.push(sanitized);
        });

        if (reelsList.length === 0) {
          seedInitialReelsIfEmpty();
        }

        // Sort reels by timestamp descending
        const sorted = (reelsList.length > 0 ? reelsList : DEFAULT_ENGINEERING_REELS).sort((a, b) => {
          const timeA = new Date(a.createdDate || a.createdAt || 0).getTime();
          const timeB = new Date(b.createdDate || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        console.log(`[Reels Real-Time] Received ${sorted.length} published reels from Firestore`);
        onReelsChanged(sorted);
      },
      (err) => {
        console.warn("[Reels Real-Time Listener Warning]:", err);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    console.warn("[Reels Real-Time Subscription Error]:", error);
    if (onError) onError(error);
    return () => {};
  }
}

/**
 * One-shot fetch for published Reels from Firestore.
 */
export async function fetchReelsFromFirestore(): Promise<Reel[]> {
  try {
    const reelsRef = collection(firebaseDb, "reels");
    const snapshot = await getDocs(reelsRef);
    const reelsList: Reel[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const sanitized = sanitizeReel(data, docSnap.id);
      reelsList.push(sanitized);
    });

    if (reelsList.length === 0) {
      seedInitialReelsIfEmpty();
      return DEFAULT_ENGINEERING_REELS;
    }

    const sorted = reelsList.sort((a, b) => {
      const timeA = new Date(a.createdDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.createdDate || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    console.log(`[Reels Fetch] Retrieved ${sorted.length} reels from Firestore`);
    return sorted;
  } catch (error) {
    console.warn("[Firestore Fetch Reels Warning]:", error);
    return DEFAULT_ENGINEERING_REELS;
  }
}

/**
 * Save / Update Reel in Firestore.
 */
export async function saveReelToFirestore(reelData: Partial<Reel> & { id: string }): Promise<void> {
  if (!reelData || !reelData.id) return;
  try {
    const docRef = doc(firebaseDb, "reels", reelData.id);
    const now = new Date().toISOString();
    
    // Clean payload to prevent undefined field values
    const cleanPayload: Record<string, any> = {
      id: reelData.id,
      title: reelData.title || "Engineering Spec Reel",
      description: reelData.description || "",
      videoUrl: reelData.videoUrl || "",
      thumbnail: reelData.thumbnail || reelData.thumbnailUrl || "",
      creatorId: reelData.creatorId || reelData.ownerId || "usr_guest",
      ownerId: reelData.ownerId || reelData.creatorId || "usr_guest",
      creatorName: reelData.creatorName || reelData.ownerName || "Student Innovator",
      ownerName: reelData.ownerName || reelData.creatorName || "Student Innovator",
      creatorAvatar: reelData.creatorAvatar || reelData.ownerAvatar || "",
      likes: Array.isArray(reelData.likes) ? reelData.likes : [],
      saves: Array.isArray(reelData.saves) ? reelData.saves : [],
      comments: Array.isArray(reelData.comments) ? reelData.comments : [],
      technologyStack: Array.isArray(reelData.technologyStack) ? reelData.technologyStack : (reelData.techStack || ["Engineering"]),
      category: reelData.category || "Computer Science",
      createdDate: reelData.createdDate || reelData.createdAt || now,
      createdAt: reelData.createdAt || reelData.createdDate || now,
      updatedAt: now
    };

    if (reelData.projectId) {
      cleanPayload.projectId = reelData.projectId;
    }
    if (reelData.cloudinaryPublicId) {
      cleanPayload.cloudinaryPublicId = reelData.cloudinaryPublicId;
    }
    if (reelData.hashtags && Array.isArray(reelData.hashtags)) {
      cleanPayload.hashtags = reelData.hashtags;
    }

    await setDoc(docRef, cleanPayload, { merge: true });
    console.log("[Reel Service] Saved reel to Firestore:", reelData.id);
  } catch (error) {
    console.warn("Firestore Save Reel Warning:", error);
  }
}

/**
 * Delete Reel from Firestore.
 */
export async function deleteReelFromFirestore(reelId: string): Promise<boolean> {
  try {
    const docRef = doc(firebaseDb, "reels", reelId);
    await deleteDoc(docRef);
    console.log("[Reel Service] Deleted reel from Firestore:", reelId);
    return true;
  } catch (err) {
    console.error("Error deleting reel from Firestore:", err);
    throw err;
  }
}
