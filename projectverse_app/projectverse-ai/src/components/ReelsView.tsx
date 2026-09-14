import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, 
  MessageSquare, 
  Bookmark, 
  ArrowRight, 
  ChevronUp, 
  ChevronDown, 
  Play, 
  Pause,
  Volume2, 
  VolumeX, 
  Sparkles,
  Share2,
  FolderPlus,
  EyeOff,
  Flag,
  CheckCircle,
  Copy,
  ChevronRight,
  UserCheck,
  UserPlus,
  X,
  Search,
  Send,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Reel, User, Project, sanitizeReel } from "../types";
import LearnMoreDrawer from "./LearnMoreDrawer";
import ReelShareModal from "./social/ReelShareModal";
import { robustFetch } from "../utils/api";
import { likeReelInSupabase, addCommentToReelInSupabase } from "../lib/supabaseService";
import FollowButton from "./social/FollowButton";
import CreatorNotificationButton from "./social/CreatorNotificationButton";
import { toggleReelLike, createNotification } from "../lib/socialService";
import { fetchReelsFromFirestore } from "../lib/reelService";

interface ReelsViewProps {
  currentUser: User | null;
  onSelectProject: (id: string) => void;
  initialReelId?: string | null;
  onClearInitialReelId?: () => void;
  reels?: Reel[];
  setReels?: React.Dispatch<React.SetStateAction<Reel[]>> | ((reels: Reel[]) => void);
  onNavigateProfile?: (userId: string) => void;
}

// Fallback high-quality loops if the reel's videoUrl is blank or simulated
const TECH_LOOPS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreet.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://www.w3schools.com/html/mov_bbb.mp4"
];

