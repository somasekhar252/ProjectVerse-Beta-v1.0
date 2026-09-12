import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  arrayUnion 
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import { User, DirectConversation, DirectMessage } from "../types";
import { canMessageUser } from "./socialService";

/**
 * Derives a deterministic one-to-one conversation ID from two User UIDs.
 * Example: sorted(["usr_A", "usr_B"]).join("_") => "usr_A_usr_B"
 * Guarantees User A -> User B and User B -> User A access the exact same chat document.
 */
export function getDeterministicConversationId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) return "";
  const sorted = [uid1.trim(), uid2.trim()].sort();
  return sorted.join("_");
}

/**
 * Gets or creates a 1-to-1 Direct Conversation document in Firestore
 */
export async function getOrCreateConversation(
  currentUser: User, 
  targetUserId: string
): Promise<DirectConversation | null> {
  if (!currentUser || !currentUser.id || !targetUserId || currentUser.id === targetUserId) {
    return null;
  }

  // Enforce chat relationship policy: currentUser follows target OR target follows currentUser
  const allowed = await canMessageUser(currentUser.id, targetUserId);
  if (!allowed) {
    console.warn(`[CHAT SECURITY] Direct conversation between ${currentUser.id} and ${targetUserId} rejected. No social relationship exists.`);
    throw new Error("Cannot start conversation with user without an active follow relationship.");
  }

  const convId = getDeterministicConversationId(currentUser.id, targetUserId);
  const convRef = doc(firebaseDb, "conversations", convId);

  try {
    const snap = await getDoc(convRef);
    if (snap.exists()) {
      return snap.data() as DirectConversation;
    }

    const now = new Date().toISOString();
    const newConv: DirectConversation = {
      id: convId,
      type: "direct",
      participantIds: [currentUser.id, targetUserId].sort(),
      createdAt: now,
      updatedAt: now,
      lastMessage: "",
      lastMessageAt: now,
      lastMessageSenderId: currentUser.id
    };

    await setDoc(convRef, newConv);
    return newConv;
  } catch (err) {
    console.error("Error in getOrCreateConversation:", err);
    return null;
  }
}

const sendingLockSet = new Set<string>();

/**
 * Sends a text message inside a conversation
 */
export async function sendMessageToConversation(
  conversationId: string,
  senderId: string,
  text: string,
  reelId?: string,
  reelTitle?: string
): Promise<DirectMessage | null> {
  const trimmedText = text ? text.trim() : "";
  if (!conversationId || !senderId || !trimmedText) {
    return null;
  }

  const lockKey = `${conversationId}_${senderId}_${trimmedText}_${reelId || ""}`;
  if (sendingLockSet.has(lockKey)) {
    console.warn("Duplicate send attempt blocked by client submission guard.");
    return null;
  }

  // Prevent absurdly long messages
  if (trimmedText.length > 2000) {
    throw new Error("Message exceeds length limit of 2000 characters.");
  }

  sendingLockSet.add(lockKey);

  const msgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const msgRef = doc(firebaseDb, "conversations", conversationId, "messages", msgId);
  const convRef = doc(firebaseDb, "conversations", conversationId);
  const now = new Date().toISOString();

  try {
    const newMsg: DirectMessage = {
      id: msgId,
      conversationId,
      senderId,
      text: trimmedText,
      createdAt: now,
      type: reelId ? "reel_share" : "text",
      readBy: [senderId]
    };

    if (reelId) {
      newMsg.reelId = reelId;
    }
    if (reelTitle) {
      newMsg.reelTitle = reelTitle;
    }

    // Add message to subcollection
    await setDoc(msgRef, newMsg);

    // Update conversation metadata
    await updateDoc(convRef, {
      lastMessage: trimmedText,
      lastMessageAt: now,
      lastMessageSenderId: senderId,
      updatedAt: now
    });

    return newMsg;
  } catch (err) {
    console.error("Error in sendMessageToConversation:", err);
    throw err;
  } finally {
    setTimeout(() => {
      sendingLockSet.delete(lockKey);
    }, 1000);
  }
}

