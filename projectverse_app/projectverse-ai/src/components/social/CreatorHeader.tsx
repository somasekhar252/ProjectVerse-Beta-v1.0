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
    e.preventDefault();
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
    <div className={`flex items-center justify-between gap-3 min-w-0 ${className}`}>
      {/* Creator Info Group: Avatar + Username (Distinct interactive profile entry points) */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Entry Point 1: Avatar */}
        <UserAvatar
          userId={creatorId}
          avatarUrl={creatorAvatar}
          name={creatorName}
          size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"}
          showBorder={true}
          onClick={handleProfileClick}
          ariaLabel={`View @${username} profile`}
        />

        {/* Entry Point 2: Username & Name Text Button */}
        <button
          type="button"
          onClick={handleProfileClick}
          aria-label={`View @${username} profile`}
          className="text-left min-w-0 flex-1 group focus:outline-none cursor-pointer"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className={`${nameSize} text-zinc-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors`}>
              {creatorName}
            </h4>
          </div>
          <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate group-hover:text-violet-500 transition-colors">
            @{username} {creatorRole ? `• ${creatorRole}` : ""}
          </p>
        </button>
      </div>

      {/* Action Controls: Follow Button & Creator Bell (Isolated Sibling Controls) */}
      {currentUser && currentUser.id !== creatorId && (
        <div 
          className="flex items-center gap-1.5 shrink-0 z-10"
          onClick={(e) => e.stopPropagation()}
        >
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
