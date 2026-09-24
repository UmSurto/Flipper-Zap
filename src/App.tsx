/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header, AppView } from './components/Header';
import { HomeHub } from './components/HomeHub';
import { FollowUpTab } from './components/FollowUpTab';
import { ChatbotTab } from './components/ChatbotTab';
import { QuickRepliesTab } from './components/QuickRepliesTab';
import { VoiceNotesTab } from './components/VoiceNotesTab';
import { MediaVaultTab } from './components/MediaVaultTab';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { QuickSendModal } from './components/QuickSendModal';
import { WebExtensionModal } from './components/WebExtensionModal';
import { 
  QuickReply, 
  VoiceNote, 
  VaultImage,
  FollowUpRule,
  FollowUpQueueItem,
  ChatbotTrigger,
  ChatbotSettings
} from './types';
import {
  getAllQuickReplies,
  getAllVoiceNotes,
  getAllVaultImages,
  saveQuickReply,
  deleteQuickReply,
  saveVoiceNote,
  deleteVoiceNote,
  saveVaultImage,
  deleteVaultImage,
  getAllFollowUpRules,
  saveFollowUpRule,
  deleteFollowUpRule,
  getAllFollowUpQueue,
  saveFollowUpQueueItem,
  deleteFollowUpQueueItem,
  updateFollowUpQueueStatus,
  getAllChatbotTriggers,
  saveChatbotTrigger,
  deleteChatbotTrigger,
  getChatbotSettings,
  saveChatbotSettings,
  seedInitialDataIfEmpty
} from './lib/db';
import { 
  fetchBridgeStatus, 
  sendCommandToActiveChat, 
  syncDataToBridge,
  toggleChatbotServer,
  syncChatbotToServer,
  BridgeStatus 
} from './lib/bridgeClient';
import { AppTheme, sendQueue } from './lib/sendQueue';
import { SendQueueFloatingBar } from './components/SendQueueFloatingBar';
import { Zap, Check, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('flipper_zap_theme') as AppTheme) || 'black';
  });
  const [defaultTypingDelay, setDefaultTypingDelay] = useState<number>(2);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [vaultImages, setVaultImages] = useState<VaultImage[]>([]);
  
  // Follow-up e Chatbot State
  const [followUpRules, setFollowUpRules] = useState<FollowUpRule[]>([]);
  const [followUpQueue, setFollowUpQueue] = useState<FollowUpQueueItem[]>([]);
  const [chatbotTriggers, setChatbotTriggers] = useState<ChatbotTrigger[]>([]);
  const [chatbotSettings, setChatbotSettings] = useState<ChatbotSettings>({
    isMasterEnabled: true,
    defaultFallbackMessage: 'Recebi sua mensagem! Já estou consultando as informações do seu pedido e te respondo em um instante.',
    fallbackEnabled: true,
    delaySeconds: 2,
    autoFollowUpOnNoReply: true,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Status da Ponte Paralela com WhatsApp Web
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>({
    connected: false,
    lastPing: 0,
    activeChat: '',
    activePhone: '',
    pendingCommands: 0,
    chatbotMasterEnabled: true,
  });

  // Notificação global de disparo
  const [globalToast, setGlobalToast] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Modals
  const [isQuickSendOpen, setIsQuickSendOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [quickSendInitialText, setQuickSendInitialText] = useState('');

  // Simulator test payload
  const [simulatorPayload, setSimulatorPayload] = useState<{
    type: 'text' | 'audio' | 'image';
    payload: any;
  } | null>(null);

  // Aplica classe de tema no documento HTML
  useEffect(() => {
    localStorage.setItem('flipper_zap_theme', currentTheme);
    document.documentElement.classList.remove('theme-white', 'theme-black', 'theme-vorcarus');
    document.documentElement.classList.add(`theme-${currentTheme}`);
  }, [currentTheme]);

  // Polling de status da conexão paralela com WhatsApp Web
  useEffect(() => {
    let isMounted = true;
    const checkBridge = async () => {
      try {
        const status = await fetchBridgeStatus();
        if (isMounted) {
          setBridgeStatus(status);
        }
      } catch (err) {
        // Status local offline
      }
    };

    checkBridge();
    const interval = setInterval(checkBridge, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sincroniza dados com o bridge quando o acervo for alterado
  useEffect(() => {
    if (quickReplies.length > 0 || voiceNotes.length > 0 || vaultImages.length > 0) {
      syncDataToBridge(quickReplies, voiceNotes, vaultImages).catch(() => {});
    }
  }, [quickReplies, voiceNotes, vaultImages]);

  // Sincroniza chatbot com o servidor
  useEffect(() => {
    if (chatbotTriggers.length > 0 || chatbotSettings) {
      syncChatbotToServer(chatbotTriggers, chatbotSettings).catch(() => {});
    }
  }, [chatbotTriggers, chatbotSettings]);

  // Carrega banco de dados inicial
  useEffect(() => {
    async function loadData() {
      try {
        await seedInitialDataIfEmpty();
        const [
          replies, 
          audios, 
          images, 
          rules, 
          queue, 
          triggers, 
          settings
        ] = await Promise.all([
          getAllQuickReplies(),
          getAllVoiceNotes(),
          getAllVaultImages(),
          getAllFollowUpRules(),
          getAllFollowUpQueue(),
          getAllChatbotTriggers(),
          getChatbotSettings(),
        ]);

        setQuickReplies(replies);
        setVoiceNotes(audios);
        setVaultImages(images);
        setFollowUpRules(rules);
        setFollowUpQueue(queue);
        setChatbotTriggers(triggers);
        setChatbotSettings(settings);
      } catch (err) {
        console.error('Erro ao inicializar banco de dados:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // ==========================================
  // MOTOR DE FOLLOW-UP AUTOMÁTICO EM SEGUNDO PLANO
  // ==========================================
  // Verifica a cada 8 segundos se há leads com cronômetro estourado (ex: 24h)
  useEffect(() => {
    const followUpInterval = setInterval(async () => {
      const now = Date.now();
      const currentQueue = await getAllFollowUpQueue();
      const pendingItems = currentQueue.filter(
        item => item.status === 'pending' && item.scheduledFor <= now
      );

      for (const item of pendingItems) {
        // Se a ponte estiver conectada ao WhatsApp Web, envia o follow-up
        if (bridgeStatus.connected) {
          const sent = await sendCommandToActiveChat(
            item.message, 
            `Follow-up Automático: ${item.leadName}`
          );
          if (sent.success) {
            await updateFollowUpQueueStatus(item.id, 'sent');
            setGlobalToast({
              type: 'success',
              text: `⏱️ Follow-up automático de 24h enviado para ${item.leadName}!`,
            });
            setTimeout(() => setGlobalToast(null), 4000);
          }
        }
      }

      // Atualiza a fila em memória
      const refreshed = await getAllFollowUpQueue();
      setFollowUpQueue(refreshed);
    }, 8000);

    return () => clearInterval(followUpInterval);
  }, [bridgeStatus.connected]);

  // DISPARO DIRETO NA CONVERSA ABERTA DO WHATSAPP WEB
  const handleSendToActiveChat = async (text: string, title?: string): Promise<boolean> => {
    try {
      const res = await sendCommandToActiveChat(text, title, 'send_text', true);
      if (res.success) {
        setGlobalToast({
          type: 'success',
          text: `⚡ Comando disparado! Enviando na conversa "${bridgeStatus.activeChat || 'Aberta no WhatsApp Web'}"...`
        });
        setTimeout(() => setGlobalToast(null), 3500);
        return true;
      } else {
        setIsExtensionModalOpen(true);
        return false;
      }
    } catch (err) {
      setIsExtensionModalOpen(true);
      return false;
    }
  };

  // CRUD HANDLERS: Quick Replies
  const handleSaveReply = async (reply: QuickReply) => {
    await saveQuickReply(reply);
    const updated = await getAllQuickReplies();
    setQuickReplies(updated);
  };

  const handleDeleteReply = async (id: string) => {
    if (confirm('Deseja realmente excluir esta resposta rápida?')) {
      await deleteQuickReply(id);
      setQuickReplies((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // CRUD HANDLERS: Voice Notes
  const handleSaveVoiceNote = async (voiceNote: VoiceNote) => {
    await saveVoiceNote(voiceNote);
    const updated = await getAllVoiceNotes();
    setVoiceNotes(updated);
  };

  const handleDeleteVoiceNote = async (id: string) => {
    if (confirm('Deseja realmente excluir este áudio gravado?')) {
      await deleteVoiceNote(id);
      setVoiceNotes((prev) => prev.filter((v) => v.id !== id));
    }
  };

  // CRUD HANDLERS: Vault Images
  const handleSaveVaultImage = async (image: VaultImage) => {
    await saveVaultImage(image);
    const updated = await getAllVaultImages();
    setVaultImages(updated);
  };

  const handleDeleteVaultImage = async (id: string) => {
    if (confirm('Deseja realmente remover esta imagem do banco de dados?')) {
      await deleteVaultImage(id);
      setVaultImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  // CRUD HANDLERS: Follow-Up
  const handleSaveFollowUpRule = async (rule: FollowUpRule) => {
    await saveFollowUpRule(rule);
    const updated = await getAllFollowUpRules();
    setFollowUpRules(updated);
  };

  const handleDeleteFollowUpRule = async (id: string) => {
    if (confirm('Deseja realmente excluir esta regra de follow-up?')) {
      await deleteFollowUpRule(id);
      setFollowUpRules(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleSaveFollowUpQueueItem = async (item: FollowUpQueueItem) => {
    await saveFollowUpQueueItem(item);
    const updated = await getAllFollowUpQueue();
    setFollowUpQueue(updated);
    setGlobalToast({
      type: 'success',
      text: `⏱️ Follow-up agendado com sucesso para ${item.leadName}!`,
    });
    setTimeout(() => setGlobalToast(null), 3500);
  };

  const handleDeleteFollowUpQueueItem = async (id: string) => {
    await deleteFollowUpQueueItem(id);
    setFollowUpQueue(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateFollowUpQueueStatus = async (
    id: string, 
    status: 'pending' | 'sent' | 'cancelled' | 'failed'
  ) => {
    await updateFollowUpQueueStatus(id, status);
    const updated = await getAllFollowUpQueue();
    setFollowUpQueue(updated);
  };

  // CRUD HANDLERS: Chatbot
  const handleSaveChatbotTrigger = async (trigger: ChatbotTrigger) => {
    await saveChatbotTrigger(trigger);
    const updated = await getAllChatbotTriggers();
    setChatbotTriggers(updated);
  };

  const handleDeleteChatbotTrigger = async (id: string) => {
    if (confirm('Deseja realmente excluir este gatilho?')) {
      await deleteChatbotTrigger(id);
      setChatbotTriggers(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSaveChatbotSettings = async (settings: ChatbotSettings) => {
    await saveChatbotSettings(settings);
    setChatbotSettings(settings);
    setGlobalToast({
      type: 'success',
      text: '⚙️ Configurações do Chatbot atualizadas!',
    });
    setTimeout(() => setGlobalToast(null), 3000);
  };

  const handleToggleChatbotMaster = async (enabled: boolean) => {
    const updated: ChatbotSettings = {
      ...chatbotSettings,
      isMasterEnabled: enabled,
    };
    await saveChatbotSettings(updated);
    setChatbotSettings(updated);
    await toggleChatbotServer(enabled);
    setGlobalToast({
      type: 'success',
      text: enabled 
        ? '🟢 Autoatendimento LIGADO! Mensagens recebidas serão respondidas.' 
        : '⚪ Autoatendimento PAUSADO.',
    });
    setTimeout(() => setGlobalToast(null), 3500);
  };

  // INTERACTIVE TEST ACTIONS
  const handleTestTextInSimulator = (text: string) => {
    setSimulatorPayload({ type: 'text', payload: text });
    setCurrentView('simulator');
  };

  const handleTestAudioInSimulator = (audio: VoiceNote) => {
    setSimulatorPayload({ type: 'audio', payload: audio });
    setCurrentView('simulator');
  };

  const handleTestImageInSimulator = (image: VaultImage) => {
    setSimulatorPayload({ type: 'image', payload: image });
    setCurrentView('simulator');
  };

  const handleSendViaWhatsApp = (text: string) => {
    setQuickSendInitialText(text);
    setIsQuickSendOpen(true);
  };

  // BACKUP & RESTORE
  const handleExportBackup = () => {
    const backupData = {
      version: '2.0',
      appName: 'Flipper Zap',
      exportDate: new Date().toISOString(),
      quickReplies,
      followUpRules,
      chatbotTriggers,
      chatbotSettings,
      vaultImages: vaultImages.map(img => ({
        id: img.id,
        title: img.title,
        shortcut: img.shortcut,
        category: img.category,
        caption: img.caption,
        tags: img.tags,
        dataUrl: img.dataUrl,
        mimeType: img.mimeType,
        fileSize: img.fileSize,
        createdAt: img.createdAt,
      })),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flipper_zap_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.quickReplies && Array.isArray(data.quickReplies)) {
        for (const rep of data.quickReplies) {
          await saveQuickReply(rep);
        }
      }
      if (data.followUpRules && Array.isArray(data.followUpRules)) {
        for (const rule of data.followUpRules) {
          await saveFollowUpRule(rule);
        }
      }
      if (data.chatbotTriggers && Array.isArray(data.chatbotTriggers)) {
        for (const trig of data.chatbotTriggers) {
          await saveChatbotTrigger(trig);
        }
      }
      if (data.chatbotSettings) {
        await saveChatbotSettings(data.chatbotSettings);
      }

      const [replies, audios, images, rules, queue, triggers, settings] = await Promise.all([
        getAllQuickReplies(),
        getAllVoiceNotes(),
        getAllVaultImages(),
        getAllFollowUpRules(),
        getAllFollowUpQueue(),
        getAllChatbotTriggers(),
        getChatbotSettings(),
      ]);

      setQuickReplies(replies);
      setVoiceNotes(audios);
      setVaultImages(images);
      setFollowUpRules(rules);
      setFollowUpQueue(queue);
      setChatbotTriggers(triggers);
      setChatbotSettings(settings);

      setGlobalToast({
        type: 'success',
        text: 'Backup restaurado com sucesso no Flipper Zap!',
      });
      setTimeout(() => setGlobalToast(null), 3500);
    } catch (err) {
      alert('Arquivo de backup inválido.');
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 animate-spin text-2xl font-bold">
          ⚡
        </div>
        <p className="text-base font-bold text-white tracking-wide">Iniciando Flipper Zap Business...</p>
        <p className="text-xs text-slate-400 mt-1">Carregando automações de vendas e conexão WhatsApp Web</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white relative font-sans">
      {/* Notificação Flutuante de Disparo */}
      {globalToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-500 text-slate-950 font-extrabold px-5 py-3 rounded-2xl shadow-2xl shadow-emerald-500/30 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-300">
          <Zap className="w-5 h-5 fill-slate-950 shrink-0" />
          <span className="text-xs sm:text-sm">{globalToast.text}</span>
        </div>
      )}

      {/* Top Navigation Bar com Logo Flipper Zap e Controles Limpos */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        bridgeStatus={bridgeStatus}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        onOpenQuickSend={() => {
          setQuickSendInitialText('');
          setIsQuickSendOpen(true);
        }}
        onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TELA PRINCIPAL (HOME HUB) */}
        {currentView === 'home' && (
          <HomeHub
            onNavigate={(view) => setCurrentView(view)}
            bridgeStatus={bridgeStatus}
            chatbotSettings={chatbotSettings}
            onToggleChatbotMaster={handleToggleChatbotMaster}
            repliesCount={quickReplies.length}
            audiosCount={voiceNotes.length}
            imagesCount={vaultImages.length}
            triggersCount={chatbotTriggers.length}
            pendingFollowUpsCount={followUpQueue.filter(q => q.status === 'pending').length}
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            defaultTypingDelay={defaultTypingDelay}
            onDefaultTypingDelayChange={setDefaultTypingDelay}
            onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
          />
        )}

        {/* MÓDULO 1: FOLLOW-UP AUTOMÁTICO & CALENDÁRIO */}
        {currentView === 'followup' && (
          <FollowUpTab
            rules={followUpRules}
            queue={followUpQueue}
            onSaveRule={handleSaveFollowUpRule}
            onDeleteRule={handleDeleteFollowUpRule}
            onSaveQueueItem={handleSaveFollowUpQueueItem}
            onDeleteQueueItem={handleDeleteFollowUpQueueItem}
            onUpdateQueueStatus={handleUpdateFollowUpQueueStatus}
            onSendToActiveChat={handleSendToActiveChat}
            bridgeStatus={bridgeStatus}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {/* MÓDULO 2: AUTOATENDIMENTO & CHATBOT */}
        {currentView === 'chatbot' && (
          <ChatbotTab
            triggers={chatbotTriggers}
            settings={chatbotSettings}
            onSaveTrigger={handleSaveChatbotTrigger}
            onDeleteTrigger={handleDeleteChatbotTrigger}
            onSaveSettings={handleSaveChatbotSettings}
            onToggleMaster={handleToggleChatbotMaster}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {/* MÓDULO 3: RESPOSTAS RÁPIDAS DE VENDAS */}
        {currentView === 'replies' && (
          <QuickRepliesTab
            replies={quickReplies}
            onSave={handleSaveReply}
            onDelete={handleDeleteReply}
            onTestInSimulator={handleTestTextInSimulator}
            onSendViaWhatsApp={handleSendViaWhatsApp}
            onSendToActiveChat={handleSendToActiveChat}
            isBridgeConnected={bridgeStatus.connected}
            activeChatName={bridgeStatus.activeChat}
            onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {/* MÓDULO 4: ÁUDIOS GRAVADOS NA HORA (PTT) */}
        {currentView === 'audios' && (
          <VoiceNotesTab
            voiceNotes={voiceNotes}
            onSave={handleSaveVoiceNote}
            onDelete={handleDeleteVoiceNote}
            onTestInSimulator={handleTestAudioInSimulator}
            onSendToActiveChat={handleSendToActiveChat}
            isBridgeConnected={bridgeStatus.connected}
            activeChatName={bridgeStatus.activeChat}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {/* MÓDULO 5: BANCO DE MÍDIAS DE PRODUTOS */}
        {currentView === 'images' && (
          <MediaVaultTab
            images={vaultImages}
            onSave={handleSaveVaultImage}
            onDelete={handleDeleteVaultImage}
            onTestInSimulator={handleTestImageInSimulator}
            onSendToActiveChat={handleSendToActiveChat}
            isBridgeConnected={bridgeStatus.connected}
            activeChatName={bridgeStatus.activeChat}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {/* MÓDULO 6: SIMULADOR WHATSAPP & TESTES */}
        {currentView === 'simulator' && (
          <WhatsAppSimulator
            quickReplies={quickReplies}
            voiceNotes={voiceNotes}
            vaultImages={vaultImages}
            initialTestMessage={simulatorPayload}
            bridgeStatus={bridgeStatus}
            onSendToActiveChat={handleSendToActiveChat}
            onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
          />
        )}
      </main>

      {/* Modals Globais */}
      <QuickSendModal
        isOpen={isQuickSendOpen}
        onClose={() => setIsQuickSendOpen(false)}
        quickReplies={quickReplies}
        voiceNotes={voiceNotes}
        vaultImages={vaultImages}
        initialText={quickSendInitialText}
        isBridgeConnected={bridgeStatus.connected}
        activeChatName={bridgeStatus.activeChat}
        onSendToActiveChat={handleSendToActiveChat}
      />

      <WebExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
        quickReplies={quickReplies}
        voiceNotes={voiceNotes}
        vaultImages={vaultImages}
        bridgeStatus={bridgeStatus}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* Barra Flutuante da Fila de Envios & Simulação de Digitação */}
      <SendQueueFloatingBar />
    </div>
  );
}
