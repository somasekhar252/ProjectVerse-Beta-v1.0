import React, { useState } from "react";
import { 
  Award, 
  Folder, 
  Heart, 
  Bookmark, 
  Edit, 
  LayoutGrid, 
  FileText, 
  MapPin, 
  Link as LinkIcon, 
  Plus, 
  X, 
  Globe, 
  GitFork, 
  MessageSquare, 
  Check, 
  User as UserIcon,
  Github,
  Linkedin,
  ExternalLink,
  Trash2,
  Video,
  MoreVertical,
  Send
} from "lucide-react";
import { Project, User, Reel } from "../types";
import FollowButton from "./social/FollowButton";
import CreatorNotificationButton from "./social/CreatorNotificationButton";
import UserAvatar from "./social/UserAvatar";
import AvatarManagementModal from "./social/AvatarManagementModal";
import { fetchUserFollowersCount, fetchUserFollowingCount, canMessageUser } from "../lib/socialService";
import { fetchUserFromFirestore, firebaseAuth } from "../lib/firebase";

interface UserProfileProps {
  currentUser: User | null;
  viewProfileUserId?: string | null;
  projects: Project[];
  reels?: Reel[];
  onSelectProject: (id: string) => void;
  onEditProject: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onDeleteReel?: (id: string) => void;
  onSelectReel?: (reel: Reel) => void;
  onUpdateUser?: (user: User) => void;
  onOpenDM?: (userId: string) => void;
}

// Helper to generate a clean gradient based on project index/category
const getProjectGradient = (category: string, index: number) => {
  const gradients = [
    "from-pink-500 via-purple-600 to-indigo-700",
    "from-violet-600 to-blue-600",
    "from-emerald-500 to-teal-700",
    "from-fuchsia-600 via-pink-600 to-orange-500",
    "from-cyan-500 to-blue-700",
    "from-indigo-500 via-purple-500 to-pink-500"
  ];
  const cat = category.toLowerCase();
  if (cat.includes("web")) return gradients[0];
  if (cat.includes("app") || cat.includes("mobile")) return gradients[1];
  if (cat.includes("ai") || cat.includes("machine") || cat.includes("intelligence")) return gradients[3];
  if (cat.includes("iot") || cat.includes("hardware")) return gradients[2];
  return gradients[index % gradients.length];
};

