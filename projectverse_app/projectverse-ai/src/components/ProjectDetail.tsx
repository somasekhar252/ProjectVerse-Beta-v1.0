import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, 
  MessageSquare, 
  Bookmark, 
  Share2, 
  Github, 
  Calendar, 
  Users, 
  ArrowLeft, 
  GitFork, 
  Sparkles, 
  Send, 
  CheckCircle, 
  Bot, 
  ChevronRight, 
  AlertCircle, 
  Edit,
  Video,
  FileText,
  FolderGit2,
  Download,
  Copy,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Project, User, Comment, Message, sanitizeProject } from "../types";
import { robustFetch } from "../utils/api";
import { likeProjectInSupabase, addCommentToProjectInSupabase } from "../lib/supabaseService";
import { getOptimizedImageUrl, getOptimizedVideoUrl } from "../utils/mediaOptimization";
import { firebaseDb } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import CreatorHeader from "./social/CreatorHeader";
import { toggleProjectLike, createNotification } from "../lib/socialService";

interface ProjectDetailProps {
  projectId: string;
  currentUser: User | null;
  onBack: () => void;
  onEdit: (id: string) => void;
  onFork: (id: string) => void;
  onNavigateProfile?: (userId: string) => void;
}

export default function ProjectDetail({
  projectId,
  currentUser,
  onBack,
  onEdit,
  onFork,
  onNavigateProfile
}: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeTab, setActiveTab] = useState<"Overview" | "Guide" | "Architecture" | "Timeline" | "Discussion">("Overview");
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isForking, setIsForking] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopyText = (text: string, sectionKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // AI Mentor Chat state
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { id: "init", text: "Hey! I am your Project AI Mentor. Ask me any question about the modules, folder structure, code, database models, or viva interview questions for this project!", sender: "ai", timestamp: new Date().toISOString() }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

  const fetchProject = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser) {
        headers["authorization"] = currentUser.id;
      }
      
      let pData: any = null;
      let cData: any[] = [];

      // 1. Attempt Express REST API first
      try {
        const pRes = await robustFetch(`/api/projects/${projectId}`, { headers, silent: true, retries: 1 } as any);
        if (pRes.ok) {
          pData = await pRes.json();
        }
      } catch (err) {
        console.debug("Express API fetch project offline, falling back to Firestore.");
      }

      // 2. If Express server returns 404 or fails, fetch directly from Firestore!
      if (!pData) {
        try {
          const docRef = doc(firebaseDb, "projects", projectId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            pData = { ...snap.data(), id: snap.id };
          }
        } catch (fsErr) {
          console.warn("Firestore fetch project fallback warning:", fsErr);
        }
      }

      // 3. Fetch comments from Express REST API
      try {
        const cRes = await robustFetch(`/api/projects/${projectId}/comments`, { silent: true, retries: 1 } as any);
        if (cRes.ok) {
          cData = await cRes.json();
        }
      } catch (cErr) {
        console.debug("Express API comments offline.");
      }

      setProject(pData ? sanitizeProject(pData) : null);
      setComments(Array.isArray(cData) ? cData : []);
    } catch (e: any) {
      console.error("Error fetching project details:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser) return alert("Please sign in to like this project.");
    if (!project) return;
    setIsLiking(true);
    
    try {
      const { liked, count } = await toggleProjectLike(
        project.id, 
        project.title, 
        currentUser, 
        project.ownerId
      );
      
      let updatedLikes = [...(project.likes || [])];
      if (liked && !updatedLikes.includes(currentUser.id)) {
        updatedLikes.push(currentUser.id);
      } else if (!liked) {
        updatedLikes = updatedLikes.filter(id => id !== currentUser.id);
      }

      setProject({ ...project, likes: updatedLikes });
    } catch (err) {
      console.warn("Firestore project like error:", err);
    }

    try {
      await likeProjectInSupabase(project.id, currentUser.id);
    } catch (err) {
      console.warn("Supabase project like sync error:", err);
    }

    try {
      await fetch(`/api/projects/${project.id}/like`, {
        method: "POST",
        headers: { "authorization": currentUser.id }
      });
    } catch (e) {
      console.error("Express like operation warning:", e);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return alert("Please sign in to bookmark this project.");
    if (!project) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/save`, {
        method: "POST",
        headers: { "authorization": currentUser.id }
      });
      if (res.ok) {
        const data = await res.json();
        setProject({ ...project, saves: data.saves });
      }
    } catch (e) {
      console.error("Save operation failed:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return alert("Please sign in to comment.");
    if (!newComment.trim() || !project) return;

    try {
      await addCommentToProjectInSupabase(project.id);
    } catch (err) {
      console.warn("Supabase project comment sync error:", err);
    }

    try {
      const res = await fetch(`/api/projects/${project.id}/comments`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "authorization": currentUser.id 
        },
        body: JSON.stringify({ text: newComment })
      });
      if (res.ok) {
        const data = await res.json();
        setComments([...comments, data.comment]);
        setNewComment("");
        setProject({ ...project, commentsCount: project.commentsCount + 1 });

        if (project.ownerId && project.ownerId !== currentUser.id) {
          await createNotification({
            type: "project_comment",
            actorId: currentUser.id,
            actorName: currentUser.name || "Student Innovator",
            actorAvatar: currentUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.id}`,
            recipientId: project.ownerId,
            targetId: project.id,
            targetTitle: project.title,
            text: `commented on your project "${project.title}"`,
            createdAt: new Date().toISOString(),
            read: false
          });
        }
      }
    } catch (e) {
      console.error("Error posting comment:", e);
    }
  };

  const handleForkProject = async () => {
    if (!currentUser) return alert("Please sign in to fork this project.");
    if (!project) return;
    if (isForking) return;
    
    setIsForking(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/fork`, {
        method: "POST",
        headers: { "authorization": currentUser.id }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Successfully forked! Redirecting to your forked project...`);
        onFork(data.project.id);
      }
    } catch (e) {
      console.error("Fork operation failed:", e);
    } finally {
      setIsForking(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !project) return;

    const userMsg: Message = {
      id: "user_" + Date.now(),
      text: chatInput,
      sender: "user",
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/gemini/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          messages: [...chatMessages, userMsg],
          projectDetails: {
            title: project.title,
            description: project.description,
            category: project.category,
            difficulty: project.difficulty,
            technologyStack: project.technologyStack,
            problemStatement: project.problemStatement,
            objectives: project.objectives,
            modules: project.modules
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, {
          id: "ai_" + Date.now(),
          text: data.reply,
          sender: "ai",
          timestamp: new Date().toISOString()
        }]);
      } else {
        throw new Error("Failed to contact AI mentor.");
      }
    } catch (e) {
      setChatMessages(prev => [...prev, {
        id: "ai_err_" + Date.now(),
        text: "My diagnostic pipelines are temporarily congested. However, I highly recommend verifying your database connector lines and CORS properties before compiling!",
        sender: "ai",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-bold dark:text-gray-400 animate-pulse">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-10 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-extrabold text-lg text-gray-800 dark:text-white">Project not found</h3>
        <p className="text-sm text-gray-500">The project might have been removed or visibility was restricted server-side.</p>
        <button onClick={onBack} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs">
          Go Back
        </button>
      </div>
    );
  }

  const isOwner = currentUser && project.ownerId === currentUser.id;
  const userLiked = currentUser && project.likes.includes(currentUser.id);
  const userSaved = currentUser && project.saves.includes(currentUser.id);

  // Guide Steps Fallback if not specified
  const guideSteps = [
    { title: "Step 1: Setup & Initialization", desc: "Initialize your repository environment, configure the build scripts inside package.json, and install core dependency frameworks." },
    { title: "Step 2: Core Server Backend Scaffolding", desc: "Build out the foundational routing APIs, set up the Express middleware stack, and configure process environment structures." },
    { title: "Step 3: Database & Models Orchestration", desc: "Configure relational or document indexes, build schemas matching user parameters, and seed diagnostic datasets." },
    { title: "Step 4: Primary Features Implementation", desc: "Implement core business operations, wire up data processing modules, and optimize logic execution bounds." },
    { title: "Step 5: AI & Real-Time Sync Pipeline", desc: "Integrate context pipelines, hook up live WebSockets telemetry, or apply SpaCy parsing configurations." },
    { title: "Step 6: Frontend Client Integration", desc: "Create interactive layout cards, structure routing tabs, and finalize UI micro-interactions using Tailwind." }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Back button & Action controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-white text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to feed
        </button>

        <div className="flex items-center gap-2">
          {isOwner ? (
            <button
              onClick={() => onEdit(project.id)}
              className="px-4 py-2 glass-panel text-violet-600 dark:text-violet-400 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 hover:bg-white/50 dark:hover:bg-black/50"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Project
            </button>
          ) : (
            <button
              onClick={handleForkProject}
              disabled={isForking}
              className="px-4 py-2 clay-btn font-extrabold text-xs flex items-center gap-2 disabled:opacity-50"
            >
              <GitFork className="w-3.5 h-3.5" />
              {isForking ? "Forking..." : "Fork Project"}
            </button>
          )}
        </div>
      </div>

      {/* Main Title Banner & Creator Header */}
      <div className="space-y-4 p-5 glass-panel rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
        <CreatorHeader
          creatorId={project.ownerId || "usr_default"}
          creatorName={project.ownerName || "Student Innovator"}
          currentUser={currentUser}
          onNavigateProfile={onNavigateProfile}
          size="lg"
        />

        <div className="space-y-2 pt-2 border-t border-zinc-150 dark:border-zinc-800/80">
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              {project.category}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
              {project.difficulty}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {project.branch}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
            {project.title}
          </h2>
          {project.forkedFromId && (
            <p className="text-xs text-violet-600 dark:text-violet-400 font-bold">
              (Forked from original creator {project.originalCreatorName})
            </p>
          )}
        </div>
      </div>

      {/* Header Stats Bar - Sticky style */}
      <div className="p-4 glass-panel rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 border border-zinc-100 dark:border-zinc-800">
            <Calendar className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            {project.duration} days
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 border border-zinc-100 dark:border-zinc-800">
            <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            {project.teamSize} members
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              userLiked
                ? "glass-panel text-rose-500 border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-900/20"
                : "glass-panel text-zinc-500 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-black/50"
            }`}
          >
            <Heart className={`w-4 h-4 ${userLiked ? "fill-rose-500 text-rose-500" : ""}`} />
            {project.likes.length}
          </button>

          {/* Comment */}
          <button
            onClick={() => setActiveTab("Discussion")}
            className="p-2.5 rounded-xl glass-panel text-zinc-500 dark:text-zinc-400 text-xs font-bold flex items-center gap-1.5 hover:bg-white/50 dark:hover:bg-black/50"
          >
            <MessageSquare className="w-4 h-4" />
            {project.commentsCount}
          </button>

          {/* Bookmark */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              userSaved
                ? "glass-panel text-amber-500 border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/20"
                : "glass-panel text-zinc-500 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-black/50"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${userSaved ? "fill-amber-500 text-amber-500" : ""}`} />
            {project.saves.length}
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="p-2.5 rounded-xl glass-panel text-zinc-500 dark:text-zinc-400 text-xs font-bold hover:bg-white/50 dark:hover:bg-black/50 flex items-center justify-center relative"
            title="Copy Project URL"
          >
            <Share2 className="w-4 h-4" />
            {shareSuccess && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded font-bold animate-fade-in backdrop-blur whitespace-nowrap">
                Copied!
              </span>
            )}
          </button>

          {/* GitHub Pill */}
          {project.githubLink && (
            <a
              href={project.githubLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 clay-btn text-xs font-extrabold flex items-center gap-1.5"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          )}

          {/* Workspace ZIP / Report PDF Pill */}
          {project.workspaceFileUrl && (
            <a
              href={project.workspaceFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-4 py-2.5 clay-btn text-xs font-extrabold flex items-center gap-1.5"
            >
              {project.workspaceFileType === "pdf" ? <FileText className="w-4 h-4" /> : <FolderGit2 className="w-4 h-4" />}
              <span>{project.workspaceFileType === "pdf" ? "Report PDF" : "Workspace ZIP"}</span>
            </a>
          )}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex overflow-x-auto gap-2">
        {["Overview", "Guide", "Architecture", "Timeline", "Discussion"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-5 py-3.5 text-sm font-extrabold transition-all relative ${
              activeTab === tab
                ? "text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="clay-card p-6 md:p-8">
        
        {/* PANEL: Overview */}
        {activeTab === "Overview" && (
          <div className="space-y-8">
            {/* DEMO VIDEO & MEDIA SHOWCASE */}
            <div className="space-y-4">
              {project.demoVideoUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Video className="w-4 h-4 text-violet-500" />
                      🎬 Interactive Demo Video & Walkthrough
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold uppercase">
                      Cloudinary HD Stream
                    </span>
                  </div>
                  <div className="rounded-3xl overflow-hidden bg-black border border-zinc-200 dark:border-zinc-800/80 shadow-2xl relative aspect-video">
                    <video
                      controls
                      poster={project.thumbnailUrl ? getOptimizedImageUrl(project.thumbnailUrl, 1280) : undefined}
                      src={getOptimizedVideoUrl(project.demoVideoUrl)}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : project.screenshots && project.screenshots.length > 0 ? (
                <div className="rounded-3xl overflow-hidden max-h-[450px] w-full border border-zinc-200 dark:border-zinc-800/60 shadow-lg">
                  <img 
                    src={getOptimizedImageUrl(project.screenshots[0], 1280)} 
                    alt="Project Thumbnail" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : null}
            </div>

            {/* WORKSPACE DOWNLOAD CARD */}
            {project.workspaceFileUrl && (
              <div className="p-6 glass-panel border border-violet-500/20 dark:border-violet-500/30 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-all hover:bg-white/40 dark:hover:bg-black/40">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
                    {project.workspaceFileType === "pdf" ? <FileText className="w-7 h-7" /> : <FolderGit2 className="w-7 h-7" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-zinc-900 dark:text-white">
                        {project.workspaceFileType === "pdf" ? "Project Documentation & Report (PDF)" : "Complete Workspace Source Code (.ZIP)"}
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wide">
                        Verified Asset
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Download the full project blueprint asset hosted securely on Cloudinary.
                    </p>
                  </div>
                </div>

                <a
                  href={project.workspaceFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-6 py-3.5 clay-btn text-xs font-black transition-all flex items-center gap-2 shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {project.workspaceFileType === "pdf" ? "PDF Report" : "Workspace ZIP"}</span>
                </a>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
                  📝 Problem Statement
                </h3>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-4 whitespace-pre-line">
                  {project.problemStatement || project.description}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
                  🎯 Objectives
                </h3>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                  {project.objectives || "Define clear metrics for optimization and establish base full-stack compilation targets."}
                </div>
              </div>

              {/* Comparison Existing vs Proposed */}
              {project.existingSystem && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="p-5 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 rounded-2xl space-y-2">
                    <h4 className="font-black text-rose-700 dark:text-rose-400 text-sm uppercase tracking-wider">
                      Existing System Gaps
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {project.existingSystem}
                    </p>
                  </div>
                  <div className="p-5 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 rounded-2xl space-y-2">
                    <h4 className="font-black text-emerald-700 dark:text-emerald-400 text-sm uppercase tracking-wider">
                      Proposed Solution
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {project.proposedSystem}
                    </p>
                  </div>
                </div>
              )}

              {/* Modules and Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {project.modules && project.modules.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                      📦 Key Modules
                    </h4>
                    <ul className="space-y-2">
                      {project.modules.map((m, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {project.features && project.features.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                      🚀 Key Features
                    </h4>
                    <ul className="space-y-2">
                      {project.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Technology Stack Badges */}
              <div className="space-y-2 pt-4">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                  🛠️ Technology Stack
                </h4>
                <div className="flex flex-wrap gap-2">
                  {project.technologyStack.map((tech, idx) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#171725] text-gray-700 dark:text-gray-300 text-xs font-extrabold border border-gray-100 dark:border-gray-800"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Team Section */}
              {project.teamMembers && (
                <div className="p-4 bg-gray-50/50 dark:bg-[#171725]/30 border border-gray-100 dark:border-gray-800/80 rounded-2xl space-y-1">
                  <h5 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Project Contributors
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">
                    {project.teamMembers}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PANEL: Guide */}
        {activeTab === "Guide" && (
          <div className="space-y-8">
            {/* Step by Step Guide */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                📗 Step-by-Step Implementation Guide
              </h3>
              <div className="space-y-4">
                {guideSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 p-4 hover:bg-gray-50/50 dark:hover:bg-[#171725]/20 rounded-xl transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800/40">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        {step.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monospace Directory structure */}
            {project.folderStructure && (
              <div className="space-y-2">
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  📁 Codebase Folder Structure
                </h3>
                <div className="relative group">
                  <button
                    onClick={() => handleCopyText(project.folderStructure, "folder")}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.2),0_4px_10px_rgba(0,0,0,0.4)] backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer z-10 active:scale-95"
                    title="Copy Codebase Folder Structure"
                  >
                    {copiedSection === "folder" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-extrabold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copy Structure</span>
                      </>
                    )}
                  </button>
                  <pre className="p-5 bg-[#0e0e15] text-emerald-400 font-mono text-xs rounded-2xl border border-gray-800/60 overflow-x-auto leading-relaxed shadow-inner">
                    {project.folderStructure}
                  </pre>
                </div>
              </div>
            )}

            {/* Deployment Checklist */}
            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                🚀 Deployment Checklist
              </h3>
              <div className="p-5 bg-gray-50/50 dark:bg-[#171725]/20 border border-gray-100 dark:border-gray-800/80 rounded-2xl space-y-3.5">
                {[
                  "Backend Hosting — Node Container clusters deployment",
                  "Frontend Client — Production build static asset serving optimization",
                  "Database Models Setup — Durable multi-region configurations mapping",
                  "Secrets Configuration — Binding standard API secret credentials keys",
                  "Live Telemetry Setup — Activating secure WebSockets streams port listeners"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PANEL: Architecture */}
        {activeTab === "Architecture" && (
          <div className="space-y-6">
            {project.apiStructure ? (
              <div className="space-y-3">
                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  📡 API Path Structure Summary
                </h3>
                <div className="relative group">
                  <button
                    onClick={() => handleCopyText(project.apiStructure, "api")}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.2),0_4px_10px_rgba(0,0,0,0.4)] backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer z-10 active:scale-95"
                    title="Copy API Architecture Specs"
                  >
                    {copiedSection === "api" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-indigo-400 font-extrabold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Copy API Spec</span>
                      </>
                    )}
                  </button>
                  <pre className="p-5 bg-[#0e0e15] text-indigo-300 font-mono text-xs rounded-2xl border border-gray-800/60 overflow-x-auto leading-relaxed">
                    {project.apiStructure}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 dark:bg-[#171725]/30 border border-gray-100 dark:border-gray-800 rounded-2xl">
                <p className="text-xs text-gray-500">API architecture paths have not been published for this project blueprint.</p>
              </div>
            )}

            {project.databaseDesign ? (
              <div className="space-y-3">
                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  🗄️ Database Design Schema Collections
                </h3>
                <div className="relative group">
                  <button
                    onClick={() => handleCopyText(project.databaseDesign, "db")}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.2),0_4px_10px_rgba(0,0,0,0.4)] backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer z-10 active:scale-95"
                    title="Copy Database Schema"
                  >
                    {copiedSection === "db" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-teal-400" />
                        <span className="text-teal-400 font-extrabold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-teal-400" />
                        <span>Copy Schema</span>
                      </>
                    )}
                  </button>
                  <pre className="p-5 bg-[#0e0e15] text-teal-300 font-mono text-xs rounded-2xl border border-gray-800/60 overflow-x-auto leading-relaxed">
                    {project.databaseDesign}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 dark:bg-[#171725]/30 border border-gray-100 dark:border-gray-800 rounded-2xl">
                <p className="text-xs text-gray-500">Database collection designs have not been published for this project blueprint.</p>
              </div>
            )}
          </div>
        )}

        {/* PANEL: Timeline */}
        {activeTab === "Timeline" && (
          <div className="space-y-6">
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              🗺️ Project Development Roadmap
            </h3>

            {project.roadmap && project.roadmap.length > 0 ? (
              <div className="relative pl-6 border-l border-indigo-100 dark:border-gray-800 space-y-6 pt-2">
                {project.roadmap.map((m, idx) => (
                  <div key={idx} className="relative">
                    {/* Node Circle */}
                    <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white dark:bg-[#111118] ${
                      m.done 
                        ? "border-emerald-500 text-emerald-500" 
                        : "border-indigo-500 text-indigo-500"
                    }`}>
                      {m.done && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mx-auto mt-0.5" />}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h4 className="text-sm font-extrabold text-gray-800 dark:text-white">
                          {m.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-[#171725] text-[10px] font-bold text-gray-500">
                          {m.date}
                        </span>
                      </div>
                      {m.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl">
                          {m.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 bg-gray-50/50 dark:bg-[#171725]/30 border border-gray-100 dark:border-gray-800 rounded-2xl whitespace-pre-line text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {project.timeline || "Phase 1: Initial core project scaffolding (Week 1)\nPhase 2: Complete endpoint implementation and schema seed mappings (Weeks 2-3)"}
              </div>
            )}

            {project.futureScope && (
              <div className="p-5 bg-indigo-50/30 dark:bg-[#171725]/20 border border-indigo-100/30 dark:border-indigo-950/40 rounded-2xl space-y-1.5">
                <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  Future Expansion Scope
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {project.futureScope}
                </p>
              </div>
            )}
          </div>
        )}

        {/* PANEL: Discussion (Comments & AI Mentor) */}
        {activeTab === "Discussion" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Standard Comments section */}
            <div className="space-y-6">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                💬 Community Discussion
              </h3>

              {currentUser ? (
                <form onSubmit={handlePostComment} className="flex gap-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ask a question, share suggestions..."
                    className="flex-1 px-4 py-2.5 glass-input text-xs font-semibold text-gray-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                  >
                    Post
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-[#171725]/30 border border-gray-100 dark:border-gray-800 rounded-xl text-center">
                  <p className="text-xs text-gray-500">You must be logged in to contribute to the discussion.</p>
                </div>
              )}

              <div className="space-y-4">
                {comments.length > 0 ? (
                  comments.map((c) => (
                    <div key={c.id} className="p-4 bg-gray-50/50 dark:bg-[#171725]/10 border border-gray-100/50 dark:border-gray-800/40 rounded-2xl space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-gray-800 dark:text-gray-200">{c.userName}</span>
                        <span className="text-gray-400">{new Date(c.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {c.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold">No comments posted yet</p>
                    <p className="text-[10px] text-gray-400/80">Be the first to start the discussion!</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Mentor Chat context window */}
            <div className="p-5 glass-panel rounded-3xl flex flex-col h-[400px]">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800/80">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-white flex items-center gap-1">
                    Ask Project AI Mentor
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[8px] font-bold">Context Active</span>
                  </h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Powered by Gemini AI</p>
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                {chatMessages.map((m) => (
                  <div 
                    key={m.id}
                    className={`flex gap-2 max-w-[85%] ${m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                      m.sender === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none font-semibold"
                        : "bg-white dark:bg-[#171725] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-tl-none font-medium"
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2 max-w-[85%] mr-auto items-center">
                    <div className="p-3 rounded-2xl bg-white dark:bg-[#171725] text-gray-400 border border-gray-100 dark:border-gray-800 rounded-tl-none text-xs flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Form */}
              <form onSubmit={handleSendChat} className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about modules, db schemas, bugs..."
                  className="flex-1 px-3 py-2 glass-input text-xs font-semibold text-gray-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="p-2 clay-btn transition-all flex items-center justify-center shrink-0 disabled:opacity-50 shadow"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
