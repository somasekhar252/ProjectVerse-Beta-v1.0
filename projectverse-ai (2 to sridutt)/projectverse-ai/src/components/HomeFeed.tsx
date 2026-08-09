import React, { useState, useMemo } from "react";
import { Sparkles, Compass, Heart, MessageSquare, Bookmark, Calendar, Users, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Project, User } from "../types";

interface HomeFeedProps {
  projects: Project[];
  currentUser: User | null;
  onSelectProject: (id: string) => void;
  setTab: (tab: string) => void;
}

export default function HomeFeed({
  projects,
  currentUser,
  onSelectProject,
  setTab
}: HomeFeedProps) {
  const [sortBy, setSortBy] = useState<"recent" | "liked" | "difficulty">("recent");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = [
    { id: "All", label: "All Fields", icon: "🌐" },
    { id: "Software", label: "Software Eng", icon: "💻" },
    { id: "Mechanical", label: "Mechanical", icon: "⚙️" },
    { id: "Civil", label: "Civil & Structural", icon: "🏗️" },
    { id: "Electrical", label: "Electrical & IoT", icon: "⚡" },
    { id: "AI", label: "AI & ML", icon: "🤖" },
    { id: "Blockchain", label: "Blockchain", icon: "🔗" }
  ];

  const filteredProjectsList = useMemo(() => {
    if (selectedCategory === "All") return projects;
    
    return projects.filter(p => {
      const cat = (p.category || "").toLowerCase();
      const title = (p.title || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      
      if (selectedCategory === "Software") {
        return (
          cat.includes("software") ||
          cat.includes("web") ||
          cat.includes("mobile") ||
          cat.includes("computer science") ||
          title.includes("software") ||
          title.includes("web") ||
          title.includes("app") ||
          title.includes("editor") ||
          title.includes("commerce") ||
          desc.includes("code") ||
          desc.includes("react")
        );
      }
      if (selectedCategory === "Mechanical") {
        return (
          cat.includes("mechanical") ||
          cat.includes("aerospace") ||
          cat.includes("robot") ||
          title.includes("mechanical") ||
          title.includes("cad") ||
          title.includes("aerospace") ||
          title.includes("robot") ||
          desc.includes("mechanical") ||
          desc.includes("engine") ||
          desc.includes("hardware") ||
          desc.includes("vehicle") ||
          desc.includes("drone")
        );
      }
      if (selectedCategory === "Civil") {
        return (
          cat.includes("civil") ||
          cat.includes("structural") ||
          title.includes("civil") ||
          title.includes("structure") ||
          title.includes("bridge") ||
          title.includes("concrete") ||
          title.includes("traffic") ||
          title.includes("urban") ||
          desc.includes("civil") ||
          desc.includes("structural") ||
          desc.includes("bridge") ||
          desc.includes("urban") ||
          desc.includes("road")
        );
      }
      if (selectedCategory === "Electrical") {
        return (
          cat.includes("iot") ||
          cat.includes("electrical") ||
          cat.includes("electronic") ||
          title.includes("iot") ||
          title.includes("electrical") ||
          title.includes("electronic") ||
          title.includes("hardware") ||
          title.includes("esp32") ||
          title.includes("arduino") ||
          title.includes("gps") ||
          title.includes("sensor") ||
          desc.includes("sensor") ||
          desc.includes("hardware") ||
          desc.includes("gps") ||
          desc.includes("circuit")
        );
      }
      if (selectedCategory === "AI") {
        return (
          cat.includes("ai") ||
          cat.includes("ml") ||
          cat.includes("machine learning") ||
          cat.includes("nlp") ||
          title.includes("ai") ||
          title.includes("ml") ||
          title.includes("machine learning") ||
          title.includes("parser") ||
          title.includes("resume") ||
          desc.includes("neural") ||
          desc.includes("ai-powered") ||
          desc.includes("nlp")
        );
      }
      if (selectedCategory === "Blockchain") {
        return (
          cat.includes("blockchain") ||
          cat.includes("crypto") ||
          title.includes("blockchain") ||
          title.includes("credentials") ||
          desc.includes("blockchain") ||
          desc.includes("ethereum") ||
          desc.includes("smart contract")
        );
      }
      
      return false;
    });
  }, [projects, selectedCategory]);

  const sortedProjects = useMemo(() => {
    const list = [...filteredProjectsList];
    if (sortBy === "recent") {
      return list.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    } else if (sortBy === "liked") {
      return list.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (sortBy === "difficulty") {
      const weights: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };
      return list.sort((a, b) => (weights[b.difficulty] || 0) - (weights[a.difficulty] || 0));
    }
    return list;
  }, [filteredProjectsList, sortBy]);

  // Sort projects for trending (highest quality score or most liked)
  const trendingProjects = useMemo(() => {
    return [...filteredProjectsList]
      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
      .slice(0, 3);
  }, [filteredProjectsList]);

  // Sort projects for recently added
  const recentlyAdded = useMemo(() => {
    return [...filteredProjectsList]
      .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
      .slice(0, 4);
  }, [filteredProjectsList]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden clay-card p-8 md:p-10">
        <div className="relative z-10 space-y-4 max-w-xl">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">{currentUser ? currentUser.name.split(" ")[0] : "Suryasekhar"}</span> 👋
          </h2>
          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
            Discover, build, and showcase engineering projects. Let AI guide your next innovation.
          </p>
          <div className="flex flex-wrap gap-3.5 pt-2">
            <button
              onClick={() => setTab("aigen")}
              className="px-5 py-3 clay-btn font-bold text-sm flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4.5 h-4.5" />
              Generate with AI
            </button>
            <button
              onClick={() => setTab("discover")}
              className="px-5 py-3 rounded-full glass-panel font-bold text-sm flex items-center gap-2 transition-all hover:bg-white/40 dark:hover:bg-black/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Compass className="w-4.5 h-4.5" />
              Explore Projects
            </button>
          </div>
        </div>
        
        {/* Background Decorative Accents */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-violet-600/10 dark:bg-violet-600/5 blur-3xl -z-10" />
        <div className="absolute right-12 top-10 w-44 h-44 rounded-full bg-indigo-600/10 dark:bg-indigo-600/5 blur-2xl -z-10" />
      </div>

      {/* Category-based Filter Bar */}
      <div className="space-y-3.5 glass-panel p-4 md:p-5 rounded-[28px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
              <span>🔧</span> Discovery Hub
            </h4>
            <p className="text-[11px] text-zinc-400 font-bold">
              Filter blueprint archives by specific engineering fields & domain stacks
            </p>
          </div>
          {selectedCategory !== "All" && (
            <button 
              onClick={() => setSelectedCategory("All")}
              className="text-[10px] font-black text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 uppercase self-start md:self-auto"
            >
              Reset Filters ×
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 -mx-1 px-1">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all duration-300 shrink-0 select-none ${
                  isActive
                    ? "clay-btn scale-[1.02] px-5"
                    : "glass-input hover:bg-white/80 dark:hover:bg-zinc-900/80"
                }`}
              >
                <span className="text-sm leading-none">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredProjectsList.length === 0 ? (
        <div className="clay-card p-8 md:p-12 text-center space-y-4 max-w-xl mx-auto mt-6">
          <div className="w-16 h-16 bg-violet-100 dark:bg-violet-950/50 rounded-full flex items-center justify-center mx-auto text-3xl">
            🛠️
          </div>
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-base text-zinc-900 dark:text-white">No blueprints in "{selectedCategory}" yet</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Be the first to create or generate an elite engineering project in this category! Use our state-of-the-art AI Generator to brainstorm a full spec.
            </p>
          </div>
          <button
            onClick={() => setTab("aigen")}
            className="px-5 py-2.5 clay-btn font-bold text-xs flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate {selectedCategory} Blueprint</span>
          </button>
        </div>
      ) : (
        <>
          {/* Trending Projects Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">📈</span>
                <h3 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  Trending Projects
                </h3>
              </div>
              <button 
                onClick={() => setTab("discover")}
                className="text-violet-600 dark:text-violet-400 text-xs font-bold hover:underline flex items-center gap-1.5"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingProjects.map((p) => (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onSelectProject(p.id)}
                  className="clay-card overflow-hidden cursor-pointer flex flex-col h-full border-none"
                >
                  {/* Thumbnail Image */}
                  <div className="h-48 w-full bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden">
                    <img
                      src={p.screenshots && p.screenshots[0] ? p.screenshots[0] : "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60"}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {/* Overlay Chips */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                        {p.category}
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-violet-600/95 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                        {p.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-base text-zinc-900 dark:text-white tracking-tight line-clamp-1 hover:text-violet-600 transition-colors">
                        {p.title}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    {/* Tags / Tech Stack */}
                    <div className="flex flex-wrap gap-1">
                      {p.technologyStack.slice(0, 4).map((tech, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold border border-zinc-100 dark:border-zinc-800"
                        >
                          {tech}
                        </span>
                      ))}
                      {p.technologyStack.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-950 text-zinc-400 text-[10px] font-bold">
                          +{p.technologyStack.length - 4}
                        </span>
                      )}
                    </div>

                    {/* Bottom stats row */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/60 text-zinc-400 text-xs font-semibold">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 hover:text-rose-500 transition-colors">
                          <Heart className="w-3.5 h-3.5 text-zinc-400" />
                          {p.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1 hover:text-violet-500 transition-colors">
                          <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                          {p.commentsCount || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{p.duration}d</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recently Added Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">🕒</span>
                <h3 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  Recently Added
                </h3>
              </div>
              <button 
                onClick={() => setTab("discover")}
                className="text-violet-600 dark:text-violet-400 text-xs font-bold hover:underline flex items-center gap-1.5"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentlyAdded.map((p) => (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -3 }}
                  onClick={() => onSelectProject(p.id)}
                  className="clay-card overflow-hidden cursor-pointer flex flex-col h-full border-none"
                >
                  <div className="h-40 w-full bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden">
                    <img
                      src={p.screenshots && p.screenshots[0] ? p.screenshots[0] : "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&auto=format&fit=crop&q=60"}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2.5 left-2.5 flex gap-1">
                      <span className="px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-md">
                        {p.category}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-violet-600/90 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-md">
                        {p.difficulty}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white tracking-tight line-clamp-1">
                        {p.title}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {p.technologyStack.slice(0, 3).map((tech, idx) => (
                        <span 
                          key={idx} 
                          className="px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 text-[9px] font-semibold"
                        >
                          {tech}
                        </span>
                      ))}
                      {p.technologyStack.length > 3 && (
                        <span className="px-1 py-0.5 rounded bg-zinc-50 dark:bg-zinc-950 text-zinc-400 text-[9px] font-bold">
                          +{p.technologyStack.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/60 text-zinc-400 text-[10px] font-bold">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-3 h-3 text-zinc-400" />
                          {p.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3 text-zinc-400" />
                          {p.commentsCount || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <Users className="w-3 h-3" />
                        <span>{p.teamSize} members</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Dynamic Explore Section with Sorting Dropdown */}
          <div className="space-y-4 pt-4 border-t border-zinc-150 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛠️</span>
                <h3 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  All Blueprints
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="px-3 py-2 glass-input text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                >
                  <option value="recent">🕒 Most Recent</option>
                  <option value="liked">❤️ Most Liked</option>
                  <option value="difficulty">⚡ Difficulty Level</option>
                </select>
              </div>
            </div>

            {sortedProjects.length === 0 ? (
              <p className="text-xs text-zinc-400 font-bold py-6 text-center">No projects found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedProjects.map((p) => (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onSelectProject(p.id)}
                    className="clay-card overflow-hidden cursor-pointer flex flex-col h-full border-none"
                  >
                    {/* Thumbnail Image */}
                    <div className="h-44 w-full bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden">
                      <img
                        src={p.screenshots && p.screenshots[0] ? p.screenshots[0] : "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60"}
                        alt={p.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                          {p.category}
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-violet-600/95 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                          {p.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-base text-zinc-900 dark:text-white tracking-tight line-clamp-1 hover:text-violet-600 transition-colors">
                          {p.title}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      {/* Tags / Tech Stack */}
                      <div className="flex flex-wrap gap-1">
                        {p.technologyStack.slice(0, 4).map((tech, idx) => (
                          <span 
                            key={idx} 
                            className="px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold border border-zinc-100 dark:border-zinc-800"
                          >
                            {tech}
                          </span>
                        ))}
                        {p.technologyStack.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-950 text-zinc-400 text-[10px] font-bold">
                            +{p.technologyStack.length - 4}
                          </span>
                        )}
                      </div>

                      {/* Bottom stats row */}
                      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/60 text-zinc-400 text-xs font-semibold">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 hover:text-rose-500 transition-colors">
                            <Heart className="w-3.5 h-3.5 text-zinc-400" />
                            {p.likes?.length || 0}
                          </span>
                          <span className="flex items-center gap-1 hover:text-violet-500 transition-colors">
                            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                            {p.commentsCount || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{p.duration}d</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
