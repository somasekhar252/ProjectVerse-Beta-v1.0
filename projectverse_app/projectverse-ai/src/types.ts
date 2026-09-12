export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  college?: string;
  collegeName?: string;
  branch?: string;
  year?: string;
  skills?: string[];
  technologies?: string[];
  bio?: string;
  badges: string[];
  totalLikes?: number;
  totalSaves?: number;
  downloadsCount?: number;
  followersCount?: number;
  followingCount?: number;
  profileViews?: number;
  github?: string;
  linkedin?: string;
  portfolioLink?: string;
  avatarUrl?: string;
  role?: string;
}

export interface AppNotification {
  id: string;
  type: "follow" | "project_like" | "reel_like" | "project_comment" | "reel_comment" | "message_request" | "message";
  actorId: string;
  actorName: string;
  actorUsername?: string;
  actorAvatar?: string;
  recipientId: string;
  targetId?: string; // projectId, reelId, or conversationId
  targetTitle?: string;
  text?: string;
  createdAt: string;
  read: boolean;
}

export interface MessageRequest {
  id: string; // `${senderId}_${recipientId}`
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  recipientId: string;
  initialMessageText: string;
  reelId?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  updatedAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface CreatorSubscription {
  id: string;
  subscriberId: string;
  creatorId: string;
  enabled: boolean;
  createdAt: string;
}

export interface DirectConversation {
  id: string; // sorted([uid1, uid2]).join("_")
  type: "direct";
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
}

export interface RoadmapMilestone {
  title: string;
  description?: string;
  date: string;
  done: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  briefDescription?: string;
  problemStatement: string;
  objectives: string;
  realWorldProblem?: string;
  existingSystem?: string;
  proposedSolution?: string;
  proposedSystem?: string;
  modules?: string[];
  features?: string[];
  technologyStack: string[];
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  branch: string;
  semester?: string;
  duration: number; // in days
  teamSize: number;
  teamMembers?: string;
  folderStructure?: string;
  apiStructure?: string;
  databaseDesign?: string;
  roadmap?: RoadmapMilestone[];
  timeline?: string;
  futureScope?: string;
  testingPlan?: string;
  deploymentGuide?: string;
  readme?: string;
  githubLink?: string;
  githubUrl?: string;
  workspaceFileUrl?: string;
  workspaceFileType?: "zip" | "pdf";
  liveDemoLink?: string;
  screenshots: string[];
  thumbnailUrl?: string;
  demoVideoUrl?: string;
  status?: string;
  ownerId: string;
  creatorId?: string;
  ownerName: string;
  isDraft: boolean;
  visibility: "Public" | "Private" | "Only Followers";
  allowDownload: boolean;
  allowFork: boolean;
  likes: string[]; // array of user IDs who liked
  saves: string[]; // array of user IDs who saved
  commentsCount: number;
  forksCount: number;
  forkedFromId?: string; // original project this was forked from
  originalCreatorId?: string;
  originalCreatorName?: string;
  createdDate: string;
  qualityScore: number; // out of 100
  qualityFeedback?: string[];
}

export interface Reel {
  id: string;
  title: string;
  description: string;
  problem?: string;
  solution?: string;
  demoType?: "simulation" | "canvas" | "video";
  videoUrl?: string; // URL or simulation identifier
  techStack?: string[];
  technologyStack?: string[];
  results?: string;
  likes: string[]; // array of user IDs who liked
  saves: string[]; // array of user IDs who saved
  comments: ReelComment[];
  sharesCount?: number;
  ownerName?: string;
  ownerId?: string;
  ownerAvatar?: string;
  projectId?: string;
  creatorId?: string;
  creatorName?: string;
  creatorRole?: string;
  creatorAvatar?: string;
  category?: string;
  hashtags?: string[];
  cloudinaryPublicId?: string;
  createdDate?: string;
  createdAt?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
}

export interface ReelComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: string;
}

