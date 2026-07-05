/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { KaTeXRenderer } from './components/KaTeXRenderer';
import { parseQuestions } from './services/geminiService';
import { Question, ExamState } from './types';
import { Modal } from './components/Modal';
import { SettingsModal } from './components/SettingsModal';
import { playSound } from './lib/sound';
import { cn } from './lib/utils';
import { 
  Play, 
  Settings, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Pause, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft, 
  Flag, 
  LogOut,
  AlertCircle,
  Trophy,
  Download,
  Upload,
  Sparkles,
  Key,
  Calendar,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Sparkle,
  ExternalLink
} from 'lucide-react';

const STORAGE_KEY = 'emagyne_exam_state';

const INITIAL_STATE: ExamState = {
  questions: [],
  duration: 45,
  startTime: null,
  endTime: null,
  userAnswers: {},
  markedForReview: new Set(),
  checkedAnswers: new Set(),
  isPaused: false,
  timeRemaining: 0,
  phase: 'INPUT',
};

interface ExamAttempt {
  id: string;
  date: number;
  score: number;
  total: number;
  timeTaken: number;
  duration: number;
}

const DEMO_QUESTIONS: Question[] = [
  {
    id: "demo-1",
    type: "MCQ",
    question: "What is the derivative of $x^2$ with respect to $x$?",
    options: ["$2x$", "$x^2$", "$2$", "$x$"],
    answer: "$2x$",
    explanation: "The power rule states that $\\frac{d}{dx}x^n = nx^{n-1}$. For $x^2$, $n=2$, so we get $\\frac{d}{dx}x^2 = 2x^{2-1} = 2x$."
  },
  {
    id: "demo-2",
    type: "NUM",
    question: "Calculate the area of a circle with radius $r = 5$ cm. Use $\\pi \\approx 3.14$.",
    unit: "cm$^2$",
    answer: "78.5",
    explanation: "The area of a circle is calculated using the formula $A = \\pi r^2$. Substituting the given values: $A \\approx 3.14 \\times 5^2 = 3.14 \\times 25 = 78.5$ cm$^2$."
  },
  {
    id: "demo-3",
    type: "MCQ",
    question: "Which of the following represents the correct expansion of $(a + b)^2$?",
    options: ["$a^2 + b^2$", "$a^2 + 2ab + b^2$", "$a^2 - 2ab + b^2$", "$a^2 + ab + b^2$"],
    answer: "$a^2 + 2ab + b^2$",
    explanation: "Expanding $(a + b)^2 = (a + b)(a + b) = a^2 + ab + ba + b^2 = a^2 + 2ab + b^2$."
  },
  {
    id: "demo-4",
    type: "NUM",
    question: "A vehicle travels at a constant speed of $60$ km/h. How many kilometers does it cover in $2.5$ hours?",
    unit: "km",
    answer: "150",
    explanation: "Distance is calculated by multiplying speed and time: $d = v \\times t = 60\\text{ km/h} \\times 2.5\\text{ h} = 150\\text{ km}$."
  }
];

