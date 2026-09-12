import React, { useState, useEffect } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { User } from "../../types";
import { followUser, unfollowUser, checkIsFollowing } from "../../lib/socialService";

interface FollowButtonProps {
  targetUserId: string;
  currentUser: User | null;
  size?: "sm" | "md" | "lg";
  onFollowStateChange?: (isFollowing: boolean) => void;
  className?: string;
  showUnfollowConfirm?: boolean;
}

export default function FollowButton({
  targetUserId,
  currentUser,
  size = "md",
  onFollowStateChange,
  className = "",
  showUnfollowConfirm = false
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [theyFollowMe, setTheyFollowMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Derives follow status and follow-back status on mount or user change
  useEffect(() => {
    let isMounted = true;
    const loadFollowState = async () => {
      if (!currentUser || !currentUser.id || !targetUserId || currentUser.id === targetUserId) {
        if (isMounted) {
          setIsFollowing(false);
          setTheyFollowMe(false);
        }
        return;
      }
      try {
        const [iFollow, theyFollow] = await Promise.all([
          checkIsFollowing(currentUser.id, targetUserId),
          checkIsFollowing(targetUserId, currentUser.id)
        ]);
        if (isMounted) {
          setIsFollowing(iFollow);
          setTheyFollowMe(theyFollow);
        }
      } catch (err) {
        console.warn("Follow state load error:", err);
      }
    };
    loadFollowState();
    return () => { isMounted = false; };
  }, [currentUser, targetUserId]);

  // Don't render Follow button if current user is viewing their own profile/content
  if (!currentUser || currentUser.id === targetUserId) {
    return null;
  }

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isLoading) return;

    if (isFollowing && showUnfollowConfirm) {
      const confirmUnfollow = window.confirm("Are you sure you want to unfollow this creator?");
      if (!confirmUnfollow) return;
    }

    const previousState = isFollowing;
    const nextState = !previousState;

    // Optimistic UI update
    setIsFollowing(nextState);
    if (onFollowStateChange) onFollowStateChange(nextState);
    setIsLoading(true);

    try {
      if (nextState) {
        await followUser(currentUser, targetUserId);
      } else {
        await unfollowUser(currentUser.id, targetUserId);
      }
    } catch (err) {
      console.error("Failed to toggle follow state:", err);
      // Rollback on failure
      setIsFollowing(previousState);
      if (onFollowStateChange) onFollowStateChange(previousState);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeStyles = {
    sm: "px-2.5 py-1 text-[10px] gap-1 rounded-lg font-bold",
    md: "px-3.5 py-1.5 text-xs gap-1.5 rounded-xl font-extrabold",
    lg: "px-5 py-2.5 text-sm gap-2 rounded-2xl font-black"
  }[size];

  const buttonText = isFollowing
    ? isHovered ? "Unfollow" : "Following"
    : theyFollowMe ? "Follow Back" : "Follow";

  return (
    <button
      onClick={handleToggleFollow}
      disabled={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-70 active:scale-95 shadow-sm ${
        isFollowing
          ? isHovered
            ? "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white"
            : "bg-zinc-100 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
          : theyFollowMe
            ? "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 shadow-emerald-600/20"
            : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border border-violet-500/30 shadow-violet-500/20"
      } ${sizeStyles} ${className}`}
      title={isFollowing ? "Click to unfollow" : theyFollowMe ? "Follow back this user" : "Follow creator for updates"}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{isFollowing ? "Unfollowing..." : "Following..."}</span>
        </>
      ) : isFollowing ? (
        <>
          <UserCheck className="w-3.5 h-3.5 text-emerald-500 group-hover:text-white transition-colors" />
          <span>{buttonText}</span>
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" />
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
}
