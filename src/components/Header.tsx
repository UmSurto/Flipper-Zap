import React from 'react';
import { 
  Home, 
  Send, 
  Code, 
  Zap, 
  ArrowLeft,
  Bot,
  Clock,
  MessageSquare,
  Mic,
  Image as ImageIcon,
  Smartphone
} from 'lucide-react';
import { BridgeStatus } from '../lib/bridgeClient';
import { AppTheme } from '../lib/sendQueue';
import { ThemeSwitcher } from './ThemeSwitcher';

export type AppView = 'home' | 'replies' | 'chatbot' | 'followup' | 'audios' | 'images' | 'simulator';

interface HeaderProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  bridgeStatus: BridgeStatus;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  onOpenQuickSend: () => void;
  onOpenExtensionModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  bridgeStatus,
  currentTheme,
  onThemeChange,
  onOpenQuickSend,
  onOpenExtensionModal,
}) => {
  const getViewTitle = () => {
    switch (currentView) {
      case 'replies': return { label: 'Mensagem rápida', icon: MessageSquare };
      case 'chatbot': return { label: 'Chatbot', icon: Bot };
      case 'followup': return { label: 'Follow-up', icon: Clock };
      case 'audios': return { label: 'Áudios', icon: Mic };
      case 'images': return { label: 'Banco de fotos', icon: ImageIcon };
      case 'simulator': return { label: 'Simulador', icon: Smartphone };
      default: return null;
    }
  };

  const viewInfo = getViewTitle();

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-slate-900/95 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-2.5 text-left cursor-pointer group shrink-0"
              title="Ir para o menu principal"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-extrabold group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <span className="font-extrabold text-base text-white tracking-tight group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                  Flipper Zap
                </span>
              </div>
            </button>

            {/* Breadcrumb if inside a module */}
            {currentView !== 'home' && viewInfo && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-800 text-xs min-w-0">
                <button
                  onClick={() => setCurrentView('home')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium whitespace-nowrap"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Início</span>
                </button>
                <span className="text-slate-600">/</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 whitespace-nowrap truncate">
                  <viewInfo.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{viewInfo.label}</span>
                </span>
              </div>
            )}
          </div>

          {/* Controls: Theme Switcher & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Seletor de Tema Compacto */}
            <div className="hidden sm:block">
              <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />
            </div>

            {/* Botão de Retorno à Home se não estiver na home */}
            {currentView !== 'home' && (
              <button
                onClick={() => setCurrentView('home')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                title="Voltar para a tela principal"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voltar ao Menu</span>
              </button>
            )}

            {/* Live WhatsApp Web Bridge Status */}
            <button
              id="btn-bridge-status"
              onClick={onOpenExtensionModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                bridgeStatus.connected
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
              }`}
              title={bridgeStatus.connected ? 'WhatsApp Web Conectado' : 'Clique para conectar com o WhatsApp Web'}
            >
              <span className={`w-2 h-2 rounded-full ${bridgeStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="hidden md:inline font-bold">
                {bridgeStatus.connected ? 'WhatsApp Conectado' : 'Conectar WhatsApp'}
              </span>
            </button>

            {/* Botão Disparo Direto */}
            <button
              id="btn-open-quick-send"
              onClick={onOpenQuickSend}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer whitespace-nowrap"
              title="Disparar mensagem no WhatsApp Web"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Disparo Direto</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
