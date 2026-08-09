import React from "react";
import { 
  Home, 
  Compass, 
  Play, 
  UploadCloud, 
  Sparkles, 
  User as UserIcon, 
  Moon, 
  Sun, 
  LogOut,
  Settings
} from "lucide-react";
import { motion } from "motion/react";
import { User } from "../types";

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenAuth: () => void;
}

export default function Sidebar({
  currentTab,
  setTab,
  currentUser,
  onLogout,
  darkMode,
  setDarkMode,
  onOpenAuth
}: SidebarProps) {
  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "discover", label: "Discover", icon: Compass },
    { id: "reels", label: "Reels", icon: Play },
    { id: "upload", label: "Upload", icon: UploadCloud },
    { id: "aigen", label: "AI Gen", icon: Sparkles },
    { id: "profile", label: "Profile", icon: UserIcon }
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-y-0 border-l-0 !border-r-[rgba(255,255,255,0.2)] dark:!border-r-[rgba(255,255,255,0.05)] h-screen fixed left-0 top-0 z-20 text-zinc-700 dark:text-zinc-300 shadow-xl rounded-none">
        {/* Brand Header */}
        <div className="p-6 border-b border-[rgba(255,255,255,0.2)] dark:border-[rgba(255,255,255,0.05)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl clay-btn flex items-center justify-center text-white font-black text-xl">
            P
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-zinc-900 dark:text-white">
              ProjectVerse
            </h1>
            <span className="text-[10px] uppercase tracking-widest font-black text-blue-600 dark:text-blue-400">
              Blueprint Universe
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative ${
                  isActive 
                    ? "text-white font-bold" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 clay-btn -z-10 !shadow-none"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-500"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Account / Settings footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          {currentUser ? (
            <div className="flex items-center gap-3 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl mb-2">
              <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center text-violet-700 dark:text-violet-300 font-bold uppercase text-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {currentUser.role || "Innovator"} • {currentUser.collegeName || "IISc"}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full py-2.5 px-4 clay-btn text-xs font-bold"
            >
              Sign In / Register
            </button>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 glass-input text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer hover:bg-white/50 dark:hover:bg-black/50"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {/* Logout Button */}
            {currentUser && (
              <button
                onClick={onLogout}
                className="flex items-center justify-center p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl border border-zinc-200/80 dark:border-zinc-800 transition-all cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel !border-x-0 !border-b-0 py-2 px-3 flex justify-around items-center z-30 rounded-none shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-all ${
                isActive ? "text-violet-600 dark:text-violet-400 font-bold" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400" : ""}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="scale-95">{item.label}</span>
            </button>
          );
        })}
        {/* Mobile Theme Toggle Button */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900">
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-violet-500" />}
          </div>
          <span className="scale-95">{darkMode ? "Light" : "Dark"}</span>
        </button>
      </nav>
    </>
  );
}
