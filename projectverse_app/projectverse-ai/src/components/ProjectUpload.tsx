import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  UploadCloud, 
  Video, 
  Sparkles, 
  FileCheck, 
  FolderGit2, 
  CheckCircle,
  HelpCircle,
  BadgeAlert,
  Image as ImageIcon,
  FileCode,
  Github,
  Layers,
  Search,
  AlertCircle,
  FileText,
  Check,
  ExternalLink
} from "lucide-react";
import { Project, User, Reel } from "../types";
import { 
  saveProjectToFirestore, 
  firebaseAuth 
} from "../lib/firebase";
import { robustFetch } from "../utils/api";
import { uploadToBackendCloudinary, rollbackUploadedAssets, RollbackAssetItem } from "../lib/cloudinary";

interface ProjectUploadProps {
  currentUser: User | null;
  onPublishSuccess: (projectId?: string) => void;
  onBack: () => void;
  editProjectData?: Project;
  existingProjects?: Project[];
}

// Predefined technology categories for the Core Tech Stack Selector
const TECH_CATEGORIES: Record<string, string[]> = {
  Frontend: ["React", "Next.js", "Angular", "Vue.js", "HTML", "CSS", "JavaScript", "TypeScript", "Tailwind CSS", "Bootstrap"],
  Backend: ["Node.js", "Express.js", "Python", "Django", "Flask", "FastAPI", "Java", "Spring Boot", "PHP", "Laravel", ".NET"],
  Mobile: ["React Native", "Flutter", "Android", "Kotlin", "Swift"],
  "AI / ML": ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "OpenCV", "Pandas", "NumPy", "Hugging Face", "LangChain", "Gemini API", "OpenAI API"],
  Database: ["Firebase", "Firestore", "Supabase", "MongoDB", "MySQL", "PostgreSQL", "SQLite", "Redis", "Oracle"],
  "Cloud / DevOps": ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Vercel", "Netlify", "GitHub Actions"],
  "IoT / Hardware": ["Arduino", "ESP32", "Raspberry Pi", "MQTT", "Node-RED"],
  Blockchain: ["Solidity", "Ethereum", "Web3.js", "Hardhat", "Polygon"],
  Other: ["Git", "GitHub", "REST API", "GraphQL", "WebSocket"]
};