export default function ReelsView({
  currentUser,
  onSelectProject,
  initialReelId,
  onClearInitialReelId,
  reels: propReels,
  setReels: propSetReels,
  onNavigateProfile
}: ReelsViewProps) {
  const [localReels, setLocalReels] = useState<Reel[]>([]);
  const reels = propReels !== undefined ? propReels : localReels;
  const setReels = propSetReels !== undefined ? propSetReels : setLocalReels;
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Overlay modals & drawer toggles
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [collectionsDrawerOpen, setCollectionsDrawerOpen] = useState(false);
  const [learnDrawerOpen, setLearnDrawerOpen] = useState(false);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedShareUsers, setSelectedShareUsers] = useState<string[]>([]);
  const [shareMessageText, setShareMessageText] = useState("");
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const [sendingShare, setSendingShare] = useState(false);
  
  const [activeComments, setActiveComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  
  // Follow state simulations
  const [followedCreators, setFollowedCreators] = useState<Record<string, boolean>>({});
  
  // Collection creation
  const [collections, setCollections] = useState<string[]>(["Core AI Blueprints", "Mechanical Specs", "ECE Embedded Blueprints", "Syllabus Outlines"]);
  const [newCollectionName, setNewCollectionName] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Support clicking a shared reel from DMs to snap and play it
  useEffect(() => {
    if (initialReelId && reels.length > 0) {
      const idx = reels.findIndex(r => r.id === initialReelId);
      if (idx !== -1) {
        setActiveIndex(idx);
        if (containerRef.current) {
          const containerHeight = containerRef.current.clientHeight;
          containerRef.current.scrollTo({
            top: idx * containerHeight,
            behavior: "smooth"
          });
        }
        if (onClearInitialReelId) {
          onClearInitialReelId();
        }
      } else {
        setToastMessage("Shared Spec Reel is no longer available");
        setTimeout(() => setToastMessage(""), 3500);
        if (onClearInitialReelId) {
          onClearInitialReelId();
        }
      }
    }
  }, [initialReelId, reels]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load reels if not passed by prop or if prop is empty
      if (!propReels || propReels.length === 0) {
        let loadedReels: Reel[] = [];
        try {
          const dbReels = await fetchReelsFromFirestore();
          if (Array.isArray(dbReels) && dbReels.length > 0) {
            loadedReels = dbReels.map(r => sanitizeReel(r));
          }
        } catch (err) {
          console.warn("[ReelsView] Firestore fetch fallback warn:", err);
        }

        if (loadedReels.length === 0) {
          try {
            const reelsRes = await robustFetch("/api/reels", { silent: true, retries: 1 } as any);
            if (reelsRes.ok) {
              const reelsData = await reelsRes.json();
              if (Array.isArray(reelsData)) {
                loadedReels = reelsData.map(r => sanitizeReel(r));
              }
            }
          } catch (err) {
            console.debug("ReelsView Express API reels offline.");
          }
        }

        if (loadedReels.length > 0) {
          setReels(loadedReels);
        }
      }

      // Load projects catalog for context inside Learn Drawer
      try {
        const projectsRes = await robustFetch("/api/projects", { silent: true, retries: 1 } as any);
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData);
        }
      } catch (err) {
        console.debug("ReelsView Express API projects offline.");
      }
      // Load users for direct messaging
      try {
        const usersRes = await robustFetch("/api/users", { silent: true, retries: 1 } as any);
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setAllUsers(usersData);
        }
      } catch (err) {
        console.debug("ReelsView Express API users offline.");
      }
    } catch (err: any) {
      console.debug("ReelsView load state offline fallback complete.");
    } finally {
      setIsLoading(false);
    }
  };

  // Synchronize container scroll with activeIndex changes
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const activeChild = container.children[activeIndex] as HTMLElement;
      if (activeChild) {
        container.scrollTo({
          top: activeChild.offsetTop,
          behavior: "smooth"
        });
      }
    }
  }, [activeIndex]);

  // Parent-level IntersectionObserver to track visible cards and set activeIndex on manual scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container || reels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(index)) {
              setActiveIndex((prev) => (prev !== index ? index : prev));
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6
      }
    );

    Array.from(container.children).forEach((child) => {
      observer.observe(child as Element);
    });

    return () => {
      observer.disconnect();
    };
  }, [reels]);

  // Keypress and Mouse wheel navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (commentsDrawerOpen || collectionsDrawerOpen || learnDrawerOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, reels.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
      }
    };

    let wheelTimeout: NodeJS.Timeout;
    const handleWheel = (e: WheelEvent) => {
      if (commentsDrawerOpen || collectionsDrawerOpen || learnDrawerOpen) return;
      e.preventDefault();
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (Math.abs(e.deltaY) > 20) {
          if (e.deltaY > 0) {
            setActiveIndex(prev => Math.min(prev + 1, reels.length - 1));
          } else {
            setActiveIndex(prev => Math.max(prev - 1, 0));
          }
        }
      }, 100);
    };

    window.addEventListener("keydown", handleKeyDown);
    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [reels, commentsDrawerOpen, collectionsDrawerOpen, learnDrawerOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const handleFollowCreator = (creatorId: string) => {
    setFollowedCreators(prev => {
      const state = !prev[creatorId];
      showToast(state ? "Added creator to your following feed" : "Removed creator from following");
      return { ...prev, [creatorId]: state };
    });
  };

  const handleNotInterested = (reelId: string) => {
    showToast("Feedback recorded: We'll show you fewer reels like this.");
    // Filter out the reel
    setReels(prev => prev.filter(r => r.id !== reelId));
    if (activeIndex >= reels.length - 1) {
      setActiveIndex(Math.max(0, reels.length - 2));
    }
  };

  const handleReportReel = (reelId: string) => {
    showToast("Thank you for keeping ProjectVerse safe! Reel reported for review.");
    setReels(prev => prev.filter(r => r.id !== reelId));
    if (activeIndex >= reels.length - 1) {
      setActiveIndex(Math.max(0, reels.length - 2));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500 font-extrabold dark:text-zinc-400">Syncing tech reel nodes...</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="p-12 text-center max-w-sm mx-auto space-y-4">
        <Play className="w-12 h-12 text-zinc-400 mx-auto animate-pulse" />
        <p className="text-sm text-zinc-500 font-bold">No active reels found. Upload your first spec reel to begin!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-2 relative select-none">
      
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-2xl flex items-center gap-2.5 text-xs font-black shadow-xl"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Snap Vertical Scroll Frame */}
      <div 
        ref={containerRef}
        className="w-full max-w-[420px] h-[calc(100vh-140px)] min-h-[560px] bg-black rounded-[32px] border border-zinc-200 dark:border-zinc-800/80 overflow-y-scroll scroll-snap-container relative shadow-2xl"
        style={{
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none"
        }}
      >
        {reels.map((reel, index) => (
          <ReelCard 
            key={reel.id}
            reel={reel}
            index={index}
            isActive={index === activeIndex}
            muted={muted}
            setMuted={setMuted}
            currentUser={currentUser}
            onSelectProject={onSelectProject}
            onOpenComments={() => {
              setActiveComments(reel.comments || []);
              setCommentsDrawerOpen(true);
            }}
            onOpenCollections={() => setCollectionsDrawerOpen(true)}
            onOpenLearn={() => setLearnDrawerOpen(true)}
            onOpenShare={() => {
              setSelectedShareUsers([]);
              setShareMessageText("");
              setShareSearchQuery("");
              setShareDrawerOpen(true);
            }}
            followed={!!followedCreators[reel.ownerId || ""]}
            onFollow={() => handleFollowCreator(reel.ownerId || "")}
            onNotInterested={() => handleNotInterested(reel.id)}
            onReport={() => handleReportReel(reel.id)}
            onShowToast={showToast}
            onNavigateProfile={onNavigateProfile}
          />
        ))}
      </div>

      {/* Right Side Keyboard Controls Helper Widget */}
      <div className="hidden lg:flex flex-col gap-4 clay-card p-5 max-w-[240px] text-xs">
        <h4 className="font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-500" />
          Interactive Keys
        </h4>
        <div className="space-y-2.5 text-zinc-500 font-bold">
          <div className="flex items-center justify-between">
            <span className="glass-panel px-2 py-1 rounded-md text-[10px] font-mono">▲ / ▼</span>
            <span>Prev / Next Reel</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="glass-panel px-2.5 py-1 rounded-md text-[10px] font-mono">SPACE</span>
            <span>Play / Pause</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="glass-panel px-2.5 py-1 rounded-md text-[10px] font-mono">Double Tap</span>
            <span>Like Spec</span>
          </div>
        </div>
      </div>

      {/* COMMENTS DRAWER */}
      <AnimatePresence>
        {commentsDrawerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommentsDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] clay-card !rounded-b-none p-6 space-y-4 max-h-[70vh] h-[70vh] flex flex-col text-zinc-900 dark:text-zinc-100"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-900">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4.5 h-4.5 text-violet-500" />
                  Spec Discussion ({activeComments.length})
                </h3>
                <button 
                  onClick={() => setCommentsDrawerOpen(false)}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                {activeComments.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 font-bold">
                    No comments yet. Write the first academic enquiry!
                  </div>
                ) : (
                  activeComments.map((c: any, cIdx: number) => (
                    <div key={cIdx} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-violet-600 dark:text-violet-400">{c.userName}</span>
                        <span className="text-[10px] text-zinc-400">{new Date(c.timestamp || Date.now()).toLocaleDateString()}</span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300 font-semibold leading-relaxed p-2.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        {c.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Write comment */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex gap-2">
                <input 
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Ask about components, costs, code..."
                  className="flex-1 px-4 py-2.5 glass-input text-xs font-semibold text-zinc-800 dark:text-zinc-100"
                />
                <button
                  onClick={async () => {
                    if (!currentUser) return showToast("Please log in to write comments.");
                    if (!newCommentText.trim()) return;
                    
                    const activeReel = reels[activeIndex];
                    const newCommentObj = {
                      id: "rc_" + Date.now(),
                      userId: currentUser.id,
                      userName: currentUser.name,
                      text: newCommentText,
                      timestamp: new Date().toISOString()
                    };

                    try {
                      await addCommentToReelInSupabase(activeReel.id, newCommentObj);
                    } catch (supabaseErr) {
                      console.warn("Supabase comment sync error:", supabaseErr);
                    }

                    try {
                      const res = await fetch(`/api/reels/${activeReel.id}/comments`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "authorization": currentUser.id
                        },
                        body: JSON.stringify({ text: newCommentText })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setActiveComments(data.comments);
                        // Update reels list
                        const updated = [...reels];
                        updated[activeIndex].comments = data.comments;
                        setReels(updated);
                        setNewCommentText("");
                        showToast("Comment published!");

                        const reelOwnerId = activeReel.creatorId || activeReel.ownerId || "";
                        if (reelOwnerId && reelOwnerId !== currentUser.id) {
                          await createNotification({
                            type: "reel_comment",
                            actorId: currentUser.id,
                            actorName: currentUser.name || "Student Innovator",
                            actorAvatar: currentUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.id}`,
                            recipientId: reelOwnerId,
                            targetId: activeReel.id,
                            targetTitle: activeReel.title,
                            text: `commented on your reel "${activeReel.title}"`,
                            createdAt: new Date().toISOString(),
                            read: false
                          });
                        }
                      }
                    } catch (e) {
                      // fallback
                      const fallbackComment = newCommentObj;
                      const updatedComments = [...activeComments, fallbackComment];
                      setActiveComments(updatedComments);
                      const updated = [...reels];
                      updated[activeIndex].comments = updatedComments;
                      setReels(updated);
                      setNewCommentText("");
                      showToast("Comment saved locally");
                    }
                  }}
                  className="px-4 clay-btn text-white font-extrabold text-xs"
                >
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SAVE TO COLLECTION DRAWER */}
      <AnimatePresence>
        {collectionsDrawerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCollectionsDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] clay-card !rounded-b-none p-6 space-y-4 max-h-[60vh] flex flex-col text-zinc-800 dark:text-zinc-200"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-900">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <FolderPlus className="w-4.5 h-4.5 text-amber-500" />
                  Save Spec to Collection
                </h3>
                <button 
                  onClick={() => setCollectionsDrawerOpen(false)}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Folders List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {collections.map((col, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      showToast(`Spec successfully pinned to "${col}" folder.`);
                      setCollectionsDrawerOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-3 glass-input text-xs font-bold transition-all text-left"
                  >
                    <span>{col}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                ))}
              </div>

              {/* Create new collection */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex gap-2">
                <input 
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="New collection folder..."
                  className="flex-1 px-4 py-2.5 glass-input text-xs font-semibold text-zinc-800 dark:text-zinc-100"
                />
                <button
                  onClick={() => {
                    if (!newCollectionName.trim()) return;
                    setCollections(prev => [...prev, newCollectionName]);
                    setNewCollectionName("");
                    showToast("Collection folder created!");
                  }}
                  className="px-4 glass-input text-white font-extrabold text-xs transition-colors hover:bg-white/20"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEARN DRAWER */}
      <AnimatePresence>
        {learnDrawerOpen && (
          <LearnMoreDrawer 
            reel={reels[activeIndex]}
            project={projects.find(p => p.id === reels[activeIndex].projectId) || null}
            currentUser={currentUser}
            onClose={() => setLearnDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* INSTAGRAM STYLE REEL SHARE MODAL */}
      {currentUser && reels[activeIndex] && (
        <ReelShareModal
          currentUser={currentUser}
          reel={reels[activeIndex]}
          isOpen={shareDrawerOpen}
          onClose={() => setShareDrawerOpen(false)}
        />
      )}

    </div>
  );
}

// SINGLE REEL CARD COMPONENT
interface ReelCardProps {
  key?: any;
  reel: any;
  index: any;
  isActive: any;
  muted: any;
  setMuted: any;
  currentUser: any;
  onSelectProject: any;
  onOpenComments: any;
  onOpenCollections: any;
  onOpenLearn: any;
  onOpenShare: any;
  followed: any;
  onFollow: any;
  onNotInterested: any;
  onReport: any;
  onShowToast: any;
  onNavigateProfile?: (userId: string) => void;
}

function ReelCard({
  reel,
  index,
  isActive,
  muted,
  setMuted,
  currentUser,
  onSelectProject,
  onOpenComments,
  onOpenCollections,
  onOpenLearn,
  onOpenShare,
  followed,
  onFollow,
  onNotInterested,
  onReport,
  onShowToast,
  onNavigateProfile
}: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [showSpeedSelector, setShowSpeedSelector] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [showOptionsPopup, setShowOptionsPopup] = useState(false);
  
  const getFallbackVideo = (idx: number) => TECH_LOOPS[idx % TECH_LOOPS.length];

  const [videoSource, setVideoSource] = useState<string>(() => {
    return (reel && reel.videoUrl && reel.videoUrl.trim() !== "") ? reel.videoUrl : getFallbackVideo(index);
  });

  // Toggle states for interaction fidelity
  const [isLiked, setIsLiked] = useState(reel.likes?.includes(currentUser?.id || "") || false);
  const [likesCount, setLikesCount] = useState(reel.likes?.length || Math.floor(Math.random() * 50) + 12);
  const [isSaved, setIsSaved] = useState(false);

  const [videoError, setVideoError] = useState(false);

  // Sync active status changes with play/pause state
  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    } else {
      setIsPlaying(false);
    }
  }, [isActive]);

  // Execute playback control on active reel with cancellation protection
  useEffect(() => {
    let isCancelled = false;
    const video = videoRef.current;
    if (!video) return;

    if (isActive && isPlaying) {
      video.muted = muted;
      const playPromise = video.play();
      if (playPromise !== undefined && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            if (isCancelled) {
              video.pause();
            }
          })
          .catch((err) => {
            if (isCancelled) return;
            console.debug("[ReelCard] Autoplay rejected or interrupted:", err);
            if (!video.muted) {
              video.muted = true;
              setMuted(true);
              video.play().catch(() => {
                if (!isCancelled) setIsPlaying(false);
              });
            } else {
              setIsPlaying(false);
            }
          });
      }
    } else {
      video.pause();
    }

    return () => {
      isCancelled = true;
      if (video) {
        video.pause();
      }
    };
  }, [isActive, isPlaying, muted, videoSource]);

  useEffect(() => {
    if (reel && reel.videoUrl && reel.videoUrl.trim() !== "") {
      setVideoSource(reel.videoUrl);
      setVideoError(false);
    } else {
      setVideoSource(getFallbackVideo(index));
      setVideoError(false);
    }
  }, [reel?.videoUrl, index]);

  // Adjust playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
  };

  // Double tap to like spec simulation
  let lastTap = 0;
  const handleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap!
      handleDoubleTapLike(e);
    } else {
      // Single tap -> Play/Pause toggle
      setIsPlaying(!isPlaying);
    }
    lastTap = now;
  };

  const handleDoubleTapLike = (e: React.MouseEvent) => {
    // Generate floating heart coordinates relative to parent container
    let x = 150;
    let y = 250;
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    const newHeart = { id: Date.now(), x, y };
    setFloatingHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1000);

    if (!isLiked) {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
    }
    onShowToast("❤️ Project Spec Spec-Liked!");
  };

  const handleVideoError = () => {
    console.warn(`[Video Player Warning] Video playback error for reel "${reel?.title}" (${videoSource})`);
    const fallback = getFallbackVideo(index);
    if (videoSource !== fallback) {
      console.log(`[Video Player Recovery] Switching to fallback stream: ${fallback}`);
      setVideoSource(fallback);
      setVideoError(false);
    } else {
      setVideoError(true);
    }
  };

  return (
    <div 
      ref={cardRef}
      data-index={index}
      className="w-full h-full snap-start shrink-0 relative overflow-hidden bg-black flex flex-col justify-between"
      style={{ scrollSnapAlign: "start" }}
    >
      
      {/* Real HTML5 Video Player */}
      <div 
        onClick={handleTap}
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleDoubleTapLike(e);
        }}
        className="absolute inset-0 z-0 cursor-pointer flex items-center justify-center bg-[#07070c]"
      >
        {videoError ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-zinc-950 text-center space-y-3">
            <div className="p-3 bg-zinc-900 rounded-full border border-zinc-800 text-zinc-400">
              <Play className="w-6 h-6" />
            </div>
            <p className="text-xs text-zinc-400 font-bold">Video Stream Unavailable</p>
            <p className="text-[10px] text-zinc-600 max-w-[220px] leading-relaxed">
              This engineering reel video cannot be loaded. Swipe up to view the next spec.
            </p>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoSource}
            loop
            playsInline
            preload="metadata"
            muted={muted}
            onTimeUpdate={handleTimeUpdate}
            onError={handleVideoError}
            className="w-full h-full object-cover"
          />
        )}

        {/* Floating double-tap hearts overlay */}
        <AnimatePresence>
          {floatingHearts.map(heart => (
            <motion.div
              key={heart.id}
              initial={{ scale: 0, opacity: 1, y: 0 }}
              animate={{ scale: [1.6, 2.3, 0.6], opacity: [1, 1, 0], y: -100 }}
              exit={{ opacity: 0 }}
              style={{ left: heart.x - 20, top: heart.y - 20 }}
              className="absolute z-20 pointer-events-none text-rose-500 text-3xl drop-shadow-lg"
            >
              ❤️
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Play/Pause state icon visual indicator */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="p-5 rounded-full bg-black/45 backdrop-blur-md text-white absolute z-10 shadow-lg border border-white/10"
            >
              <Play className="w-8 h-8 fill-white text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Darkening overlays for UI legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85 pointer-events-none z-0" />
      </div>

      {/* HEADER OVERLAYS */}
      <div className="relative z-10 p-5 flex justify-between items-center text-white select-none">
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 text-emerald-400">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          Active Spec Reel
        </div>

        <div className="flex items-center gap-2">
          {/* Mute toggle button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setMuted(!muted);
            }}
            className="p-2 bg-zinc-950/60 hover:bg-zinc-900/60 backdrop-blur-md rounded-full text-white border border-white/5 transition-all hover:scale-105 active:scale-95"
          >
            {muted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-violet-400" />}
          </button>

          {/* Options button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowOptionsPopup(!showOptionsPopup);
            }}
            className="p-2 bg-zinc-950/60 hover:bg-zinc-900/60 backdrop-blur-md rounded-full text-white border border-white/5 font-extrabold text-xs transition-all hover:scale-105 active:scale-95"
          >
            •••
          </button>
        </div>

        {/* Options Popup Overlay */}
        {showOptionsPopup && (
          <div className="absolute right-5 top-16 glass-panel text-white p-2 w-44 z-30 shadow-2xl space-y-1">
            <button
              onClick={() => {
                onNotInterested();
                setShowOptionsPopup(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-white/20 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Not Interested
            </button>
            <button
              onClick={() => {
                onReport();
                setShowOptionsPopup(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              Report Spec Reel
            </button>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR ACTION BUTTONS OVERLAYS - INSTAGRAM FLOATING STYLE */}
      <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-4 text-white">
        
        {/* Creator profile & follow indicator (Sibling interactive controls) */}
        <div className="flex flex-col items-center gap-1 relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const creatorId = reel.creatorId || reel.ownerId;
              if (onNavigateProfile && creatorId) {
                onNavigateProfile(creatorId);
              }
            }}
            aria-label={`View ${reel.creatorName || reel.ownerName || "creator"}'s profile`}
            className="w-10 h-10 rounded-full border border-white/20 bg-zinc-900 flex items-center justify-center font-extrabold uppercase relative shadow-md hover:opacity-80 transition-all cursor-pointer overflow-hidden group focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            {reel.creatorAvatar ? (
              <img
                src={reel.creatorAvatar}
                alt={reel.creatorName || reel.ownerName || "Creator avatar"}
                className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
              />
            ) : (
              <span>{(reel.creatorName || reel.ownerName || "S").charAt(0)}</span>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFollow();
            }}
            aria-label={followed ? "Unfollow creator" : "Follow creator"}
            className={`absolute -bottom-1 -right-1 p-1 rounded-full border border-black transition-all cursor-pointer z-10 ${
              followed ? "bg-emerald-500 text-white" : "bg-violet-600 text-white hover:scale-110"
            }`}
          >
            {followed ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
          </button>
        </div>

        {/* Like Button */}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!currentUser) return onShowToast("Please log in to like.");
            
            const reelOwnerId = reel.creatorId || reel.ownerId || "";
            try {
              const { liked, count } = await toggleReelLike(reel.id, reel.title, currentUser, reelOwnerId);
              setIsLiked(liked);
              setLikesCount(count);
              onShowToast(liked ? "❤️ Spec Liked!" : "💔 Removed Spec Like");
            } catch (err) {
              console.warn("Firestore reel like error:", err);
            }

            try {
              await likeReelInSupabase(reel.id, currentUser.id);
            } catch (err) {
              console.warn("Supabase like sync error:", err);
            }
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`p-2.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md transition-all group-hover:scale-110 active:scale-95 ${
            isLiked ? "text-rose-500 scale-110" : "text-white"
          }`}>
            <Heart className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
          </div>
          <span className="text-[10px] font-black text-zinc-300 drop-shadow">{likesCount}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments();
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md transition-all group-hover:scale-110 active:scale-95 text-zinc-200">
            <MessageSquare className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          </div>
          <span className="text-[10px] font-black text-zinc-300 drop-shadow">{(reel.comments || []).length}</span>
        </button>

        {/* Save folder collection button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isSaved) {
              setIsSaved(false);
              onShowToast("Bookmark removed");
            } else {
              onOpenCollections();
              setIsSaved(true);
            }
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`p-2.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md transition-all group-hover:scale-110 active:scale-95 ${
            isSaved ? "text-amber-400 scale-110" : "text-white"
          }`}>
            <Bookmark className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isSaved ? "fill-amber-400 text-amber-400" : ""}`} />
          </div>
          <span className="text-[10px] font-black text-zinc-300 drop-shadow">{isSaved ? "Saved" : "Pin"}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenShare();
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md transition-all group-hover:scale-110 active:scale-95 text-zinc-200">
            <Share2 className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          </div>
          <span className="text-[10px] font-black text-zinc-300 drop-shadow">Share</span>
        </button>

        {/* Spec blueprint details redirection button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectProject(reel.projectId || "");
          }}
          className="flex flex-col items-center gap-1 group text-violet-400"
          title="Explore Full Project Blueprint Spec"
        >
          <div className="p-2.5 rounded-full bg-violet-600 hover:bg-violet-500 hover:scale-115 border border-violet-500/30 transition-all text-white shadow-lg shadow-violet-500/20 animate-pulse">
            <ArrowRight className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider text-violet-300 drop-shadow">Spec</span>
        </button>
      </div>

      {/* BOTTOM INFO BAR WITH TECH CHIIPS & SPEED SELECTORS */}
      <div className="relative z-10 p-5 space-y-3 bg-gradient-to-t from-black via-black/30 to-transparent text-white select-none">
        
        {/* Creator Identity & Metadata */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 max-w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const creatorId = reel.creatorId || reel.ownerId;
                if (onNavigateProfile && creatorId) {
                  onNavigateProfile(creatorId);
                }
              }}
              aria-label={`View @${reel.creatorName || reel.ownerName || "creator"} profile`}
              className="font-extrabold text-sm tracking-tight text-white hover:text-violet-400 hover:underline transition-colors text-left cursor-pointer truncate max-w-full focus:outline-none"
            >
              @{reel.creatorName ? reel.creatorName.toLowerCase().replace(/\s+/g, "") : reel.ownerName ? reel.ownerName.toLowerCase().replace(/\s+/g, "") : "innovator"}
            </button>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-bold text-zinc-400 shrink-0">
              {reel.creatorRole || "Builder"}
            </span>
          </div>
          <h4 className="text-xs font-bold leading-snug">
            {reel.title}
          </h4>
          <p className="text-[10px] text-zinc-300 leading-relaxed font-semibold line-clamp-2">
            {reel.description}
          </p>
        </div>

        {/* Speed Selector Row */}
        <div className="flex items-center justify-between text-[10px] pt-1">
          {/* Speed badge */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSpeedSelector(!showSpeedSelector);
              }}
              className="px-2 py-1 rounded bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-extrabold border border-white/5 cursor-pointer"
            >
              Speed: {playbackSpeed}x
            </button>
            
            {showSpeedSelector && (
              <div className="absolute bottom-8 left-0 bg-zinc-950 border border-zinc-800 rounded-lg p-1 space-y-1 w-20 z-30">
                {[0.5, 1, 1.5, 2].map((sp) => (
                  <button
                    key={sp}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaybackSpeed(sp);
                      setShowSpeedSelector(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-[10px] font-bold ${
                      playbackSpeed === sp ? "bg-violet-600 text-white" : "hover:bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Learn More slide drawer trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenLearn();
            }}
            className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg transition-all shadow-md flex items-center gap-1 animate-pulse"
          >
            <Sparkles className="w-3 h-3 text-black" />
            Learn Details
          </button>
        </div>

        {/* PROGRESS BAR */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            handleProgressBarClick(e);
          }}
          className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer relative"
        >
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

      </div>

    </div>
  );
}
