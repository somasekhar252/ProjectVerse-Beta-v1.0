import React, { useState, useEffect, useRef } from "react";
import { User, DirectConversation, DirectMessage, MessageRequest } from "../../types";
import { 
  getOrCreateConversation, 
  sendMessageToConversation, 
  subscribeToConversationMessages, 
  subscribeToUserConversations, 
  markConversationAsRead 
} from "../../lib/chatService";
import { 
  subscribeToUserMessageRequests, 
  acceptMessageRequest, 
  declineMessageRequest 
} from "../../lib/messageRequestService";
import { fetchUserFromFirestore } from "../../lib/firebase";
import { canMessageUser } from "../../lib/socialService";
import UserAvatar from "./UserAvatar";
import ReelShareCard from "./ReelShareCard";
import { 
  X, 
  Send, 
  ArrowLeft, 
  MessageCircle, 
  Sparkles, 
  Check, 
  CheckCheck, 
  Loader2, 
  Inbox,
  UserCheck,
  Trash2,
  ShieldAlert,
  Play
} from "lucide-react";

interface DirectMessagesDrawerProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  activeTargetUserId?: string | null;
  onNavigateProfile?: (userId: string) => void;
  onPlayReel?: (reelId: string) => void;
}

export default function DirectMessagesDrawer({
  currentUser,
  isOpen,
  onClose,
  activeTargetUserId,
  onNavigateProfile,
  onPlayReel
}: DirectMessagesDrawerProps) {
  // Drawer navigation state: "inbox" | "chat"
  const [viewMode, setViewMode] = useState<"inbox" | "chat">("inbox");
  // Inbox tab state: "messages" | "requests"
  const [inboxTab, setInboxTab] = useState<"messages" | "requests">("messages");
  
  // Active conversation states
  const [activeConversation, setActiveConversation] = useState<DirectConversation | null>(null);
  const [chatPartner, setChatPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  
  // Loading & Error States
  const [isLoadingConv, setIsLoadingConv] = useState(false);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  
  // Inbox & Message Request states
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [partnerProfiles, setPartnerProfiles] = useState<Record<string, User>>({});

  // Subscribe to Pending Message Requests
  useEffect(() => {
    if (!currentUser || !currentUser.id || !isOpen) return;

    const unsubscribe = subscribeToUserMessageRequests(currentUser.id, (reqs) => {
      setMessageRequests(reqs);
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat thread when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // 1. Subscribe to User Inbox Conversations in real-time
  useEffect(() => {
    if (!currentUser || !currentUser.id || !isOpen) return;

    const unsubscribe = subscribeToUserConversations(currentUser.id, async (convs) => {
      setConversations(convs);

      // Fetch partner profiles for inbox list items
      const missingUserIds = new Set<string>();
      convs.forEach(c => {
        const partnerId = c.participantIds.find(id => id !== currentUser.id);
        if (partnerId && !partnerProfiles[partnerId]) {
          missingUserIds.add(partnerId);
        }
      });

      if (missingUserIds.size > 0) {
        const fetched: Record<string, User> = {};
        for (const uid of Array.from(missingUserIds)) {
          try {
            const u = await fetchUserFromFirestore(uid);
            if (u) fetched[uid] = u as User;
          } catch (e) {
            console.warn("Error fetching inbox user profile:", e);
          }
        }
        setPartnerProfiles(prev => ({ ...prev, ...fetched }));
      }
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  // Helper function to open chat with target user ID
  const openChatWithUser = async (targetUserId: string) => {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) return;

    setIsLoadingConv(true);
    setChatError(null);
    setViewMode("chat");

    try {
      let partner = partnerProfiles[targetUserId];
      if (!partner) {
        const u = await fetchUserFromFirestore(targetUserId);
        if (u) partner = u as User;
      }

      if (partner) {
        setChatPartner(partner);
      } else {
        setChatPartner({
          id: targetUserId,
          name: "Innovator",
          email: "",
          role: "Developer"
        } as User);
      }

      const conv = await getOrCreateConversation(currentUser, targetUserId);
      setActiveConversation(conv);
      setIsLoadingConv(false);
    } catch (err: any) {
      console.error("Error opening chat with user:", err);
      setChatError(err?.message || "Failed to open conversation.");
      setIsLoadingConv(false);
    }
  };

  // 2. Open specific target user conversation when activeTargetUserId is provided
  useEffect(() => {
    if (!isOpen || !currentUser || !activeTargetUserId || currentUser.id === activeTargetUserId) {
      return;
    }
    openChatWithUser(activeTargetUserId);
  }, [isOpen, activeTargetUserId, currentUser]);

  // 3. Real-time subscription to active conversation messages
  useEffect(() => {
    if (!activeConversation || !activeConversation.id || !isOpen) {
      setMessages([]);
      return;
    }

    setIsLoadingMsgs(true);
    setChatError(null);

    const unsubscribe = subscribeToConversationMessages(activeConversation.id, (msgs) => {
      setMessages(msgs);
      setIsLoadingMsgs(false);

      // Mark incoming messages as read
      markConversationAsRead(activeConversation.id, currentUser.id);
    });

    return () => unsubscribe();
  }, [activeConversation, currentUser, isOpen]);

  // Send text message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = inputText.trim();
    if (!trimmed || !activeConversation || !currentUser || isSending) return;

    setIsSending(true);
    setInputText("");

    try {
      await sendMessageToConversation(activeConversation.id, currentUser.id, trimmed);
      setIsSending(false);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setChatError(err?.message || "Failed to send message.");
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-950 h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 transition-all overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur-md">
          {viewMode === "chat" ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => {
                  setViewMode("inbox");
                  setActiveConversation(null);
                  setChatPartner(null);
                  setChatError(null);
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Back to inbox"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              {chatPartner && (
                <div 
                  onClick={() => onNavigateProfile && onNavigateProfile(chatPartner.id)}
                  className="flex items-center gap-2.5 cursor-pointer group min-w-0 flex-1"
                >
                  <UserAvatar
                    userId={chatPartner.id}
                    avatarUrl={chatPartner.avatarUrl}
                    name={chatPartner.name}
                    size="sm"
                    showBorder={true}
                  />
                  <div className="min-w-0 text-left">
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white truncate group-hover:text-violet-600 transition-colors">
                      {chatPartner.name}
                    </h3>
                    <p className="text-[9px] text-zinc-400 font-bold truncate">
                      @{chatPartner.username || chatPartner.name.toLowerCase().replace(/\s+/g, "_")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-violet-500" />
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Direct Messages</h3>
                  <p className="text-[10px] text-zinc-400 font-semibold">Active Developer Threads</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* VIEW 1: INBOX LIST (MESSAGES vs REQUESTS) */}
        {viewMode === "inbox" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs Header */}
            <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-1">
              <button
                onClick={() => setInboxTab("messages")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  inboxTab === "messages"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                <span>Messages</span>
                {conversations.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-black">
                    {conversations.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setInboxTab("requests")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  inboxTab === "requests"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                <span>Requests</span>
                {messageRequests.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                    {messageRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CONTENT 1: MESSAGES */}
            {inboxTab === "messages" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center text-violet-500">
                      <MessageCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200">No Conversations Yet</h4>
                    <p className="text-[11px] text-zinc-400 font-medium max-w-xs leading-relaxed">
                      Visit student profile cards to start 1-to-1 conversations with creators you follow!
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const partnerId = conv.participantIds.find(id => id !== currentUser.id) || "";
                    const partner = partnerProfiles[partnerId] || {
                      id: partnerId,
                      name: "Innovator",
                      role: "Developer"
                    };

                  const isUnread = conv.lastMessageSenderId !== currentUser.id && conv.lastMessage;

                  return (
                    <div
                      key={conv.id}
                      onClick={async () => {
                        setChatPartner(partner);
                        setActiveConversation(conv);
                        setViewMode("chat");
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isUnread
                          ? "bg-violet-500/5 dark:bg-violet-500/10 border-violet-200/60 dark:border-violet-800/50 shadow-2xs"
                          : "bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-150 dark:border-zinc-800/60"
                      }`}
                    >
                      <UserAvatar
                        userId={partner.id}
                        avatarUrl={partner.avatarUrl}
                        name={partner.name}
                        size="md"
                        showBorder={true}
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-extrabold text-zinc-900 dark:text-white truncate">
                            {partner.name}
                          </h4>
                          {conv.lastMessageAt && (
                            <span className="text-[9px] text-zinc-400 font-bold shrink-0">
                              {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 font-semibold truncate">
                          @{partner.username || partner.name.toLowerCase().replace(/\s+/g, "_")}
                        </p>
                        <p className={`text-xs truncate mt-1 ${isUnread ? "font-extrabold text-violet-600 dark:text-violet-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                          {conv.lastMessage ? conv.lastMessage : "Start conversation 👋"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB CONTENT 2: MESSAGE REQUESTS */}
          {inboxTab === "requests" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {messageRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-500">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200">No Pending Requests</h4>
                  <p className="text-[11px] text-zinc-400 font-medium max-w-xs leading-relaxed">
                    Message requests from developers you don't follow yet will appear here.
                  </p>
                </div>
              ) : (
                messageRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        userId={req.senderId}
                        avatarUrl={req.senderAvatar}
                        name={req.senderName || "Innovator"}
                        size="md"
                        showBorder={true}
                      />
                      <div className="min-w-0 text-left flex-1">
                        <h4 className="text-xs font-black text-zinc-900 dark:text-white truncate">
                          {req.senderName || "Student Innovator"}
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-bold">
                          Wants to send you a message
                        </p>
                      </div>
                    </div>

                    {/* Request Message Preview */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-150 dark:border-zinc-700/60 text-xs font-medium text-zinc-700 dark:text-zinc-200 leading-relaxed italic">
                      "{req.initialMessageText}"
                    </div>

                    {/* Accept / Decline Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={async () => {
                          try {
                            await acceptMessageRequest(req.id);
                            // Open active conversation
                            if (req.senderId && currentUser) {
                              openChatWithUser(req.senderId);
                            }
                          } catch (e) {
                            console.error("Accept request error:", e);
                          }
                        }}
                        className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            await declineMessageRequest(req.id);
                          } catch (e) {
                            console.error("Decline request error:", e);
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 text-zinc-600 dark:text-zinc-400 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

          {/* VIEW 2: ACTIVE CONVERSATION CHAT THREAD */}
          {viewMode === "chat" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Error Banner */}
              {chatError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 border-b border-rose-200 dark:border-rose-900">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}

              {/* Message List Stack */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
                {isLoadingConv || isLoadingMsgs ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                    <p className="text-xs text-zinc-400 font-bold">Loading conversation messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <MessageCircle className="w-8 h-8 text-violet-400/60 dark:text-violet-600/60 animate-bounce" />
                    <p className="text-xs text-zinc-400 font-bold leading-relaxed">
                      No message history yet.<br />Say hello 👋 to start collaborating!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const timestampStr = msg.createdAt || msg.timestamp 
                      ? new Date(msg.createdAt || msg.timestamp || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                      >
                        <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed text-left ${
                          isMe
                            ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-tr-none shadow-md"
                            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800"
                        }`}>
                          {/* Render ReelShareCard if message is a reel share (supports legacy and new formats) */}
                          {msg.reelId || msg.type === "reel_share" || msg.reelTitle || (msg.text && msg.text.toLowerCase().includes("shared a")) ? (
                            <ReelShareCard
                              reelId={msg.reelId || "reel_1"}
                              initialTitle={msg.reelTitle || (msg.text ? msg.text.replace(/^Shared a (Spec )?Reel:?\s*"?/i, "").replace(/"$/, "") : "Spec Reel Blueprint")}
                              onPlayReel={onPlayReel}
                            />
                          ) : (
                            <p>{msg.text}</p>
                          )}

                          <div className={`flex items-center gap-1 mt-1 justify-end text-[8px] font-bold ${
                            isMe ? "text-violet-200" : "text-zinc-400"
                          }`}>
                            <span>{timestampStr}</span>
                            {isMe && (
                              <CheckCheck className="w-3 h-3 text-emerald-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 backdrop-blur-md flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={2000}
                  disabled={isSending || !!chatError}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending || !!chatError}
                  className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl transition-all shadow-md cursor-pointer shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 rotate-[-15deg]" />
                  )}
                </button>
              </form>

            </div>
          )}

      </div>
    </div>
  );
}
