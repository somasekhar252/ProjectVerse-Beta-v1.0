import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "../../lib/firebase";
import { Reel } from "../../types";
import UserAvatar from "./UserAvatar";
import { Play, Sparkles, AlertCircle, Loader2 } from "lucide-react";

interface ReelShareCardProps {
  reelId: string;
  initialTitle?: string;
  initialThumbnailUrl?: string;
  initialCreatorName?: string;
  initialCreatorAvatar?: string;
  onPlayReel?: (reelId: string) => void;
}

export default function ReelShareCard({
  reelId,
  initialTitle,
  initialThumbnailUrl,
  initialCreatorName,
  initialCreatorAvatar,
  onPlayReel
}: ReelShareCardProps) {
  const [reel, setReel] = useState<Partial<Reel> | null>(() => {
    if (initialTitle || initialThumbnailUrl) {
      return {
        id: reelId,
        title: initialTitle,
        thumbnailUrl: initialThumbnailUrl,
        creatorName: initialCreatorName,
        creatorAvatar: initialCreatorAvatar
      };
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(!initialTitle);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    if (!reelId) {
      setIsUnavailable(true);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Fetch canonical Firestore Reel document
    const fetchReelDoc = async () => {
      try {
        const snap = await getDoc(doc(firebaseDb, "reels", reelId));
        if (snap.exists()) {
          if (isMounted) {
            setReel(snap.data() as Reel);
            setIsLoading(false);
            setIsUnavailable(false);
          }
        } else {
          // If no doc and no initial metadata fallback, mark unavailable
          if (isMounted) {
            if (!initialTitle) {
              setIsUnavailable(true);
            }
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.warn("ReelShareCard document fetch warning:", err);
        if (isMounted && !initialTitle) {
          setIsUnavailable(true);
          setIsLoading(false);
        }
      }
    };

    fetchReelDoc();

    return () => {
      isMounted = false;
    };
  }, [reelId, initialTitle]);

  const handleCardClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (onPlayReel && reelId && !isUnavailable) {
      onPlayReel(reelId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick(e);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-2.5 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-2 max-w-sm">
        <Loader2 className="w-5 h-5 text-violet-500 animate-spin mx-auto" />
        <p className="text-[10px] font-bold text-zinc-400">Loading Spec Reel...</p>
      </div>
    );
  }

  if (isUnavailable) {
    return (
      <div className="mt-2.5 p-3.5 rounded-2xl bg-zinc-950/90 border border-rose-500/20 text-left space-y-1.5 max-w-sm">
        <div className="flex items-center gap-1.5 text-rose-400 font-extrabold text-[10px]">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Reel Unavailable</span>
        </div>
        <p className="text-[10px] font-semibold text-zinc-400">
          This Spec Reel may have been deleted or is no longer accessible.
        </p>
      </div>
    );
  }

  const title = reel?.title || initialTitle || "Spec Reel Blueprint";
  const poster = reel?.thumbnailUrl || reel?.coverUrl || reel?.videoThumbnail || initialThumbnailUrl || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80";
  const creatorName = reel?.creatorName || reel?.ownerName || initialCreatorName || "Student Innovator";
  const creatorAvatar = reel?.creatorAvatar || initialCreatorAvatar;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`Watch Reel: ${title}`}
      className="mt-2.5 w-full max-w-[260px] rounded-2xl bg-zinc-950/90 border border-violet-500/30 hover:border-violet-500/60 shadow-xl overflow-hidden group cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
    >
      {/* Thumbnail Container with Play Overlay */}
      <div className="relative w-full h-36 bg-zinc-900 overflow-hidden">
        <img
          src={poster}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        
        {/* REEL Badge */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-violet-600/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-white" />
          <span>Spec Reel</span>
        </div>

        {/* Center Play Icon Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-violet-600 transition-all shadow-lg">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Info Content */}
      <div className="p-3 text-left space-y-2">
        <h4 className="text-xs font-extrabold text-white leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
          {title}
        </h4>

        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
          <UserAvatar
            userId={reel?.creatorId || reel?.ownerId || "creator"}
            avatarUrl={creatorAvatar}
            name={creatorName}
            size="xs"
            showBorder={false}
          />
          <span className="text-[10px] font-bold text-zinc-300 truncate">
            @{creatorName.toLowerCase().replace(/\s+/g, "_")}
          </span>
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={handleCardClick}
          className="w-full py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-extrabold text-[11px] text-white flex items-center justify-center gap-1.5 transition-colors shadow-md mt-1 cursor-pointer"
        >
          <Play className="w-3 h-3 fill-white" />
          <span>Watch Reel</span>
        </button>
      </div>
    </div>
  );
}
