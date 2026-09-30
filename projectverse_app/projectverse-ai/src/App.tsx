import React, { useState, useEffect, useRef } from "react";
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
import { User, Project, Reel, AppNotification, sanitizeProject, sanitizeReel } from "./types";
import { Sparkles, Compass, User as UserIcon, Send, MessageCircle, Check, X, Search, ChevronLeft, Sun, Moon, Bell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import NotificationCenter from "./components/social/NotificationCenter";
import GlobalSearchResultsModal from "./components/social/GlobalSearchResultsModal";
import UserAvatar from "./components/social/UserAvatar";
import DirectMessagesDrawer from "./components/social/DirectMessagesDrawer";
import { subscribeToUserNotifications } from "./lib/socialService";
import { subscribeToReelsFromFirestore } from "./lib/reelService";
import { robustFetch } from "./utils/api";
import { fetchUserDMsFromFirestore } from "./lib/chatService";
import { supabase } from "./lib/supabase";
import { syncUserProfile, updateUserProfile } from "./lib/supabaseService";
import { 
  mapFirebaseUserToAppUser, 
  observeFirebaseAuth, 
  signOutFirebase, 
  fetchProjectsFromFirestore,
  fetchReelsFromFirestore,
  deleteProjectFromFirestore,
  seedInitialProjectsIfEmpty
} from "./lib/firebase";
import { DEFAULT_PROJECTS } from "./lib/projectService";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setTab] = useState("home");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const fetchProjectsFallback = async () => {
    try {
      const res = await robustFetch("/api/projects", { silent: true, retries: 1 } as any);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return setProjects(data.map(p => sanitizeProject(p)));
        }
      }
    } catch (e: any) {
      console.debug("Fallback projects fetch complete (Express offline).");
    }
    // Final safe fallback: DEFAULT_PROJECTS
    setProjects(DEFAULT_PROJECTS.map(p => sanitizeProject(p)));
  };
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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Social Interaction & Notification System States
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userNotifications, setUserNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Single Real-Time Notification Listener across entire application lifecycle
  useEffect(() => {
    if (!currentUser || !currentUser.id) {
      setUserNotifications([]);
      setUnreadNotificationsCount(0);
      return;
    }
    const unsubscribe = subscribeToUserNotifications(currentUser.id, (notifs) => {
      setUserNotifications(notifs);
      const unread = notifs.filter(n => !n.read).length;
      setUnreadNotificationsCount(unread);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Helper to change tab with browser history stack integration for Back/Forward support
  const changeTab = (newTab: string, projId: string | null = null, profileId: string | null = null, replace = false) => {
    setTab(newTab);
    setSelectedProjectId(projId);
    setViewProfileUserId(profileId);

    if (typeof window !== "undefined" && window.history) {
      const stateObj = { tab: newTab, selectedProjectId: projId, viewProfileUserId: profileId };
      const hash = projId ? `#detail-${projId}` : profileId ? `#profile-${profileId}` : `#${newTab}`;
      if (replace) {
        window.history.replaceState(stateObj, "", hash);
      } else {
        window.history.pushState(stateObj, "", hash);
      }
    }
  };

  // Sync navigation on browser Back and Forward button clicks (popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setTab(e.state.tab);
        setSelectedProjectId(e.state.selectedProjectId || null);
        setViewProfileUserId(e.state.viewProfileUserId || null);
      } else if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash.slice(1);
        if (hash.startsWith("detail-")) {
          setTab("detail");
          setSelectedProjectId(hash.replace("detail-", ""));
        } else if (hash.startsWith("profile-")) {
          setTab("profile");
          setViewProfileUserId(hash.replace("profile-", ""));
        } else if (hash) {
          setTab(hash);
        }
      } else {
        setTab("home");
        setSelectedProjectId(null);
        setViewProfileUserId(null);
      }
    };

    window.addEventListener("popstate", handlePopState);

    // Initial URL hash sync on load
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.slice(1);
      if (hash.startsWith("detail-")) {
        setTab("detail");
        setSelectedProjectId(hash.replace("detail-", ""));
      } else if (hash.startsWith("profile-")) {
        setTab("profile");
        setViewProfileUserId(hash.replace("profile-", ""));
      } else if (["home", "discover", "reels", "upload", "ai-gen", "profile", "ai-settings"].includes(hash)) {
        setTab(hash);
      }
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigateProfile = (userId: string) => {
    changeTab("profile", null, userId);
  };

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

  const hasLoggedDMErrorRef = useRef(false);

  // Poll for direct messages every 3 seconds to keep chat real-time
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchDMs = async () => {
      try {
        const res = await robustFetch("/api/dms", {
          headers: {
            "authorization": currentUser.id
          },
          silent: true,
          retries: 1
        } as any);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          hasLoggedDMErrorRef.current = false;
          return;
        }
      } catch (err: any) {
        if (!hasLoggedDMErrorRef.current) {
          hasLoggedDMErrorRef.current = true;
          console.debug("Local /api/dms offline, using Firestore DMs fallback.");
        }
        try {
          const fsMessages = await fetchUserDMsFromFirestore(currentUser.id);
          if (fsMessages && fsMessages.length > 0) {
            setMessages(fsMessages);
          }
        } catch (fsErr) {
          // Quiet handling for offline fallback
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
            body: JSON.stringify({ senderId: activeChatUserId }),
            silent: true,
            retries: 1
          } as any);
          if (res.ok) {
            // Instantly fetch updated DMs to synchronize state locally
            const fetchRes = await robustFetch("/api/dms", {
              headers: {
                "authorization": currentUser.id
              },
              silent: true,
              retries: 1
            } as any);
            if (fetchRes.ok) {
              const data = await fetchRes.json();
              setMessages(data);
            }
          }
        } catch (err) {
          console.debug("Offline: Error marking messages as read via API:", err);
        }
      }
    };

    markAsRead();
  }, [activeChatUserId, messages, currentUser]);

  // Fetch users list for DM selections
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await robustFetch("/api/users", { silent: true, retries: 1 } as any);
        if (res.ok) {
          const data = await res.json();
          setAllUsersList(data);
        }
      } catch (err: any) {
        console.debug("Local /api/users offline (using Firestore/static user context).");
      }
    };
    fetchUsers();
  }, []);

  // Check for ?reel={reelId} deep link parameter on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reelParam = params.get("reel") || params.get("reelId");
    if (reelParam) {
      setActiveReelIdToPlay(reelParam);
      setTab("reels");
    }
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
          const res = await robustFetch("/api/projects", { silent: true, retries: 1 } as any);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              localProjects = data.map(p => sanitizeProject(p));
            }
          }
        } catch (err) {
          console.debug("Local /api/projects offline, fallback to Firestore projects.");
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
          const reelsRes = await robustFetch("/api/reels", { silent: true, retries: 1 } as any);
          if (reelsRes.ok) {
            const data = await reelsRes.json();
            if (Array.isArray(data)) {
              localReels = data.map(r => sanitizeReel(r));
            }
          }
        } catch (err) {
          console.debug("Local /api/reels offline, fallback to Firestore reels.");
        }

        let firestoreReels: Reel[] = [];
        try {
          const rawDb = await fetchReelsFromFirestore();
          if (Array.isArray(rawDb)) {
            firestoreReels = rawDb.map(r => sanitizeReel(r));
          }
        } catch (err) {
          console.warn("Firestore fetch reels warning:", err);
        }

        const mergedReels = new Map<string, Reel>();
        localReels.forEach(r => {
          const s = sanitizeReel(r);
          mergedReels.set(s.id, s);
        });
        firestoreReels.forEach(r => {
          const s = sanitizeReel(r);
          mergedReels.set(s.id, s);
        });
        const sortedReels = Array.from(mergedReels.values()).sort((a, b) => {
          const timeA = new Date(a.createdDate || a.createdAt || 0).getTime();
          const timeB = new Date(b.createdDate || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        setReels(sortedReels);

      } catch (err) {
        console.debug("Data loading fallback trigger:", err);
        await fetchProjectsFallback();
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationData();
  }, []);

  // Real-time Firestore Reels Listener
  useEffect(() => {
    const unsubscribeReels = subscribeToReelsFromFirestore((realTimeReels) => {
      setReels(prevReels => {
        const mergedReels = new Map<string, Reel>();
        prevReels.forEach(r => {
          const s = sanitizeReel(r);
          mergedReels.set(s.id, s);
        });
        realTimeReels.forEach(r => {
          const s = sanitizeReel(r);
          mergedReels.set(s.id, s);
        });
        return Array.from(mergedReels.values()).sort((a, b) => {
          const timeA = new Date(a.createdDate || a.createdAt || 0).getTime();
          const timeB = new Date(b.createdDate || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
      });
    });

    return () => {
      unsubscribeReels();
    };
  }, []);

  const fetchProjects = async () => {
    try {
      // 1. Fetch local projects
      let localProjects: Project[] = [];
      try {
        const res = await robustFetch("/api/projects", { silent: true, retries: 1 } as any);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            localProjects = data.map(p => sanitizeProject(p));
          }
        }
      } catch (err) {
        console.debug("Local /api/projects offline.");
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
        const reelsRes = await robustFetch("/api/reels", { silent: true, retries: 1 } as any);
        if (reelsRes.ok) {
          const data = await reelsRes.json();
          if (Array.isArray(data)) {
            localReels = data.map(r => sanitizeReel(r));
          }
        }
      } catch (err) {
        console.debug("Local /api/reels offline.");
      }

      let dbReels: Reel[] = [];
      try {
        const rawDb = await fetchReelsFromFirestore();
        if (Array.isArray(rawDb)) {
          dbReels = rawDb.map(r => sanitizeReel(r));
        }
      } catch (err) {
        console.warn("Firestore fetch reels error:", err);
      }

      const mergedReels = new Map<string, Reel>();
      localReels.forEach(r => {
        const s = sanitizeReel(r);
        mergedReels.set(s.id, s);
      });
      dbReels.forEach(r => {
        const s = sanitizeReel(r);
        mergedReels.set(s.id, s);
      });
      const sortedReels = Array.from(mergedReels.values()).sort((a, b) => {
        const timeA = new Date(a.createdDate || a.createdAt || 0).getTime();
        const timeB = new Date(b.createdDate || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
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
    changeTab("detail", id, null);
  };

  const handlePublishSuccess = async (newProjectId?: string) => {
    await Promise.all([fetchProjects(), fetchReels()]);
    if (newProjectId) {
      changeTab("detail", newProjectId, null);
    } else {
      changeTab("profile", null, null);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!currentUser) return;
    const targetProject = projects.find(p => p.id === id);
    if (targetProject) {
      const isOwner = String(currentUser.id) === String(targetProject.ownerId || targetProject.creatorId);
      if (!isOwner) {
        alert("Unauthorized: Only the project owner can delete this project.");
        return;
      }
    }
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    try {
      // 1. Delete from backend DB / REST (if available)
      fetch(`/api/projects/${id}`, {
        method: "DELETE",
        headers: { "authorization": currentUser.id }
      }).catch(console.warn);

      // 2. Also delete from Firebase if we saved there
      await import("./lib/firebase").then(m => m.deleteProjectFromFirestore(id, currentUser.id)).catch(console.warn);
      
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
          changeTab(newTab, null, null);
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
          </div>

          {/* Site-wide search bar */}
          <div className="flex-1 max-w-xs md:max-w-md relative mx-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search people, projects, reels, stacks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) setIsSearchModalOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setIsSearchModalOpen(true);
              }}
              className="w-full pl-10 pr-8 py-2.5 text-xs glass-input text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 font-bold"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchModalOpen(false);
                }}
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
              <>
                {/* Global Notification Bell Button */}
                <button 
                  onClick={() => setNotificationsOpen(true)}
                  className="p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-300 border border-zinc-150 dark:border-zinc-800 transition-all relative group cursor-pointer"
                  title="Notifications Center"
                >
                  <Bell className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full border-2 border-white dark:border-[#09090b] shadow-xs">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {/* Direct Messages Inbox Button */}
                <button 
                  onClick={() => {
                    setActiveChatUserId(null); // default to conversations list
                    setInboxOpen(true);
                  }}
                  className="p-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-300 border border-zinc-150 dark:border-zinc-800 transition-all relative group cursor-pointer"
                  title="Direct Messages Inbox"
                >
                  <Send className="w-4 h-4 text-violet-500 dark:text-violet-400 rotate-[-15deg]" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#09090b]" />
                </button>
              </>
            )}

            {currentUser ? (
              <div 
                onClick={() => {
                  setSelectedProjectId(null);
                  setViewProfileUserId(null);
                  setTab("profile");
                }}
                className="flex items-center gap-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 px-3 py-1.5 rounded-xl transition-all"
              >
                <UserAvatar
                  userId={currentUser.id}
                  avatarUrl={currentUser.avatarUrl}
                  name={currentUser.name}
                  size="sm"
                />
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
                  onNavigateProfile={handleNavigateProfile}
                />
              )}

              {currentTab === "discover" && (
                <ProjectDiscover
                  projects={filteredProjects}
                  onSelectProject={handleSelectProject}
                  currentUser={currentUser}
                  onNavigateProfile={handleNavigateProfile}
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
                  onNavigateProfile={handleNavigateProfile}
                />
              )}

              {currentTab === "upload" && (
                <ProjectUpload
                  currentUser={currentUser}
                  existingProjects={projects}
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
                  onNavigateProfile={handleNavigateProfile}
                />
              )}

              {currentTab === "profile" && (
                <UserProfile
                  currentUser={currentUser}
                  viewProfileUserId={viewProfileUserId}
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
                  onSelectReel={(selectedReel) => {
                    setActiveReelIdToPlay(selectedReel.id);
                    setTab("reels");
                  }}
                  onUpdateUser={handleUpdateUser}
                  onOpenDM={(targetId) => {
                    setActiveChatUserId(targetId);
                    setInboxOpen(true);
                  }}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Global Real-Time Notification Center Drawer */}
      <NotificationCenter
        currentUser={currentUser}
        notifications={userNotifications}
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNavigateTarget={(type, targetId) => {
          if (type === "user" && targetId) {
            handleNavigateProfile(targetId);
          } else if (type === "project" && targetId) {
            setSelectedProjectId(targetId);
            setTab("detail");
          } else if (type === "reel" && targetId) {
            setActiveReelIdToPlay(targetId);
            setTab("reels");
          }
        }}
      />

      {/* Global Social Graph Profile & Content Search Modal */}
      <GlobalSearchResultsModal
        searchQuery={searchQuery}
        currentUser={currentUser}
        projects={projects}
        reels={reels}
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigateProfile={(userId) => {
          handleNavigateProfile(userId);
          setIsSearchModalOpen(false);
        }}
        onSelectProject={(project) => {
          setSelectedProjectId(project.id);
          setTab("detail");
          setIsSearchModalOpen(false);
        }}
        onSelectReel={(reel) => {
          setActiveReelIdToPlay(reel.id);
          setTab("reels");
          setIsSearchModalOpen(false);
        }}
      />

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
        {/* REAL-TIME FIRESTORE DIRECT MESSAGING DRAWER */}
        {currentUser && (
          <DirectMessagesDrawer
            currentUser={currentUser}
            isOpen={inboxOpen}
            onClose={() => setInboxOpen(false)}
            activeTargetUserId={activeChatUserId}
            onNavigateProfile={handleNavigateProfile}
            onPlayReel={(reelId) => {
              setActiveReelIdToPlay(reelId);
              setTab("reels");
              setInboxOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