interface NavigatorContentProps {
  state: ExamState;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (idx: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setIsExitModalOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

function NavigatorContent({ 
  state, 
  currentQuestionIndex, 
  setCurrentQuestionIndex, 
  searchQuery, 
  setSearchQuery, 
  setIsExitModalOpen,
  isCollapsed = false,
  setIsCollapsed
}: NavigatorContentProps) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center w-full">
        {/* Expand Toggle Button */}
        <button
          onClick={() => {
            playSound('click');
            setIsCollapsed?.(false);
          }}
          className="mb-6 p-2 bg-slate-950/60 border border-primary/10 rounded-xl text-slate-400 hover:text-primary hover:border-primary/30 transition-all cursor-pointer flex items-center justify-center"
          title="Expand Navigator"
        >
          <ChevronRight size={18} />
        </button>

        {/* Minimized grid of question buttons */}
        <div className="grid grid-cols-2 gap-1.5 mb-6 max-h-[350px] overflow-y-auto pr-0.5 custom-scrollbar w-full">
          {state.questions.map((q, idx) => {
            const isAnswered = state.userAnswers[q.id] !== undefined;
            const isMarked = state.markedForReview.has(q.id);
            const isCurrent = idx === currentQuestionIndex;
            const isChecked = state.checkedAnswers.has(q.id);
            const isCorrect = isChecked && state.userAnswers[q.id] === q.answer;
            
            return (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentQuestionIndex(idx);
                  playSound('click');
                }}
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black transition-all cursor-pointer relative mx-auto",
                  isCurrent ? "ring-2 ring-primary scale-110 z-10" : "hover:scale-105",
                  isChecked 
                    ? (isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white")
                    : (isAnswered ? "bg-primary text-slate-950" : "bg-slate-800/80 text-slate-400 border border-slate-700/30"),
                  isMarked && !isChecked ? "after:content-[''] after:absolute after:top-0 after:right-0 after:w-1.5 after:h-1.5 after:bg-blue-400 after:rounded-full" : ""
                )}
                title={`Question ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Exit Icon-only Button */}
        <button
          onClick={() => {
            playSound('click');
            setIsExitModalOpen(true);
          }}
          className="p-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer mt-4 flex items-center justify-center"
          title="Exit Simulation"
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  // Expanded layout
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black uppercase tracking-wider text-xs text-primary/80">Question Navigator</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold">{currentQuestionIndex + 1} of {state.questions.length}</span>
          {setIsCollapsed && (
            <button
              onClick={() => {
                playSound('click');
                setIsCollapsed(true);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
              title="Collapse Navigator"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Find question..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-950/50 border border-primary/10 rounded-xl py-2 px-4 text-xs focus:outline-none focus:border-primary/40 transition-colors placeholder:text-slate-600"
        />
      </div>

      <div className="grid grid-cols-5 gap-2 mb-8 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
        {state.questions.map((q, idx) => {
          const isAnswered = state.userAnswers[q.id] !== undefined;
          const isMarked = state.markedForReview.has(q.id);
          const isCurrent = idx === currentQuestionIndex;
          const isChecked = state.checkedAnswers.has(q.id);
          const isCorrect = isChecked && state.userAnswers[q.id] === q.answer;
          
          if (searchQuery && !q.question.toLowerCase().includes(searchQuery.toLowerCase())) {
            return null;
          }

          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentQuestionIndex(idx);
                playSound('click');
              }}
              className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-xs font-black transition-all cursor-pointer relative",
                isCurrent ? "ring-2 ring-primary scale-110 z-10" : "hover:scale-105",
                isChecked 
                  ? (isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white")
                  : (isAnswered ? "bg-primary text-slate-950" : "bg-slate-800/80 text-slate-400 border border-slate-700/30"),
                isMarked && !isChecked ? "after:content-[''] after:absolute after:top-0 after:right-0 after:w-2.5 after:h-2.5 after:bg-blue-400 after:rounded-full after:border after:border-slate-900" : ""
              )}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
      
      <div className="space-y-2.5 pt-5 border-t border-slate-800">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400">
          <div className="w-3.5 h-3.5 bg-primary rounded-sm shadow-sm" /> Answered
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400">
          <div className="w-3.5 h-3.5 bg-slate-800 border border-slate-700/50 rounded-sm" /> Unanswered
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400">
          <div className="w-3.5 h-3.5 bg-slate-800 border border-slate-700/50 rounded-sm relative" >
            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-400 rounded-full" />
          </div> Marked for Review
        </div>
      </div>

      <button
        onClick={() => {
          playSound('click');
          setIsExitModalOpen(true);
        }}
        className="w-full mt-8 py-3 rounded-xl border border-red-500/20 text-red-400 font-bold hover:bg-red-500/10 hover:border-red-500/30 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
      >
        <LogOut size={14} />
        EXIT SIMULATION
      </button>
    </>
  );
}

// Circular Score Ring for Results
const ScoreRing = ({ score, total }: { score: number, total: number }) => {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const strokeWidth = 10;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-40 h-40 mx-auto mb-6">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          className="stroke-slate-800/80"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          className="stroke-primary transition-all duration-1000 ease-out"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black text-slate-100">{percentage}%</span>
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5">
          {score} / {total} Correct
        </span>
      </div>
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<ExamState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          markedForReview: new Set(parsed.markedForReview),
          checkedAnswers: new Set(parsed.checkedAnswers),
        };
      } catch (e) {
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [history, setHistory] = useState<ExamAttempt[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for API Key presence
  const checkApiKey = useCallback(() => {
    const localKey = localStorage.getItem('emagyne_api_key');
    // process.env is injected by Vite Define
    const envKey = (process.env as any).GEMINI_API_KEY;
    const hasKey = (localKey && localKey.trim() !== '') || (envKey && envKey !== 'MY_GEMINI_API_KEY' && envKey.trim() !== '');
    setHasApiKey(!!hasKey);
  }, []);

  // Load history
  const loadHistory = useCallback(() => {
    try {
      const savedHistory = localStorage.getItem('emagyne_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
    loadHistory();

    // Listen for storage events (emitted when SettingsModal saves)
    window.addEventListener('storage', checkApiKey);
    window.addEventListener('storage', loadHistory);
    return () => {
      window.removeEventListener('storage', checkApiKey);
      window.removeEventListener('storage', loadHistory);
    };
  }, [checkApiKey, loadHistory]);

  // Scroll to top on question change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentQuestionIndex]);

  // Persistence
  useEffect(() => {
    const stateToSave = {
      ...state,
      markedForReview: Array.from(state.markedForReview),
      checkedAnswers: Array.from(state.checkedAnswers),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [state]);

  // Timer logic
  useEffect(() => {
    if (state.phase === 'QUIZ' && !state.isPaused && state.timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setState(prev => {
          if (prev.timeRemaining <= 1) {
            clearInterval(timerRef.current!);
            // Handle auto-finish on time out
            const timeTaken = prev.duration * 60;
            const score = Object.entries(prev.userAnswers).filter(([id, ans]) => ans === prev.questions.find(q => q.id === id)?.answer).length;
            const newAttempt: ExamAttempt = {
              id: `attempt-${Date.now()}`,
              date: Date.now(),
              score,
              total: prev.questions.length,
              timeTaken,
              duration: prev.duration
            };
            const currentHistory = JSON.parse(localStorage.getItem('emagyne_history') || '[]');
            localStorage.setItem('emagyne_history', JSON.stringify([newAttempt, ...currentHistory]));
            loadHistory();
            playSound('complete');

            return { ...prev, timeRemaining: 0, phase: 'RESULTS', endTime: Date.now() };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.phase, state.isPaused, state.timeRemaining, loadHistory]);

  // Keyboard Shortcuts
  useEffect(() => {
    const enabled = localStorage.getItem('emagyne_shortcuts_enabled') !== 'false';
    if (!enabled || state.phase !== 'QUIZ' || state.isPaused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        if (!isTyping) {
          e.preventDefault();
          setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
          playSound('click');
        }
      } else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        if (!isTyping) {
          e.preventDefault();
          setCurrentQuestionIndex(prev => Math.min(state.questions.length - 1, prev + 1));
          playSound('click');
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (!isTyping) {
          e.preventDefault();
          const qId = state.questions[currentQuestionIndex].id;
          setState(prev => {
            const newMarked = new Set(prev.markedForReview);
            if (newMarked.has(qId)) newMarked.delete(qId);
            else newMarked.add(qId);
            return { ...prev, markedForReview: newMarked };
          });
          playSound('click');
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const qId = state.questions[currentQuestionIndex].id;
        const isChecked = state.checkedAnswers.has(qId);
        const hasAnswer = state.userAnswers[qId] !== undefined;

        if (!isChecked && hasAnswer) {
          const q = state.questions[currentQuestionIndex];
          const isCorrect = state.userAnswers[qId] === q.answer;
          setState(prev => ({ ...prev, checkedAnswers: new Set(prev.checkedAnswers).add(qId) }));
          playSound(isCorrect ? 'correct' : 'incorrect');
        } else if (isChecked || !hasAnswer) {
          if (currentQuestionIndex === state.questions.length - 1) {
            finishExam();
          } else {
            setCurrentQuestionIndex(prev => prev + 1);
            playSound('click');
          }
        }
      } else if (!isTyping && /^[1-9]$/.test(e.key)) {
        const q = state.questions[currentQuestionIndex];
        if (q.type === 'MCQ' && q.options) {
          const optIdx = parseInt(e.key) - 1;
          if (optIdx < q.options.length) {
            const option = q.options[optIdx];
            setState(prev => ({
              ...prev,
              userAnswers: { ...prev.userAnswers, [q.id]: option }
            }));
            playSound('click');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.phase, state.isPaused, state.questions, currentQuestionIndex, state.userAnswers, state.checkedAnswers]);

  const handleParse = async () => {
    if (!rawInput.trim()) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const questions = await parseQuestions(rawInput);
      if (questions && questions.length > 0) {
        setState(prev => ({ ...prev, questions, phase: 'SETUP' }));
        playSound('correct');
      } else {
        setParseError("No questions could be parsed. Please check your input format or try again.");
        playSound('incorrect');
      }
    } catch (e: any) {
      console.error("Parse Error:", e);
      playSound('incorrect');
      if (e.message === 'MISSING_API_KEY') {
        const provider = localStorage.getItem('emagyne_api_provider') || 'gemini';
        const providerName = provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'Custom';
        setParseError(`Configuration Error: ${providerName} API Key is missing. Click the Settings icon in the top right to configure it.`);
      } else {
        setParseError(e.message || "An error occurred while parsing questions. Please try again.");
      }
    } finally {
      setIsParsing(false);
    }
  };

  // Instant pre-parsed demo load (Bypasses Gemini API)
  const handleLoadDemo = () => {
    setState(prev => ({
      ...prev,
      questions: DEMO_QUESTIONS,
      phase: 'SETUP'
    }));
    setParseError(null);
    playSound('correct');
  };

  // Export parsed questions as JSON
  const handleExportExam = () => {
    if (state.questions.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `emagyne_exam_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    playSound('click');
  };

  // Import questions from JSON
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question && parsed[0].answer) {
          setState(prev => ({
            ...prev,
            questions: parsed,
            phase: 'SETUP'
          }));
          setParseError(null);
          playSound('correct');
        } else {
          setParseError("Invalid exam file format. It must be a JSON array of questions.");
          playSound('incorrect');
        }
      } catch (err) {
        setParseError("Failed to read file. Please ensure it is a valid JSON file.");
        playSound('incorrect');
      }
    };
    reader.readAsText(file);
  };

  const startExam = () => {
    setState(prev => ({
      ...prev,
      phase: 'QUIZ',
      startTime: Date.now(),
      timeRemaining: prev.duration * 60,
      isPaused: false,
      userAnswers: {},
      markedForReview: new Set(),
      checkedAnswers: new Set(),
    }));
    setCurrentQuestionIndex(0);
    playSound('click');
  };

  const finishExam = () => {
    const timeTaken = state.duration * 60 - state.timeRemaining;
    const score = Object.entries(state.userAnswers).filter(([id, ans]) => ans === state.questions.find(q => q.id === id)?.answer).length;
    const total = state.questions.length;

    // Save to history
    const newAttempt: ExamAttempt = {
      id: `attempt-${Date.now()}`,
      date: Date.now(),
      score,
      total,
      timeTaken,
      duration: state.duration
    };

    const currentHistory = JSON.parse(localStorage.getItem('emagyne_history') || '[]');
    localStorage.setItem('emagyne_history', JSON.stringify([newAttempt, ...currentHistory]));
    loadHistory();

    setState(prev => ({
      ...prev,
      phase: 'RESULTS',
      endTime: Date.now(),
    }));

    playSound('complete');
  };

  const resetExam = () => {
    setState(INITIAL_STATE);
    setCurrentQuestionIndex(0);
    setRawInput('');
    playSound('click');
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your exam attempt history?")) {
      localStorage.removeItem('emagyne_history');
      setHistory([]);
      playSound('click');
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const currentQuestion = state.questions[currentQuestionIndex];
  const timePercentage = state.duration > 0 ? (state.timeRemaining / (state.duration * 60)) * 100 : 0;

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
        {/* Universal Premium Header */}
        <header className="w-full max-w-6xl flex justify-between items-center mb-6 md:mb-10">
          <div 
            className="flex items-center gap-2.5 md:gap-3.5 cursor-pointer hover:opacity-90 active:scale-98 transition-all"
            onClick={() => {
              playSound('click');
              setIsSettingsOpen(true);
            }}
            title="Open Settings & Themes"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-950/60 border border-primary/20 rounded-xl flex items-center justify-center shadow-lg shadow-primary/10 pulse-glow-effect">
              <svg viewBox="0 0 100 100" className="w-6 h-6 md:w-7 md:h-7 shrink-0">
                <defs>
                  <linearGradient id="gold-header-logo" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFE58F" />
                    <stop offset="25%" stopColor="#FADB14" />
                    <stop offset="60%" stopColor="#D4B106" />
                    <stop offset="100%" stopColor="#874D00" />
                  </linearGradient>
                </defs>
                <g fill="url(#gold-header-logo)">
                  <rect x="25" y="20" width="50" height="12" rx="2.5" />
                  <rect x="25" y="42" width="50" height="12" rx="2.5" />
                  <path d="M 35,54 L 35,66 C 35,76 48,80 75,80 L 75,68 C 52,68 47,62 47,54 Z" />
                </g>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl theme-gradient-text uppercase">Emagyne</h1>
              <p className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-[0.25em] uppercase -mt-1 hidden sm:block">AI Exam Simulator</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {state.phase === 'QUIZ' && (
              <div className="flex items-center gap-3 md:gap-4 glass-panel px-3 md:px-5 py-1.5 md:py-2.5 rounded-2xl mr-1 md:mr-2">
                <div className={cn(
                  "flex items-center gap-1.5 font-mono text-sm md:text-lg font-black transition-colors",
                  state.timeRemaining <= 60 
                    ? "animate-blink-red text-red-500" 
                    : timePercentage < 10 
                      ? "text-red-500 animate-pulse" 
                      : "text-primary"
                )}>
                  <Clock size={16} />
                  {formatTime(state.timeRemaining)}
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <button 
                  onClick={() => {
                    playSound('click');
                    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
                  }}
                  className="text-primary hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  title={state.isPaused ? "Resume Exam" : "Pause Exam"}
                >
                  {state.isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                </button>
                <button 
                  onClick={() => {
                    playSound('click');
                    setIsMobileNavOpen(true);
                  }}
                  className="md:hidden text-primary hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  title="Open Navigator"
                >
                  <Settings size={16} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Dashboard */}
        <main className="w-full max-w-6xl flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {state.phase === 'INPUT' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-stretch"
              >
                {/* Left Form: Dataset Initialization */}
                <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-3xl flex flex-col min-h-[500px]">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="text-primary" size={22} />
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Initialize Dataset</h2>
                  </div>

                  {parseError && (
                    <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs md:text-sm font-semibold flex items-start gap-3">
                      <AlertCircle className="shrink-0 mt-0.5" size={16} />
                      <span>{parseError}</span>
                    </div>
                  )}

                   <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-5">
                    Paste your questions and explanations in any format (e.g., copied from a PDF, document, or site). Our AI will automatically structure them and highlight code snippets.
                  </p>
                  
                  <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Example of pasting questions normally:

Q1. Which f-string correctly formats the number 1234567.89 to show 1,234,567.9 (comma thousands separator, one decimal place)?
A. f&quot;{n:.1,f}&quot;
B. f&quot;{n:,.1f}&quot;
C. f&quot;{n:1.f}&quot;
D. f&quot;{n:.1e}&quot;
Answer: B
Explanation: The format specifier ,.1f adds a comma thousands separator and rounds to one decimal place.

Q2. What is the value of 5 + 3?
Answer: 8
Explanation: 5 + 3 is equal to 8."
                    className="flex-1 bg-slate-950/40 border border-primary/10 hover:border-primary/20 focus:border-primary/40 rounded-2xl p-5 font-mono text-xs md:text-sm focus:outline-none transition-colors resize-none custom-scrollbar placeholder:text-slate-700"
                  />

                  {/* API Key warning guard inside input box */}
                  {!hasApiKey && (
                    <div className="mt-4 p-3.5 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Key className="text-yellow-500 shrink-0" size={16} />
                        <span className="text-[11px] md:text-xs text-slate-400 leading-normal">
                          <strong>No API Key Configured.</strong> To generate exams using AI, you need a Gemini API Key. You can get a free key from Google AI Studio.
                        </span>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <a
                          href="https://aistudio.google.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-yellow-500 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          Get Free Key <ExternalLink size={10} />
                        </a>
                        <span className="text-slate-700 hidden sm:inline">|</span>
                        <button
                          onClick={() => {
                            playSound('click');
                            setIsSettingsOpen(true);
                          }}
                          className="text-[11px] text-yellow-500 font-bold hover:underline cursor-pointer"
                        >
                          Add Key
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3.5 mt-6">
                    <button
                      onClick={handleParse}
                      disabled={isParsing || !rawInput.trim() || !hasApiKey}
                      className="flex-1 py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-35 disabled:cursor-not-allowed text-slate-950 font-black text-sm md:text-base rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/10"
                    >
                      {isParsing ? (
                        <>
                          <RotateCcw className="animate-spin" size={18} />
                          AI STRUCTURING...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} fill="currentColor" />
                          GENERATE VIA AI
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleLoadDemo}
                      className="py-3.5 px-6 border border-primary/20 text-primary font-bold rounded-2xl hover:bg-primary/5 transition-all text-sm md:text-base cursor-pointer flex items-center justify-center gap-2"
                      title="Load built-in practice questions instantly"
                    >
                      <Sparkle size={16} className="text-primary animate-pulse" />
                      QUICK PRACTICE (DEMO)
                    </button>

                    <button
                      onClick={() => {
                        playSound('click');
                        fileInputRef.current?.click();
                      }}
                      className="py-3.5 px-6 border border-slate-800 text-slate-400 font-bold rounded-2xl hover:text-slate-200 hover:border-slate-600 transition-all text-sm md:text-base cursor-pointer flex items-center justify-center gap-2"
                      title="Load a previously exported .json exam"
                    >
                      <Upload size={16} />
                      IMPORT JSON
                    </button>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportFile}
                      accept=".json"
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Right Side: Instructions & Attempts History */}
                <div className="flex flex-col gap-6">
                  {/* Instructions Panel */}
                  <div className="glass-panel p-6 rounded-3xl">
                    <h3 className="text-sm font-black uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                      <HelpCircle size={16} />
                      Quick Guide
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-400 list-disc list-inside leading-relaxed">
                      <li>Use the <strong className="text-slate-300">Quick Practice</strong> button to test the app instantly.</li>
                      <li>Use <strong className="text-slate-300">pipe format</strong>: <code className="text-primary bg-slate-950 px-1 rounded">Type | Q | Options | Ans | Expl</code>.</li>
                      <li>In simulator, press <kbd className="bg-slate-800 text-slate-300 px-1 rounded border border-slate-750">Enter</kbd> to check/submit.</li>
                      <li>Use <kbd className="bg-slate-800 text-slate-300 px-1 rounded border border-slate-750">Arrow Keys</kbd> to navigate questions.</li>
                      <li>Press <kbd className="bg-slate-800 text-slate-300 px-1 rounded border border-slate-750">1</kbd> - <kbd className="bg-slate-800 text-slate-300 px-1 rounded border border-slate-750">4</kbd> to select MCQ options.</li>
                    </ul>
                  </div>

                  {/* Attempts History Log */}
                  <div className="glass-panel p-6 rounded-3xl flex-1 flex flex-col min-h-[250px] max-h-[350px]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black uppercase tracking-wider text-primary flex items-center gap-2">
                        <Trophy size={16} />
                        Attempt History
                      </h3>
                      {history.length > 0 && (
                        <button 
                          onClick={handleClearHistory}
                          className="text-[10px] text-red-400 font-bold hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                      {history.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                          <Calendar size={28} className="text-slate-700 mb-2" />
                          <p className="text-xs text-slate-500">No attempts logged yet. Complete an exam to track your scores here!</p>
                        </div>
                      ) : (
                        history.map((attempt) => {
                          const pct = Math.round((attempt.score / attempt.total) * 100);
                          return (
                            <div 
                              key={attempt.id} 
                              className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl flex items-center justify-between hover:border-slate-800 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                                  <Calendar size={11} className="text-slate-600" />
                                  {formatDate(attempt.date)}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Time: {formatTime(attempt.timeTaken)} ({attempt.duration}m limit)
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={cn(
                                  "text-sm font-black",
                                  pct >= 80 ? "text-green-400" : pct >= 50 ? "text-primary" : "text-red-400"
                                )}>
                                  {pct}%
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold">
                                  {attempt.score}/{attempt.total} Correct
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {state.phase === 'SETUP' && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="glass-panel p-8 md:p-12 rounded-3xl max-w-xl mx-auto w-full text-center"
              >
                <Settings className="text-primary mx-auto mb-5 animate-spin-slow" size={44} />
                <h2 className="text-2xl md:text-3xl font-black mb-1.5 uppercase tracking-tight">Exam Configuration</h2>
                <p className="text-slate-400 text-xs md:text-sm mb-8">Adjust parameters prior to starting your simulator session.</p>
                
                <div className="mb-8 p-6 bg-slate-950/50 border border-slate-900 rounded-2xl">
                  <label className="block text-[10px] font-black text-primary/80 uppercase tracking-widest mb-3">Session Duration (Minutes)</label>
                  <div className="flex items-center justify-center gap-6">
                    <button 
                      onClick={() => {
                        playSound('click');
                        setState(prev => ({ ...prev, duration: Math.max(1, prev.duration - 5) }));
                      }}
                      className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      type="button"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <input
                      type="number"
                      value={state.duration}
                      onChange={(e) => setState(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                      className="bg-transparent text-5xl font-black text-primary w-24 text-center focus:outline-none font-mono"
                    />
                    <button 
                      onClick={() => {
                        playSound('click');
                        setState(prev => ({ ...prev, duration: prev.duration + 5 }));
                      }}
                      className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      type="button"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-primary/5">
                    <div className="text-slate-500 text-[10px] uppercase font-black tracking-wider mb-0.5">Questions Loaded</div>
                    <div className="text-2xl font-black text-primary font-mono">{state.questions.length}</div>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-primary/5">
                    <div className="text-slate-500 text-[10px] uppercase font-black tracking-wider mb-0.5">Sim Mode</div>
                    <div className="text-2xl font-black text-primary">Proctored</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={startExam}
                    className="flex-1 py-4 bg-primary hover:bg-primary-hover text-slate-950 font-black text-base rounded-2xl transition-all shadow-lg shadow-primary/20 cursor-pointer"
                  >
                    START SIMULATION
                  </button>

                  <button
                    onClick={handleExportExam}
                    className="py-4 px-5 border border-primary/20 text-primary font-bold rounded-2xl hover:bg-primary/5 transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
                    title="Save this exam layout to a file so you can import it later without AI parsing"
                  >
                    <Download size={16} />
                    EXPORT DATASET
                  </button>
                </div>

                <button
                  onClick={() => {
                    playSound('click');
                    setState(prev => ({ ...prev, phase: 'INPUT' }));
                  }}
                  className="mt-5 text-xs text-slate-500 hover:text-primary transition-colors font-bold cursor-pointer"
                >
                  Back to Input Setup
                </button>
              </motion.div>
            )}

            {state.phase === 'QUIZ' && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col md:flex-row gap-6 md:gap-8 h-full items-start"
              >
                {/* Navigator Sidebar (Desktop) */}
                <aside className={cn(
                  "hidden md:block glass-panel p-4 md:p-6 rounded-3xl h-fit sticky top-8 transition-all duration-300 shrink-0",
                  isSidebarCollapsed ? "w-20" : "w-72"
                )}>
                  <NavigatorContent 
                    state={state} 
                    currentQuestionIndex={currentQuestionIndex} 
                    setCurrentQuestionIndex={setCurrentQuestionIndex}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    setIsExitModalOpen={setIsExitModalOpen}
                    isCollapsed={isSidebarCollapsed}
                    setIsCollapsed={setIsSidebarCollapsed}
                  />
                </aside>

                {/* Mobile Navigator Drawer Overlay */}
                <AnimatePresence>
                  {isMobileNavOpen && (
                    <div className="fixed inset-0 z-50 md:hidden flex items-end justify-center">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileNavOpen(false)}
                        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
                      />
                      <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="glass-panel relative w-full max-h-[85vh] p-6 rounded-t-3xl overflow-y-auto custom-scrollbar"
                      >
                        <div className="flex justify-between items-center mb-5">
                          <h3 className="text-lg font-black text-primary uppercase tracking-wider">Question Navigator</h3>
                          <button 
                            onClick={() => {
                              playSound('click');
                              setIsMobileNavOpen(false);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <ArrowLeft className="rotate-270" size={22} />
                          </button>
                        </div>
                        <NavigatorContent 
                          state={state} 
                          currentQuestionIndex={currentQuestionIndex} 
                          setCurrentQuestionIndex={(idx) => {
                            setCurrentQuestionIndex(idx);
                            setIsMobileNavOpen(false);
                          }}
                          searchQuery={searchQuery}
                          setSearchQuery={setSearchQuery}
                          setIsExitModalOpen={setIsExitModalOpen}
                        />
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Main Question Display Area */}
                <div className="flex-1 flex flex-col gap-5 w-full">
                  {/* Linear Progress Bar of Exam Time */}
                  <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000 ease-linear",
                        timePercentage < 10 ? "bg-red-500" : "bg-primary"
                      )} 
                      style={{ width: `${timePercentage}%` }}
                    />
                  </div>

                  <div className="glass-panel p-5 md:p-8 rounded-3xl flex-1 relative overflow-hidden min-h-[380px]">
                    {state.isPaused && (
                      <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
                        <Pause size={54} className="text-primary mb-3 animate-pulse" />
                        <h2 className="text-2xl font-black text-primary uppercase tracking-wider">Simulation Paused</h2>
                        <p className="text-xs text-slate-500 mt-1 mb-6 max-w-xs">Your exam timer is suspended. Content is hidden for academic integrity.</p>
                        <button 
                          onClick={() => {
                            playSound('click');
                            setState(prev => ({ ...prev, isPaused: false }));
                          }}
                          className="px-8 py-3 bg-primary text-slate-950 font-black rounded-xl hover:bg-primary-hover transition-all text-sm cursor-pointer shadow-lg shadow-primary/20"
                        >
                          RESUME SESSION
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-6">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest border border-primary/10">
                        {currentQuestion.type === 'MCQ' ? 'Multiple Choice' : 'Numeric Fill-In'}
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer group select-none">
                        <input 
                          type="checkbox"
                          checked={state.markedForReview.has(currentQuestion.id)}
                          onChange={(e) => {
                            playSound('click');
                            const newMarked = new Set(state.markedForReview);
                            if (e.target.checked) newMarked.add(currentQuestion.id);
                            else newMarked.delete(currentQuestion.id);
                            setState(prev => ({ ...prev, markedForReview: newMarked }));
                          }}
                          className="hidden"
                        />
                        <div className={cn(
                          "w-4 h-4 rounded border transition-all flex items-center justify-center",
                          state.markedForReview.has(currentQuestion.id) ? "bg-blue-500 border-blue-500" : "border-slate-750 group-hover:border-primary/50"
                        )}>
                          {state.markedForReview.has(currentQuestion.id) && <Flag size={10} fill="white" className="text-white" />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">Mark for Review</span>
                      </label>
                    </div>

                    <div className="mb-6 md:mb-8">
                      <div className="text-base md:text-xl font-semibold leading-relaxed text-slate-100">
                        <KaTeXRenderer content={currentQuestion.question} />
                      </div>
                    </div>

                    {/* Question Inputs */}
                    <div className="space-y-3.5">
                      {currentQuestion.type === 'MCQ' ? (
                        currentQuestion.options?.map((option, idx) => {
                          const isSelected = state.userAnswers[currentQuestion.id] === option;
                          const isChecked = state.checkedAnswers.has(currentQuestion.id);
                          const isCorrect = option === currentQuestion.answer;
                          
                          return (
                            <button
                              key={idx}
                              disabled={isChecked}
                              onClick={() => {
                                playSound('click');
                                setState(prev => ({
                                  ...prev,
                                  userAnswers: { ...prev.userAnswers, [currentQuestion.id]: option }
                                }));
                              }}
                              className={cn(
                                "w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 group relative overflow-hidden",
                                isSelected ? "border-primary bg-primary/8" : "border-slate-850 bg-slate-950/25 hover:border-primary/30",
                                isChecked && isCorrect ? "border-green-500 bg-green-500/8" : "",
                                isChecked && isSelected && !isCorrect ? "border-red-500 bg-red-500/8" : "",
                                isChecked ? "cursor-default" : "cursor-pointer"
                              )}
                            >
                              <div className={cn(
                                "w-7.5 h-7.5 rounded-lg flex items-center justify-center text-xs font-black transition-colors shrink-0",
                                isSelected ? "bg-primary text-slate-950" : "bg-slate-850 text-slate-400 group-hover:bg-slate-800",
                                isChecked && isCorrect ? "bg-green-500 text-white" : "",
                                isChecked && isSelected && !isCorrect ? "bg-red-500 text-white" : ""
                              )}>
                                {String.fromCharCode(65 + idx)}
                              </div>
                              <div className="flex-1 text-xs md:text-sm font-medium">
                                <KaTeXRenderer content={option} />
                              </div>
                              {isChecked && isCorrect && <CheckCircle2 className="text-green-500 shrink-0" size={18} />}
                              {isChecked && isSelected && !isCorrect && <AlertCircle className="text-red-500 shrink-0" size={18} />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            disabled={state.checkedAnswers.has(currentQuestion.id)}
                            value={state.userAnswers[currentQuestion.id] || ''}
                            onChange={(e) => setState(prev => ({
                              ...prev,
                              userAnswers: { ...prev.userAnswers, [currentQuestion.id]: e.target.value }
                            }))}
                            placeholder="Enter numeric response..."
                            className="flex-1 bg-slate-950/40 border border-slate-850 hover:border-primary/20 focus:border-primary/50 rounded-2xl p-4 text-base md:text-lg font-black text-primary focus:outline-none transition-colors font-mono"
                          />
                          {currentQuestion.unit && (
                            <span className="text-lg font-black text-slate-500">{currentQuestion.unit}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Explanation Panel */}
                    {state.checkedAnswers.has(currentQuestion.id) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "mt-6 p-5 rounded-2xl border",
                          state.userAnswers[currentQuestion.id] === currentQuestion.answer 
                            ? "bg-green-500/5 border-green-500/15" 
                            : "bg-red-500/5 border-red-500/15"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {state.userAnswers[currentQuestion.id] === currentQuestion.answer ? (
                            <span className="text-green-400 font-black uppercase tracking-wider text-[11px]">Correct Response</span>
                          ) : (
                            <span className="text-red-400 font-black uppercase tracking-wider text-[11px]">Incorrect Response</span>
                          )}
                        </div>
                        <div className="text-slate-400 text-xs leading-relaxed">
                          <KaTeXRenderer content={currentQuestion.explanation} />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3.5 mt-2">
                    <button
                      onClick={() => {
                        playSound('click');
                        setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                      }}
                      disabled={currentQuestionIndex === 0}
                      className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-primary/15 text-primary font-bold hover:bg-primary/5 disabled:opacity-25 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-xs md:text-sm cursor-pointer"
                    >
                      <ArrowLeft size={16} />
                      PREVIOUS
                    </button>

                    <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto">
                      {!state.checkedAnswers.has(currentQuestion.id) && (
                        <button
                          onClick={() => {
                            const q = state.questions[currentQuestionIndex];
                            const isCorrect = state.userAnswers[q.id] === q.answer;
                            setState(prev => ({ ...prev, checkedAnswers: new Set(prev.checkedAnswers).add(q.id) }));
                            playSound(isCorrect ? 'correct' : 'incorrect');
                          }}
                          disabled={!state.userAnswers[currentQuestion.id]}
                          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 text-primary font-black border border-primary/10 hover:border-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs md:text-sm cursor-pointer"
                        >
                          CHECK ANSWER
                        </button>
                      )}
                      
                      {currentQuestionIndex === state.questions.length - 1 ? (
                        <button
                          onClick={finishExam}
                          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-primary text-slate-950 font-black hover:bg-primary-hover transition-all flex items-center justify-center gap-2 text-xs md:text-sm cursor-pointer shadow-lg shadow-primary/15"
                        >
                          FINISH EXAM
                          <CheckCircle2 size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            playSound('click');
                            setCurrentQuestionIndex(prev => Math.min(state.questions.length - 1, prev + 1));
                          }}
                          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-primary text-slate-950 font-black hover:bg-primary-hover transition-all flex items-center justify-center gap-2 text-xs md:text-sm cursor-pointer shadow-lg shadow-primary/15"
                        >
                          NEXT
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {state.phase === 'RESULTS' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-3xl mx-auto"
              >
                <div className="glass-panel p-8 md:p-10 rounded-3xl text-center mb-8">
                  <Trophy className="text-primary mx-auto mb-4 animate-bounce" size={48} />
                  <h2 className="text-2xl md:text-3xl font-black mb-1 uppercase tracking-tight">Performance Analytics</h2>
                  <p className="text-slate-400 text-xs md:text-sm mb-8">Review the metrics of your simulator attempt.</p>

                  {/* Circular Score Ring */}
                  <ScoreRing 
                    score={Object.entries(state.userAnswers).filter(([id, ans]) => ans === state.questions.find(q => q.id === id)?.answer).length}
                    total={state.questions.length}
                  />

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900 col-span-2 md:col-span-1">
                      <div className="text-slate-500 text-[10px] uppercase font-black tracking-wider mb-0.5">Average Accuracy</div>
                      <div className="text-xl font-black text-primary">
                        {Math.round((Object.entries(state.userAnswers).filter(([id, ans]) => ans === state.questions.find(q => q.id === id)?.answer).length / state.questions.length) * 100)}%
                      </div>
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900">
                      <div className="text-slate-500 text-[10px] uppercase font-black tracking-wider mb-0.5">Elapsed Time</div>
                      <div className="text-xl font-black text-primary font-mono">
                        {formatTime(state.duration * 60 - state.timeRemaining)}
                      </div>
                    </div>
                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900">
                      <div className="text-slate-500 text-[10px] uppercase font-black tracking-wider mb-0.5">Pace / Question</div>
                      <div className="text-xl font-black text-primary font-mono">
                        {Math.round((state.duration * 60 - state.timeRemaining) / state.questions.length)}s
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3.5">
                    <button
                      onClick={startExam}
                      className="flex-1 py-3.5 bg-primary hover:bg-primary-hover text-slate-950 font-black rounded-2xl transition-all cursor-pointer shadow-lg shadow-primary/10 text-sm md:text-base"
                    >
                      RETAKE SIMULATION
                    </button>
                    <button
                      onClick={resetExam}
                      className="flex-1 py-3.5 border border-primary/25 text-primary font-bold rounded-2xl hover:bg-primary/5 transition-all cursor-pointer text-sm md:text-base"
                    >
                      INITIALIZE NEW EXAM
                    </button>
                  </div>
                </div>

                <div className="space-y-5">
                  <h3 className="text-lg font-black uppercase tracking-tight text-primary/70 ml-2">Detailed Response Review</h3>
                  {state.questions.map((q, idx) => {
                    const userAns = state.userAnswers[q.id];
                    const isCorrect = userAns === q.answer;
                    return (
                      <div key={q.id} className={cn(
                        "glass-panel p-6 md:p-8 rounded-3xl border-l-4",
                        isCorrect ? "border-l-green-500" : "border-l-red-500"
                      )}>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Question {idx + 1}</span>
                          {isCorrect ? (
                            <span className="text-green-400 font-black text-xs uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={12} /> Correct
                            </span>
                          ) : (
                            <span className="text-red-450 font-black text-xs uppercase tracking-widest flex items-center gap-1">
                              <AlertCircle size={12} /> Incorrect
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm md:text-base font-medium mb-5 leading-relaxed">
                          <KaTeXRenderer content={q.question} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900/50">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Your Response</div>
                            <div className={cn("text-xs font-bold", isCorrect ? "text-green-400" : "text-red-400")}>
                              {userAns ? <KaTeXRenderer content={userAns} /> : 'Blank'}
                            </div>
                          </div>
                          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900/50">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Correct Key</div>
                            <div className="text-green-400 text-xs font-bold">
                              <KaTeXRenderer content={q.answer} />
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-950/20 p-5 rounded-2xl border border-primary/5">
                          <div className="text-[10px] font-black text-primary/60 uppercase tracking-wider mb-1.5">Explanation</div>
                          <div className="text-slate-450 text-xs leading-relaxed">
                            <KaTeXRenderer content={q.explanation} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Universal Modals */}
        <Modal
          isOpen={isExitModalOpen}
          onClose={() => setIsExitModalOpen(false)}
          onConfirm={resetExam}
          title="Exit Simulation?"
          message="Are you sure you want to terminate the proctored session? Your current progress will be discarded."
        />

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        <footer className="w-full max-w-6xl mt-12 py-6 border-t border-primary/5 text-center">
          <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.25em]">
            &copy; 2026 EMAGYNE SIMULATOR &bull; PROFESSIONAL INTERFACE
          </p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
