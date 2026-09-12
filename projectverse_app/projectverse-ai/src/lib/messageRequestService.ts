import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc 
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import { User, MessageRequest } from "../types";
import { createNotification } from "./socialService";
import { getDeterministicConversationId } from "./chatService";

/**
 * Creates a new Message Request when User A contacts User B for the first time
 */
export async function createMessageRequest(
  sender: User,
  recipientId: string,
  initialText: string,
  reelId?: string
): Promise<MessageRequest | null> {
  if (!sender || !sender.id || !recipientId || sender.id === recipientId) {
    return null;
  }

  const requestId = `${sender.id}_${recipientId}`;
  const convId = getDeterministicConversationId(sender.id, recipientId);
  const reqRef = doc(firebaseDb, "messageRequests", requestId);
  const now = new Date().toISOString();

  try {
    const existingSnap = await getDoc(reqRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data() as MessageRequest;
      if (data.status === "pending") {
        return data; // Request already exists and is pending
      }
    }

    const payload: MessageRequest = {
      id: requestId,
      conversationId: convId,
      senderId: sender.id,
      senderName: sender.name || "Student Innovator",
      senderAvatar: sender.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${sender.id}`,
      recipientId,
      initialMessageText: initialText,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    if (reelId) {
      payload.reelId = reelId;
    }

    await setDoc(reqRef, payload);

    // Trigger Message Request Notification for recipient
    await createNotification({
      type: "message_request",
      actorId: sender.id,
      actorName: sender.name || "Student Innovator",
      actorAvatar: sender.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${sender.id}`,
      recipientId,
      targetId: convId,
      targetTitle: "Message Request",
      text: "sent you a message request",
      createdAt: now,
      read: false
    });

    return payload;
  } catch (err) {
    console.error("Error in createMessageRequest:", err);
    throw err;
  }
}

/**
 * Real-time listener for user's pending Message Requests
 */
export function subscribeToUserMessageRequests(
  recipientId: string,
  callback: (requests: MessageRequest[]) => void
) {
  if (!recipientId) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(firebaseDb, "messageRequests"),
      where("recipientId", "==", recipientId),
      where("status", "==", "pending")
    );

    return onSnapshot(q, (snapshot) => {
      const list: MessageRequest[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as MessageRequest);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }, (err) => {
      console.warn("subscribeToUserMessageRequests warning:", err);
      callback([]);
    });
  } catch (err) {
    console.warn("Error setting up message requests listener:", err);
    callback([]);
    return () => {};
  }
}

/**
 * Accepts a pending Message Request, converting it to an active conversation
 */
export async function acceptMessageRequest(requestId: string): Promise<boolean> {
  if (!requestId) return false;

  const reqRef = doc(firebaseDb, "messageRequests", requestId);
  const now = new Date().toISOString();

  try {
    const snap = await getDoc(reqRef);
    if (!snap.exists()) return false;

    const reqData = snap.data() as MessageRequest;

    // Update request status
    await updateDoc(reqRef, {
      status: "accepted",
      updatedAt: now
    });

    // Update conversation status
    if (reqData.conversationId) {
      const convRef = doc(firebaseDb, "conversations", reqData.conversationId);
      try {
        await updateDoc(convRef, {
          status: "accepted",
          updatedAt: now
        });
      } catch (e) {
        console.warn("Update conversation status warning:", e);
      }
    }

    return true;
  } catch (err) {
    console.error("Error in acceptMessageRequest:", err);
    throw err;
  }
}

/**
 * Declines / deletes a pending Message Request
 */
export async function declineMessageRequest(requestId: string): Promise<boolean> {
  if (!requestId) return false;

  const reqRef = doc(firebaseDb, "messageRequests", requestId);
  const now = new Date().toISOString();

  try {
    await updateDoc(reqRef, {
      status: "declined",
      updatedAt: now
    });
    return true;
  } catch (err) {
    console.error("Error in declineMessageRequest:", err);
    throw err;
  }
}

/**
 * Checks if a user has accepted a message relationship with another user
 */
export async function hasAcceptedMessageRelationship(userAId: string, userBId: string): Promise<boolean> {
  if (!userAId || !userBId || userAId === userBId) return true;

  const reqId1 = `${userAId}_${userBId}`;
  const reqId2 = `${userBId}_${userAId}`;

  try {
    const [snap1, snap2] = await Promise.all([
      getDoc(doc(firebaseDb, "messageRequests", reqId1)),
      getDoc(doc(firebaseDb, "messageRequests", reqId2))
    ]);

    if (snap1.exists() && (snap1.data() as MessageRequest).status === "accepted") return true;
    if (snap2.exists() && (snap2.data() as MessageRequest).status === "accepted") return true;

    // If no request document exists yet, relationship is clear to communicate
    if (!snap1.exists() && !snap2.exists()) return true;

    return false;
  } catch (err) {
    console.warn("hasAcceptedMessageRelationship warning:", err);
    return true;
  }
}
