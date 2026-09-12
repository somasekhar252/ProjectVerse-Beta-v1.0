import React, { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { User } from "../../types";
import { toggleCreatorSubscription, checkIsSubscribedToCreator } from "../../lib/socialService";

interface CreatorNotificationButtonProps {
  creatorId: string;
  currentUser: User | null;
  size?: "sm" | "md";
  className?: string;
}

export default function CreatorNotificationButton({
  creatorId,
  currentUser,
  size = "md",
  className = ""
}: CreatorNotificationButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSubState = async () => {
      if (!currentUser || !currentUser.id || !creatorId || currentUser.id === creatorId) {
        if (isMounted) setIsSubscribed(false);
        return;
      }
      try {
        const subStatus = await checkIsSubscribedToCreator(currentUser.id, creatorId);
        if (isMounted) setIsSubscribed(subStatus);
      } catch (err) {
        console.warn("Creator sub state error:", err);
      }
    };
    loadSubState();
    return () => { isMounted = false; };
  }, [currentUser, creatorId]);

  if (!currentUser || currentUser.id === creatorId) {
    return null;
  }

  const handleToggleSubscription = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLoading) return;

    const previousState = isSubscribed;
    const nextState = !previousState;
    setIsSubscribed(nextState);
    setIsLoading(true);

    try {
      const updated = await toggleCreatorSubscription(currentUser.id, creatorId);
      setIsSubscribed(updated);
    } catch (err) {
      console.error("Failed to toggle creator notification subscription:", err);
      setIsSubscribed(previousState);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonSize = size === "sm" ? "p-1.5 rounded-lg" : "p-2 rounded-xl";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <button
      onClick={handleToggleSubscription}
      disabled={isLoading}
      className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer border shadow-2xs active:scale-95 ${
        isSubscribed
          ? "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
          : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-zinc-800 dark:hover:text-white"
      } ${buttonSize} ${className}`}
      title={isSubscribed ? "Notifications on for this creator" : "Notify me about new content from this creator"}
    >
      {isLoading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : isSubscribed ? (
        <Bell className={`${iconSize} fill-amber-500 text-amber-500`} />
      ) : (
        <BellOff className={`${iconSize}`} />
      )}
    </button>
  );
}
