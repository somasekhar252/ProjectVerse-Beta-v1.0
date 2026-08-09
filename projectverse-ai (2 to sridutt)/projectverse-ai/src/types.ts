export interface User {
  id: string;
  name: string;
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
  category?: string;
  hashtags?: string[];
  createdDate?: string;
  thumbnail?: string;
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

export function sanitizeProject(project: any): Project {
  if (!project || typeof project !== "object") {
    return {
      id: String(project || "invalid"),
      title: "Unknown Project",
      description: "",
      problemStatement: "",
      objectives: "",
      technologyStack: [],
      category: "Web Development",
      difficulty: "Intermediate",
      branch: "Computer Science",
      duration: 30,
      teamSize: 1,
      likes: [],
      saves: []
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

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  text: string;
  reelId?: string;
  reelTitle?: string;
  reelDescription?: string;
  timestamp: string;
}

