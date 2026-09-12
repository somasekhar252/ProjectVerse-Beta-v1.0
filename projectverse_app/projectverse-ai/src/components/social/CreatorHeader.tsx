import React from "react";
import { User } from "../../types";
import FollowButton from "./FollowButton";
import CreatorNotificationButton from "./CreatorNotificationButton";
import UserAvatar from "./UserAvatar";

interface CreatorHeaderProps {
  creatorId: string;
  creatorName?: string;
  creatorAvatar?: string;
  creatorRole?: string;
  currentUser: User | null;
  onNavigateProfile?: (userId: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  showNotificationBell?: boolean;
}

export default function CreatorHeader({
  creatorId,
  creatorName = "Student Innovator",
  creatorAvatar,
  creatorRole,
  currentUser,
  onNavigateProfile,
  size = "md",
  className = "",
  showNotificationBell = true
}: CreatorHeaderProps) {
  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateProfile && creatorId) {
      onNavigateProfile(creatorId);
    }
  };

  const username = creatorName.toLowerCase().replace(/\s+/g, "");

  const nameSize = {
    sm: "text-xs font-extrabold",
    md: "text-xs sm:text-sm font-extrabold",
    lg: "text-sm sm:text-base font-black"
  }[size];

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {/* Creator Info Group (Clickable to navigate to Profile) */}
      <div 
        onClick={handleProfileClick}
        className="flex items-center gap-2.5 cursor-pointer group hover:opacity-90 transition-opacity min-w-0"
      >
        <UserAvatar
          userId={creatorId}
          avatarUrl={creatorAvatar}
          name={creatorName}
          size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"}
          showBorder={true}
        />
        <div className="text-left truncate">
          <div className="flex items-center gap-1.5 truncate">
            <h4 className={`${nameSize} text-zinc-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors`}>
              {creatorName}
            </h4>
          </div>
          <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate">
            @{username} {creatorRole ? `• ${creatorRole}` : ""}
          </p>
        </div>
      </div>

      {/* Action Controls: Follow Button & Creator Bell */}
      {currentUser && currentUser.id !== creatorId && (
        <div className="flex items-center gap-1.5 shrink-0">
          <FollowButton
            targetUserId={creatorId}
            currentUser={currentUser}
            size={size === "lg" ? "md" : "sm"}
          />
          {showNotificationBell && (
            <CreatorNotificationButton
              creatorId={creatorId}
              currentUser={currentUser}
              size={size === "lg" ? "md" : "sm"}
            />
          )}
        </div>
      )}
    </div>
  );
}
