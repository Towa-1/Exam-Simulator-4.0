import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, ShieldCheck, Key, Volume2, Keyboard, Trash2, Cpu, ExternalLink, Sparkles, Palette } from 'lucide-react';
import { cn } from '../lib/utils';

export type ThemeType = 'gold' | 'emerald' | 'sapphire' | 'ruby';

interface ThemeOption {
  id: ThemeType;
  name: string;
  className: string;
  colorClass: string;
}

const THEMES: ThemeOption[] = [
  { id: 'gold', name: 'Amber Gold', className: '', colorClass: 'bg-yellow-500' },
  { id: 'emerald', name: 'Emerald Cyber', className: 'theme-emerald', colorClass: 'bg-emerald-500' },
  { id: 'sapphire', name: 'Sapphire Deep', className: 'theme-sapphire', colorClass: 'bg-blue-500' },
  { id: 'ruby', name: 'Ruby Crimson', className: 'theme-ruby', colorClass: 'bg-red-500' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'deepseek' | 'custom'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [activeTheme, setActiveTheme] = useState<ThemeType>('gold');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProvider((localStorage.getItem('emagyne_api_provider') as any) || 'gemini');
      setApiKey(localStorage.getItem('emagyne_api_key') || '');
      setCustomUrl(localStorage.getItem('emagyne_custom_url') || '');
      setCustomModel(localStorage.getItem('emagyne_custom_model') || '');
      setSoundEnabled(localStorage.getItem('emagyne_sound_enabled') !== 'false');
      setShortcutsEnabled(localStorage.getItem('emagyne_shortcuts_enabled') !== 'false');
      setActiveTheme((localStorage.getItem('emagyne_theme') as ThemeType) || 'gold');
      setIsSaved(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Remove all theme classes from document element
    THEMES.forEach(t => {
      if (t.className) {
        document.documentElement.classList.remove(t.className);
      }
    });

    // Add active theme class to document element
    const themeObj = THEMES.find(t => t.id === activeTheme);
    if (themeObj && themeObj.className) {
      document.documentElement.classList.add(themeObj.className);
    }
  }, [activeTheme]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('emagyne_api_provider', provider);
    localStorage.setItem('emagyne_api_key', apiKey.trim());
    localStorage.setItem('emagyne_custom_url', customUrl.trim());
    localStorage.setItem('emagyne_custom_model', customModel.trim());
    localStorage.setItem('emagyne_sound_enabled', String(soundEnabled));
    localStorage.setItem('emagyne_shortcuts_enabled', String(shortcutsEnabled));
    localStorage.setItem('emagyne_theme', activeTheme);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
      // Dispatch storage event so other components know storage changed
      window.dispatchEvent(new Event('storage'));
    }, 800);
  };

  const handleClearKey = () => {
    if (confirm('Are you sure you want to remove your saved API key?')) {
      localStorage.removeItem('emagyne_api_key');
      setApiKey('');
      window.dispatchEvent(new Event('storage'));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="glass-panel relative w-full max-w-md p-6 md:p-8 rounded-3xl z-10 flex flex-col max-h-[90vh]"
          >
            <button
              onClick={onClose}
              type="button"
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-black uppercase tracking-tight text-primary mb-6 shrink-0">Preferences & API</h2>

            <form onSubmit={handleSave} className="space-y-5 overflow-y-auto flex-1 custom-scrollbar pr-1.5 -mr-1.5">
              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider">
                  <Cpu size={14} className="text-primary" />
                  API Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="w-full bg-slate-950/50 border border-primary/20 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-slate-200 cursor-pointer"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="custom">Custom (OpenAI-Compatible)</option>
                </select>
              </div>

              {/* API Key Input */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider">
                  <Key size={14} className="text-primary" />
                  {provider === 'gemini' 
                    ? 'Gemini API Key' 
                    : provider === 'openai' 
                      ? 'OpenAI API Key' 
                      : provider === 'deepseek'
                        ? 'DeepSeek API Key'
                        : 'API Key'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      provider === 'gemini' 
                        ? 'AI Studio API Key (AIzaSy...)' 
                        : provider === 'openai' 
                          ? 'OpenAI API Key (sk-...)' 
                          : provider === 'deepseek'
                            ? 'DeepSeek API Key (sk-...)'
                            : 'API Key'
                    }
                    className="w-full bg-slate-950/50 border border-primary/20 rounded-xl py-3 pl-4 pr-20 text-sm focus:outline-none focus:border-primary/50 transition-colors font-mono text-primary"
                  />
                  <div className="absolute right-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {apiKey && (
                      <button
                        type="button"
                        onClick={handleClearKey}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Clear saved key"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Instructions on how to get API Keys */}
                {provider === 'gemini' && (
                  <div className="mt-2.5 p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-2 text-[11px] md:text-xs text-slate-400 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                      <Sparkles size={13} className="text-primary animate-pulse" />
                      Get a free Google Gemini API Key:
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 pl-0.5">
                      <li>
                        Go to{' '}
                        <a 
                          href="https://aistudio.google.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-0.5 font-bold cursor-pointer"
                        >
                          Google AI Studio <ExternalLink size={10} className="inline ml-0.5" />
                        </a>
                      </li>
                      <li>Sign in with your Google Account.</li>
                      <li>Click the <strong className="text-slate-300">"Get API key"</strong> button in the left menu.</li>
                      <li>Click <strong className="text-slate-300">"Create API key"</strong> and select a project.</li>
                      <li>Copy the key (starts with <code className="text-primary bg-primary/10 px-1 py-0.5 rounded font-mono text-[10px]">AIzaSy...</code>) and paste it above!</li>
                    </ol>
                  </div>
                )}

                {provider === 'openai' && (
                  <div className="mt-2.5 p-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-[11px] md:text-xs text-slate-400 leading-normal">
                    Need an OpenAI API Key? Get one from the{' '}
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5 font-bold cursor-pointer"
                    >
                      OpenAI Developer Dashboard <ExternalLink size={10} className="inline ml-0.5" />
                    </a>.
                  </div>
                )}

                {provider === 'deepseek' && (
                  <div className="mt-2.5 p-3 bg-slate-950/40 border border-slate-800 rounded-2xl text-[11px] md:text-xs text-slate-400 leading-normal">
                    Need a DeepSeek API Key? Get one from the{' '}
                    <a 
                      href="https://platform.deepseek.com/api_keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5 font-bold cursor-pointer"
                    >
                      DeepSeek Console <ExternalLink size={10} className="inline ml-0.5" />
                    </a>.
                  </div>
                )}
              </div>

              {/* Custom Provider Fields */}
              <AnimatePresence>
                {provider === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-1 overflow-hidden"
                  >
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                        Base URL
                      </label>
                      <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://api.deepseek.com/v1"
                        className="w-full bg-slate-950/50 border border-primary/20 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-slate-200 font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                        Model Name
                      </label>
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="deepseek-chat"
                        className="w-full bg-slate-950/50 border border-primary/20 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary/50 text-slate-200 font-mono"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Preferences */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Simulator Settings</h3>

                {/* Active Theme Selector */}
                <div className="flex items-center justify-between p-3 bg-slate-950/30 border border-slate-800/50 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800/50 rounded-lg text-primary mt-0.5">
                      <Palette size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">Active Theme</div>
                      <div className="text-xs text-slate-500 font-medium">Choose color accent.</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {THEMES.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => setActiveTheme(theme.id)}
                        type="button"
                        title={theme.name}
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-125 cursor-pointer relative",
                          theme.colorClass,
                          activeTheme === theme.id ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110" : "opacity-50 hover:opacity-100"
                        )}
                      >
                        {activeTheme === theme.id && (
                          <span className="absolute w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Keyboard Shortcuts */}
                <label className="flex items-center justify-between p-3 bg-slate-950/30 border border-slate-800/50 rounded-2xl cursor-pointer hover:border-slate-700/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800/50 rounded-lg text-primary mt-0.5">
                      <Keyboard size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">Keyboard Shortcuts</div>
                      <div className="text-xs text-slate-500">Use arrow keys, numbers, and Enter to navigate.</div>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={shortcutsEnabled}
                      onChange={(e) => setShortcutsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5 peer-checked:after:bg-slate-950 transition-colors" />
                  </div>
                </label>

                {/* Sound Effects */}
                <label className="flex items-center justify-between p-3 bg-slate-950/30 border border-slate-800/50 rounded-2xl cursor-pointer hover:border-slate-700/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800/50 rounded-lg text-primary mt-0.5">
                      <Volume2 size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">Sound Effects</div>
                      <div className="text-xs text-slate-500">Subtle audio feedback on score and interactions.</div>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5 peer-checked:after:bg-slate-950 transition-colors" />
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-primary/20 text-primary font-bold hover:bg-primary/10 transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-primary text-slate-950 font-black hover:bg-primary-hover transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
                >
                  {isSaved ? (
                    <>
                      <ShieldCheck size={18} />
                      SAVED!
                    </>
                  ) : (
                    'SAVE PREFERENCES'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
