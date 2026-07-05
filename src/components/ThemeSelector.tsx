import React, { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
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

export function ThemeSelector() {
  const [activeTheme, setActiveTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('emagyne_theme') as ThemeType) || 'gold';
  });

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

    localStorage.setItem('emagyne_theme', activeTheme);
  }, [activeTheme]);

  return (
    <div className="flex items-center gap-2 bg-slate-950/60 border border-primary/10 rounded-full px-3 py-1.5 backdrop-blur-md shadow-inner">
      <Palette size={14} className="text-primary/75 animate-pulse" />
      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider hidden sm:inline">Theme</span>
      <div className="flex gap-1.5">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => setActiveTheme(theme.id)}
            type="button"
            title={theme.name}
            className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-125 cursor-pointer relative",
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
  );
}
