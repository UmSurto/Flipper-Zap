import React from 'react';
import { 
  MessageSquare, 
  Bot, 
  Clock, 
  Mic, 
  Image as ImageIcon, 
  Smartphone, 
  Zap,
  Power
} from 'lucide-react';
import { BridgeStatus } from '../lib/bridgeClient';
import { ChatbotSettings, FollowUpQueueItem } from '../types';
import { AppTheme } from '../lib/sendQueue';
import { ThemeSwitcher } from './ThemeSwitcher';
import { TypingTimerSelector } from './TypingTimerSelector';

interface HomeHubProps {
  onNavigate: (view: 'replies' | 'chatbot' | 'followup' | 'audios' | 'images' | 'simulator') => void;
  bridgeStatus: BridgeStatus;
  chatbotSettings: ChatbotSettings;
  onToggleChatbotMaster: (enabled: boolean) => void;
  repliesCount: number;
  audiosCount: number;
  imagesCount: number;
  triggersCount: number;
  pendingFollowUpsCount: number;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  defaultTypingDelay: number;
  onDefaultTypingDelayChange: (seconds: number) => void;
  onOpenExtensionModal: () => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  onNavigate,
  bridgeStatus,
  chatbotSettings,
  onToggleChatbotMaster,
  repliesCount,
  audiosCount,
  imagesCount,
  triggersCount,
  pendingFollowUpsCount,
  currentTheme,
  onThemeChange,
  defaultTypingDelay,
  onDefaultTypingDelayChange,
  onOpenExtensionModal,
}) => {
  const cards = [
    {
      id: 'replies' as const,
      label: 'Mensagem rápida',
      icon: MessageSquare,
      badge: `${repliesCount}`,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      activeBorder: 'hover:border-emerald-500/50',
    },
    {
      id: 'followup' as const,
      label: 'Follow-up',
      icon: Clock,
      badge: pendingFollowUpsCount > 0 ? `${pendingFollowUpsCount} pendente` : `${pendingFollowUpsCount}`,
      badgeHighlight: pendingFollowUpsCount > 0,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      activeBorder: 'hover:border-amber-500/50',
    },
    {
      id: 'chatbot' as const,
      label: 'Chatbot',
      icon: Bot,
      badge: chatbotSettings.isMasterEnabled ? 'Ligado' : 'Desligado',
      badgeHighlight: chatbotSettings.isMasterEnabled,
      colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      activeBorder: 'hover:border-sky-500/50',
    },
    {
      id: 'audios' as const,
      label: 'Áudios',
      icon: Mic,
      badge: `${audiosCount}`,
      colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      activeBorder: 'hover:border-purple-500/50',
    },
    {
      id: 'images' as const,
      label: 'Banco de fotos',
      icon: ImageIcon,
      badge: `${imagesCount}`,
      colorClass: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      activeBorder: 'hover:border-pink-500/50',
    },
    {
      id: 'simulator' as const,
      label: 'Simulador',
      icon: Smartphone,
      badge: 'Teste',
      colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      activeBorder: 'hover:border-indigo-500/50',
    },
  ];

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Barra de Controle Superior: Tema, Temporizador e Conexão WhatsApp */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        {/* Seletor de Tema (rodar no white, rodar no black, VORCARUS) */}
        <div className="flex items-center gap-2">
          <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />
        </div>

        {/* Temporizador Global & Status WhatsApp */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <TypingTimerSelector
            value={defaultTypingDelay}
            onChange={onDefaultTypingDelayChange}
            labelPrefix="Digitação"
            size="sm"
          />

          <button
            onClick={onOpenExtensionModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
              bridgeStatus.connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Status do WhatsApp Web"
          >
            <Zap className={`w-3.5 h-3.5 ${bridgeStatus.connected ? 'fill-current' : ''}`} />
            <span className="whitespace-nowrap">
              {bridgeStatus.connected ? 'WhatsApp Conectado' : 'Conectar WhatsApp Web'}
            </span>
          </button>
        </div>
      </div>

      {/* Containers Quadrados com as Funcionalidades */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className={`group aspect-square rounded-3xl bg-slate-900 border border-slate-800/90 ${card.activeBorder} p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden active:scale-95`}
            >
              {/* Badge no canto superior */}
              <div className="absolute top-4 right-4">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
                  card.badgeHighlight 
                    ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                    : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}>
                  {card.badge}
                </span>
              </div>

              {/* Ícone Centralizado no quadrado */}
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${card.colorClass} border flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 mb-4`}>
                <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              {/* Palavra simples abaixo */}
              <span className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                {card.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
