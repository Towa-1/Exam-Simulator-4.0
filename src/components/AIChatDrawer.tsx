import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Trash2, Sparkles, AlertCircle, HelpCircle, ArrowRight, MessageSquare } from 'lucide-react';
import { KaTeXRenderer } from './KaTeXRenderer';
import { generateChatResponse, ChatMessage } from '../services/geminiService';
import { playSound } from '../lib/sound';
import { Question } from '../types';
import { cn } from '../lib/utils';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeQuestion?: Question;
  activeQuestionIndex?: number;
  userAnswer?: string;
  isAnswerChecked?: boolean;
  isInline?: boolean;
}

export function AIChatDrawer({
  isOpen,
  onClose,
  activeQuestion,
  activeQuestionIndex,
  userAnswer,
  isAnswerChecked,
  isInline = false
}: AIChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('emagyne_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const provider = localStorage.getItem('emagyne_chat_provider') || localStorage.getItem('emagyne_api_provider') || 'gemini';
  const providerName = provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : provider === 'deepseek' ? 'DeepSeek' : 'Custom AI';

  // Persistence
  useEffect(() => {
    localStorage.setItem('emagyne_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setError(null);
    const newMsg: ChatMessage = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    playSound('click');

    try {
      const systemInstruction = 
        "You are Emagyne AI Assistant, a friendly and highly knowledgeable academic tutor. " +
        "Your task is to help the user understand exam questions, explain complicated concepts clearly, " +
        "and guide them through solutions step by step. Use markdown formatting where appropriate. " +
        "Crucially: you MUST style all mathematical equations using LaTeX delimiters ($...$ for inline, $$...$$ for block math), " +
        "and wrap all code syntax, variables, outputs, and console commands in backticks (`code`) so they render nicely.";

      const responseText = await generateChatResponse(updatedMessages, systemInstruction);
      setMessages(prev => [...prev, { role: 'model', content: responseText }]);
      playSound('correct');
    } catch (e: any) {
      console.error(e);
      playSound('incorrect');
      if (e.message === 'MISSING_API_KEY') {
        setError(`Configuration Error: AI Tutor API Key is missing. Click the Settings icon in the top right to configure your ${providerName} key.`);
      } else {
        setError(e.message || "An error occurred while generating the AI response. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear this conversation?")) {
      setMessages([]);
      setError(null);
      playSound('click');
    }
  };

  // Helper to ask about the active question
  const askAboutActiveQuestion = () => {
    if (!activeQuestion) return;

    const qNum = typeof activeQuestionIndex === 'number' ? activeQuestionIndex + 1 : '';
    let questionContext = `Can you explain Question ${qNum}?\n\n**Question:** ${activeQuestion.question}\n`;
    
    if (activeQuestion.options && activeQuestion.options.length > 0) {
      questionContext += `**Options:**\n${activeQuestion.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n')}\n`;
    }
    
    questionContext += `**Correct Answer:** ${activeQuestion.answer}\n`;

    if (isAnswerChecked && userAnswer) {
      questionContext += `**My Answer:** ${userAnswer} (${userAnswer === activeQuestion.answer ? 'Correct' : 'Incorrect'})\n`;
    }

    questionContext += `**Provided Explanation:** ${activeQuestion.explanation}\n\nCan you break this down further and explain the key concepts here?`;

    handleSend(questionContext);
  };

  const samplePrompts = [
    {
      title: "Explain active question",
      action: askAboutActiveQuestion,
      show: !!activeQuestion
    },
    {
      title: "Exam study strategies",
      action: () => handleSend("Can you share some of the best strategies for studying and managing time during complex multiple choice and numerical exams?"),
      show: true
    },
    {
      title: "Explain LaTeX & Math",
      action: () => handleSend("How does LaTeX work in exams? Can you show me an example of an equation formatted in LaTeX like the quadratic formula?"),
      show: true
    }
  ];

  const renderInner = () => (
    <>
      {/* Header */}
      <header className="p-4 border-b border-primary/10 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary animate-pulse" size={20} fill="currentColor" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider theme-gradient-text">Emagyne AI Tutor</h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Connected &bull; {providerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900/60 transition-colors cursor-pointer"
              title="Clear Conversation"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
            title="Close Panel"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="w-16 h-16 bg-slate-950/60 border border-primary/20 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/5 pulse-glow-effect">
              <MessageSquare className="text-primary" size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">Academic AI Companion</h3>
              <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed">
                Ask me about the questions, formulas, explanations, or any concepts you are struggling with.
              </p>
            </div>

            {/* Sample Prompts */}
            <div className="w-full max-w-[320px] space-y-2.5 pt-4">
              {samplePrompts.map((prompt, idx) => {
                if (!prompt.show) return null;
                return (
                  <button
                    key={idx}
                    onClick={prompt.action}
                    className="w-full p-3 rounded-xl bg-slate-950/60 border border-slate-850 hover:border-primary/30 text-left text-xs font-semibold text-slate-400 hover:text-primary transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>{prompt.title}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isModel = msg.role === 'model';
              return (
                <div
                  key={index}
                  className={cn(
                    "flex w-full flex-col space-y-1",
                    isModel ? "items-start" : "items-end"
                  )}
                >
                  <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider px-1">
                    {isModel ? providerName : "You"}
                  </span>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl p-3.5 text-xs md:text-sm font-medium leading-relaxed shadow-md border",
                      isModel
                        ? "bg-slate-900/80 border-primary/10 text-slate-100"
                        : "bg-primary/10 border-primary/20 text-primary-hover"
                    )}
                  >
                    <KaTeXRenderer content={msg.content} />
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex w-full flex-col space-y-1 items-start">
                <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider px-1">
                  {providerName}
                </span>
                <div className="max-w-[85%] rounded-2xl p-3.5 bg-slate-900/80 border border-primary/10 shadow-md flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI is formulating...</span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border-t border-b border-red-500/20 text-red-400 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="shrink-0 mt-0.5" size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Context bar if a question is active and not already discussed */}
      {activeQuestion && messages.length > 0 && (
        <div className="px-4 py-2 bg-slate-900/40 border-t border-primary/5 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase">
            Active Q{typeof activeQuestionIndex === 'number' ? activeQuestionIndex + 1 : ''} Context available
          </span>
          <button
            onClick={askAboutActiveQuestion}
            disabled={isLoading}
            className="px-2.5 py-1 text-[10px] font-black bg-primary/10 border border-primary/20 text-primary rounded-lg hover:bg-primary/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Discuss Active Question
          </button>
        </div>
      )}

      {/* Input Panel */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-4 border-t border-primary/10 bg-slate-950/40"
      >
        <div className="flex gap-2.5 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Ask a question..."
            rows={1}
            className="flex-1 bg-slate-950/60 border border-primary/10 hover:border-primary/20 focus:border-primary/30 rounded-xl px-4 py-3 text-xs md:text-sm text-slate-200 focus:outline-none transition-colors resize-none custom-scrollbar max-h-24 placeholder:text-slate-600 font-medium"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 bg-primary hover:bg-primary-hover text-slate-950 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0 shadow-lg shadow-primary/5"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </>
  );

  if (isInline) {
    return (
      <div className="glass-panel w-full h-full flex flex-col z-10 border border-primary/20 shadow-2xl rounded-3xl relative overflow-hidden">
        {renderInner()}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="glass-panel relative w-full sm:w-[460px] h-screen flex flex-col z-10 border-l border-primary/20 shadow-[0_0_60px_rgba(0,0,0,0.8)]"
          >
            {renderInner()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