export default function ProjectUpload({
  currentUser,
  onPublishSuccess,
  onBack,
  editProjectData,
  existingProjects
}: ProjectUploadProps) {
  const [uploadType, setUploadType] = useState<"project" | "reel">("project");
  
  // Projects active step state
  const [activeStep, setActiveStep] = useState<"Basic" | "Details" | "Technical" | "Media & Links" | "Settings">("Basic");

  // 16 MANDATORY FORM FIELDS STATES
  const [title, setTitle] = useState(""); // 1. Title
  const [description, setDescription] = useState(""); // 2. Brief Description
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced" | "Expert">("Intermediate"); // 3. Difficulty
  const [category, setCategory] = useState("Web Development"); // 4. Category
  const [branch, setBranch] = useState("Computer Science"); // 5. Branch
  const [semester, setSemester] = useState("Semester 6"); // 6. Semester
  const [duration, setDuration] = useState<number | "">(45); // 7. Duration
  const [teamSize, setTeamSize] = useState<number | "">(4); // 8. Team Size
  const [technologies, setTechnologies] = useState<string[]>(["React", "TypeScript", "Node.js"]); // 9. Core Stack
  const [problemStatement, setProblemStatement] = useState(""); // 10. Problem Statement
  const [objectives, setObjectives] = useState(""); // 11. Objectives
  const [proposedSolution, setProposedSolution] = useState(""); // 12. Proposed Solution
  const [folderStructure, setFolderStructure] = useState(`src/
├── components/
├── hooks/
└── App.tsx`); // 13. Folder Structure
  const [apiStructure, setApiStructure] = useState(`GET    /api/projects      - Fetch published project items
POST   /api/projects      - Publish project blueprint spec`); // 14. API Structure
  const [databaseDesign, setDatabaseDesign] = useState(`projects: { id, title, description, ownerId, technologyStack }
users: { id, name, email, college }`); // 15. Database Design
  const [futureScope, setFutureScope] = useState(""); // 16. Future Scope

  // 4 MANDATORY MEDIA & FILES / LINKS STATES
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(""); // 17. Thumbnail
  
  const [demoVideoFile, setDemoVideoFile] = useState<File | null>(null);
  const [demoVideoUrl, setDemoVideoUrl] = useState(""); // 18. Demo Video
  
  const [workspaceFile, setWorkspaceFile] = useState<File | null>(null);
  const [workspaceFileType, setWorkspaceFileType] = useState<"zip" | "pdf">("zip");
  const [attachmentUrl, setAttachmentUrl] = useState(""); // 19. Workspace ZIP or Report PDF
  
  const [githubLink, setGithubLink] = useState(""); // 20. GitHub Link

  // Additional settings states
  const [visibility, setVisibility] = useState<"Public" | "Private" | "Only Followers">("Public");
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowFork, setAllowFork] = useState(true);

  // Tech Selector State
  const [selectedTechCategory, setSelectedTechCategory] = useState<string>("All");
  const [techSearchQuery, setTechSearchQuery] = useState<string>("");
  const [customTechInput, setCustomTechInput] = useState<string>("");

  // REEL FORM STATES
  const [reelTitle, setReelTitle] = useState("");
  const [reelDesc, setReelDesc] = useState("");
  const [reelVideoFile, setReelVideoFile] = useState<File | null>(null);
  const [reelVideoUrl, setReelVideoUrl] = useState("");
  const [reelHashtagsInput, setReelHashtagsInput] = useState("");
  const [reelTechInput, setReelTechInput] = useState("");
  const [reelTechStack, setReelTechStack] = useState<string[]>([]);
  const [relatedProjectId, setRelatedProjectId] = useState("");
  const [userProjectsList, setUserProjectsList] = useState<Project[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);

  // Submission & Progress states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatusMessage, setUploadStatusMessage] = useState("");
  const [uploadProgressState, setUploadProgressState] = useState<{
    thumbnail: number;
    video: number;
    workspace: number;
    reel: number;
  }>({ thumbnail: 0, video: 0, workspace: 0, reel: 0 });

  const steps: ("Basic" | "Details" | "Technical" | "Media & Links" | "Settings")[] = [
    "Basic", "Details", "Technical", "Media & Links", "Settings"
  ];

  // Prefill when editing
  useEffect(() => {
    if (editProjectData) {
      setTitle(editProjectData.title || "");
      setDescription(editProjectData.description || "");
      setDifficulty((editProjectData.difficulty as any) || "Intermediate");
      setCategory(editProjectData.category || "Web Development");
      setBranch(editProjectData.branch || "Computer Science");
      setSemester(editProjectData.semester || "Semester 6");
      setDuration(editProjectData.duration || 45);
      setTeamSize(editProjectData.teamSize || 4);
      setTechnologies(editProjectData.technologyStack || []);
      setProblemStatement(editProjectData.problemStatement || "");
      setObjectives(editProjectData.objectives || "");
      setProposedSolution(editProjectData.proposedSolution || "");
      setFolderStructure(editProjectData.folderStructure || "");
      setApiStructure(editProjectData.apiStructure || "");
      setDatabaseDesign(editProjectData.databaseDesign || "");
      setFutureScope(editProjectData.futureScope || "");
      setThumbnailUrl(editProjectData.thumbnailUrl || (editProjectData as any).thumbnail || "");
      setDemoVideoUrl(editProjectData.demoVideoUrl || (editProjectData as any).demoVideo || "");
      const legacyAttachments = (editProjectData as any).attachments;
      setAttachmentUrl(legacyAttachments && legacyAttachments[0] ? legacyAttachments[0] : (editProjectData.workspaceFileUrl || ""));
      setGithubLink(editProjectData.githubLink || "");
    }
  }, [editProjectData]);

  // Helper check if a GitHub link is valid
  const isValidGithubUrl = (url: string): boolean => {
    if (!url || !url.trim()) return false;
    const lower = url.toLowerCase().trim();
    return (lower.includes("github.com/") && lower.length > 18) || lower.startsWith("https://github.com/");
  };

  // EVALUATE THE 20 REQUIRED ITEMS
  const requirementChecklist = useMemo(() => {
    return [
      { id: 1, label: "Project Title", isDone: title.trim().length > 0, step: "Basic" as const },
      { id: 2, label: "Brief Description", isDone: description.trim().length > 0, step: "Basic" as const },
      { id: 3, label: "Difficulty Level", isDone: Boolean(difficulty), step: "Basic" as const },
      { id: 4, label: "Category", isDone: Boolean(category), step: "Basic" as const },
      { id: 5, label: "Branch / Department", isDone: branch.trim().length > 0, step: "Basic" as const },
      { id: 6, label: "Semester", isDone: semester.trim().length > 0, step: "Basic" as const },
      { id: 7, label: "Duration (Days)", isDone: Number(duration) > 0, step: "Basic" as const },
      { id: 8, label: "Team Size", isDone: Number(teamSize) > 0, step: "Basic" as const },
      { id: 9, label: "Technologies / Core Stack", isDone: technologies.length >= 1, step: "Technical" as const },
      { id: 10, label: "Problem Statement", isDone: problemStatement.trim().length > 0, step: "Details" as const },
      { id: 11, label: "Objectives", isDone: objectives.trim().length > 0, step: "Details" as const },
      { id: 12, label: "Proposed Solution", isDone: proposedSolution.trim().length > 0, step: "Details" as const },
      { id: 13, label: "Folder Structure", isDone: folderStructure.trim().length > 0, step: "Technical" as const },
      { id: 14, label: "API Paths Structure Summary", isDone: apiStructure.trim().length > 0, step: "Technical" as const },
      { id: 15, label: "Database Design", isDone: databaseDesign.trim().length > 0, step: "Technical" as const },
      { id: 16, label: "Future Scope Expansion", isDone: futureScope.trim().length > 0, step: "Technical" as const },
      { id: 17, label: "Project Thumbnail", isDone: thumbnailFile !== null || thumbnailUrl.trim().length > 0, step: "Media & Links" as const },
      { id: 18, label: "Project Demo Video", isDone: demoVideoFile !== null || demoVideoUrl.trim().length > 0, step: "Media & Links" as const },
      { id: 19, label: "Workspace ZIP OR Project Report PDF", isDone: workspaceFile !== null || attachmentUrl.trim().length > 0, step: "Media & Links" as const },
      { id: 20, label: "GitHub Repository Link", isDone: isValidGithubUrl(githubLink), step: "Media & Links" as const }
    ];
  }, [
    title, description, difficulty, category, branch, semester, duration, teamSize,
    technologies, problemStatement, objectives, proposedSolution, folderStructure,
    apiStructure, databaseDesign, futureScope, thumbnailFile, thumbnailUrl,
    demoVideoFile, demoVideoUrl, workspaceFile, attachmentUrl, githubLink
  ]);

  const completedCount = useMemo(() => {
    return requirementChecklist.filter(item => item.isDone).length;
  }, [requirementChecklist]);

  const missingItems = useMemo(() => {
    return requirementChecklist.filter(item => !item.isDone);
  }, [requirementChecklist]);

  // Fetch ONLY current user's uploaded projects for reels association selector
  useEffect(() => {
    let isMounted = true;

    const loadUserProjects = async () => {
      setIsProjectsLoading(true);

      const firebaseUser = firebaseAuth.currentUser;
      const activeUserIds = new Set<string>(
        [firebaseUser?.uid, currentUser?.id].filter((id): id is string => Boolean(id))
      );

      const filterUserProjects = (pool: Project[]): Project[] => {
        if (activeUserIds.size === 0) return [];
        return pool.filter(p => {
          if (!p) return false;
          return activeUserIds.has(p.ownerId) || 
                 (p.creatorId ? activeUserIds.has(p.creatorId) : false) || 
                 ((p as any).userId ? activeUserIds.has((p as any).userId) : false);
        });
      };

      // 1. Initial population from existingProjects prop if available
      if (existingProjects && existingProjects.length > 0) {
        const filtered = filterUserProjects(existingProjects);
        if (isMounted) {
          setUserProjectsList(filtered);
        }
      }

      // 2. Direct fetch from Cloud Firestore /projects collection
      try {
        const { fetchProjectsFromFirestore } = await import("../lib/projectService");
        const firestoreProjects = await fetchProjectsFromFirestore();
        const pool = firestoreProjects.length > 0 ? firestoreProjects : (existingProjects || []);

        if (isMounted) {
          const userProjects = filterUserProjects(pool);
          setUserProjectsList(userProjects);
        }
      } catch (err) {
        console.warn("[ProjectUpload] User projects selector fetch warning:", err);
      } finally {
        if (isMounted) setIsProjectsLoading(false);
      }
    };

    loadUserProjects();

    return () => { isMounted = false; };
  }, [currentUser, existingProjects]);

  // Tech stack handlers
  const handleToggleTech = (tech: string) => {
    if (technologies.includes(tech)) {
      setTechnologies(technologies.filter(t => t !== tech));
    } else {
      setTechnologies([...technologies, tech]);
    }
  };

  const handleAddCustomTech = () => {
    if (customTechInput.trim() && !technologies.includes(customTechInput.trim())) {
      setTechnologies([...technologies, customTechInput.trim()]);
      setCustomTechInput("");
    }
  };

  const filteredPredefinedTech = useMemo(() => {
    let list: string[] = [];
    if (selectedTechCategory === "All") {
      Object.values(TECH_CATEGORIES).forEach(arr => {
        arr.forEach(t => {
          if (!list.includes(t)) list.push(t);
        });
      });
    } else {
      list = TECH_CATEGORIES[selectedTechCategory] || [];
    }

    if (techSearchQuery.trim()) {
      const q = techSearchQuery.toLowerCase();
      list = list.filter(t => t.toLowerCase().includes(q));
    }

    return list;
  }, [selectedTechCategory, techSearchQuery]);

  // Step Navigators
  const handleNext = () => {
    const idx = steps.indexOf(activeStep);
    if (idx < steps.length - 1) {
      setActiveStep(steps[idx + 1]);
    }
  };

  const handlePrev = () => {
    const idx = steps.indexOf(activeStep);
    if (idx > 0) {
      setActiveStep(steps[idx - 1]);
    }
  };

  // Direct File Pickers Handlers with Size Validation
  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        return alert("Project Image size must be 10 MB or less.");
      }
      setThumbnailFile(file);
      setThumbnailUrl(URL.createObjectURL(file));
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 100 * 1024 * 1024) {
        return alert("Demo Video size must be 100 MB or less.");
      }
      setDemoVideoFile(file);
      setDemoVideoUrl(URL.createObjectURL(file));
    }
  };

  const handleWorkspaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        return alert("Workspace ZIP / Report PDF size must be 50 MB or less.");
      }
      setWorkspaceFile(file);
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      setWorkspaceFileType(isPdf ? "pdf" : "zip");
      setAttachmentUrl(URL.createObjectURL(file));
    }
  };

  // PUBLISH PROJECT WORKFLOW TO CLOUDINARY & FIRESTORE
  const handlePublishProject = async (isDraft: boolean) => {
    if (completedCount < 20) {
      alert(`Cannot publish incomplete project! ${20 - completedCount} required items remaining.`);
      const firstMissing = missingItems[0];
      if (firstMissing) setActiveStep(firstMissing.step);
      return;
    }

    if (!currentUser) {
      return alert("Authentication required. Please sign in to publish your project.");
    }

    setIsSubmitting(true);
    setUploadStatusMessage("Initializing secure project upload session...");
    const uploadedAssets: RollbackAssetItem[] = [];

    try {
      const projectId = editProjectData?.id || "proj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const firebaseUser = firebaseAuth.currentUser;
      const userId = firebaseUser?.uid || currentUser.id;

      let finalThumbnailUrl = thumbnailUrl;
      let finalDemoVideoUrl = demoVideoUrl;
      let finalWorkspaceUrl = attachmentUrl;

      // 1. Upload Thumbnail to Cloudinary via backend
      if (thumbnailFile) {
        setUploadStatusMessage("Uploading Project Thumbnail to Cloudinary...");
        const res = await uploadToBackendCloudinary(thumbnailFile, "project-thumbnail", (pct) => {
          setUploadProgressState(prev => ({ ...prev, thumbnail: pct }));
        });
        finalThumbnailUrl = res.secure_url;
        uploadedAssets.push({ public_id: res.public_id, resource_type: "image" });
      }

      // 2. Upload Demo Video to Cloudinary via backend
      if (demoVideoFile) {
        setUploadStatusMessage("Uploading Demo Video to Cloudinary...");
        const res = await uploadToBackendCloudinary(demoVideoFile, "project-video", (pct) => {
          setUploadProgressState(prev => ({ ...prev, video: pct }));
        });
        finalDemoVideoUrl = res.secure_url;
        uploadedAssets.push({ public_id: res.public_id, resource_type: "video" });
      }

      // 3. Upload Workspace ZIP or Project Report PDF to Cloudinary via backend
      if (workspaceFile) {
        setUploadStatusMessage("Uploading Workspace Files / PDF Report to Cloudinary...");
        const res = await uploadToBackendCloudinary(workspaceFile, "project-file", (pct) => {
          setUploadProgressState(prev => ({ ...prev, workspace: pct }));
        });
        finalWorkspaceUrl = res.secure_url;
        uploadedAssets.push({ public_id: res.public_id, resource_type: "raw" });
      }

      // 4. Construct complete Firestore Document Payload
      setUploadStatusMessage("Saving complete project document into Firestore database...");
      
      const projectPayload: Project = {
        id: projectId,
        ownerId: userId,
        creatorId: userId,
        ownerName: currentUser.name || "Student Innovator",
        title: title.trim(),
        briefDescription: description.trim(),
        description: description.trim() || `Blueprint specification for: ${title}`,
        problemStatement: problemStatement.trim(),
        objectives: objectives.trim(),
        proposedSolution: proposedSolution.trim(),
        proposedSystem: proposedSolution.trim(),
        folderStructure: folderStructure.trim(),
        apiStructure: apiStructure.trim(),
        databaseDesign: databaseDesign.trim(),
        futureScope: futureScope.trim(),
        category,
        difficulty,
        branch: branch.trim(),
        semester: semester.trim(),
        duration: Number(duration) || 30,
        teamSize: Number(teamSize) || 1,
        technologyStack: technologies,
        thumbnailUrl: finalThumbnailUrl || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60",
        screenshots: [finalThumbnailUrl || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60"],
        demoVideoUrl: finalDemoVideoUrl,
        workspaceFileUrl: finalWorkspaceUrl,
        workspaceFileType,
        githubLink: githubLink.trim(),
        githubUrl: githubLink.trim(),
        status: "published",
        isDraft: false,
        visibility,
        allowDownload,
        allowFork,
        likes: [],
        saves: [],
        commentsCount: 0,
        forksCount: 0,
        createdDate: editProjectData?.createdDate || new Date().toISOString(),
        qualityScore: editProjectData?.qualityScore || Math.floor(Math.random() * 10) + 88
      };

      // Write to Firestore database 'projects' collection
      await saveProjectToFirestore(projectPayload);
      setUserProjectsList(prev => [projectPayload, ...prev.filter(p => p.id !== projectPayload.id)]);

      // Mirror to local REST server /api/projects for local listeners
      try {
        await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "authorization": userId
          },
          body: JSON.stringify(projectPayload)
        });
      } catch (err) {
        console.warn("REST server synchronization warning:", err);
      }

      setUploadStatusMessage("Project successfully published!");
      alert("🎉 Project published successfully! Media & files stored in Cloudinary, and data saved in Firestore.");
      onPublishSuccess(projectId);
    } catch (err: any) {
      console.error("Publishing project error:", err);
      if (uploadedAssets.length > 0) {
        setUploadStatusMessage("Error occurred. Rolling back uploaded media from Cloudinary...");
        await rollbackUploadedAssets(uploadedAssets);
      }
      alert(`Publishing failed: ${err?.message || "Check your internet or Firebase permissions and try again."}`);
    } finally {
      setIsSubmitting(false);
      setUploadStatusMessage("");
    }
  };

  // REEL PUBLISH WORKFLOW
  const handlePublishReel = async () => {
    if (!reelTitle.trim()) return alert("Reel Title is required.");
    if (!reelVideoFile && !reelVideoUrl) return alert("Please select a video file for your reel.");
    if (!currentUser && !firebaseAuth.currentUser) return alert("Please sign in to publish a reel.");

    if (reelVideoFile && reelVideoFile.size > 50 * 1024 * 1024) {
      return alert("Video must be 50MB or smaller.");
    }

    setIsSubmitting(true);
    const uploadedAssets: RollbackAssetItem[] = [];

    try {
      const firebaseUser = firebaseAuth.currentUser;
      const userId = firebaseUser?.uid || currentUser?.id || "user_student";
      const userName = currentUser?.name || firebaseUser?.displayName || "Student Innovator";
      const userAvatar = currentUser?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=student";

      let finalUrl = reelVideoUrl;
      let publicId = "";

      if (reelVideoFile) {
        setUploadStatusMessage("Uploading Reel video directly to Cloudinary Media Library...");
        const res = await uploadToBackendCloudinary(reelVideoFile, "reel-video", (pct) => {
          setUploadProgressState(prev => ({ ...prev, reel: pct }));
        });

        if (!res || !res.secure_url || (!res.secure_url.includes("cloudinary.com") && !res.secure_url.startsWith("http"))) {
          throw new Error("Cloudinary upload failed: Valid secure video URL was not generated.");
        }

        finalUrl = res.secure_url;
        publicId = res.public_id;
        uploadedAssets.push({ public_id: res.public_id, resource_type: "video" });
      }

      if (!finalUrl || (!finalUrl.includes("cloudinary.com") && !finalUrl.startsWith("http"))) {
        throw new Error("Invalid video URL. Upload must complete to Cloudinary first.");
      }

      const hashtags = reelHashtagsInput
        ? reelHashtagsInput.split(" ").filter(t => t.trim()).map(t => t.startsWith("#") ? t : `#${t}`)
        : [];
      const technologyStack = reelTechStack.length > 0 ? reelTechStack : ["Core Systems"];

      const reelPayload = {
        id: "reel_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        title: reelTitle.trim(),
        description: reelDesc.trim(),
        videoUrl: finalUrl,
        cloudinaryPublicId: publicId || undefined,
        projectId: relatedProjectId || undefined,
        hashtags,
        technologyStack,
        techStack: technologyStack,
        category: category || "Computer Science",
        thumbnail: thumbnailUrl || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60",
        creatorId: userId,
        ownerId: userId,
        creatorName: userName,
        ownerName: userName,
        creatorAvatar: userAvatar,
        likes: [],
        saves: [],
        comments: [],
        sharesCount: 0,
        createdDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setUploadStatusMessage("Saving Reel spec to Cloud Firestore...");

      // 1. Save to Cloud Firestore '/reels' collection
      const { saveReelToFirestore } = await import("../lib/firebase");
      await saveReelToFirestore(reelPayload);

      // 2. Local REST server mirror if running locally
      try {
        await fetch("/api/reels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "authorization": userId
          },
          body: JSON.stringify(reelPayload)
        });
      } catch (err) {
        console.debug("Local REST server sync skipped.");
      }

      alert("🎉 Engineering Spec Reel published successfully!");

      // Reset Reel Form state after successful publication
      setReelTitle("");
      setReelDesc("");
      setReelHashtagsInput("");
      setReelTechStack([]);
      setReelVideoFile(null);
      if (reelVideoUrl && reelVideoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(reelVideoUrl);
      }
      setReelVideoUrl("");
      setRelatedProjectId("");
      setUploadProgressState(prev => ({ ...prev, reel: 0 }));

      onPublishSuccess();
    } catch (e: any) {
      console.error("[Reel Upload Error]:", e);
      if (uploadedAssets.length > 0) {
        await rollbackUploadedAssets(uploadedAssets);
      }
      alert(`Publishing failed: ${e?.message || "Failed to upload video to Cloudinary. Please try again."}`);
    } finally {
      setIsSubmitting(false);
      setUploadStatusMessage("");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 text-zinc-900 dark:text-zinc-100">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <button 
            onClick={onBack} 
            className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors mb-1 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>🚀</span> Blueprint Workspace Center
          </h2>
        </div>

        {/* Dual Tab Switcher */}
        <div className="flex glass-panel p-1.5 rounded-[18px] self-stretch md:self-auto shadow-2xs">
          <button
            onClick={() => setUploadType("project")}
            className={`flex-1 md:flex-none px-4 py-2 rounded-[14px] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              uploadType === "project" 
                ? "clay-btn text-white" 
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-black/50"
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            Upload Project
          </button>
          <button
            onClick={() => setUploadType("reel")}
            className={`flex-1 md:flex-none px-4 py-2 rounded-[14px] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              uploadType === "reel" 
                ? "clay-btn text-white" 
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-black/50"
            }`}
          >
            <Video className="w-4 h-4" />
            Upload Reel
          </button>
        </div>
      </div>

      {uploadType === "project" ? (
        <>
          {/* REAL-TIME 20 / 20 REQUIRED ITEMS PROGRESS BANNER */}
          <div className="clay-card p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <span className="text-xl">📋</span>
                  <span>{completedCount} / 20 Required Items Completed</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5">
                  {completedCount === 20 
                    ? "🎉 All mandatory requirements completed! Your project is ready to publish to Firebase Storage & Firestore." 
                    : `Please complete all ${20 - completedCount} remaining required item(s) below to publish your project.`}
                </p>
              </div>

              {/* Publish Action Button */}
              <button
                type="button"
                disabled={completedCount < 20 || isSubmitting}
                onClick={() => handlePublishProject(false)}
                className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md ${
                  completedCount === 20 && !isSubmitting
                    ? "clay-btn text-white animate-pulse cursor-pointer"
                    : "glass-input text-zinc-400 dark:text-zinc-500 cursor-not-allowed border-transparent"
                }`}
                title={completedCount < 20 ? `Complete all 20 required items to unlock publishing (${completedCount}/20)` : "Publish Project"}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Publish Project ({completedCount}/20)</span>
                  </>
                )}
              </button>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${(completedCount / 20) * 100}%` }}
              />
            </div>

            {/* Live Upload Status Feedback */}
            {uploadStatusMessage && isSubmitting && (
              <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center gap-2 text-xs font-bold animate-pulse">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{uploadStatusMessage}</span>
              </div>
            )}

            {/* Interactive Missing Requirements List */}
            {completedCount < 20 && (
              <div className="pt-1 space-y-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                  <BadgeAlert className="w-3.5 h-3.5" /> Missing Items ({20 - completedCount}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {missingItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveStep(item.step)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>{item.id}. {item.label} *</span>
                      <span className="text-[9px] opacity-75 font-normal">({item.step})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STEP INDICATOR TABS */}
          <div className="flex items-center justify-between overflow-x-auto gap-4 py-3 glass-panel px-6 rounded-[28px]">
            {steps.map((st, idx) => {
              const isActive = activeStep === st;
              const stepMissingCount = requirementChecklist.filter(item => item.step === st && !item.isDone).length;
              return (
                <button
                  key={st}
                  onClick={() => setActiveStep(st)}
                  className="flex items-center gap-2 shrink-0 group focus:outline-none cursor-pointer"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                    isActive 
                      ? "bg-violet-600 text-white ring-4 ring-violet-500/20" 
                      : stepMissingCount === 0 
                        ? "bg-emerald-500 text-white" 
                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                  }`}>
                    {stepMissingCount === 0 ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-bold flex items-center gap-1 ${
                    isActive ? "text-violet-600 dark:text-violet-400" : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"
                  }`}>
                    {st}
                    {stepMissingCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" title={`${stepMissingCount} missing items in ${st}`} />
                    )}
                  </span>
                  {idx < steps.length - 1 && <div className="w-4 h-px bg-zinc-200 dark:bg-zinc-800" />}
                </button>
              );
            })}
          </div>

          {/* FORM CONTENT BODY CONTAINER */}
          <div className="clay-card p-6 md:p-8 space-y-6">
            
            {/* ============================================================== */}
            {/* STEP 1: BASIC (Items 1 - 8) */}
            {/* ============================================================== */}
            {activeStep === "Basic" && (
              <div className="space-y-6">
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>1️⃣</span> Basic Project Metadata
                  </h3>
                  <p className="text-xs text-zinc-400 font-semibold">General specification overview and target department scope</p>
                </div>

                {/* 1. Project Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    1. Project Title <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Smart Campus Bus Tracking & Seat Prediction System"
                    className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white"
                  />
                </div>

                {/* 2. Brief Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    2. Brief Description <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a 2-3 sentence summary explaining the core architecture, purpose, and impact..."
                    rows={3}
                    className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* 3. Difficulty Level */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      3. Difficulty Level <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white cursor-pointer"
                    >
                      <option value="Beginner">Beginner (1st / 2nd Year)</option>
                      <option value="Intermediate">Intermediate (3rd Year)</option>
                      <option value="Advanced">Advanced (Final Year / Capstone)</option>
                      <option value="Expert">Expert (Research / Startup Prototype)</option>
                    </select>
                  </div>

                  {/* 4. Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      4. Category <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white cursor-pointer"
                    >
                      <option value="Web Development">Web Development</option>
                      <option value="Mobile App">Mobile App</option>
                      <option value="AI/ML">AI / Machine Learning</option>
                      <option value="IoT">IoT / Hardware</option>
                      <option value="Blockchain">Blockchain / Web3</option>
                      <option value="Cyber Security">Cyber Security</option>
                      <option value="Cloud/DevOps">Cloud / DevOps</option>
                      <option value="Data Engineering">Data Engineering</option>
                      <option value="Hardware/Robotics">Hardware / Robotics</option>
                      <option value="General Engineering">General Engineering</option>
                    </select>
                  </div>

                  {/* 5. Branch / Department */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      5. Branch / Department <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering"
                      className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white"
                    />
                  </div>

                  {/* 6. Semester */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      6. Semester <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      placeholder="e.g. Semester 6 / Final Year"
                      className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white"
                    />
                  </div>

                  {/* 7. Duration */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      7. Duration (Days) <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : "")}
                      placeholder="45"
                      className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white"
                    />
                  </div>

                  {/* 8. Team Size */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      8. Team Size <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value ? Number(e.target.value) : "")}
                      placeholder="4"
                      className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* STEP 2: DETAILS (Items 10, 11, 12) */}
            {/* ============================================================== */}
            {activeStep === "Details" && (
              <div className="space-y-6">
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>2️⃣</span> Problem Statement & Proposed Solution
                  </h3>
                  <p className="text-xs text-zinc-400 font-semibold">Define academic problem context, concrete objectives, and engineering approach</p>
                </div>

                {/* 10. Problem Statement */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    10. Problem Statement <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea
                    value={problemStatement}
                    onChange={(e) => setProblemStatement(e.target.value)}
                    placeholder="Describe the core problem, current pain points, and why existing manual or legacy systems fail..."
                    rows={4}
                    className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white cursor-pointer"
                  />
                </div>

                {/* 11. Objectives */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    11. Objectives <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    placeholder="1. Build real-time IoT location tracking API&#10;2. Implement machine learning seat availability predictor&#10;3. Design student mobile interface..."
                    rows={4}
                    className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white cursor-pointer"
                  />
                </div>

                {/* 12. Proposed Solution */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    12. Proposed Solution <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea
                    value={proposedSolution}
                    onChange={(e) => setProposedSolution(e.target.value)}
                    placeholder="Detail the technical architecture and how your proposed system resolves the problem statement..."
                    rows={4}
                    className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* STEP 3: TECHNICAL (Items 9, 13, 14, 15, 16) */}
            {/* ============================================================== */}
            {activeStep === "Technical" && (
              <div className="space-y-6">
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>3️⃣</span> System Architecture & Core Stack
                  </h3>
                  <p className="text-xs text-zinc-400 font-semibold">Select technology stack chips, directory trees, REST APIs, and database models</p>
                </div>

                {/* 9. SEARCHABLE MULTI-SELECT CORE TECH STACK SELECTOR */}
                <div className="space-y-3 glass-panel p-5 rounded-[28px]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                      9. Technologies / Core Stack <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                      {technologies.length} selected
                    </span>
                  </div>

                  {/* Selected Tech Chips */}
                  <div className="flex flex-wrap gap-1.5 p-3 glass-input min-h-[48px] items-center">
                    {technologies.length === 0 ? (
                      <span className="text-xs text-zinc-400 font-medium italic">No technologies selected yet. Choose from chips below or type a custom name.</span>
                    ) : (
                      technologies.map((t) => (
                        <span 
                          key={t}
                          className="px-3 py-1.5 rounded-xl bg-violet-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{t}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleTech(t)}
                            className="hover:bg-white/20 p-0.5 rounded-full transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Search Bar & Category Filter Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search technology (e.g. React, Python, Docker, ESP32)..."
                        value={techSearchQuery}
                        onChange={(e) => setTechSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs glass-input text-zinc-900 dark:text-white font-bold"
                      />
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {["All", ...Object.keys(TECH_CATEGORIES)].map(catName => (
                        <button
                          key={catName}
                          type="button"
                          onClick={() => setSelectedTechCategory(catName)}
                          className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 border transition-all cursor-pointer ${
                            selectedTechCategory === catName
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100"
                          }`}
                        >
                          {catName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Predefined Tech Chips Grid */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 glass-input border-transparent">
                    {filteredPredefinedTech.map((t) => {
                      const isSelected = technologies.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleToggleTech(t)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                              : "bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-violet-400"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                          <span>{t}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Tech Input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add custom technology (e.g. YOLOv8, Y.js)..."
                      value={customTechInput}
                      onChange={(e) => setCustomTechInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomTech();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 glass-input text-xs font-semibold text-zinc-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTech}
                      className="px-4 py-2 clay-btn text-xs font-bold"
                    >
                      Add Custom
                    </button>
                  </div>
                </div>

                {/* 13. Folder Structure */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    13. Folder Structure <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea
                    value={folderStructure}
                    onChange={(e) => setFolderStructure(e.target.value)}
                    placeholder="Rendered directory tree layout..."
                    rows={4}
                    className="w-full px-4 py-3 glass-input text-xs font-mono text-zinc-900 dark:text-white"
                  />
                </div>

                {/* 14. API Structure */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    14. API Paths Structure Summary <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea
                    value={apiStructure}
                    onChange={(e) => setApiStructure(e.target.value)}
                    placeholder="GET /api/buses - Fetch active bus fleet locations&#10;POST /api/predict - Infer seat availability"
                    rows={4}
                    className="w-full px-4 py-3 glass-input text-xs font-mono text-zinc-900 dark:text-white"
                  />
                </div>

                {/* 15. Database Design */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    15. Database Design <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea
                    value={databaseDesign}
                    onChange={(e) => setDatabaseDesign(e.target.value)}
                    placeholder="Describe collections/tables, properties, keys, and relational schema mappings..."
                    rows={4}
                    className="w-full px-4 py-3 glass-input text-xs font-mono text-zinc-900 dark:text-white"
                  />
                </div>

                {/* 16. Future Scope Expansion */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    16. Future Scope Expansion <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <textarea
                    value={futureScope}
                    onChange={(e) => setFutureScope(e.target.value)}
                    placeholder="Outline potential future feature expansions, IoT hardware iterations, or ML model scalability..."
                    rows={3}
                    className="w-full px-4 py-3 glass-input text-xs font-semibold text-zinc-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* STEP 4: MEDIA & LINKS (Items 17, 18, 19, 20) */}
            {/* ============================================================== */}
            {activeStep === "Media & Links" && (
              <div className="space-y-6">
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>4️⃣</span> Media Uploads & Repository Links
                  </h3>
                  <p className="text-xs text-zinc-400 font-semibold">Upload thumbnail image, demo video file, workspace ZIP/PDF, and GitHub repository URL</p>
                </div>

                {/* 17. PROJECT THUMBNAIL IMAGE */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    17. Project Thumbnail <span className="text-rose-500 font-bold">*</span> (JPG, PNG, WEBP)
                  </label>

                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 text-center glass-panel hover:border-violet-500 transition-all">
                    {thumbnailUrl ? (
                      <div className="space-y-3">
                        <img 
                          src={thumbnailUrl} 
                          alt="Thumbnail Preview" 
                          className="max-h-48 rounded-2xl mx-auto object-cover border border-zinc-200 dark:border-zinc-800 shadow-sm"
                        />
                        <div className="flex justify-center gap-2">
                          <label className="px-4 py-2 clay-btn font-bold text-xs cursor-pointer inline-block">
                            <span>Replace Thumbnail</span>
                            <input type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer block space-y-2">
                        <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 flex items-center justify-center mx-auto">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Click to select Project Thumbnail image from your computer
                        </p>
                        <p className="text-[10px] text-zinc-400 font-semibold">PNG, JPG, JPEG, WEBP</p>
                        <input type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
                      </label>
                    )}

                    {uploadProgressState.thumbnail > 0 && uploadProgressState.thumbnail < 100 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-violet-600 dark:text-violet-400">
                          <span>Uploading image to Cloudinary...</span>
                          <span>{uploadProgressState.thumbnail}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-600 transition-all duration-150" style={{ width: `${uploadProgressState.thumbnail}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 18. DEMO VIDEO FILE */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    18. Project Demo Video <span className="text-rose-500 font-bold">*</span> (MP4, WEBM, MOV)
                  </label>

                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 text-center glass-panel hover:border-violet-500 transition-all">
                    {demoVideoUrl ? (
                      <div className="space-y-3">
                        <video 
                          controls 
                          src={demoVideoUrl} 
                          className="max-h-56 rounded-2xl mx-auto border border-zinc-200 dark:border-zinc-800 shadow-sm"
                        />
                        <div className="flex justify-center gap-2">
                          <label className="px-4 py-2 clay-btn font-bold text-xs cursor-pointer inline-block">
                            <span>Replace Demo Video</span>
                            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoSelect} className="hidden" />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer block space-y-2">
                        <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 flex items-center justify-center mx-auto">
                          <Video className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Click to select Demo Video file from local computer
                        </p>
                        <p className="text-[10px] text-zinc-400 font-semibold">MP4, WEBM, MOV (Max 100MB)</p>
                        <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoSelect} className="hidden" />
                      </label>
                    )}

                    {uploadProgressState.video > 0 && uploadProgressState.video < 100 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-violet-600 dark:text-violet-400">
                          <span>Uploading demo video to Cloudinary...</span>
                          <span>{uploadProgressState.video}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-600 transition-all duration-150" style={{ width: `${uploadProgressState.video}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 19. WORKSPACE ZIP OR PROJECT REPORT PDF */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    19. Workspace ZIP OR Project Report PDF <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <p className="text-[11px] text-zinc-400 font-semibold">
                    * At least ONE file (.zip workspace OR .pdf report) is mandatory to publish. Max 50MB.
                  </p>

                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 text-center glass-panel hover:border-violet-500 transition-all">
                    {workspaceFile || attachmentUrl ? (
                      <div className="space-y-3 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                            {workspaceFileType === "pdf" ? <FileText className="w-5 h-5" /> : <FolderGit2 className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">
                              {workspaceFile ? workspaceFile.name : "workspace_file"}
                            </p>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                              {workspaceFileType.toUpperCase()} Document
                            </span>
                          </div>
                        </div>

                        <label className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 font-bold text-[11px] rounded-xl cursor-pointer transition-all shrink-0">
                          <span>Change</span>
                          <input type="file" accept=".zip,.pdf" onChange={handleWorkspaceFileSelect} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer block space-y-2">
                        <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 flex items-center justify-center mx-auto">
                          <FileCode className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Click to select Workspace ZIP or Project Report PDF file
                        </p>
                        <p className="text-[10px] text-zinc-400 font-semibold">.ZIP (Full source code) OR .PDF (Documentation report)</p>
                        <input type="file" accept=".zip,.pdf" onChange={handleWorkspaceFileSelect} className="hidden" />
                      </label>
                    )}

                    {uploadProgressState.workspace > 0 && uploadProgressState.workspace < 100 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-violet-600 dark:text-violet-400">
                          <span>Uploading workspace files to Cloudinary...</span>
                          <span>{uploadProgressState.workspace}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-600 transition-all duration-150" style={{ width: `${uploadProgressState.workspace}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 20. GITHUB REPOSITORY LINK */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    20. GitHub Repository Link <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="url"
                      value={githubLink}
                      onChange={(e) => setGithubLink(e.target.value)}
                      placeholder="https://github.com/username/project-repository"
                      className="w-full pl-10 pr-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white"
                    />
                  </div>
                  {githubLink && !isValidGithubUrl(githubLink) && (
                    <p className="text-[10px] text-rose-500 font-bold">
                      ⚠️ Please provide a valid GitHub repository URL starting with https://github.com/
                    </p>
                  )}
                  {isValidGithubUrl(githubLink) && (
                    <div className="pt-1">
                      <a 
                        href={githubLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View on GitHub</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* STEP 5: SETTINGS & PUBLISH */}
            {/* ============================================================== */}
            {activeStep === "Settings" && (
              <div className="space-y-6">
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>5️⃣</span> Project Access & Visibility Controls
                  </h3>
                  <p className="text-xs text-zinc-400 font-semibold">Configure public permissions, download flags, and fork options</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Visibility Scope
                    </label>
                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as any)}
                      className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white cursor-pointer"
                    >
                      <option value="Public">Public (Visible to all students & recruiters)</option>
                      <option value="Private">Private (Only you can access)</option>
                      <option value="Only Followers">Only Followers</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 glass-panel rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Allow Direct File Downloads</h4>
                      <p className="text-[10px] text-zinc-400 font-semibold">Permit visitors to download attached workspace ZIP / report PDF files</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={allowDownload} 
                      onChange={(e) => setAllowDownload(e.target.checked)}
                      className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 glass-panel rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Allow Project Forking</h4>
                      <p className="text-[10px] text-zinc-400 font-semibold">Allow other students to fork a copy of this blueprint to their workspace</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={allowFork} 
                      onChange={(e) => setAllowFork(e.target.checked)}
                      className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* UPLOAD STATUS BANNER */}
            {isSubmitting && uploadStatusMessage && (
              <div className="p-4 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-2xl flex items-center gap-3 animate-pulse mb-4">
                <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="text-xs font-bold text-violet-900 dark:text-violet-200">{uploadStatusMessage}</span>
              </div>
            )}

            {/* REQUIRED FIELDS FOOTNOTE & STEP NAVIGATOR FOOTER */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs font-bold text-rose-500">
                * Required fields ({completedCount} / 20 items completed)
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {activeStep !== "Basic" && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Previous
                  </button>
                )}

                {activeStep !== "Settings" ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-violet-600/15 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={completedCount < 20 || isSubmitting}
                    onClick={() => handlePublishProject(false)}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md ${
                      completedCount === 20 && !isSubmitting
                        ? "clay-btn text-white cursor-pointer"
                        : "glass-input text-zinc-400 dark:text-zinc-500 cursor-not-allowed border-transparent"
                    }`}
                  >
                    {isSubmitting ? "Uploading to Cloudinary..." : `Publish Project (${completedCount}/20)`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* REEL FORM UPLOAD SECTION */
        <div className="clay-card p-6 md:p-8 space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-violet-500" />
              Upload Engineering Spec Reel
            </h3>
            <p className="text-xs text-zinc-400 font-semibold">Share short video demonstrations of your physical hardware or software models</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Reel Title <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={reelTitle}
                onChange={(e) => setReelTitle(e.target.value)}
                placeholder="ESP32 Live GPS Map Synchronizer Demo"
                className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Reel Video File <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 text-center glass-panel hover:border-violet-500 transition-all">
                {reelVideoUrl ? (
                  <div className="space-y-2">
                    <video controls src={reelVideoUrl} className="max-h-48 rounded-xl mx-auto" />
                    <label className="px-4 py-2 clay-btn text-white font-bold text-xs cursor-pointer inline-block">
                      <span>Change Reel Video</span>
                      <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (file.size > 50 * 1024 * 1024) {
                            return alert("Video must be 50MB or smaller.");
                          }
                          setReelVideoFile(file);
                          setReelVideoUrl(URL.createObjectURL(file));
                        }
                      }} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer block space-y-2">
                    <Video className="w-8 h-8 text-violet-500 mx-auto" />
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Select Reel Video file from local computer</p>
                    <p className="text-[10px] text-zinc-400 font-semibold mt-1">MP4, WEBM, MOV (Max 50MB)</p>
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.size > 50 * 1024 * 1024) {
                          return alert("Video must be 50MB or smaller.");
                        }
                        setReelVideoFile(file);
                        setReelVideoUrl(URL.createObjectURL(file));
                      }
                    }} className="hidden" />
                  </label>
                )}
                {uploadProgressState.reel > 0 && uploadProgressState.reel < 100 && (
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-violet-600 dark:text-violet-400">
                      <span>Uploading reel to Cloudinary...</span>
                      <span>{uploadProgressState.reel}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-600 transition-all duration-150" style={{ width: `${uploadProgressState.reel}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Caption & Description
              </label>
              <textarea
                value={reelDesc}
                onChange={(e) => setReelDesc(e.target.value)}
                placeholder="Explain the problem -> solution -> results of this spec..."
                rows={3}
                className="w-full px-4 py-3 glass-input text-xs font-semibold text-zinc-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Hashtags (Space Separated)
              </label>
              <input
                type="text"
                value={reelHashtagsInput}
                onChange={(e) => setReelHashtagsInput(e.target.value)}
                placeholder="#ESP32 #IoT #React #Hardware"
                className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Core Technologies Displayed
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {reelTechStack.map((tech) => (
                  <span key={tech} className="px-2.5 py-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold rounded-lg flex items-center gap-1">
                    {tech}
                    <button type="button" onClick={() => setReelTechStack(reelTechStack.filter(t => t !== tech))} className="hover:text-rose-500 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="customReelTechInput"
                  placeholder="e.g. ESP32, Socket.io, React"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !reelTechStack.includes(val)) {
                        setReelTechStack([...reelTechStack, val]);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2.5 glass-input text-xs font-bold text-zinc-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.getElementById("customReelTechInput") as HTMLInputElement;
                    if (inputEl && inputEl.value.trim()) {
                      const val = inputEl.value.trim();
                      if (!reelTechStack.includes(val)) {
                        setReelTechStack([...reelTechStack, val]);
                        inputEl.value = "";
                      }
                    }
                  }}
                  className="px-4 py-2.5 clay-btn text-white text-xs font-bold cursor-pointer"
                >
                  Add Tech
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Connect to Related Project Blueprint</span>
                {isProjectsLoading ? (
                  <span className="text-[10px] text-violet-500 font-normal animate-pulse">Loading blueprints...</span>
                ) : userProjectsList.length === 0 ? (
                  <span className="text-[10px] text-zinc-400 font-normal">No user projects uploaded yet</span>
                ) : (
                  <span className="text-[10px] text-emerald-500 font-bold">{userProjectsList.length} project(s) available</span>
                )}
              </label>
              <select
                value={relatedProjectId}
                onChange={(e) => setRelatedProjectId(e.target.value)}
                className="w-full px-4 py-3 glass-input text-xs font-bold text-zinc-900 dark:text-white cursor-pointer"
              >
                <option value="">None (Independent Reel)</option>
                {userProjectsList.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              {userProjectsList.length === 0 && !isProjectsLoading && (
                <p className="text-[11px] text-zinc-400 font-medium italic">
                  Upload a project blueprint first to connect it to an Engineering Reel.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={isSubmitting || !reelTitle.trim() || (!reelVideoFile && !reelVideoUrl)}
              onClick={handlePublishReel}
              className="w-full py-3 clay-btn disabled:opacity-50 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? "Publishing Engineering Reel..." : "Publish Engineering Reel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