export function sanitizeProject(project: any, docId?: string): Project {
  if (!project || typeof project !== "object") {
    return {
      id: docId || "proj_" + Math.random().toString(36).substring(2, 9),
      title: "Engineering Spec Project",
      description: "",
      problemStatement: "",
      objectives: "",
      technologyStack: ["Computer Science"],
      category: "Software Engineering",
      difficulty: "Intermediate",
      branch: "Computer Science",
      duration: 30,
      teamSize: 1,
      likes: [],
      saves: [],
      createdDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    } as any;
  }

  const sanitizeField = (field: any): string => {
    if (!field) return "";
    if (typeof field === "object") {
      try {
        return JSON.stringify(field, null, 2);
      } catch (err) {
        return String(field);
      }
    }
    return String(field);
  };

  const result = { ...project };
  result.id = docId || project.id || "proj_" + Math.random().toString(36).substring(2, 9);

  const stringFields = [
    "title", "description", "problemStatement", "existingSystem", "proposedSystem",
    "teamMembers", "folderStructure", "apiStructure", "databaseDesign", "timeline",
    "futureScope", "testingPlan", "deploymentGuide", "readme", "category", "difficulty", "branch", "semester", "realWorldProblem"
  ];

  stringFields.forEach(f => {
    if (result[f] !== undefined) {
      result[f] = sanitizeField(result[f]);
    }
  });

  if (!result.category) result.category = "Software Engineering";
  if (!result.difficulty) result.difficulty = "Intermediate";
  if (!result.branch) result.branch = "Computer Science";
  if (!result.createdDate && result.createdAt) result.createdDate = result.createdAt;
  if (!result.createdDate) result.createdDate = new Date().toISOString();

  if (result.objectives !== undefined) {
    if (Array.isArray(result.objectives)) {
      result.objectives = result.objectives.map((o: any) => typeof o === "object" ? JSON.stringify(o) : String(o)).join("\n");
    } else {
      result.objectives = sanitizeField(result.objectives);
    }
  }

  if (result.modules !== undefined && !Array.isArray(result.modules)) {
    if (typeof result.modules === "object") {
      try {
        result.modules = Object.entries(result.modules).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
      } catch (e) {
        result.modules = [JSON.stringify(result.modules)];
      }
    } else {
      result.modules = [String(result.modules)];
    }
  }

  if (result.features !== undefined && !Array.isArray(result.features)) {
    if (typeof result.features === "object") {
      try {
        result.features = Object.entries(result.features).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
      } catch (e) {
        result.features = [JSON.stringify(result.features)];
      }
    } else {
      result.features = [String(result.features)];
    }
  }

  if (result.technologyStack !== undefined) {
    if (Array.isArray(result.technologyStack)) {
      result.technologyStack = result.technologyStack.map((item: any) => typeof item === "object" ? JSON.stringify(item) : String(item));
    } else if (typeof result.technologyStack === "object") {
      try {
        result.technologyStack = Object.keys(result.technologyStack);
      } catch (e) {
        result.technologyStack = [JSON.stringify(result.technologyStack)];
      }
    } else {
      result.technologyStack = [String(result.technologyStack)];
    }
  } else {
    result.technologyStack = [];
  }

  // Ensure arrays are arrays
  if (!Array.isArray(result.likes)) result.likes = [];
  if (!Array.isArray(result.saves)) result.saves = [];
  if (!Array.isArray(result.screenshots)) result.screenshots = [];

  return result as Project;
}

const FALLBACK_REEL_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreet.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://www.w3schools.com/html/mov_bbb.mp4"
];

export function sanitizeReel(raw: any, docId?: string): Reel {
  if (!raw || typeof raw !== "object") {
    const id = docId || "reel_" + Date.now();
    const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      id,
      title: "Untitled Spec Reel",
      description: "",
      videoUrl: FALLBACK_REEL_VIDEOS[hash % FALLBACK_REEL_VIDEOS.length],
      thumbnail: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60",
      creatorId: "unknown",
      creatorName: "Student Innovator",
      ownerId: "unknown",
      ownerName: "Student Innovator",
      likes: [],
      saves: [],
      comments: [],
      technologyStack: ["Engineering"],
      category: "Computer Science",
      createdDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  const id = raw.id || docId || "reel_" + Date.now();
  const title = raw.title || "Engineering Spec Reel";
  const description = raw.description || raw.briefDescription || "";
  let videoUrl = raw.videoUrl || raw.demoVideoUrl || raw.url || "";
  if (!videoUrl || videoUrl.trim() === "") {
    const hash = id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    videoUrl = FALLBACK_REEL_VIDEOS[hash % FALLBACK_REEL_VIDEOS.length];
  }
  const thumbnail = raw.thumbnail || raw.thumbnailUrl || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60";
  
  // Normalize identity
  const creatorId = raw.creatorId || raw.ownerId || raw.userId || raw.authorId || "";
  const ownerId = raw.ownerId || raw.creatorId || raw.userId || raw.authorId || "";
  const creatorName = raw.creatorName || raw.ownerName || raw.authorName || "Student Innovator";
  const ownerName = raw.ownerName || raw.creatorName || raw.authorName || "Student Innovator";
  const creatorAvatar = raw.creatorAvatar || raw.ownerAvatar || raw.avatarUrl || "";

  // Normalize dates
  const createdDate = raw.createdDate || raw.createdAt || raw.timestamp || new Date().toISOString();
  const createdAt = raw.createdAt || raw.createdDate || raw.timestamp || new Date().toISOString();

  // Normalize arrays
  const likes = Array.isArray(raw.likes) ? raw.likes : [];
  const saves = Array.isArray(raw.saves) ? raw.saves : [];
  const comments = Array.isArray(raw.comments) ? raw.comments : [];
  const technologyStack = Array.isArray(raw.technologyStack) 
    ? raw.technologyStack 
    : Array.isArray(raw.techStack) 
      ? raw.techStack 
      : ["Engineering"];
  const hashtags = Array.isArray(raw.hashtags) ? raw.hashtags : [];

  return {
    ...raw,
    id,
    title,
    description,
    videoUrl,
    thumbnail,
    thumbnailUrl: thumbnail,
    creatorId,
    ownerId,
    creatorName,
    ownerName,
    creatorAvatar,
    ownerAvatar: creatorAvatar,
    createdDate,
    createdAt,
    likes,
    saves,
    comments,
    technologyStack,
    techStack: technologyStack,
    category: raw.category || "Computer Science",
    hashtags,
    projectId: raw.projectId || undefined
  };
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName?: string;
  recipientId?: string;
  conversationId?: string;
  text: string;
  type?: "text" | "reel_share";
  readBy?: string[];
  reelId?: string;
  reelTitle?: string;
  reelDescription?: string;
  createdAt?: string;
  timestamp?: string;
}

