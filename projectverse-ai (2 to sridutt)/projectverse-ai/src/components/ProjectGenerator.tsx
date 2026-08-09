import React, { useState, useEffect } from "react";
import { Sparkles, Save, Edit, RefreshCw, Layers, Terminal, ArrowRight, Play, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, sanitizeProject, Project } from "../types";

interface ProjectGeneratorProps {
  currentUser: User | null;
  onSaveGenerated: () => void;
}

export default function ProjectGenerator({
  currentUser,
  onSaveGenerated
}: ProjectGeneratorProps) {
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState("Web Development");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [branch, setBranch] = useState("Computer Science");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  
  // Generated result state - fully editable
  const [generatedResult, setGeneratedResult] = useState<{
    title: string;
    description: string;
    problemStatement: string;
    objectives: string;
    folderStructure: string;
    apiStructure: string;
    databaseDesign: string;
    timeline: string;
    futureScope: string;
  } | null>(null);

  const stepsList = [
    "Analyzing concept requirements and hardware boundaries...",
    "Scaffolding folder architecture & directory tree mappings...",
    "Defining RESTful API structures & schemas...",
    "Orchestrating robust SQL database schema scripts...",
    "Generating detailed step-by-step implementation guide checklists..."
  ];

  // Simulated progress logs loop when generating
  useEffect(() => {
    let timer: any;
    if (isGenerating && progressStep < stepsList.length) {
      timer = setTimeout(() => {
        setProgressLogs((prev) => [...prev, `[${progressStep + 1}/5] ${stepsList[progressStep]}`]);
        setProgressStep((prev) => prev + 1);
      }, 1400);
    } else if (isGenerating && progressStep === stepsList.length) {
      // call real backend or trigger complete mock
      fetchGeneratedResult();
    }
    return () => clearTimeout(timer);
  }, [isGenerating, progressStep]);

  const triggerGenerate = () => {
    if (!idea.trim()) return alert("Please enter a short project idea or topic!");
    setIsGenerating(true);
    setProgressStep(0);
    setProgressLogs(["Initializing AI engineering blueprint generation..."]);
    setGeneratedResult(null);
  };

  const fetchGeneratedResult = async () => {
    try {
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, category, difficulty, branch })
      });

      if (res.ok) {
        const data = await res.json();
        const rawResult = data.project || data;
        const sanitized = sanitizeProject(rawResult);
        setGeneratedResult(sanitized);
      } else {
        throw new Error("Failed generation");
      }
    } catch (e) {
      // Smart offline fallback
      setGeneratedResult({
        title: idea.length < 40 ? `Automated ${idea}` : idea,
        description: `An AI-engineered blueprint for a durable, robust system centered around: ${idea}.`,
        problemStatement: `Modern implementations of ${idea} lack standardized interfaces, clean separation of concerns, and automated pipeline layers, leading to runtime inefficiency.`,
        objectives: `1. Scaffolding dynamic full-stack routing components.\n2. Integrating robust telemetry storage databases.\n3. Creating modern dashboard analytics layouts.`,
        folderStructure: `src/\n├── components/\n│   ├── Header.tsx\n│   └── MapWidget.tsx\n├── routes/\n│   └── api.ts\n├── db/\n│   └── index.ts\n└── main.tsx`,
        apiStructure: `GET    /api/telemetry   - Fetch node status logs\nPOST   /api/sync        - Synchronize client sensors data`,
        databaseDesign: `nodes: { id, status, heartbeats: [] }\nlogs: { id, node_id, message, timestamp }`,
        timeline: `Phase 1: Configure build directories and initialize repositories (Days 1-5)\nPhase 2: Establish database schema constraints and design APIs (Days 6-15)\nPhase 3: Wire frontend components and optimize layouts (Days 16-30)`,
        futureScope: `We plan to implement localized Edge ML processors and automated self-healing pipeline recovery steps.`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToProfile = async () => {
    if (!generatedResult) return;
    if (!currentUser) return alert("Please sign in to save this blueprint to your profile!");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authorization": currentUser.id
        },
        body: JSON.stringify({
          ...generatedResult,
          category,
          difficulty,
          branch,
          technologyStack: ["React", "Express", "MongoDB", "Gemini AI"],
          duration: 30,
          teamSize: 1,
          isDraft: false,
          visibility: "Public"
        })
      });

      if (res.ok) {
        alert("Blueprint published and added to your profile published projects!");
        onSaveGenerated();
      } else {
        alert("Failed to save blueprint.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-violet-600 dark:text-violet-400" />
          AI Project Generator
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          Input your project concept and instantly generate a production-ready engineering blueprint
        </p>
      </div>

      {!generatedResult && !isGenerating && (
        <div className="clay-card p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Describe your project idea or topic
            </label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g., Smart parking space allocator using Arduino sensors, Express server, and dynamic canvas map visualization for students."
              rows={4}
              className="w-full px-4 py-3 glass-input text-xs font-semibold text-zinc-800 dark:text-white leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Department / Syllabus Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Computer Science"
                className="w-full px-4 py-3 glass-input text-xs font-semibold text-zinc-800 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Target Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3.5 py-3 glass-input text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Project Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-3 glass-input text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <option value="Software Engineering">Software Engineering</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Web Development">Web Development</option>
                <option value="Mobile App">Mobile App</option>
                <option value="AI/ML">AI/ML</option>
                <option value="IoT">IoT & Systems</option>
                <option value="Blockchain">Blockchain</option>
              </select>
            </div>
          </div>

          <button
            onClick={triggerGenerate}
            className="w-full py-3 clay-btn text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            Generate Complete Blueprint with AI
          </button>
        </div>
      )}

      {/* Progress logs terminal */}
      {isGenerating && (
        <div className="p-6 glass-panel bg-[#09090f] dark:bg-[#09090f] space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-mono font-bold text-zinc-300">AI Core compiler console</span>
            </div>
            <RefreshCw className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
          </div>
          
          <div className="font-mono text-[11px] text-zinc-400 space-y-2 max-h-48 overflow-y-auto leading-relaxed">
            {progressLogs.map((log, idx) => (
              <p key={idx} className="flex gap-2">
                <span className="text-violet-500 shrink-0">&gt;&gt;</span>
                <span className={idx === progressLogs.length - 1 ? "text-violet-300 font-bold" : ""}>
                  {log}
                </span>
              </p>
            ))}
          </div>

          <div className="w-full bg-zinc-800/60 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-violet-500 h-full transition-all duration-1000" 
              style={{ width: `${(progressStep / stepsList.length) * 100}%` }} 
            />
          </div>
        </div>
      )}

      {/* Generated Result Container - Fully editable */}
      {generatedResult && !isGenerating && (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4.5 h-4.5" />
              <span>AI engineering blueprint compiled! Tweak any section below before publishing.</span>
            </div>
            <button
              onClick={handleSaveToProfile}
              className="px-4 py-2 clay-btn text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Blueprint to Profile
            </button>
          </div>

          <div className="clay-card p-6 md:p-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                Title
              </label>
              <input
                type="text"
                value={generatedResult.title}
                onChange={(e) => setGeneratedResult({ ...generatedResult, title: e.target.value })}
                className="w-full px-3.5 py-2.5 glass-input text-sm font-extrabold text-zinc-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={generatedResult.description}
                onChange={(e) => setGeneratedResult({ ...generatedResult, description: e.target.value })}
                rows={2}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-150 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  Problem Statement
                </label>
                <textarea
                  value={generatedResult.problemStatement}
                  onChange={(e) => setGeneratedResult({ ...generatedResult, problemStatement: e.target.value })}
                  rows={4}
                  className="w-full p-3 glass-input text-xs font-semibold text-zinc-800 dark:text-white leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  Objectives
                </label>
                <textarea
                  value={generatedResult.objectives}
                  onChange={(e) => setGeneratedResult({ ...generatedResult, objectives: e.target.value })}
                  rows={4}
                  className="w-full p-3 glass-input text-xs font-semibold text-zinc-800 dark:text-white leading-relaxed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                Folder Structure (Monospace directory tree)
              </label>
              <textarea
                value={generatedResult.folderStructure}
                onChange={(e) => setGeneratedResult({ ...generatedResult, folderStructure: e.target.value })}
                rows={5}
                className="w-full p-3 font-mono text-emerald-400 bg-[#0e0e15] border border-zinc-800 rounded-xl text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  API Paths Structure
                </label>
                <textarea
                  value={generatedResult.apiStructure}
                  onChange={(e) => setGeneratedResult({ ...generatedResult, apiStructure: e.target.value })}
                  rows={4}
                  className="w-full p-3 font-mono text-indigo-300 bg-[#0e0e15] border border-zinc-800 rounded-xl text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  Database Design Schema
                </label>
                <textarea
                  value={generatedResult.databaseDesign}
                  onChange={(e) => setGeneratedResult({ ...generatedResult, databaseDesign: e.target.value })}
                  rows={4}
                  className="w-full p-3 font-mono text-teal-300 bg-[#0e0e15] border border-zinc-800 rounded-xl text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  Roadmap Timeline
                </label>
                <textarea
                  value={generatedResult.timeline}
                  onChange={(e) => setGeneratedResult({ ...generatedResult, timeline: e.target.value })}
                  rows={3}
                  className="w-full p-3 glass-input text-xs font-semibold text-zinc-800 dark:text-white leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  Future Scope Expansion
                </label>
                <textarea
                  value={generatedResult.futureScope}
                  onChange={(e) => setGeneratedResult({ ...generatedResult, futureScope: e.target.value })}
                  rows={3}
                  className="w-full p-3 glass-input text-xs font-semibold text-zinc-800 dark:text-white leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
              <button
                onClick={() => setGeneratedResult(null)}
                className="px-4 py-2 glass-input text-xs font-extrabold text-zinc-600 dark:text-zinc-300 cursor-pointer border-transparent"
              >
                Start Over
              </button>
              <button
                onClick={handleSaveToProfile}
                className="px-5 py-2.5 clay-btn text-white text-xs font-extrabold cursor-pointer"
              >
                Publish Blueprint to Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
