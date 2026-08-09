import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import HomeFeed from "./components/HomeFeed";
import ProjectDiscover from "./components/ProjectDiscover";
import ProjectDetail from "./components/ProjectDetail";
import ProjectUpload from "./components/ProjectUpload";
import ProjectGenerator from "./components/ProjectGenerator";
import ReelsView from "./components/ReelsView";
import UserProfile from "./components/UserProfile";
import AuthModal from "./components/AuthModal";
import LoginPage from "./components/LoginPage";
import AISettings from "./components/AISettings";
import { Project, User, Reel, sanitizeProject } from "./types";
import { Sparkles, Compass, User as UserIcon, Send, MessageCircle, Check, X, Search, ChevronLeft, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { robustFetch } from "./utils/api";
import { supabase } from "./lib/supabase";
import { syncUserProfile, updateUserProfile } from "./lib/supabaseService";
import { 
  mapFirebaseUserToAppUser, 
  observeFirebaseAuth, 
  signOutFirebase, 
  fetchProjectsFromFirestore,
  fetchReelsFromFirestore,
  deleteProjectFromFirestore
} from "./lib/firebase";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setTab] = useState("home");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply theme class to document root and sync with localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Listen for OS theme preference changes when no explicit saved theme exists
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        setDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Direct Messaging States
  const [inboxOpen, setInboxOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatInputText, setChatInputText] = useState("");
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [activeReelIdToPlay, setActiveReelIdToPlay] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = projects.filter((project) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = project.title?.toLowerCase().includes(q);
    const descMatch = project.description?.toLowerCase().includes(q);
    const techMatch = project.technologyStack?.some(tech => tech.toLowerCase().includes(q));
    const catMatch = project.category?.toLowerCase().includes(q);
    const branchMatch = project.branch?.toLowerCase().includes(q);
    return titleMatch || descMatch || techMatch || catMatch || branchMatch;
  });

  // Poll for direct messages every 3 seconds to keep chat real-time
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchDMs = async () => {
      try {
        const res = await robustFetch("/api/dms", {
          headers: {
            "authorization": currentUser.id
          }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err: any) {
        if (err?.message?.includes("Failed to fetch") || err?.toString()?.includes("Failed to fetch")) {
          console.warn("Error fetching DMs (restarting/offline):", err);
        } else {
          console.error("Error fetching DMs:", err);
        }
      }
    };

    fetchDMs();
    const interval = setInterval(fetchDMs, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Mark messages as read when a developer thread is selected or when new messages arrive while viewing
  useEffect(() => {
    if (!currentUser || !activeChatUserId) return;
    
    const markAsRead = async () => {
      const normalizedMyId = (currentUser.id === "usr_1") ? "user_suryasekhar" : currentUser.id;
      // Filter for unread messages received from the active chat partner
      const unreadCount = messages.filter(
        m => m.senderId === activeChatUserId && 
             m.recipientId === normalizedMyId && 
             !m.read
      ).length;
      
      if (unreadCount > 0) {
        try {
          const res = await robustFetch("/api/dms/mark-read", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "authorization": currentUser.id
            },
            body: JSON.stringify({ senderId: activeChatUserId })
          });
          if (res.ok) {
            // Instantly fetch updated DMs to synchronize state locally
            const fetchRes = await robustFetch("/api/dms", {
              headers: {
                "authorization": currentUser.id
              }
            });
            if (fetchRes.ok) {
              const data = await fetchRes.json();
              setMessages(data);
            }
          }
        } catch (err) {
          console.error("Error marking messages as read:", err);
        }
      }
    };

    markAsRead();
  }, [activeChatUserId, messages, currentUser]);

  // Fetch users list for DM selections
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await robustFetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setAllUsersList(data);
        }
      } catch (err: any) {
        if (err?.message?.includes("Failed to fetch") || err?.toString()?.includes("Failed to fetch")) {
          console.warn("Error fetching users list (restarting/offline):", err);
        } else {
          console.error("Error fetching users list:", err);
        }
      }
    };
    fetchUsers();
  }, []);

  // Real-time auth session management for Firebase and Supabase
  useEffect(() => {
    let isMounted = true;

    const applyUser = async (profile: User | null) => {
      if (!isMounted) return;
      setCurrentUser(profile);
      if (profile) {
        localStorage.setItem("current_user", JSON.stringify(profile));
      } else {
        localStorage.removeItem("current_user");
      }
    };

    const initSession = async () => {
      try {
        const firebaseUser = mapFirebaseUserToAppUser(null);
        if (firebaseUser) {
          // The Firebase user will be handled by the auth observer below.
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await syncUserProfile(session.user);
          await applyUser(profile);
        } else {
          const savedUser = localStorage.getItem("current_user");
          if (savedUser) {
            await applyUser(JSON.parse(savedUser));
          } else {
            await applyUser(null);
          }
        }
      } catch (err) {
        console.warn("Auth recovery issue, falling back to local storage:", err);
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    initSession();

    const unsubscribeFirebase = observeFirebaseAuth(async (firebaseUser) => {
      if (!isMounted) return;
      if (firebaseUser) {
        const profile = await syncUserProfile({
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          user_metadata: {
            full_name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Student Innovator",
            avatar_url: firebaseUser.photoURL || undefined,
          },
        });
        await applyUser(profile);
      } else {
        const savedUser = localStorage.getItem("current_user");
        if (savedUser) {
          await applyUser(JSON.parse(savedUser));
        } else {
          await applyUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribeFirebase();
    };
  }, []);

  // Fetch projects and reels directly from Firebase Firestore and local Express API
  useEffect(() => {
    const fetchApplicationData = async () => {
      setLoading(true);
      try {
        // 1. Fetch local projects
        let localProjects: Project[] = [];
        try {
          const res = await robustFetch("/api/projects");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              localProjects = data.map(p => sanitizeProject(p));
            }
          }
        } catch (err) {
          console.warn("Local fetch projects warning:", err);
        }

        // 2. Fetch Firestore projects
        let firestoreProjects: any[] = [];
        try {
          firestoreProjects = await fetchProjectsFromFirestore();
        } catch (err) {
          console.warn("Firestore fetch projects warning:", err);
        }

        // Merge projects
        const mergedProjects = new Map<string, Project>();
        localProjects.forEach(p => mergedProjects.set(p.id, p));
        firestoreProjects.forEach(p => {
          const san = sanitizeProject(p);
          mergedProjects.set(san.id, san);
        });

        const sortedProjects = Array.from(mergedProjects.values()).sort(
          (a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime()
        );
        setProjects(sortedProjects);

        // 3. Fetch local reels & Firestore reels
        let localReels: Reel[] = [];
        try {
          const reelsRes = await robustFetch("/api/reels");
          if (reelsRes.ok) {
            localReels = await reelsRes.json();
          }
        } catch (err) {
          console.warn("Local fetch reels warning:", err);
        }

        let firestoreReels: Reel[] = [];
        try {
          firestoreReels = await fetchReelsFromFirestore();
        } catch (err) {
          console.warn("Firestore fetch reels warning:", err);
        }

        const mergedReels = new Map<string, Reel>();
        localReels.forEach(r => mergedReels.set(r.id, r));
        firestoreReels.forEach(r => mergedReels.set(r.id, r));
        const sortedReels = Array.from(mergedReels.values()).sort(
          (a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime()
        );
        setReels(sortedReels);

      } catch (err) {
        console.warn("Data loading fallback:", err);
        await fetchProjectsFallback();
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationData();
  }, []);

  const fetchProjectsFallback = async () => {
    try {
      const res = await robustFetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(data.map(p => sanitizeProject(p)));
        } else {
          setProjects([]);
        }
      }
    } catch (e: any) {
      console.warn("Fallback projects fetch failed:", e);
    }
  };

  const fetchProjects = async () => {
    try {
      // 1. Fetch local projects
      let localProjects: Project[] = [];
      try {
        const res = await robustFetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            localProjects = data.map(p => sanitizeProject(p));
          }
        }
      } catch (err) {
        console.warn("Local fetch projects error:", err);
      }

      // 2. Fetch Firestore projects
      let dbProjects: any[] = [];
      try {
        dbProjects = await fetchProjectsFromFirestore();
      } catch (err) {
        console.warn("Firestore fetch projects error:", err);
      }

      // 3. Merge projects (preferring Firestore details but retaining local projects)
      const mergedProjects = new Map<string, Project>();
      localProjects.forEach(p => mergedProjects.set(p.id, p));
      dbProjects.forEach(p => {
        const san = sanitizeProject(p);
        mergedProjects.set(san.id, san);
      });
      const sortedProjects = Array.from(mergedProjects.values()).sort(
        (a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime()
      );
      setProjects(sortedProjects);
    } catch (err) {
      console.error("fetchProjects error:", err);
      await fetchProjectsFallback();
    }
  };

  const fetchReels = async () => {
    try {
      let localReels: Reel[] = [];
      try {
        const reelsRes = await robustFetch("/api/reels");
        if (reelsRes.ok) {
          localReels = await reelsRes.json();
        }
      } catch (err) {
        console.warn("Local fetch reels error:", err);
      }

      let dbReels: Reel[] = [];
      try {
        dbReels = await fetchReelsFromFirestore();
      } catch (err) {
        console.warn("Firestore fetch reels error:", err);
      }

      const mergedReels = new Map<string, Reel>();
      localReels.forEach(r => mergedReels.set(r.id, r));
      dbReels.forEach(r => mergedReels.set(r.id, r));
      const sortedReels = Array.from(mergedReels.values()).sort(
        (a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime()
      );
      setReels(sortedReels);
    } catch (err) {
      console.warn("fetchReels error:", err);
    }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("current_user", JSON.stringify(user));
    fetchProjects(); // reload view details with auth context
  };

  const handleUpdateUser = async (updatedUser: User) => {
    // Optimistic UI update
    setCurrentUser(updatedUser);
    localStorage.setItem("current_user", JSON.stringify(updatedUser));

    try {
      const persistedUser = await updateUserProfile(updatedUser.id, updatedUser);
      if (persistedUser) {
        setCurrentUser(persistedUser);
        localStorage.setItem("current_user", JSON.stringify(persistedUser));
      }
    } catch (err) {
      console.error("Failed to update profile in database:", err);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await supabase.auth.signOut();
      await signOutFirebase();
    } catch (err) {
      console.warn("Logout cleanup issue:", err);
    }

    setCurrentUser(null);
    localStorage.removeItem("current_user");
    setTab("home");
    setSelectedProjectId(null);
    setShowLogoutConfirm(false);
  };

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setTab("detail");
  };

  const handlePublishSuccess = async (newProjectId?: string) => {
    await Promise.all([fetchProjects(), fetchReels()]);
    if (newProjectId) {
      setSelectedProjectId(newProjectId);
      setTab("detail");
    } else {
      setTab("profile");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!currentUser) return;
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    try {
      // 1. Delete from backend DB / REST (if available)
      fetch(`/api/projects/${id}`, {
        method: "DELETE",
        headers: { "authorization": currentUser.id }
      }).catch(console.warn);

      // 2. Also delete from Firebase if we saved there
      await import("./lib/firebase").then(m => m.deleteProjectFromFirestore(id)).catch(console.warn);
      
      await fetchProjects();
      alert("Project deleted successfully.");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting project.");
    }
  };

  const handleDeleteReel = async (id: string) => {
    if (!currentUser) return;
    if (!window.confirm("Are you sure you want to delete this reel? This action cannot be undone.")) return;
    try {
      // Delete from local REST API (if available)
      fetch(`/api/reels/${id}`, {
        method: "DELETE",
        headers: { "authorization": currentUser.id }
      }).catch(console.warn);
      
      // Delete from firestore
      await import("./lib/firebase").then(m => m.deleteReelFromFirestore(id)).catch(console.warn);

      await fetchReels();
      alert("Reel deleted successfully.");
    } catch (error) {
      console.error("Delete reel error:", error);
      alert("Could not delete this reel. Please try again.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-500 font-bold dark:text-zinc-400 animate-pulse">
          Connecting to ProjectVerse...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  return (
    <div className={`min-h-screen relative flex flex-col md:flex-row transition-colors duration-500 overflow-hidden`}>
      {/* Background blobs for premium claymorphism effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[100px] pointer-events-none blob-float" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-purple-400/20 dark:bg-purple-600/10 blur-[100px] pointer-events-none blob-float" style={{ animationDelay: '2s' }} />
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={selectedProjectId && currentTab === "detail" ? "" : currentTab}
        setTab={(newTab) => {
          setSelectedProjectId(null);
          setTab(newTab);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main viewport area */}
      <main className="flex-1 md:pl-64 pb-20 md:pb-6 min-h-screen">
        {/* Top Header bar with dynamic user context details */}
        <header className="px-6 py-4 glass-panel border-x-0 border-t-0 !border-b-[rgba(255,255,255,0.2)] dark:!border-b-[rgba(255,255,255,0.05)] sticky top-0 z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">
              ProjectVerse
            </span>
            <span className="px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-[9px] font-black uppercase text-violet-700 dark:text-violet-300">
              MVP Phase 1
            </span>
          </div>

          {/* Site-wide search bar */}
          <div className="flex-1 max-w-xs md:max-w-md relative mx-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search projects, stacks, technologies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 text-xs glass-input text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 font-bold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Header Theme Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 bg-zinc-100/80 hover:bg-zinc-200 dark:bg-zinc-900/80 dark:hover:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800 transition-all cursor-pointer shadow-2xs"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-violet-500" />}
            </button>

            {currentUser && (
              <button 
                onClick={() => {
                  setActiveChatUserId(null); // default to conversations list
                  setInboxOpen(true);
                }}
                className="p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-300 border border-zinc-150 dark:border-zinc-800 transition-all relative group"
                title="Direct Messages Inbox"
              >
                <Send className="w-4 h-4 text-violet-500 dark:text-violet-400 rotate-[-15deg]" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#09090b]" />
              </button>
            )}

            {currentUser ? (
              <div 
                onClick={() => {
                  setSelectedProjectId(null);
                  setTab("profile");
                }}
                className="flex items-center gap-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 px-3 py-1.5 rounded-xl transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950 flex items-center justify-center text-violet-700 dark:text-violet-300 font-bold uppercase text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold leading-none text-zinc-900 dark:text-white truncate max-w-[120px]">
                    {currentUser.name}
                  </p>
                  <span className="text-[9px] text-zinc-400 font-bold">
                    {currentUser.role || "Student Innovator"}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-extrabold transition-all shadow shadow-violet-500/10"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Inner views router */}
        <div className="p-4 md:p-8">
          {loading && projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 font-bold dark:text-gray-400 animate-pulse">
                Initializing in-memory micro-databases...
              </p>
            </div>
          ) : (
            <>
              {currentTab === "home" && (
                <HomeFeed
                  projects={filteredProjects}
                  currentUser={currentUser}
                  onSelectProject={handleSelectProject}
                  setTab={setTab}
                />
              )}

              {currentTab === "discover" && (
                <ProjectDiscover
                  projects={filteredProjects}
                  onSelectProject={handleSelectProject}
                />
              )}

              {currentTab === "detail" && selectedProjectId && (
                <ProjectDetail
                  projectId={selectedProjectId}
                  currentUser={currentUser}
                  onBack={() => {
                    setSelectedProjectId(null);
                    setTab("discover");
                  }}
                  onEdit={(id) => {
                    setTab("upload"); // or implement full update sheet
                  }}
                  onFork={(newId) => {
                    setSelectedProjectId(newId);
                    setTab("detail");
                    fetchProjects(); // reload to include forked project
                  }}
                />
              )}

              {currentTab === "upload" && (
                <ProjectUpload
                  currentUser={currentUser}
                  onPublishSuccess={() => {
                    handlePublishSuccess();
                    setEditingProject(undefined);
                  }}
                  onBack={() => {
                    setTab("home");
                    setEditingProject(undefined);
                  }}
                  editProjectData={editingProject}
                />
              )}

              {currentTab === "aigen" && (
                <ProjectGenerator
                  currentUser={currentUser}
                  onSaveGenerated={() => {
                    fetchProjects();
                    setTab("profile");
                  }}
                />
              )}

              {currentTab === "reels" && (
                <ReelsView
                  currentUser={currentUser}
                  onSelectProject={handleSelectProject}
                  initialReelId={activeReelIdToPlay}
                  onClearInitialReelId={() => setActiveReelIdToPlay(null)}
                  reels={reels}
                  setReels={setReels}
                />
              )}

              {currentTab === "profile" && (
                <UserProfile
                  currentUser={currentUser}
                  projects={projects}
                  reels={reels}
                  onSelectProject={handleSelectProject}
                  onEditProject={(id) => {
                    const projectToEdit = projects.find(p => p.id === id);
                    if (projectToEdit) {
                      setEditingProject(projectToEdit);
                      setTab("upload");
                    }
                  }}
                  onDeleteProject={handleDeleteProject}
                  onDeleteReel={handleDeleteReel}
                  onUpdateUser={handleUpdateUser}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Registration/Auth overlays */}
      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Logout confirmation overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl w-full max-w-sm p-6 text-center space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                Confirm Sign Out
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-bold">
                Are you sure you want to log out of your current session on ProjectVerse AI?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT MESSAGES INBOX DRAWER (SLIDEOVER) */}
      <AnimatePresence>
        {inboxOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => setInboxOpen(false)} />
            
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col text-zinc-800 dark:text-zinc-200"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeChatUserId && (
                    <button 
                      onClick={() => setActiveChatUserId(null)}
                      className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-zinc-500" />
                    </button>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                      <Send className="w-4 h-4 text-violet-500 rotate-[-15deg]" />
                      Direct Messages
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-bold leading-none mt-0.5">
                      {activeChatUserId ? "Active developer thread" : "Inboxes & blueprint shares"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setInboxOpen(false)}
                  className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto flex flex-col">
                {activeChatUserId === null ? (
                  /* CONVERSATIONS LIST VIEW */
                  <div className="p-4 space-y-4">
                    {/* List developers */}
                    <div className="space-y-1 text-left">
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Developer Threads</span>
                      <div className="space-y-1">
                        {allUsersList.filter(u => {
                          const loggedInId = currentUser?.id || "user_suryasekhar";
                          const mappedLoggedInId = loggedInId === "usr_1" ? "user_suryasekhar" : loggedInId;
                          const mappedUserId = u.id === "usr_1" ? "user_suryasekhar" : u.id;
                          return mappedUserId !== mappedLoggedInId;
                        }).map(userItem => {
                          const normalizedMyId = (currentUser?.id === "usr_1") ? "user_suryasekhar" : (currentUser?.id || "user_suryasekhar");
                          const userDMs = messages.filter(
                            m => (m.senderId === userItem.id && m.recipientId === normalizedMyId) || 
                                 (m.senderId === normalizedMyId && m.recipientId === userItem.id)
                          );
                          const lastMsg = userDMs[userDMs.length - 1];
                          const unreadCount = userDMs.filter(m => m.senderId === userItem.id && m.recipientId === normalizedMyId && !m.read).length;
                          
                          return (
                            <div 
                              key={userItem.id}
                              onClick={() => setActiveChatUserId(userItem.id)}
                              className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all border ${
                                unreadCount > 0 
                                  ? "bg-violet-500/5 dark:bg-violet-500/5 border-violet-200/50 dark:border-violet-900/40" 
                                  : "border-transparent hover:border-zinc-150 dark:hover:border-zinc-800"
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center font-black text-violet-700 dark:text-violet-300 text-sm relative shrink-0">
                                {userItem.name.charAt(0)}
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-950" />
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <div className="flex justify-between items-baseline gap-2">
                                  <p className={`text-xs font-bold leading-none mb-1 truncate ${unreadCount > 0 ? "text-violet-600 dark:text-violet-400" : "text-zinc-900 dark:text-white"}`}>
                                    {userItem.name}
                                  </p>
                                  <div className="flex flex-col items-end shrink-0">
                                    {lastMsg && (
                                      <span className="text-[8px] text-zinc-400 font-bold mb-0.5">
                                        {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    )}
                                    {unreadCount > 0 && (
                                      <span className="px-1.5 py-0.5 rounded-full bg-violet-600 text-white text-[8px] font-black leading-none min-w-[14px] text-center">
                                        {unreadCount}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-[10px] text-zinc-400 font-bold truncate">
                                  {userItem.college || userItem.collegeName || "Engineering Scholar"}
                                </p>
                                <p className={`text-xs truncate mt-1 ${unreadCount > 0 ? "font-bold text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                                  {lastMsg && lastMsg.senderId === normalizedMyId && (
                                    <span className={`font-black text-[11px] mr-1 ${lastMsg.read ? "text-sky-500" : "text-zinc-400"}`}>
                                      {lastMsg.read ? "✓✓" : "✓"}
                                    </span>
                                  )}
                                  {lastMsg ? lastMsg.text : "No messages yet. Send a blueprint spec!"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ACTIVE CHAT DIALOGUE VIEW */
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Active User mini info */}
                    {(() => {
                      const chatPartner = allUsersList.find(u => u.id === activeChatUserId);
                      if (!chatPartner) return null;
                      
                      const normalizedMyId = (currentUser?.id === "usr_1") ? "user_suryasekhar" : (currentUser?.id || "user_suryasekhar");
                      const threadMessages = messages.filter(
                        m => (m.senderId === chatPartner.id && m.recipientId === normalizedMyId) || 
                             (m.senderId === normalizedMyId && m.recipientId === chatPartner.id)
                      );
                      
                      return (
                        <>
                          <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-150 dark:border-zinc-800 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center font-bold text-xs text-violet-700 dark:text-violet-300">
                              {chatPartner.name.charAt(0)}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-zinc-900 dark:text-white leading-none">{chatPartner.name}</p>
                              <p className="text-[9px] text-zinc-400 font-bold leading-none mt-0.5 truncate max-w-[280px]">
                                {chatPartner.college || chatPartner.collegeName || "Engineering Scholar"}
                              </p>
                            </div>
                          </div>
                          
                          {/* Messages scrolling stack */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
                            {threadMessages.length === 0 ? (
                              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
                                <MessageCircle className="w-8 h-8 text-violet-300 dark:text-violet-700 animate-pulse" />
                                <p className="text-xs text-zinc-400 font-bold leading-relaxed">
                                  No message history.<br/>Send a message or share a Spec Reel to start collaborating!
                                </p>
                              </div>
                            ) : (
                              threadMessages.map(msg => {
                                const isMe = msg.senderId === normalizedMyId;
                                return (
                                  <div 
                                    key={msg.id}
                                    className={`flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                                  >
                                    <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed text-left ${
                                      isMe 
                                        ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-tr-none shadow" 
                                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800"
                                    }`}>
                                      {/* Message text */}
                                      <p>{msg.text}</p>
                                      
                                      {/* Shared reel attachment preview card */}
                                      {msg.reelId && (
                                        <div className="mt-2.5 p-3 rounded-xl bg-black/20 text-white text-left space-y-2 border border-white/5">
                                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-violet-200 tracking-wider">
                                            <Sparkles className="w-3 h-3 text-violet-200" />
                                            <span>Attached Spec Reel</span>
                                          </div>
                                          <p className="text-xs font-extrabold text-white leading-tight">{msg.reelTitle}</p>
                                          <p className="text-[10px] text-zinc-200 font-semibold line-clamp-2 leading-snug">{msg.reelDescription}</p>
                                          
                                          <button
                                            onClick={() => {
                                              setActiveReelIdToPlay(msg.reelId);
                                              setTab("reels");
                                              setInboxOpen(false);
                                            }}
                                            className="w-full py-2 bg-violet-600 hover:bg-violet-700 font-black text-[10px] uppercase text-white rounded-lg transition-colors flex items-center justify-center gap-1 mt-1 shadow-lg shadow-violet-700/20"
                                          >
                                            <span>▶ Watch Blueprint Reel</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 px-1">
                                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-bold">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                      {isMe && (
                                        <span 
                                          className={`text-[10px] font-black leading-none ${msg.read ? "text-sky-500" : "text-zinc-400 dark:text-zinc-500"}`}
                                          title={msg.read ? `Seen ${msg.readAt ? new Date(msg.readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}` : "Sent"}
                                        >
                                          {msg.read ? "✓✓" : "✓"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Message input field */}
                          <div className="p-3 border-t border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex gap-2">
                            <input 
                              type="text"
                              placeholder="Write a message..."
                              value={chatInputText}
                              onChange={(e) => setChatInputText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && chatInputText.trim()) {
                                  e.preventDefault();
                                  // trigger submit message
                                  const sendBtn = document.getElementById("send-msg-btn");
                                  if (sendBtn) sendBtn.click();
                                }
                              }}
                              className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-violet-500 text-zinc-800 dark:text-zinc-100"
                            />
                            <button
                              id="send-msg-btn"
                              disabled={!chatInputText.trim() || sendingMsg}
                              onClick={async () => {
                                if (!chatInputText.trim()) return;
                                setSendingMsg(true);
                                try {
                                  await robustFetch("/api/dms", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      "authorization": currentUser?.id || "user_suryasekhar"
                                    },
                                    body: JSON.stringify({
                                      recipientId: activeChatUserId,
                                      text: chatInputText
                                    })
                                  });
                                  setChatInputText("");
                                  
                                  // Instantly fetch DMs to update local message stack
                                  const res = await robustFetch("/api/dms", {
                                    headers: {
                                      "authorization": currentUser?.id || "user_suryasekhar"
                                    }
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setMessages(data);
                                  }
                                } catch (err) {
                                  console.error("Error sending message:", err);
                                } finally {
                                  setSendingMsg(false);
                                }
                              }}
                              className="px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl transition-all shadow shadow-violet-600/15 flex items-center justify-center"
                            >
                              {sendingMsg ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Send className="w-4 h-4 rotate-[-15deg]" />
                              )}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
