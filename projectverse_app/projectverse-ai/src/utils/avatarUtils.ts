/**
 * Curated Default Avatar Presets for NexCivic / ProjectVerse AI
 * Provides deterministic, high-quality illustrated avatars.
 */

export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
}

export const DEFAULT_AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "preset_1",
    name: "Adventurer",
    url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix"
  },
  {
    id: "preset_2",
    name: "Cyber Bot",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=Innovator"
  },
  {
    id: "preset_3",
    name: "Tech Lead",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria"
  },
  {
    id: "preset_4",
    name: "Syllabus Architect",
    url: "https://api.dicebear.com/7.x/micah/svg?seed=Marcus"
  },
  {
    id: "preset_5",
    name: "Code Prodigy",
    url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Maya"
  },
  {
    id: "preset_6",
    name: "Robo Tech",
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=RoboTech"
  },
  {
    id: "preset_7",
    name: "Design Creator",
    url: "https://api.dicebear.com/7.x/big-smile/svg?seed=Chloe"
  },
  {
    id: "preset_8",
    name: "Research Fellow",
    url: "https://api.dicebear.com/7.x/avataaars/svg?seed=David"
  },
  {
    id: "preset_9",
    name: "Full Stack Engineer",
    url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sam"
  },
  {
    id: "preset_10",
    name: "Nexus Scholar",
    url: "https://api.dicebear.com/7.x/micah/svg?seed=Elena"
  }
];

/**
 * Returns a deterministic default avatar URL based on string seed (userId or name)
 * Guarantees that a user without a custom photo receives a FIXED, consistent avatar.
 */
export function getDefaultAvatarUrl(seed?: string | null): string {
  if (!seed || !seed.trim()) {
    return DEFAULT_AVATAR_PRESETS[0].url;
  }

  // Calculate simple hash from seed string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % DEFAULT_AVATAR_PRESETS.length;
  return DEFAULT_AVATAR_PRESETS[index].url;
}

/**
 * Resolves the display avatar URL for a user with robust fallbacks
 */
export function resolveUserAvatarUrl(avatarUrl?: string | null, seed?: string | null): string {
  if (avatarUrl && avatarUrl.trim() && avatarUrl !== "null" && avatarUrl !== "undefined") {
    return avatarUrl.trim();
  }
  return getDefaultAvatarUrl(seed);
}