/**
 * Real-time listener for messages in a conversation
 */
export function subscribeToConversationMessages(
  conversationId: string,
  callback: (messages: DirectMessage[]) => void
) {
  if (!conversationId) {
    callback([]);
    return () => {};
  }

  try {
    const messagesRef = collection(firebaseDb, "conversations", conversationId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snapshot) => {
      const list: DirectMessage[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as DirectMessage);
      });
      callback(list);
    }, (err) => {
      console.warn("subscribeToConversationMessages warning:", err);
      // Fallback query if ordering index building
      const fallbackRef = collection(firebaseDb, "conversations", conversationId, "messages");
      onSnapshot(fallbackRef, (snap) => {
        const list: DirectMessage[] = [];
        snap.forEach(d => list.push(d.data() as DirectMessage));
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(list);
      });
    });
  } catch (err) {
    console.warn("Error setting up message listener:", err);
    callback([]);
    return () => {};
  }
}

/**
 * Real-time listener for user's inbox conversations
 */
export function subscribeToUserConversations(
  userId: string,
  callback: (conversations: DirectConversation[]) => void
) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(firebaseDb, "conversations"),
      where("participantIds", "array-contains", userId)
    );

    return onSnapshot(q, (snapshot) => {
      const list: DirectConversation[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as DirectConversation);
      });
      // Sort client-side descending by updatedAt
      list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      callback(list);
    }, (err) => {
      console.warn("subscribeToUserConversations warning:", err);
      callback([]);
    });
  } catch (err) {
    console.warn("Error setting up conversations listener:", err);
    callback([]);
    return () => {};
  }
}

/**
 * Marks incoming messages in a conversation as read by the user
 */
export async function markConversationAsRead(
  conversationId: string, 
  userId: string
): Promise<void> {
  if (!conversationId || !userId) return;

  try {
    const messagesRef = collection(firebaseDb, "conversations", conversationId, "messages");
    const snap = await getDocs(messagesRef);
    const updates = snap.docs
      .map(docSnap => docSnap.data() as DirectMessage)
      .filter(msg => msg.senderId !== userId && !msg.readBy?.includes(userId))
      .map(msg => updateDoc(doc(firebaseDb, "conversations", conversationId, "messages", msg.id), {
        readBy: arrayUnion(userId)
      }));

    await Promise.all(updates);
  } catch (err) {
    console.warn("markConversationAsRead warning:", err);
  }
}

/**
 * Fallback reader for direct messages from Firestore when local Express API is offline.
 */
export async function fetchUserDMsFromFirestore(userId: string): Promise<any[]> {
  if (!userId) return [];
  try {
    const normalizedUserId = userId === "usr_1" ? "user_suryasekhar" : userId;
    const q = query(
      collection(firebaseDb, "conversations"),
      where("participantIds", "array-contains", normalizedUserId)
    );
    const convSnap = await getDocs(q);
    const allMessages: any[] = [];

    for (const convDoc of convSnap.docs) {
      const convData = convDoc.data();
      const convId = convDoc.id;
      const msgsSnap = await getDocs(collection(firebaseDb, "conversations", convId, "messages"));

      msgsSnap.forEach(mDoc => {
        const data = mDoc.data();
        const partnerId = (data.senderId === normalizedUserId)
          ? (convData.participantIds as string[])?.find((p: string) => p !== normalizedUserId)
          : data.senderId;

        allMessages.push({
          id: mDoc.id,
          senderId: data.senderId,
          senderName: data.senderName || "User",
          recipientId: data.recipientId || partnerId || normalizedUserId,
          text: data.text || "",
          reelId: data.reelId,
          reelTitle: data.reelTitle,
          timestamp: data.createdAt || new Date().toISOString(),
          read: data.readBy?.includes(normalizedUserId) ?? (data.read ?? true)
        });
      });
    }

    allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return allMessages;
  } catch (err) {
    console.warn("Firestore fetch DMs fallback warning:", err);
    return [];
  }
}
