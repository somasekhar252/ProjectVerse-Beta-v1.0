import React, { useState, useEffect } from "react";
import { resolveUserAvatarUrl, getDefaultAvatarUrl } from "../../utils/avatarUtils";
import { Camera } from "lucide-react";

interface UserAvatarProps {
  userId?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  showBorder?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  isEditable?: boolean;
  ariaLabel?: string;
}

const SIZE_MAP = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-xs",
  lg: "w-14 h-14 text-sm",
  xl: "w-20 h-20 text-base",
  "2xl": "w-28 h-28 text-lg"
};

export default function UserAvatar({
  userId,
  avatarUrl,
  name,
  size = "md",
  showBorder = false,
  className = "",
  onClick,
  isEditable = false,
  ariaLabel
}: UserAvatarProps) {
  const seed = userId || name || "default_user";
  const primarySrc = resolveUserAvatarUrl(avatarUrl, seed);
  const fallbackSrc = getDefaultAvatarUrl(seed);

  const [imageSrc, setImageSrc] = useState(primarySrc);
  const [hasError, setHasError] = useState(false);

  // Update image source when props change
  useEffect(() => {
    setImageSrc(resolveUserAvatarUrl(avatarUrl, seed));
    setHasError(false);
  }, [avatarUrl, seed]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImageSrc(fallbackSrc);
    }
  };

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const borderClass = showBorder 
    ? "ring-2 ring-violet-500/30 dark:ring-violet-400/40 p-0.5" 
    : "";

  const content = (
    <>
      <img
        src={imageSrc}
        alt={name || "User profile photo"}
        onError={handleError}
        className={`${sizeClass} ${borderClass} rounded-full object-cover bg-zinc-100 dark:bg-zinc-800 transition-transform duration-200 ${
          onClick ? "group-hover:scale-105" : ""
        }`}
      />

      {/* Editable Hover Overlay */}
      {isEditable && (
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
          <Camera className="w-5 h-5 drop-shadow-md" />
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel || `View ${name || "user"}'s profile`}
        className={`relative inline-block rounded-full shrink-0 cursor-pointer group hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`relative inline-block rounded-full shrink-0 ${className}`}>
      {content}
    </div>
  );
}
