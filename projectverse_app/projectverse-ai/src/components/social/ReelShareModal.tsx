import React, { useState, useEffect } from "react";
import { User, Reel } from "../../types";
import { getShareableUsers, ShareableUser } from "../../lib/socialService";
import { getOrCreateConversation, sendMessageToConversation } from "../../lib/chatService";
import { 
  copyReelLink, 
  shareToWhatsApp, 
  shareToX, 
  shareToTelegram, 
  shareToFacebook, 
  shareByEmail, 
  canNativeShare, 
  shareNative 
} from "../../utils/shareUtils";
import UserAvatar from "./UserAvatar";
import { 
  Search, 
  X, 
  Send, 
  Check, 
  Sparkles, 
  Loader2, 
  Copy, 
  Share2, 
  Mail, 
  Globe, 
  MessageSquare, 
  Smartphone 
} from "lucide-react";

interface ReelShareModalProps {
  currentUser: User;
  reel: Reel;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReelShareModal({
  currentUser,
  reel,
  isOpen,
  onClose
}: ReelShareModalProps) {
  const [friends, setFriends] = useState<ShareableUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customNote, setCustomNote] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSentSuccess, setIsSentSuccess] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUser || !currentUser.id) return;

    let isMounted = true;
    setIsLoading(true);
    setSelectedUserIds([]);
    setCustomNote("");
    setIsSentSuccess(false);

    getShareableUsers(currentUser.id)
      .then((users) => {
        if (isMounted) {
          setFriends(users);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Error loading shareable users:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser]);

  if (!isOpen || !reel) return null;

  // Filter friends by search query across name, username, college, role, skills
  const filteredFriends = friends.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (f.name || "").toLowerCase().includes(q);
    const userHandle = (f.username || f.name || "").toLowerCase().replace(/\s+/g, "_");
    const handleMatch = userHandle.includes(q);
    const collegeMatch = (f.collegeName || "").toLowerCase().includes(q);
    const roleMatch = (f.role || "").toLowerCase().includes(q);
    return nameMatch || handleMatch || collegeMatch || roleMatch;
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendToSelectedFriends = async () => {
    if (selectedUserIds.length === 0 || isSending || isSentSuccess) return;

    setIsSending(true);

    try {
      const messageText = customNote.trim()
        ? `${customNote.trim()}\nShared a reel: "${reel.title}"`
        : `Shared a reel: "${reel.title}"`;

      // Loop send to each selected recipient individually
      for (const targetId of selectedUserIds) {
        const conv = await getOrCreateConversation(currentUser, targetId);
        if (conv) {
          await sendMessageToConversation(
            conv.id,
            currentUser.id,
            messageText,
            reel.id,
            reel.title
          );
        }
      }

      setIsSentSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      console.error("Error sharing reel to selected friends:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyReelLink(reel.id);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const poster = reel.thumbnail || (reel as any).thumbnailUrl || (reel as any).coverUrl || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Send className="w-4 h-4 rotate-[-15deg]" />
            </div>
            <div className="text-left">
              <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Share Spec Reel
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold truncate max-w-[260px]">
                Send direct message with blueprint attachment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reel Preview Header Card */}
        <div className="p-3 border-b border-zinc-150 dark:border-zinc-800/80 bg-zinc-900 text-white flex items-center gap-3">
          <img
            src={poster}
            alt={reel.title}
            className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80";
            }}
          />
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-violet-400 tracking-wider">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Spec Reel Blueprint</span>
            </div>
            <h4 className="text-xs font-extrabold text-white truncate">{reel.title}</h4>
            <p className="text-[10px] text-zinc-400 font-bold truncate">
              @{reel.creatorName || reel.ownerName || "Suryasekhar_Sen"}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends by name, handle, college, or skill..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-transparent text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
        </div>

        {/* Multi-Select Friends List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[35vh]">
          {isLoading ? (
            <div className="p-8 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto" />
              <p className="text-xs font-bold text-zinc-400">Loading connected friends...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <p className="text-xs font-bold text-zinc-400">No connected friends found</p>
              <p className="text-[10px] text-zinc-500">Follow creators or follow back to share reels directly!</p>
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isSelected = selectedUserIds.includes(friend.id);

              return (
                <div
                  key={friend.id}
                  onClick={() => toggleUserSelection(friend.id)}
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-violet-50 dark:bg-violet-950/40 border-violet-500/60 dark:border-violet-500/60 shadow-xs"
                      : "bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserAvatar
                      userId={friend.id}
                      avatarUrl={friend.avatarUrl}
                      name={friend.name}
                      size="md"
                      showBorder={true}
                    />
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {friend.name}
                        </h4>
                        {friend.isMutual && (
                          <span className="px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-[8px] font-black uppercase">
                            Mutual
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 font-semibold truncate">
                        @{friend.username || friend.name.toLowerCase().replace(/\s+/g, "_")}
                      </p>
                    </div>
                  </div>

                  {/* Selection Checkbox */}
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Custom Note Area */}
        <div className="p-3 border-t border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-1.5 text-left">
          <label className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">
            Add Custom Note
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Write a message to send with the reel..."
            maxLength={500}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>

        {/* Send Button */}
        <div className="px-3 pb-3">
          <button
            onClick={handleSendToSelectedFriends}
            disabled={selectedUserIds.length === 0 || isSending || isSentSuccess}
            className={`w-full py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
              isSentSuccess
                ? "bg-emerald-500 text-white"
                : "bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white"
            }`}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending to {selectedUserIds.length}...</span>
              </>
            ) : isSentSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Sent ✓</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 rotate-[-15deg]" />
                <span>
                  {selectedUserIds.length === 0
                    ? "Select Friends to Send"
                    : selectedUserIds.length === 1
                    ? "Send to 1 Person"
                    : `Send to ${selectedUserIds.length} People`}
                </span>
              </>
            )}
          </button>
        </div>

        {/* External Social Sharing Section */}
        <div className="p-3 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 space-y-2">
          <div className="text-[9px] font-black uppercase text-zinc-400 tracking-wider text-center">
            Or Share External
          </div>

          <div className="flex items-center justify-around gap-1.5 overflow-x-auto py-1">
            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[9px] font-extrabold transition-all cursor-pointer min-w-[56px] ${
                copyFeedback
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800"
              }`}
              title="Copy Reel Link"
            >
              {copyFeedback ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              )}
              <span>{copyFeedback ? "Copied ✓" : "Copy Link"}</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={() => shareToWhatsApp(reel, customNote)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl text-[9px] font-extrabold text-zinc-600 dark:text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all cursor-pointer min-w-[56px]"
              title="Share on WhatsApp"
            >
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>WhatsApp</span>
            </button>

            {/* X / Twitter */}
            <button
              onClick={() => shareToX(reel, customNote)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl text-[9px] font-extrabold text-zinc-600 dark:text-zinc-300 hover:bg-sky-500/10 hover:text-sky-400 transition-all cursor-pointer min-w-[56px]"
              title="Share on X (Twitter)"
            >
              <Globe className="w-4 h-4 text-sky-400" />
              <span>X / Twitter</span>
            </button>

            {/* Telegram */}
            <button
              onClick={() => shareToTelegram(reel, customNote)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl text-[9px] font-extrabold text-zinc-600 dark:text-zinc-300 hover:bg-sky-500/10 hover:text-sky-500 transition-all cursor-pointer min-w-[56px]"
              title="Share on Telegram"
            >
              <Share2 className="w-4 h-4 text-sky-500" />
              <span>Telegram</span>
            </button>

            {/* Facebook */}
            <button
              onClick={() => shareToFacebook(reel)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl text-[9px] font-extrabold text-zinc-600 dark:text-zinc-300 hover:bg-blue-500/10 hover:text-blue-500 transition-all cursor-pointer min-w-[56px]"
              title="Share on Facebook"
            >
              <Globe className="w-4 h-4 text-blue-500" />
              <span>Facebook</span>
            </button>

            {/* Email */}
            <button
              onClick={() => shareByEmail(reel, customNote)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl text-[9px] font-extrabold text-zinc-600 dark:text-zinc-300 hover:bg-amber-500/10 hover:text-amber-500 transition-all cursor-pointer min-w-[56px]"
              title="Share by Email"
            >
              <Mail className="w-4 h-4 text-amber-500" />
              <span>Email</span>
            </button>

            {/* Native Share */}
            {canNativeShare() && (
              <button
                onClick={() => shareNative(reel, customNote)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl text-[9px] font-extrabold text-zinc-600 dark:text-zinc-300 hover:bg-violet-500/10 hover:text-violet-500 transition-all cursor-pointer min-w-[56px]"
                title="More Sharing Options"
              >
                <Smartphone className="w-4 h-4 text-violet-500" />
                <span>More...</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
