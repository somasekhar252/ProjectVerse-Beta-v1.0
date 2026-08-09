import React, { useState } from "react";
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  GraduationCap, 
  Sparkles, 
  Code, 
  Cpu, 
  Video, 
  Zap,
  Sun,
  Moon
} from "lucide-react";
import { motion } from "motion/react";
import { User } from "../types";
import { supabase } from "../lib/supabase";
import { syncUserProfile } from "../lib/supabaseService";
import { signInWithGoogle } from "../lib/firebase";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function LoginPage({
  onLoginSuccess,
  darkMode,
  setDarkMode
}: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [branch, setBranch] = useState("Computer Science");
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    const body = isLogin 
      ? { email, password } 
      : { name, email, password, collegeName, branch };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.user);
        return;
      } else {
        setError(data.error || "Authentication failed.");
      }
    } catch (err: any) {
      console.warn("Authentication request failed:", err);
      setError("Unable to reach authentication server. Generating a simulated student profile for development.");
      setTimeout(() => {
        onLoginSuccess({
          id: "usr_mock_" + Math.floor(Math.random() * 100000),
          name: name || "Student Innovator",
          email: email || "student@example.com",
          collegeName: collegeName || "Indian Institute of Science",
          role: "Syllabus Architect",
          badges: ["Guest Pioneer"]
        });
      }, 600);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      const firebaseUser = await signInWithGoogle();
      if (!firebaseUser) throw new Error("Google sign-in was cancelled.");

      const profile = await syncUserProfile({
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        user_metadata: {
          full_name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Google Student",
          avatar_url: firebaseUser.photoURL || undefined,
        }
      });

      onLoginSuccess(profile);
    } catch (err: any) {
      console.error("Firebase Google sign-in failed:", err);
      setError(err?.message || "Google sign-in could not be completed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row transition-colors duration-300">
      
      {/* BRAND & VALUE PROPOSITION HERO SECTION (LEFT) */}
      <div className="md:w-1/2 bg-gradient-to-br from-violet-900 via-indigo-950 to-zinc-950 p-8 md:p-16 flex flex-col justify-between relative overflow-hidden text-white shrink-0 min-h-[320px] md:min-h-screen">
        {/* Glow decoration */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/15 blur-[100px] pointer-events-none" />

        {/* Top brand header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15 text-white font-black text-2xl shadow-xl">
            P
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight text-white leading-none">
              ProjectVerse
            </h1>
            <span className="text-[10px] uppercase tracking-widest font-black text-violet-300">
              engineering spec ecosystem
            </span>
          </div>
        </div>

        {/* Interactive Features List */}
        <div className="my-auto py-12 space-y-8 relative z-10 max-w-lg">
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider">
              🚀 MVP Phase 1 Live
            </span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              The blueprints. The specs. <br />All in one ecosystem.
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed font-medium">
              Join the dedicated social platform for engineering students. Present your system designs, view interactive specification sheets, and watch video specs of core models.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <Cpu className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-white">Full Blueprints</h4>
                <p className="text-xs text-zinc-400">View and upload full system specification documents.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <Video className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-white">Engineering Reels</h4>
                <p className="text-xs text-zinc-400">Watch short visual summaries of hardware and software models.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-white">AI Generator</h4>
                <p className="text-xs text-zinc-400">Generate structural templates instantly with Gemini integration.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
              <Code className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-white">Tech Stack Filters</h4>
                <p className="text-xs text-zinc-400">Filter by Computer Science, Mech, ECE, Civil, or Bio systems.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-zinc-400 relative z-10 flex items-center justify-between border-t border-white/10 pt-4">
          <span>© 2026 ProjectVerse Platforms Inc.</span>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1 bg-white/10 hover:bg-white/15 rounded-lg border border-white/10 font-bold transition-all"
          >
            {darkMode ? "☀️ Light mode" : "🌙 Dark mode"}
          </button>
        </div>
      </div>

      {/* FORM GATE SECTION (RIGHT) */}
      <div className="flex-1 p-6 md:p-16 flex items-center justify-center relative bg-white dark:bg-zinc-950">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="absolute top-6 right-6 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all flex items-center gap-2 text-xs font-semibold shadow-xs"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-violet-500" />}
          <span className="hidden sm:inline">{darkMode ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <div className="w-full max-w-[440px] space-y-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              {isLogin ? "Sign in to ProjectVerse" : "Create your student account"}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isLogin ? "Enter your credentials to explore the Blueprint Universe" : "Sign up to start sharing specification sheets with peers"}
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-semibold leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Suryasekhar Sen"
                    className="w-full pl-10 pr-4 py-3 glass-input text-xs font-semibold transition-all text-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                College/Institute Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="suryasekhar@college.edu"
                  className="w-full pl-10 pr-4 py-3 glass-input text-xs font-semibold transition-all text-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    College / Institute Name
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      placeholder="Indian Institute of Science"
                      className="w-full pl-10 pr-4 py-3 glass-input text-xs font-semibold transition-all text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Engineering Branch
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3.5 py-3 glass-input text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 glass-input text-xs font-semibold transition-all text-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 clay-btn disabled:opacity-55 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{isLoading ? "Authenticating..." : isLogin ? "Sign In to Workspace" : "Register and Open Account"}</span>
            </button>

            {/* Google Authentication Divider & Button */}
            <div className="flex items-center my-4 text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              <span className="px-3">Or continue with</span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 glass-input disabled:opacity-55 text-zinc-700 dark:text-zinc-300 text-xs font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Connect Google Account</span>
            </button>
          </form>

          {/* Toggle Button */}
          <div className="text-center pt-2">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-xs text-violet-600 dark:text-violet-400 font-extrabold hover:underline cursor-pointer"
            >
              {isLogin ? "New student? Create an account in 10s" : "Already registered? Sign in to your account"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