export default function UserProfile({
  currentUser,
  viewProfileUserId,
  projects,
  reels = [],
  onSelectProject,
  onEditProject,
  onDeleteProject,
  onDeleteReel,
  onSelectReel,
  onUpdateUser,
  onOpenDM
}: UserProfileProps) {
  const [activeSubTab, setActiveSubTab] = useState<"posts" | "reels" | "saved" | "drafts">("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);

  // Target User Profile Resolution
  const targetUserId = (viewProfileUserId && viewProfileUserId.trim()) ? viewProfileUserId : currentUser?.id;
  const isOwnProfile = currentUser && currentUser.id === targetUserId;

  const [targetUser, setTargetUser] = useState<User | null>(isOwnProfile ? currentUser : null);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [canMessage, setCanMessage] = useState(false);

  // Derives target user profile, counts, and chat permission status
  React.useEffect(() => {
    let isMounted = true;
    if (isOwnProfile) {
      setTargetUser(currentUser);
    } else if (targetUserId) {
      fetchUserFromFirestore(targetUserId).then(uData => {
        if (isMounted && uData) {
          setTargetUser(uData as User);
        } else if (isMounted) {
          setTargetUser({
            id: targetUserId,
            name: "Student Innovator",
            email: "",
            role: "Engineering Scholar",
            badges: ["Innovator"]
          } as User);
        }
      }).catch(err => {
        console.warn("Fetch target user profile error:", err);
      });
    }

    if (targetUserId) {
      fetchUserFollowersCount(targetUserId).then(cnt => { if (isMounted) setFollowersCount(cnt); });
      fetchUserFollowingCount(targetUserId).then(cnt => { if (isMounted) setFollowingCount(cnt); });
      if (currentUser && currentUser.id && currentUser.id !== targetUserId) {
        canMessageUser(currentUser.id, targetUserId).then(allowed => {
          if (isMounted) setCanMessage(allowed);
        });
      } else if (isMounted) {
        setCanMessage(false);
      }
    }

    return () => { isMounted = false; };
  }, [targetUserId, currentUser, isOwnProfile]);

  const displayUser = (isOwnProfile ? currentUser : targetUser) || currentUser;

  // Edit form states
  const [editName, setEditName] = useState(currentUser?.name || "");
  const [editRole, setEditRole] = useState(currentUser?.role || "Engineering Scholar");
  const [editCollege, setEditCollege] = useState(currentUser?.college || currentUser?.collegeName || "");
  const [editBranch, setEditBranch] = useState(currentUser?.branch || "");
  const [editBio, setEditBio] = useState(currentUser?.bio || "");
  const [editGithub, setEditGithub] = useState(currentUser?.github || "");
  const [editLinkedin, setEditLinkedin] = useState(currentUser?.linkedin || "");
  const [editPortfolio, setEditPortfolio] = useState(currentUser?.portfolioLink || "");
  const [editSkills, setEditSkills] = useState<string[]>(currentUser?.skills || []);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !editSkills.includes(trimmed)) {
      setEditSkills([...editSkills, trimmed]);
      setNewSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setEditSkills(editSkills.filter(s => s !== skillToRemove));
  };

  if (!currentUser) {
    return (
      <div className="clay-card p-12 text-center max-w-sm mx-auto space-y-4 my-8">
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-zinc-400">
          <UserIcon className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">Sign in to view profile</h3>
        <p className="text-xs text-zinc-500">Access your personalized developer dashboard, follower metrics, project grid, and saved blueprints.</p>
      </div>
    );
  }

  const activeUserId = targetUserId || currentUser.id;

  // Filter projects relative to active tabs & target user ID
  const publishedProjects = (projects || []).filter((p) => p && p.ownerId === activeUserId && !p.isDraft);
  const draftProjects = (projects || []).filter((p) => p && p.ownerId === activeUserId && p.isDraft);
  const savedProjects = (projects || []).filter((p) => p && p.saves?.includes(activeUserId));
  const publishedReels = (reels || []).filter((r) => r && (r.creatorId === activeUserId || r.ownerId === activeUserId));

  const postsCount = publishedProjects.length + publishedReels.length;

  const handleOpenEditModal = () => {
    setEditName(currentUser.name || "");
    setEditRole(currentUser.role || "Engineering Scholar");
    setEditCollege(currentUser.college || currentUser.collegeName || "");
    setEditBranch(currentUser.branch || "");
    setEditBio(currentUser.bio || "Building next-generation engineering specifications & blueprints. Check out my Spec Reels! 🚀");
    setEditGithub(currentUser.github || "");
    setEditLinkedin(currentUser.linkedin || "");
    setEditPortfolio(currentUser.portfolioLink || "");
    setEditSkills(currentUser.skills || []);
    setNewSkillInput("");
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    const updatedUser: User = {
      ...currentUser,
      name: editName,
      role: editRole,
      college: editCollege,
      collegeName: editCollege,
      branch: editBranch,
      bio: editBio,
      github: editGithub,
      linkedin: editLinkedin,
      portfolioLink: editPortfolio,
      skills: editSkills
    };

    if (onUpdateUser) {
      await onUpdateUser(updatedUser);
    }
    setIsSaving(false);
    setIsEditModalOpen(false);
  };

  // Instagram-style highlight circles based on User's Badges
  const highlights = ((displayUser?.badges) || ["AI Innovator", "Verified Student"]).map((b, idx) => ({
    title: b,
    icon: idx % 3 === 0 ? Award : idx % 3 === 1 ? Globe : GitFork,
    color: idx % 3 === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" : idx % 3 === 1 ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
  }));

  // Clean username handle representation
  const userHandle = (displayUser?.name || "user").toLowerCase().replace(/\s+/g, "_");
  const avatarUrl = displayUser?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayUser?.id || userHandle}`;

  return (
    <div className="max-w-3xl mx-auto pb-24 text-zinc-800 dark:text-zinc-100">
      
      {/* INSTAGRAM PROFILE HEADER */}
      <div className="px-4 py-8 md:py-12 border-b border-zinc-150 dark:border-zinc-800 space-y-6">
        
        {/* Main Details row */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center md:items-start">
          
          {/* Circular profile avatar with Instagram-style stories ring */}
          <div className="shrink-0 relative group">
            <div className="p-1 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-yellow-500 shadow-lg">
              <UserAvatar
                userId={targetUserId}
                avatarUrl={displayUser?.avatarUrl}
                name={displayUser?.name}
                size="2xl"
                isEditable={isOwnProfile}
                onClick={isOwnProfile ? () => setIsAvatarModalOpen(true) : undefined}
              />
            </div>
          </div>

          {/* Stats & Title details */}
          <div className="flex-1 space-y-4 md:space-y-5 text-center md:text-left w-full">
            
            {/* Top row: Handle name and Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-5 justify-center md:justify-start">
              <h2 className="text-xl font-light tracking-wide text-zinc-900 dark:text-white">
                @{userHandle}
              </h2>
              
              <div className="flex flex-wrap gap-2 justify-center items-center">
                {isOwnProfile ? (
                  <button
                    onClick={handleOpenEditModal}
                    className="px-6 py-1.5 glass-panel text-xs font-bold text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <FollowButton
                      targetUserId={activeUserId}
                      currentUser={currentUser}
                      size="md"
                      onFollowStateChange={() => {
                        fetchUserFollowersCount(activeUserId).then(cnt => setFollowersCount(cnt));
                        if (currentUser && currentUser.id) {
                          canMessageUser(currentUser.id, activeUserId).then(allowed => setCanMessage(allowed));
                        }
                      }}
                    />
                    <CreatorNotificationButton
                      creatorId={activeUserId}
                      currentUser={currentUser}
                      size="md"
                    />
                    {onOpenDM && canMessage && (
                      <button
                        onClick={() => onOpenDM(activeUserId)}
                        className="px-4 py-1.5 glass-panel text-xs font-extrabold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 hover:bg-violet-500/10 transition-colors cursor-pointer"
                      >
                        <Send className="w-3 h-3 rotate-[-15deg]" />
                        Message
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Middle row: Stats counters */}
            <div className="flex items-center justify-center md:justify-start gap-8 md:gap-10 border-y sm:border-y-0 py-3 sm:py-0 border-zinc-150 dark:border-zinc-800">
              <div className="text-center sm:text-left">
                <span className="font-bold text-zinc-900 dark:text-white text-base mr-1">{postsCount}</span>
                <span className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm">posts</span>
              </div>
              <div className="text-center sm:text-left">
                <span className="font-bold text-zinc-900 dark:text-white text-base mr-1">{followersCount}</span>
                <span className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm">followers</span>
              </div>
              <div className="text-center sm:text-left">
                <span className="font-bold text-zinc-900 dark:text-white text-base mr-1">{followingCount}</span>
                <span className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm">following</span>
              </div>
            </div>

            {/* Bottom block: Bio and description details */}
            <div className="text-xs text-left max-w-md mx-auto md:mx-0 space-y-1.5">
              <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                {displayUser?.name}
              </h3>
              
              {/* College and professional info */}
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                {isOwnProfile ? editRole : (displayUser?.role || "Engineering Scholar")}
              </p>
              
              {/* Branch/University with Location badge */}
              {((isOwnProfile ? editCollege || editBranch : displayUser?.collegeName || displayUser?.college || displayUser?.branch)) && (
                <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>
                    {isOwnProfile 
                      ? [editBranch, editCollege].filter(Boolean).join(" @ ")
                      : [displayUser?.branch, displayUser?.collegeName || displayUser?.college].filter(Boolean).join(" @ ")
                    }
                  </span>
                </div>
              )}

              {/* Real Bio message */}
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal whitespace-pre-line pt-1">
                {isOwnProfile 
                  ? (editBio || "No bio spec uploaded yet. Click edit profile to add your dev bio! 🚀")
                  : (displayUser?.bio || "Building next-generation engineering specifications & blueprints. Check out my Spec Reels! 🚀")
                }
              </p>

              {/* Specialized Engineering Skills Display */}
              {(displayUser?.skills && displayUser.skills.length > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {displayUser.skills.map((skill, index) => (
                    <span 
                      key={index} 
                      className="px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-[10px] font-bold text-violet-700 dark:text-violet-300 border border-violet-100/50 dark:border-violet-900/30"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Social URLs and Links */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-violet-600 dark:text-violet-400 font-bold">
                {editGithub && (
                  <a href={editGithub} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                    <Github className="w-3.5 h-3.5" />
                    <span>github</span>
                  </a>
                )}
                {editLinkedin && (
                  <a href={editLinkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                    <Linkedin className="w-3.5 h-3.5" />
                    <span>linkedin</span>
                  </a>
                )}
                {editPortfolio && (
                  <a href={editPortfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                    <span>portfolio</span>
                  </a>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* INSTAGRAM-STYLE HIGHLIGHTS BAR */}
        {highlights.length > 0 && (
          <div className="pt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-none justify-start px-2">
            {highlights.map((h, idx) => {
              const HighlightIcon = h.icon;
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="p-[2px] rounded-full border border-zinc-200 dark:border-zinc-800">
                    <div className="w-14 h-14 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 flex items-center justify-center">
                      <HighlightIcon className="w-5 h-5 text-violet-500" />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight max-w-[64px] truncate text-center">
                    {h.title}
                  </span>
                </div>
              );
            })}
            <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer" onClick={handleOpenEditModal}>
              <div className="p-[2px] rounded-full border border-transparent">
                <div className="w-14 h-14 rounded-full bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-dashed border-zinc-300 dark:border-zinc-800 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-zinc-400" />
                </div>
              </div>
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 tracking-tight text-center">
                Add Bio
              </span>
            </div>
          </div>
        )}

      </div>

      {/* INSTAGRAM TABS SECTION BAR */}
      <div className="flex justify-center border-t border-zinc-150 dark:border-zinc-800/60 pb-px">
        <div className="flex gap-12 sm:gap-16">
          
          {/* Posts / Published grid Tab */}
          <button
            onClick={() => setActiveSubTab("posts")}
            className={`py-3.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all border-t-2 -mt-[2px] ${
              activeSubTab === "posts"
                ? "text-zinc-900 dark:text-white border-zinc-900 dark:border-white"
                : "text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Published Specs</span>
            <span className="sm:hidden">Specs</span>
          </button>

          {/* Reels Tab */}
          <button
            onClick={() => setActiveSubTab("reels")}
            className={`py-3.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all border-t-2 -mt-[2px] ${
              activeSubTab === "reels"
                ? "text-zinc-900 dark:text-white border-zinc-900 dark:border-white"
                : "text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Reels</span>
          </button>

          {/* Bookmarks Tab */}
          <button
            onClick={() => setActiveSubTab("saved")}
            className={`py-3.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all border-t-2 -mt-[2px] ${
              activeSubTab === "saved"
                ? "text-zinc-900 dark:text-white border-zinc-900 dark:border-white"
                : "text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bookmarks</span>
            <span className="sm:hidden">Saved</span>
          </button>

          {/* Drafts Tab */}
          <button
            onClick={() => setActiveSubTab("drafts")}
            className={`py-3.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all border-t-2 -mt-[2px] ${
              activeSubTab === "drafts"
                ? "text-zinc-900 dark:text-white border-zinc-900 dark:border-white"
                : "text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Drafts</span>
          </button>

        </div>
      </div>

      {/* THREE-COLUMN SQUARE CARD GRID */}
      <div className="px-1 sm:px-0 pt-4">
        
        {activeSubTab === "posts" && (
          publishedProjects.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:gap-4">
              {publishedProjects.map((p, idx) => {
                const isMenuOpen = openMenuProjectId === p.id;
                return (
                  <div 
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className="aspect-square relative group overflow-visible rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 cursor-pointer shadow-sm hover:shadow"
                  >
                    {/* Procedural clean cover background representing project details */}
                    <div className={`w-full h-full bg-gradient-to-tr ${getProjectGradient(p.category, idx)} p-3 flex flex-col justify-between text-white relative rounded-xl overflow-hidden`}>
                      
                      {/* Tiny grid overlay lines for blueprint aesthetics */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40 pointer-events-none" />
                      
                      <div className="flex justify-between items-start relative z-10">
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded text-white truncate max-w-[70%]">
                          {p.category}
                        </span>

                        {/* THREE DOTS MENU BAR */}
                        {(() => {
                          const activeUid = firebaseAuth.currentUser?.uid || currentUser?.id;
                          const isItemOwner = Boolean(activeUid && p && (String(activeUid) === String(p.ownerId || p.creatorId || (p as any).userId)));
                          if (!isItemOwner) return null;
                          return (
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuProjectId(prev => prev === p.id ? null : p.id);
                                }}
                                className="p-1 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-[inset_1px_1px_2px_rgba(255,255,255,0.4),0_2px_6px_rgba(0,0,0,0.3)] transition-all cursor-pointer flex items-center justify-center active:scale-95 z-30"
                                title="Project Actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {/* CLAYMORPHIC DROPDOWN MENU BAR */}
                              {isMenuOpen && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute top-7 right-0 z-50 min-w-[140px] p-2 rounded-2xl bg-zinc-900/95 border border-white/20 shadow-[8px_8px_20px_rgba(0,0,0,0.7),-4px_-4px_12px_rgba(255,255,255,0.1)] backdrop-blur-xl flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150"
                                >
                                  {/* CLAYMORPHIC EDIT OPTION */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuProjectId(null);
                                      onEditProject(p.id);
                                    }}
                                    className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),inset_-1.5px_-1.5px_3px_rgba(0,0,0,0.3),0_4px_12px_rgba(124,58,237,0.4)] active:scale-95 transition-all cursor-pointer"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-violet-200 shrink-0" />
                                    <span>Edit</span>
                                  </button>

                                  {/* CLAYMORPHIC DELETE OPTION */}
                                  {onDeleteProject && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuProjectId(null);
                                        onDeleteProject(p.id);
                                      }}
                                      className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),inset_-1.5px_-1.5px_3px_rgba(0,0,0,0.3),0_4px_12px_rgba(225,29,72,0.4)] active:scale-95 transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-200 shrink-0" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="relative z-10 space-y-1">
                        <h4 className="font-black text-[10px] sm:text-xs md:text-sm line-clamp-2 leading-tight tracking-tight drop-shadow-md">
                          {p.title}
                        </h4>
                        <p className="text-[7px] sm:text-[9px] font-bold text-white/80 uppercase tracking-wider block">
                          {p.branch}
                        </p>
                      </div>
                    </div>

                    {/* INSTAGRAM OVERLAY ON HOVER */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3 text-white relative z-20 rounded-xl overflow-hidden">
                      <div className="flex gap-3 sm:gap-6 text-xs sm:text-sm font-black">
                        <span className="flex items-center gap-1 sm:gap-1.5">
                          <Heart className="w-4 h-4 fill-white text-white" />
                          {p.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1 sm:gap-1.5">
                          <Bookmark className="w-4 h-4 fill-white text-white" />
                          {p.saves?.length || 0}
                        </span>
                        {p.forksCount !== undefined && p.forksCount > 0 && (
                          <span className="flex items-center gap-1 sm:gap-1.5">
                            <GitFork className="w-4 h-4" />
                            {p.forksCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="clay-card p-16 text-center text-zinc-400 dark:text-zinc-500 space-y-3">
              <Folder className="w-10 h-10 mx-auto opacity-30 text-zinc-400" />
              <p className="text-xs font-black uppercase tracking-widest">No published blueprints yet</p>
              <p className="text-[10px] text-zinc-400/80 max-w-xs mx-auto">Upload or generate specs to populate your blueprint reels feed.</p>
            </div>
          )
        )}

        {activeSubTab === "reels" && (
          publishedReels.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:gap-4">
              {publishedReels.map((r, idx) => (
                <div 
                  key={r.id}
                  onClick={() => onSelectReel && onSelectReel(r)}
                  className="aspect-[9/16] relative group overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm cursor-pointer hover:border-cyan-500/50 transition-all"
                >
                  {r.videoUrl ? (
                    <video
                      src={r.videoUrl}
                      poster={r.thumbnail}
                      className="w-full h-full object-cover opacity-80"
                      muted
                      loop
                      onMouseEnter={(e) => {
                        const p = e.currentTarget.play();
                        if (p && p.catch) p.catch(() => {});
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                  ) : (
                    <img 
                      src={r.thumbnail} 
                      alt={r.title}
                      className="w-full h-full object-cover opacity-80"
                    />
                  )}
                  
                  <div className="absolute bottom-2 left-2 right-2 text-white z-10">
                    <h4 className="font-bold text-[10px] sm:text-xs line-clamp-1">{r.title}</h4>
                    <span className="text-[8px] flex items-center gap-1 mt-1 font-semibold">
                      <Heart className="w-2.5 h-2.5" /> {r.likes?.length || 0}
                    </span>
                  </div>

                  {/* Top action bar on hover (Owner controls) */}
                  <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex flex-col gap-1.5 z-20">
                    {onDeleteReel && r.creatorId === currentUser.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteReel(r.id);
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-500/90 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg"
                        title="Delete Reel"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="clay-card p-16 text-center text-zinc-400 dark:text-zinc-500 space-y-3">
              <Video className="w-10 h-10 mx-auto opacity-30 text-zinc-400" />
              <p className="text-xs font-black uppercase tracking-widest">No reels yet</p>
              <p className="text-[10px] text-zinc-400/80 max-w-xs mx-auto">Upload engaging project videos to showcase your skills.</p>
            </div>
          )
        )}

        {activeSubTab === "saved" && (
          savedProjects.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:gap-4">
              {savedProjects.map((p, idx) => (
                <div 
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className="aspect-square relative group overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 cursor-pointer shadow-sm hover:shadow"
                >
                  <div className={`w-full h-full bg-gradient-to-tr ${getProjectGradient(p.category, idx + 4)} p-3 flex flex-col justify-between text-white relative`}>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40 pointer-events-none" />
                    <div className="flex justify-between items-start relative z-10">
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded text-white truncate max-w-[85%]">
                        {p.category}
                      </span>
                      <Bookmark className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
                    </div>

                    <div className="relative z-10 space-y-1">
                      <h4 className="font-black text-[10px] sm:text-xs md:text-sm line-clamp-2 leading-tight tracking-tight drop-shadow-md">
                        {p.title}
                      </h4>
                      <p className="text-[7px] sm:text-[9px] font-extrabold text-white/70">
                        by {p.ownerName}
                      </p>
                    </div>
                  </div>

                  {/* HOVER OVERLAY */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 sm:gap-6 text-white text-xs sm:text-sm font-black relative z-20">
                    <span className="flex items-center gap-1 sm:gap-1.5">
                      <Heart className="w-4 h-4 fill-white text-white" />
                      {p.likes?.length || 0}
                    </span>
                    <span className="flex items-center gap-1 sm:gap-1.5">
                      <Bookmark className="w-4 h-4 fill-white text-white" />
                      {p.saves?.length || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="clay-card p-16 text-center text-zinc-400 dark:text-zinc-500 space-y-3">
              <Bookmark className="w-10 h-10 mx-auto opacity-30 text-zinc-400" />
              <p className="text-xs font-black uppercase tracking-widest">No saved bookmarks yet</p>
              <p className="text-[10px] text-zinc-400/80 max-w-xs mx-auto">Explore and bookmark student spec designs to display them here.</p>
            </div>
          )
        )}

        {activeSubTab === "drafts" && (
          draftProjects.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:gap-4">
              {draftProjects.map((p, idx) => (
                <div 
                  key={p.id}
                  className="aspect-square relative group overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 shadow-sm"
                >
                  <div className="w-full h-full p-3 flex flex-col justify-between relative">
                    <div className="flex justify-between items-start">
                      <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 dark:text-zinc-400 truncate max-w-[85%]">
                        Draft Spec
                      </span>
                      <FileText className="w-4 h-4 text-zinc-400" />
                    </div>

                    <div className="space-y-1 text-left">
                      <h4 className="font-extrabold text-[10px] sm:text-xs md:text-sm text-zinc-900 dark:text-white line-clamp-2 leading-tight">
                        {p.title}
                      </h4>
                      <p className="text-[8px] text-zinc-400 font-bold truncate">
                        Last edited draft
                      </p>
                    </div>

                    <div className="pt-2 flex gap-1.5">
                      <button
                        onClick={() => onEditProject(p.id)}
                        className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-[9px] sm:text-xs uppercase rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      {onDeleteProject && (
                        <button
                          onClick={() => onDeleteProject(p.id)}
                          className="px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] sm:text-xs rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                          title="Delete Draft"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="clay-card p-16 text-center text-zinc-400 dark:text-zinc-500 space-y-3">
              <FileText className="w-10 h-10 mx-auto opacity-30 text-zinc-400" />
              <p className="text-xs font-black uppercase tracking-widest">No drafts found</p>
              <p className="text-[10px] text-zinc-400/80 max-w-xs mx-auto">Drafts saved in the upload tab will be securely stored here.</p>
            </div>
          )
        )}

      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="clay-card w-full max-w-md p-6 relative my-8">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 text-left">
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Edit className="w-4 h-4 text-violet-500" />
                Edit Developer Profile
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold leading-none mt-1">
                Customize your bio details as seen on your student dev feed.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Full Name</label>
                <input 
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input text-xs font-semibold text-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Professional Role</label>
                  <input 
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    placeholder="e.g. Scholar Dev, UI designer"
                    className="w-full px-3 py-2 glass-input text-xs font-semibold text-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Branch</label>
                  <input 
                    type="text"
                    value={editBranch}
                    onChange={(e) => setEditBranch(e.target.value)}
                    placeholder="e.g. CSE, ECE"
                    className="w-full px-3 py-2 glass-input text-xs font-semibold text-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">College/University</label>
                <input 
                  type="text"
                  value={editCollege}
                  onChange={(e) => setEditCollege(e.target.value)}
                  placeholder="e.g. IIT Kharagpur"
                  className="w-full px-4 py-2.5 glass-input text-xs font-semibold text-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Bio Text</label>
                <textarea 
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell other student innovators about your passion..."
                  className="w-full px-4 py-2.5 glass-input text-xs font-semibold text-zinc-800 dark:text-zinc-100 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Specialized Engineering Skills</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Add a skill (e.g. CAD, MATLAB, VLSI, Python)"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      className="flex-1 px-4 py-2 glass-input text-xs font-semibold text-zinc-800 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-4 clay-btn text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  
                  {editSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-150 dark:border-zinc-800/80 max-h-24 overflow-y-auto">
                      {editSkills.map((skill, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] font-extrabold border border-zinc-200 dark:border-zinc-700 shadow-sm"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="text-zinc-400 hover:text-rose-500 font-bold transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-400 font-bold italic">No specialized skills added yet. Add some skills to stand out!</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Social Specification Links</span>
                <div className="space-y-1.5">
                  <div className="flex gap-2 items-center">
                    <Github className="w-4 h-4 text-zinc-400" />
                    <input 
                      type="url"
                      placeholder="GitHub Link (https://...)"
                      value={editGithub}
                      onChange={(e) => setEditGithub(e.target.value)}
                      className="flex-1 px-3 py-2 glass-input text-[11px] font-semibold text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <Linkedin className="w-4 h-4 text-zinc-400" />
                    <input 
                      type="url"
                      placeholder="LinkedIn Link (https://...)"
                      value={editLinkedin}
                      onChange={(e) => setEditLinkedin(e.target.value)}
                      className="flex-1 px-3 py-2 glass-input text-[11px] font-semibold text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <Globe className="w-4 h-4 text-zinc-400" />
                    <input 
                      type="url"
                      placeholder="Portfolio / Blog (https://...)"
                      value={editPortfolio}
                      onChange={(e) => setEditPortfolio(e.target.value)}
                      className="flex-1 px-3 py-2 glass-input text-[11px] font-semibold text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 clay-btn disabled:opacity-55 text-white text-xs font-black uppercase flex items-center justify-center gap-2 mt-2"
              >
                {isSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{isSaving ? "Saving Profiles..." : "Save Bio Changes"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Avatar / Profile Photo Management Modal */}
      {isOwnProfile && currentUser && (
        <AvatarManagementModal
          currentUser={currentUser}
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          onUpdateUser={(updatedUser) => {
            onUpdateUser(updatedUser);
            setTargetUser(updatedUser);
          }}
        />
      )}

    </div>
  );
}
