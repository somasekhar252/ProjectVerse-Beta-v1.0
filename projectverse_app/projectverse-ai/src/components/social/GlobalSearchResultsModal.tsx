import React, { useState, useEffect } from "react";
import { User, Project, Reel } from "../../types";
import { searchUsersInFirestore } from "../../lib/socialService";
import FollowButton from "./FollowButton";
import CreatorNotificationButton from "./CreatorNotificationButton";
import UserAvatar from "./UserAvatar";
import { User as UserIcon, Code, Video, X, ArrowRight, ShieldCheck, Award } from "lucide-react";

interface GlobalSearchResultsModalProps {
  searchQuery: string;
  currentUser: User | null;
  projects: Project[];
  reels: Reel[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateProfile: (userId: string) => void;
  onSelectProject: (project: Project) => void;
  onSelectReel: (reel: Reel) => void;
}

export default function GlobalSearchResultsModal({
  searchQuery,
  currentUser,
  projects,
  reels,
  isOpen,
  onClose,
  onNavigateProfile,
  onSelectProject,
  onSelectReel
}: GlobalSearchResultsModalProps) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [matchingUsers, setMatchingUsers] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Debounce input 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Perform search on debounced query change
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setMatchingUsers([]);
      return;
    }

    let isMounted = true;
    setIsSearchingUsers(true);

    searchUsersInFirestore(debouncedQuery, 8)
      .then((users) => {
        if (isMounted) {
          setMatchingUsers(users);
          setIsSearchingUsers(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsSearchingUsers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  if (!isOpen || !searchQuery.trim()) return null;

  const q = debouncedQuery.toLowerCase();

  // Filter projects matching search query
  const matchingProjects = projects.filter((p) => {
    if (!q) return false;
    const titleMatch = p.title?.toLowerCase().includes(q);
    const descMatch = p.description?.toLowerCase().includes(q);
    const ownerMatch = p.ownerName?.toLowerCase().includes(q);
    const branchMatch = p.branch?.toLowerCase().includes(q);
    const techMatch = p.technologyStack?.some((t) => t.toLowerCase().includes(q));
    return titleMatch || descMatch || ownerMatch || branchMatch || techMatch;
  }).slice(0, 5);

  // Filter reels matching search query
  const matchingReels = reels.filter((r) => {
    if (!q) return false;
    const titleMatch = r.title?.toLowerCase().includes(q);
    const descMatch = r.description?.toLowerCase().includes(q);
    const creatorMatch = (r.creatorName || r.ownerName)?.toLowerCase().includes(q);
    const categoryMatch = r.category?.toLowerCase().includes(q);
    const hashtagsMatch = (r.hashtags || []).some((t) => t.toLowerCase().includes(q));
    return titleMatch || descMatch || creatorMatch || categoryMatch || hashtagsMatch;
  }).slice(0, 5);

  const hasNoResults = !isSearchingUsers && matchingUsers.length === 0 && matchingProjects.length === 0 && matchingReels.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Social Graph Discovery
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              • Results for &ldquo;{searchQuery}&rdquo;
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Content Body */}
        <div className="p-4 overflow-y-auto space-y-6 flex-1 scrollbar-thin">

          {/* SECTION 1: PEOPLE (USER PROFILES) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <UserIcon className="w-3.5 h-3.5 text-violet-500" />
                <span>People & Innovators ({matchingUsers.length})</span>
              </div>
              {isSearchingUsers && (
                <span className="text-[10px] text-violet-500 font-semibold animate-pulse">Searching profiles...</span>
              )}
            </div>

            {matchingUsers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchingUsers.map((u) => {
                  const isSelf = currentUser && currentUser.id === u.id;
                  const userHandle = u.username || u.name.toLowerCase().replace(/\s+/g, "_");
                  const avatarUrl = u.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.id}`;

                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        onNavigateProfile(u.id);
                        onClose();
                      }}
                      className="group p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <UserAvatar
                          userId={u.id}
                          avatarUrl={u.avatarUrl}
                          name={u.name}
                          size="md"
                          showBorder={true}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-violet-600 transition-colors">
                              {u.name}
                            </h4>
                            <ShieldCheck className="w-3 h-3 text-violet-500 shrink-0" />
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            @{userHandle} • {u.collegeName || u.college || u.role || "Innovator"}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!isSelf && currentUser && (
                          <>
                            <FollowButton
                              currentUser={currentUser}
                              targetUserId={u.id}
                              size="sm"
                            />
                            <CreatorNotificationButton
                              currentUser={currentUser}
                              creatorId={u.id}
                              size="sm"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              !isSearchingUsers && (
                <div className="p-3 text-center rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-xs text-zinc-400 italic">
                  No matching user profiles found
                </div>
              )
            )}
          </div>

          {/* SECTION 2: PROJECTS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
              <Code className="w-3.5 h-3.5 text-emerald-500" />
              <span>Blueprints & Projects ({matchingProjects.length})</span>
            </div>

            {matchingProjects.length > 0 ? (
              <div className="space-y-2">
                {matchingProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-between gap-3 cursor-pointer transition-all hover:border-emerald-500/40"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-zinc-900 dark:text-white truncate hover:text-emerald-500 transition-colors">
                          {p.title}
                        </h4>
                        {p.branch && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-700/60 text-[9px] font-bold text-zinc-600 dark:text-zinc-300 uppercase">
                            {p.branch}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {p.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-xs text-zinc-400 italic">
                No matching projects found
              </div>
            )}
          </div>

          {/* SECTION 3: REELS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
              <Video className="w-3.5 h-3.5 text-rose-500" />
              <span>Spec Reels ({matchingReels.length})</span>
            </div>

            {matchingReels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchingReels.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      onSelectReel(r);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center gap-2.5 cursor-pointer transition-all hover:border-rose-500/40"
                  >
                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 font-black text-xs shrink-0">
                      ▶
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {r.title}
                      </h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        by {r.creatorName || "Innovator"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 text-xs text-zinc-400 italic">
                No matching spec reels found
              </div>
            )}
          </div>

          {/* Empty State when zero results across all categories */}
          {hasNoResults && (
            <div className="py-10 text-center space-y-2">
              <Award className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                No profiles, projects, or reels matching &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-[11px] text-zinc-400">
                Try searching for a developer&apos;s name, college name, branch, or technology stack.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
