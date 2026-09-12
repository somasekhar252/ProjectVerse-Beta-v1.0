import React, { useState, useEffect } from "react";
import { 
  X, 
  Sparkles, 
  BookOpen, 
  FolderTree, 
  Cpu, 
  HelpCircle, 
  Trophy, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle as QuestionIcon,
  Copy,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Reel, Project, User } from "../types";

interface LearnMoreDrawerProps {
  reel: Reel;
  project: Project | null;
  currentUser: User | null;
  onClose: () => void;
}

export default function LearnMoreDrawer({
  reel,
  project,
  currentUser,
  onClose
}: LearnMoreDrawerProps) {
  const [activeTab, setActiveTab] = useState<"explain" | "architecture" | "interview" | "quiz">("explain");
  const [vivaOpenIndex, setVivaOpenIndex] = useState<number | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopyText = (text: string, sectionKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };
  
  // Quiz states
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizSuccess, setQuizSuccess] = useState(false);
  const [quizError, setQuizError] = useState("");

  const techList = project?.technologyStack || reel.techStack || ["React", "TypeScript", "Node.js", "Tailwind CSS"];
  const problemText = project?.problemStatement || reel.problem || "This engineering system addresses critical data synchronization and latency overheads in modern distributed edge architectures.";
  const solutionText = project?.proposedSystem || reel.solution || "Leveraging localized event-driven state processing and lightweight secure socket routing to guarantee immediate UI propagation and zero database bottlenecks.";

  // Viva preparation questions
  const interviewQuestions = [
    {
      q: "Explain the central architectural pattern chosen for this project.",
      a: "This system relies on a decoupled, full-stack event-driven architecture. The client front-end communicates with a lightweight Express server using a structured API gateway layer. It leverages modular components to separate state management, DOM triggers, and external API requests, ensuring a high cohesive structure and easy horizontal scaling."
    },
    {
      q: "How does the system ensure fast data lookup and minimize read overheads?",
      a: "By employing in-memory caching buffers and structured indexes. Key collections are parsed and cached near application runtime logic, and database collections leverage exact matching query boundaries. In client layers, lazy hook synchronization is used to avoid redundant virtual DOM computations."
    },
    {
      q: "What were the primary trade-offs when selecting this technology stack?",
      a: "We traded massive SQL clustering overheads for direct JSON-schema document-based structures, enabling immediate prototype agility and flexible nested fields. The minor trade-off is ACID compliance constraints, which we resolved via strict server-side validation schemas."
    },
    {
      q: "How does the implementation handle network failures and client offline-states?",
      a: "The architecture implements client-side persistence and sanitization fallbacks. When network fetch calls timeout, a local cache layer handles requests gracefully and triggers a user feedback alert instead of crashing the front-end loop."
    },
    {
      q: "What optimization strategies would you deploy to scale this to 100,000 active concurrent connections?",
      a: "We would split state pipelines using Redis streams, transition to WebSockets over an Nginx reverse-proxy load balancer, partition the databases across regional clusters, and package the Express runtime inside lightweight Docker containers on Google Cloud Run."
    }
  ];

  // MCQ quiz questions
  const quizQuestions = [
    {
      question: "Which pattern is optimal to avoid infinite component re-renders in dynamic views?",
      options: [
        "Passing raw un-memoized object references as stable useEffect hook dependencies",
        "Updating state directly within the component's main render body",
        "Utilizing stabilized dependencies, local references, or event-driven primitive state checks"
      ],
      correct: 2
    },
    {
      question: "What is the primary technical trade-off of schema-less document databases?",
      options: [
        "Highly complex querying capabilities but slow write speed",
        "Flexible prototyping speed and easy nested models, at the cost of strict relational integrity",
        "Strict static typing and pre-allocated cluster storage tables"
      ],
      correct: 1
    },
    {
      question: "How does an Intersection Observer optimize resource consumption in vertical video feeds?",
      options: [
        "By compressing the videos on-the-fly inside the client context",
        "By dynamically triggering play loops only on elements in active view and pausing off-screen ones",
        "By saving video assets directly to local standard arrays without network queries"
      ],
      correct: 1
    }
  ];

  const handleQuizSubmit = () => {
    // Verify all 3 questions
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < 3) {
      setQuizError("Please answer all 3 questions to complete your viva evaluation!");
      return;
    }

    setQuizError("");
    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct) {
        correctCount++;
      }
    });

    setQuizSubmitted(true);
    if (correctCount === 3) {
      setQuizSuccess(true);
    } else {
      setQuizSuccess(false);
    }
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizSuccess(false);
    setQuizError("");
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
      {/* Sliding Drawer Card */}
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="w-full max-w-[550px] glass-panel !rounded-none !border-y-0 !border-r-0 !border-l border-zinc-150 dark:border-zinc-800 h-full flex flex-col shadow-2xl relative text-zinc-800 dark:text-zinc-200"
      >
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-zinc-900 dark:text-white truncate max-w-[320px]">
                {reel.title}
              </h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                Syllabus & Blueprint Inspector
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full text-zinc-400 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className="flex border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-2 gap-1 text-[11px] font-bold">
          <button
            onClick={() => { setActiveTab("explain"); }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "explain" 
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/10" 
                : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Academic Spec</span>
          </button>

          <button
            onClick={() => { setActiveTab("architecture"); }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "architecture" 
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/10" 
                : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>

          <button
            onClick={() => { setActiveTab("interview"); }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "interview" 
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/10" 
                : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Viva Prep</span>
          </button>

          <button
            onClick={() => { setActiveTab("quiz"); }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "quiz" 
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/10" 
                : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 animate-bounce" />
            <span>Evaluator</span>
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "explain" && (
            <div className="space-y-6">
              {/* Problem statement */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                  The Problem Gaps
                </h4>
                <div className="glass-panel p-4">
                  <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 font-semibold">
                    {problemText}
                  </p>
                </div>
              </div>

              {/* Proposed Solution */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Proposed System Spec
                </h4>
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/10">
                  <p className="text-xs leading-relaxed text-zinc-700 dark:text-emerald-300 font-semibold">
                    {solutionText}
                  </p>
                </div>
              </div>

              {/* Stack Chips */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                  Core Technology Stack
                </h4>
                <div className="flex flex-wrap gap-2">
                  {techList.map((tech) => (
                    <span 
                      key={tech}
                      className="px-3 py-1.5 glass-input text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300 transition-all cursor-default"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "architecture" && (
            <div className="space-y-6">
              {/* Monospace Directory Structure */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-zinc-400" />
                  Engineering Folder Blueprint
                </h4>
                <div className="relative group bg-zinc-950 text-emerald-400 p-4 rounded-2xl font-mono text-[10px] overflow-x-auto leading-relaxed border border-zinc-800 shadow-xl">
                  <button
                    onClick={() => handleCopyText(project?.folderStructure || `root_project/
├── server/
│   ├── index.ts          # Express microservice setup
│   ├── config/           # Database & env validation
│   └── routes/           # REST endpoints mapping
├── src/
│   ├── components/       # Optimized UI modules
│   ├── hooks/            # Non-blocking async caching
│   └── types.ts          # Robust model schemas
├── package.json          # Bundle optimization variables
└── tailwind.config.js    # Adaptive layout theme configurations`, "drawer_folder")}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 shadow-md backdrop-blur-md text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer z-10 active:scale-95"
                    title="Copy Folder Structure"
                  >
                    {copiedSection === "drawer_folder" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-extrabold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-emerald-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <pre>{project?.folderStructure || `root_project/
├── server/
│   ├── index.ts          # Express microservice setup
│   ├── config/           # Database & env validation
│   └── routes/           # REST endpoints mapping
├── src/
│   ├── components/       # Optimized UI modules
│   ├── hooks/            # Non-blocking async caching
│   └── types.ts          # Robust model schemas
├── package.json          # Bundle optimization variables
└── tailwind.config.js    # Adaptive layout theme configurations`}</pre>
                </div>
              </div>

              {/* Technical API Structures */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  Core API Spec Architecture
                </h4>
                <div className="glass-panel p-4 space-y-3">
                  {project?.apiStructure ? (
                    <pre className="font-mono text-[10px] leading-relaxed overflow-x-auto text-zinc-600 dark:text-zinc-300">
                      {project.apiStructure}
                    </pre>
                  ) : (
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between font-mono glass-input p-2 rounded">
                        <span className="text-emerald-500 font-extrabold">GET /api/specs</span>
                        <span className="text-zinc-400">Fetch catalog database</span>
                      </div>
                      <div className="flex justify-between font-mono glass-input p-2 rounded">
                        <span className="text-blue-500 font-extrabold">POST /api/specs</span>
                        <span className="text-zinc-400">Register new custom spec</span>
                      </div>
                      <div className="flex justify-between font-mono glass-input p-2 rounded">
                        <span className="text-violet-500 font-extrabold">POST /api/ai/analyze</span>
                        <span className="text-zinc-400">Trigger Gemini verification pipeline</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "interview" && (
            <div className="space-y-4">
              <div className="p-4 bg-violet-600/5 rounded-2xl border border-violet-500/10 mb-2">
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-semibold leading-relaxed">
                  Prepare for your college Viva/Professor evaluation or technical interview with these curated questions on this specific architecture.
                </p>
              </div>

              {interviewQuestions.map((item, index) => {
                const isOpen = vivaOpenIndex === index;
                return (
                  <div 
                    key={index}
                    className="glass-panel overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setVivaOpenIndex(isOpen ? null : index)}
                      className="w-full text-left p-4 flex items-start gap-3 justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <span className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 leading-snug">
                        Q{index + 1}: {item.q}
                      </span>
                      <span className="text-xs text-violet-500 font-extrabold">
                        {isOpen ? "Hide" : "Show"}
                      </span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 font-semibold border-t border-zinc-100 dark:border-zinc-900/50 pt-3"
                        >
                          {item.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "quiz" && (
            <div className="space-y-6">
              <div className="p-4 bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-2xl shadow-lg relative overflow-hidden">
                <div className="relative z-10 space-y-1">
                  <h4 className="text-[11px] uppercase tracking-widest font-black flex items-center gap-1.5 text-violet-100">
                    <Trophy className="w-4 h-4 text-amber-300 animate-bounce" />
                    Viva Assessment Pipeline
                  </h4>
                  <p className="text-xs font-semibold leading-relaxed">
                    Complete this quick assessment covering critical React and full-stack patterns to verify your architectural comprehension.
                  </p>
                </div>
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full" />
              </div>

              {quizError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quizError}</span>
                </div>
              )}

              {quizSubmitted ? (
                <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 text-center space-y-4">
                  {quizSuccess ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-zinc-900 dark:text-white">
                          Evaluation Cleared!
                        </h4>
                        <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
                          Quiz Completed Successfully. Your code comprehension is spectacular!
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-zinc-900 dark:text-white">
                          Viva Verification Failed
                        </h4>
                        <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
                          Some answers were incorrect. Review the Academic Specifications and architectural guides, then retry!
                        </p>
                      </div>
                      <button
                        onClick={resetQuiz}
                        className="py-2 px-4 clay-btn text-white font-extrabold text-xs cursor-pointer"
                      >
                        Try Again
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {quizQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="space-y-3">
                      <h5 className="text-xs font-extrabold text-zinc-900 dark:text-white leading-relaxed flex gap-2">
                        <span className="w-5 h-5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-400 flex items-center justify-center text-[10px] shrink-0">
                          {qIdx + 1}
                        </span>
                        <span>{q.question}</span>
                      </h5>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedAnswers[qIdx] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
                              }}
                              className={`w-full text-left p-3.5 text-xs font-semibold leading-relaxed transition-all flex items-start gap-3 cursor-pointer ${
                                isSelected 
                                  ? "glass-panel ring-1 ring-violet-500 text-violet-700 dark:text-violet-300" 
                                  : "glass-input text-zinc-600 dark:text-zinc-400 hover:opacity-80"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-300 dark:border-zinc-700"
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleQuizSubmit}
                    className="w-full py-3 clay-btn text-white text-xs font-black uppercase tracking-widest mt-4 cursor-pointer"
                  >
                    Submit Spec Viva Answer Sheet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
