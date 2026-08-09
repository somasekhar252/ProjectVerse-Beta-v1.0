import React, { useState, useMemo } from "react";
import { Search, SlidersHorizontal, Heart, MessageSquare, Bookmark, Calendar, Users, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Project } from "../types";

interface ProjectDiscoverProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
}

export default function ProjectDiscover({
  projects,
  onSelectProject
}: ProjectDiscoverProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  // Available unique fields computed from dataset
  const categories = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];
  const difficulties = ["All", "Beginner", "Intermediate", "Advanced", "Expert"];
  const branches = ["All", ...Array.from(new Set(projects.map((p) => p.branch)))];

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Search text filter (fuzzy match title, description, stack, objectives)
      const q = search.toLowerCase();
      const matchesSearch = !search || 
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.technologyStack.some((t) => t.toLowerCase().includes(q)) ||
        (p.problemStatement && p.problemStatement.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === "All" || p.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesDifficulty = selectedDifficulty === "All" || p.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
      const matchesBranch = selectedBranch === "All" || p.branch.toLowerCase() === selectedBranch.toLowerCase();

      return matchesSearch && matchesCategory && matchesDifficulty && matchesBranch;
    });
  }, [projects, search, selectedCategory, selectedDifficulty, selectedBranch]);

  const [sortBy, setSortBy] = useState<"recent" | "liked" | "difficulty">("recent");

  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    if (sortBy === "recent") {
      return list.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    } else if (sortBy === "liked") {
      return list.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (sortBy === "difficulty") {
      const weights: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };
      return list.sort((a, b) => (weights[b.difficulty] || 0) - (weights[a.difficulty] || 0));
    }
    return list;
  }, [filteredProjects, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("All");
    setSelectedDifficulty("All");
    setSelectedBranch("All");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="space-y-1.5">
        <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Discover Projects
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          Browse {sortedProjects.length} engineering projects with full architectural blueprints
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, technologies, domains..."
            className="w-full pl-11 pr-4 py-3 glass-input text-sm font-semibold text-zinc-800 dark:text-white"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-4 py-3 glass-input text-sm font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            <option value="recent">🕒 Most Recent</option>
            <option value="liked">❤️ Most Liked</option>
            <option value="difficulty">⚡ Difficulty Level</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-[16px] text-sm font-bold transition-all ${
              showFilters || selectedCategory !== "All" || selectedDifficulty !== "All" || selectedBranch !== "All"
                ? "clay-btn text-white"
                : "glass-input text-zinc-700 dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-black/50"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {(selectedCategory !== "All" || selectedDifficulty !== "All" || selectedBranch !== "All") && (
              <span className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Filters Drawer */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-5 glass-panel rounded-[28px] grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Category Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-bold text-zinc-800 dark:text-zinc-200"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Difficulty Level
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-bold text-zinc-800 dark:text-zinc-200"
                >
                  {difficulties.map((diff) => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>

              {/* Branch Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Engineering Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 glass-input text-xs font-bold text-zinc-800 dark:text-zinc-200"
                >
                  {branches.map((br) => (
                    <option key={br} value={br}>{br}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active chips summary row */}
      {(selectedCategory !== "All" || selectedDifficulty !== "All" || selectedBranch !== "All" || search) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-400 font-bold">Active filters:</span>
          {search && (
            <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold flex items-center gap-1.5">
              Query: "{search}"
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch("")} />
            </span>
          )}
          {selectedCategory !== "All" && (
            <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold flex items-center gap-1.5">
              Category: {selectedCategory}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory("All")} />
            </span>
          )}
          {selectedDifficulty !== "All" && (
            <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold flex items-center gap-1.5">
              Difficulty: {selectedDifficulty}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDifficulty("All")} />
            </span>
          )}
          {selectedBranch !== "All" && (
            <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold flex items-center gap-1.5">
              Branch: {selectedBranch}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBranch("All")} />
            </span>
          )}
          <button 
            onClick={clearFilters}
            className="text-violet-600 dark:text-violet-400 font-extrabold hover:underline pl-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Project Grid */}
      {sortedProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProjects.map((p) => (
            <motion.div
              layout
              key={p.id}
              whileHover={{ y: -4 }}
              onClick={() => onSelectProject(p.id)}
              className="clay-card overflow-hidden cursor-pointer flex flex-col h-full border-none"
            >
              <div className="h-44 w-full bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden">
                <img
                  src={p.screenshots && p.screenshots[0] ? p.screenshots[0] : "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&auto=format&fit=crop&q=60"}
                  alt={p.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                    {p.category}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-violet-600 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                    {p.difficulty}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider">
                      {p.branch}
                    </span>
                    {p.qualityScore && (
                      <span className="px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 font-black text-[9px] uppercase tracking-wide">
                        Score: {p.qualityScore}%
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-base text-zinc-900 dark:text-white tracking-tight line-clamp-1 hover:text-violet-600 transition-colors">
                    {p.title}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {p.technologyStack.slice(0, 4).map((tech, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 text-[9px] font-bold border border-zinc-100 dark:border-zinc-800"
                    >
                      {tech}
                    </span>
                  ))}
                  {p.technologyStack.length > 4 && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-950 text-zinc-400 text-[9px] font-bold">
                      +{p.technologyStack.length - 4}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/60 text-zinc-400 text-xs font-semibold">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 hover:text-rose-500 transition-colors">
                      <Heart className="w-3.5 h-3.5" />
                      {p.likes.length}
                    </span>
                    <span className="flex items-center gap-1 hover:text-violet-500 transition-colors">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {p.commentsCount}
                    </span>
                    <span className="flex items-center gap-1 hover:text-amber-500 transition-colors">
                      <Bookmark className="w-3.5 h-3.5" />
                      {p.saves.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{p.teamSize} members</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center space-y-4">
          <div className="text-4xl">🔍</div>
          <h3 className="font-extrabold text-lg text-zinc-800 dark:text-white">
            No projects matched your criteria
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Try adjusting your search terms, categories, difficulties, or branches to find matching blueprints.
          </p>
          <button
            onClick={clearFilters}
            className="px-5 py-2.5 bg-violet-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all shadow"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
