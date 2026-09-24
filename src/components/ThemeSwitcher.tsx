import React from 'react';
import { AppTheme, sendQueue } from '../lib/sendQueue';
import { Sun, Moon, Flame } from 'lucide-react';

interface ThemeSwitcherProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  compact?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onThemeChange,
  compact = false
}) => {
  const themes: { id: AppTheme; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'white', label: 'rodar no white', icon: Sun },
    { id: 'black', label: 'rodar no black', icon: Moon },
    { id: 'vorcarus', label: 'VORCARUS', icon: Flame },
  ];

  return (
    <div className="inline-flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800 shadow-inner">
      {themes.map((t) => {
        const isSelected = currentTheme === t.id;
        const Icon = t.icon;

        let activeStyle = '';
        if (isSelected) {
          if (t.id === 'white') {
            activeStyle = 'bg-white text-slate-900 font-extrabold shadow-md border border-slate-300';
          } else if (t.id === 'vorcarus') {
            activeStyle = 'bg-rose-600 text-white font-extrabold shadow-md shadow-rose-600/30';
          } else {
            activeStyle = 'bg-slate-800 text-emerald-400 font-extrabold shadow-md border border-slate-700';
          }
        } else {
          activeStyle = 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40';
        }

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onThemeChange(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs ${activeStyle}`}
            title={`Trocar tema para ${t.label}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="capitalize">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};
