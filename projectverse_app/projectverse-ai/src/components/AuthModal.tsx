import React, { useState } from "react";
import { X, Mail, Lock, User as UserIcon, GraduationCap, ShieldCheck } from "lucide-react";
import { User } from "../types";
import { supabase } from "../lib/supabase";
import { syncUserProfile } from "../lib/supabaseService";
import { signInWithGoogle } from "../lib/firebase";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export default function AuthModal({
  onClose,
  onLoginSuccess
}: AuthModalProps) {
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
      if (isLogin) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData?.user) {
          const profile = await syncUserProfile(authData.user);
          onLoginSuccess(profile);
          onClose();
          return;
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              college: collegeName,
              branch: branch,
            }
          }
        });

        if (authError) throw authError;

        if (authData?.user) {
          const profile = await syncUserProfile(authData.user);
          onLoginSuccess(profile);
          onClose();
          return;
        }
      }
    } catch (err: any) {
      console.warn("Supabase standard auth failed/unconfigured, trying local backend:", err);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        const data = await res.json();
        if (res.ok) {
          onLoginSuccess(data.user);
          onClose();
          return;
        } else {
          setError(data.error || "Authentication failed.");
        }
      } catch (localErr) {
        setError("Unable to connect to ProjectVerse servers. Authenticating via simulated local user session.");
        // Fallback local auth mock if offline
        setTimeout(() => {
          onLoginSuccess({
            id: "usr_mock",
            name: name || "Suryasekhar Sen",
            email: email || "suryasekhar@college.edu",
            collegeName: collegeName || "Institute of Engineering",
            role: "Syllabus Architect",
            badges: ["Novice Builder", "Blueprint Pioneer"]
          });
          onClose();
        }, 800);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Container Card */}
      <div className="clay-card w-full max-w-[420px] relative overflow-hidden text-zinc-800 dark:text-zinc-200">
        
        {/* Header Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-950 rounded-full text-zinc-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Box */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white mx-auto font-black text-2xl shadow-lg shadow-violet-500/10">
              P
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                {isLogin ? "Welcome to ProjectVerse" : "Join the ProjectVerse"}
              </h3>
              <p className="text-xs text-zinc-500">
                {isLogin ? "Discover curated blueprints or generate yours with AI" : "Connect with engineering peers and build custom specs"}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-center text-xs font-semibold leading-relaxed">
              {error}
            </div>
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
                    className="w-full pl-10 pr-4 py-2.5 glass-input text-xs font-semibold"
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
                  className="w-full pl-10 pr-4 py-2.5 glass-input text-xs font-semibold"
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
                      placeholder="Institute of Engineering & Science"
                      className="w-full pl-10 pr-4 py-2.5 glass-input text-xs font-semibold"
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
                    className="w-full px-3.5 py-2.5 glass-input text-xs font-bold text-zinc-800 dark:text-zinc-200"
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
                  className="w-full pl-10 pr-4 py-2.5 glass-input text-xs font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 clay-btn text-white text-xs font-extrabold cursor-pointer"
            >
              {isLoading ? "Authenticating..." : isLogin ? "Sign In" : "Register Credentials"}
            </button>

            {/* Google Authentication Divider & Button */}
            <div className="flex items-center my-3 text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">
              <div className="flex-1 h-px bg-zinc-150 dark:bg-zinc-800" />
              <span className="px-3">Or continue with</span>
              <div className="flex-1 h-px bg-zinc-150 dark:bg-zinc-800" />
            </div>

            <button
              type="button"
              onClick={async () => {
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
                  onClose();
                } catch (err: any) {
                  console.error("Firebase Google sign-in failed:", err);
                  setError(err?.message || "Google sign-in could not be completed. Please try again.");
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full py-2.5 glass-input text-zinc-700 dark:text-zinc-300 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all"
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
              <span>Google Account</span>
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
              {isLogin ? "New student? Create an account" : "Already registered? Sign in"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
