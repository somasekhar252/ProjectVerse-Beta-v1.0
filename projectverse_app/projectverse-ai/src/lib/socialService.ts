import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  increment 
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import { User, AppNotification, Follow, CreatorSubscription } from "../types";

/**
 * ============================================================================
 * 1. FOLLOW SYSTEM (USER-TO-USER RELATIONSHIP)
 * ============================================================================
 */

export async function followUser(follower: User, targetUserId: string): Promise<boolean> {
  if (!follower || !follower.id || !targetUserId || follower.id === targetUserId) {
    return false;
  }

  const followId = `${follower.id}_${targetUserId}`;
  const followRef = doc(firebaseDb, "follows", followId);

  try {
    const existingSnap = await getDoc(followRef);
    if (existingSnap.exists()) {
      return true; // Already following
    }

    const payload: Follow = {
      id: followId,
      followerId: follower.id,
      followingId: targetUserId,
      createdAt: new Date().toISOString()
    };

    await setDoc(followRef, payload);

    // Update follower's followingCount & target user's followersCount
    try {
      const followerRef = doc(firebaseDb, "users", follower.id);
      await setDoc(followerRef, { 
        id: follower.id,
        name: follower.name || "Student Innovator",
        followingCount: increment(1) 
      }, { merge: true });
    } catch (e) {
      console.warn("Update follower count warning:", e);
    }

    try {
      const targetRef = doc(firebaseDb, "users", targetUserId);
      await setDoc(targetRef, { 
        id: targetUserId,
        followersCount: increment(1) 
      }, { merge: true });
    } catch (e) {
      console.warn("Update target followers count warning:", e);
    }

    // Trigger Notification for target user
    await createNotification({
      type: "follow",
      actorId: follower.id,
      actorName: follower.name || "Student Innovator",
      actorUsername: (follower as any).username || follower.name || "Student Innovator",
      actorAvatar: follower.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${follower.id}`,
      recipientId: targetUserId,
      text: "started following you",
      createdAt: new Date().toISOString(),
      read: false
    });

    return true;
  } catch (err) {
    console.error("Error in followUser:", err);
    throw err;
  }
}

export async function unfollowUser(followerId: string, targetUserId: string): Promise<boolean> {
  if (!followerId || !targetUserId) return false;

  const followId = `${followerId}_${targetUserId}`;
  const followRef = doc(firebaseDb, "follows", followId);

  try {
    const snap = await getDoc(followRef);
    if (!snap.exists()) {
      return false;
    }

    await deleteDoc(followRef);

    // Decrement counts
    try {
      const followerRef = doc(firebaseDb, "users", followerId);
      await setDoc(followerRef, { 
        id: followerId,
        followingCount: increment(-1) 
      }, { merge: true });
    } catch (e) {
      console.warn("Decrement follower count warning:", e);
    }

    try {
      const targetRef = doc(firebaseDb, "users", targetUserId);
      await setDoc(targetRef, { 
        id: targetUserId,
        followersCount: increment(-1) 
      }, { merge: true });
    } catch (e) {
      console.warn("Decrement target followers count warning:", e);
    }

    return true;
  } catch (err) {
    console.error("Error in unfollowUser:", err);
    throw err;
  }
}

export async function checkIsFollowing(followerId: string, targetUserId: string): Promise<boolean> {
  if (!followerId || !targetUserId || followerId === targetUserId) return false;
  try {
    const followId = `${followerId}_${targetUserId}`;
    const followRef = doc(firebaseDb, "follows", followId);
    const snap = await getDoc(followRef);
    return snap.exists();
  } catch (err) {
    console.warn("checkIsFollowing error:", err);
    return false;
  }
}

/**
 * Centralized Chat Permission Helper:
 * Evaluates whether currentUserId and targetUserId have an active social relationship.
 * Messaging is allowed IF:
 *   currentUserId follows targetUserId
 *   OR
 *   targetUserId follows currentUserId
 */
export async function canMessageUser(currentUserId: string, targetUserId: string): Promise<boolean> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return false;
  }
  try {
    const [iFollow, theyFollow] = await Promise.all([
      checkIsFollowing(currentUserId, targetUserId),
      checkIsFollowing(targetUserId, currentUserId)
    ]);
    return iFollow || theyFollow;
  } catch (err) {
    console.warn("canMessageUser check warning:", err);
    return false;
  }
}

export interface ShareableUser extends User {
  isMutual?: boolean;
}

/**
 * Priority-ordered Reel Share suggestion algorithm.
 * Returns users connected via social relationships (Mutual friends first, then following/followers).
 */
export async function getShareableUsers(currentUserId: string): Promise<ShareableUser[]> {
  if (!currentUserId) return [];

  try {
    // 1. Fetch people I follow (/follows where followerId == currentUserId)
    const followingQuery = query(collection(firebaseDb, "follows"), where("followerId", "==", currentUserId));
    // 2. Fetch people following me (/follows where followingId == currentUserId)
    const followersQuery = query(collection(firebaseDb, "follows"), where("followingId", "==", currentUserId));

    const [followingSnap, followersSnap] = await Promise.all([
      getDocs(followingQuery),
      getDocs(followersQuery)
    ]);

    const followingSet = new Set<string>();
    followingSnap.forEach(d => {
      const data = d.data() as Follow;
      if (data.followingId && data.followingId !== currentUserId) {
        followingSet.add(data.followingId);
      }
    });

    const followerSet = new Set<string>();
    followersSnap.forEach(d => {
      const data = d.data() as Follow;
      if (data.followerId && data.followerId !== currentUserId) {
        followerSet.add(data.followerId);
      }
    });

    // Combine all connected user IDs
    const allConnectedIds = Array.from(new Set([...followingSet, ...followerSet]));
    if (allConnectedIds.length === 0) return [];

    // Fetch user profiles from Firestore using fetchUserFromFirestore
    const userProfiles: ShareableUser[] = [];
    for (const uid of allConnectedIds) {
      try {
        const uSnap = await getDoc(doc(firebaseDb, "users", uid));
        if (uSnap.exists()) {
          const uData = uSnap.data() as User;
          const isMutual = followingSet.has(uid) && followerSet.has(uid);
          userProfiles.push({
            ...uData,
            id: uid,
            isMutual
          });
        }
      } catch (e) {
        console.warn("Error fetching shareable user profile:", e);
      }
    }

    // Sort: Mutual friends first, then alphabetically
    userProfiles.sort((a, b) => {
      if (a.isMutual && !b.isMutual) return -1;
      if (!a.isMutual && b.isMutual) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    return userProfiles;
  } catch (err) {
    console.error("Error in getShareableUsers:", err);
    return [];
  }
}

export async function fetchUserFollowersCount(userId: string): Promise<number> {
  try {
    const q = query(collection(firebaseDb, "follows"), where("followingId", "==", userId));
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.warn("fetchUserFollowersCount warning:", err);
    return 0;
  }
}

export async function fetchUserFollowingCount(userId: string): Promise<number> {
  try {
    const q = query(collection(firebaseDb, "follows"), where("followerId", "==", userId));
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.warn("fetchUserFollowingCount warning:", err);
    return 0;
  }
}

/**
 * ============================================================================
 * 2. CREATOR NOTIFICATION PREFERENCE (BELL NEAR CREATOR)
 * ============================================================================
 */

export async function toggleCreatorSubscription(subscriberId: string, creatorId: string): Promise<boolean> {
  if (!subscriberId || !creatorId || subscriberId === creatorId) return false;
  const subId = `${subscriberId}_${creatorId}`;
  const subRef = doc(firebaseDb, "subscriptions", subId);

  try {
    const snap = await getDoc(subRef);
    if (snap.exists()) {
      const data = snap.data();
      const newStatus = !data.enabled;
      await updateDoc(subRef, { enabled: newStatus });
      return newStatus;
    } else {
      const payload: CreatorSubscription = {
        id: subId,
        subscriberId,
        creatorId,
        enabled: true,
        createdAt: new Date().toISOString()
      };
      await setDoc(subRef, payload);
      return true;
    }
  } catch (err) {
    console.error("toggleCreatorSubscription error:", err);
    return false;
  }
}

export async function checkIsSubscribedToCreator(subscriberId: string, creatorId: string): Promise<boolean> {
  if (!subscriberId || !creatorId || subscriberId === creatorId) return false;
  try {
    const subId = `${subscriberId}_${creatorId}`;
    const snap = await getDoc(doc(firebaseDb, "subscriptions", subId));
    return snap.exists() && snap.data()?.enabled !== false;
  } catch (err) {
    return false;
  }
}

/**
 * ============================================================================
 * 3. PROJECT & REEL LIKES WITH ATOMIC COMPOSITE KEYS
 * ============================================================================
 */

export async function toggleProjectLike(
  projectId: string, 
  projectTitle: string, 
  user: User, 
  ownerId: string
): Promise<{ liked: boolean; count: number }> {
  if (!projectId || !user || !user.id) return { liked: false, count: 0 };

  const likeDocId = `${user.id}_${projectId}`;
  const likeRef = doc(firebaseDb, "projectLikes", likeDocId);
  const projectRef = doc(firebaseDb, "projects", projectId);

  try {
    const likeSnap = await getDoc(likeRef);
    const projSnap = await getDoc(projectRef);
    let likesArray: string[] = [];

    if (projSnap.exists()) {
      likesArray = projSnap.data().likes || [];
    }

    let newlyLiked = false;

    if (likeSnap.exists()) {
      // Unlike
      await deleteDoc(likeRef);
      likesArray = likesArray.filter(id => id !== user.id);
      await updateDoc(projectRef, { likes: likesArray });
    } else {
      // Like
      newlyLiked = true;
      await setDoc(likeRef, {
        id: likeDocId,
        projectId,
        userId: user.id,
        createdAt: new Date().toISOString()
      });

      if (!likesArray.includes(user.id)) {
        likesArray.push(user.id);
      }
      await updateDoc(projectRef, { likes: likesArray });

      // Notify project owner if user is not the owner
      if (ownerId && ownerId !== user.id) {
        await createNotification({
          type: "project_like",
          actorId: user.id,
          actorName: user.name || "Student Innovator",
          actorAvatar: user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id}`,
          recipientId: ownerId,
          targetId: projectId,
          targetTitle: projectTitle || "Engineering Blueprint",
          text: `liked your project "${projectTitle || "Engineering Blueprint"}"`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    }

    return { liked: newlyLiked, count: likesArray.length };
  } catch (err) {
    console.error("toggleProjectLike error:", err);
    throw err;
  }
}

export async function toggleReelLike(
  reelId: string, 
  reelTitle: string, 
  user: User, 
  ownerId: string
): Promise<{ liked: boolean; count: number }> {
  if (!reelId || !user || !user.id) return { liked: false, count: 0 };

  const likeDocId = `${user.id}_${reelId}`;
  const likeRef = doc(firebaseDb, "reelLikes", likeDocId);
  const reelRef = doc(firebaseDb, "reels", reelId);

  try {
    const likeSnap = await getDoc(likeRef);
    const reelSnap = await getDoc(reelRef);
    let likesArray: string[] = [];

    if (reelSnap.exists()) {
      likesArray = reelSnap.data().likes || [];
    }

    let newlyLiked = false;

    if (likeSnap.exists()) {
      // Unlike
      await deleteDoc(likeRef);
      likesArray = likesArray.filter(id => id !== user.id);
      await setDoc(reelRef, { likes: likesArray }, { merge: true });
    } else {
      // Like
      newlyLiked = true;
      await setDoc(likeRef, {
        id: likeDocId,
        reelId,
        userId: user.id,
        createdAt: new Date().toISOString()
      });

      if (!likesArray.includes(user.id)) {
        likesArray.push(user.id);
      }
      await setDoc(reelRef, { likes: likesArray }, { merge: true });

      // Notify reel owner
      if (ownerId && ownerId !== user.id) {
        await createNotification({
          type: "reel_like",
          actorId: user.id,
          actorName: user.name || "Student Innovator",
          actorAvatar: user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id}`,
          recipientId: ownerId,
          targetId: reelId,
          targetTitle: reelTitle || "Engineering Reel",
          text: `liked your reel "${reelTitle || "Engineering Reel"}"`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    }

    return { liked: newlyLiked, count: likesArray.length };
  } catch (err) {
    console.error("toggleReelLike error:", err);
    throw err;
  }
}

/**
 * ============================================================================
 * 4. NOTIFICATIONS SYSTEM & REAL-TIME LISTENERS
 * ============================================================================
 */

export async function createNotification(notificationData: Omit<AppNotification, "id">): Promise<void> {
  if (!notificationData.recipientId || notificationData.actorId === notificationData.recipientId) {
    return; // Don't notify self
  }

  const notifId = "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const notifRef = doc(firebaseDb, "notifications", notifId);

  try {
    const payload: AppNotification = {
      ...notificationData,
      id: notifId,
      createdAt: notificationData.createdAt || new Date().toISOString(),
      read: false
    };
    await setDoc(notifRef, payload);
  } catch (err) {
    console.warn("createNotification warning:", err);
  }
}

export function subscribeToUserNotifications(
  userId: string, 
  callback: (notifications: AppNotification[]) => void
) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(firebaseDb, "notifications"), 
      where("recipientId", "==", userId)
    );

    return onSnapshot(q, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as AppNotification);
      });
      // Sort client-side desc by createdAt
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }, (error) => {
      console.warn("subscribeToUserNotifications warning:", error);
    });
  } catch (err) {
    console.warn("Notification listener initialization issue:", err);
    callback([]);
    return () => {};
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    const notifRef = doc(firebaseDb, "notifications", notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (err) {
    console.warn("markNotificationAsRead warning:", err);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const q = query(collection(firebaseDb, "notifications"), where("recipientId", "==", userId), where("read", "==", false));
    const snap = await getDocs(q);
    const promises = snap.docs.map(d => updateDoc(doc(firebaseDb, "notifications", d.id), { read: true }));
    await Promise.all(promises);
  } catch (err) {
    console.warn("markAllNotificationsAsRead warning:", err);
  }
}

/**
 * ============================================================================
 * 5. PROFILE SEARCH ENGINE
 * ============================================================================
 */
export async function searchUsersInFirestore(searchTerm: string, limitCount = 10): Promise<User[]> {
  if (!searchTerm || !searchTerm.trim()) return [];

  const qStr = searchTerm.trim().toLowerCase();

  try {
    const usersRef = collection(firebaseDb, "users");
    const snapshot = await getDocs(usersRef);
    const results: User[] = [];

    snapshot.forEach((docSnap) => {
      const u = docSnap.data() as User;
      if (!u || !u.id) return;

      const name = (u.name || "").toLowerCase();
      const username = (u.username || u.name || "").toLowerCase().replace(/\s+/g, "_");
      const role = (u.role || "").toLowerCase();
      const college = (u.collegeName || u.college || "").toLowerCase();
      const branch = (u.branch || "").toLowerCase();
      const skills = (u.skills || []).map(s => s.toLowerCase());

      const matchesName = name.includes(qStr);
      const matchesUsername = username.includes(qStr) || `@${username}`.includes(qStr);
      const matchesRole = role.includes(qStr);
      const matchesCollege = college.includes(qStr);
      const matchesBranch = branch.includes(qStr);
      const matchesSkills = skills.some(s => s.includes(qStr));

      if (matchesName || matchesUsername || matchesRole || matchesCollege || matchesBranch || matchesSkills) {
        results.push({
          ...u,
          username: u.username || username
        });
      }
    });

    return results.slice(0, limitCount);
  } catch (err) {
    console.warn("searchUsersInFirestore warning:", err);
    return [];
  }
}
