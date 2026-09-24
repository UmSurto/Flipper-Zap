import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Search, 
  CheckCheck, 
  Play, 
  Pause, 
  RotateCcw, 
  MessageSquare, 
  Zap, 
  Image as ImageIcon,
  Bot,
  Monitor,
  ExternalLink,
  Check
} from 'lucide-react';
import { QuickReply, VoiceNote, VaultImage, SimulatedMessage } from '../types';
import { formatAudioDuration } from '../lib/audioRecorder';
import { BridgeStatus } from '../lib/bridgeClient';

interface WhatsAppSimulatorProps {
  quickReplies: QuickReply[];
  voiceNotes: VoiceNote[];
  vaultImages: VaultImage[];
  initialTestMessage?: { type: 'text' | 'audio' | 'image'; payload: any } | null;
  bridgeStatus?: BridgeStatus;
  onSendToActiveChat?: (text: string, title?: string) => Promise<boolean>;
  onOpenExtensionModal?: () => void;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  quickReplies,
  voiceNotes,
  vaultImages,
  initialTestMessage,
  bridgeStatus = {
    connected: false,
    lastPing: 0,
    activeChat: '',
    activePhone: '',
    pendingCommands: 0,
  },
  onSendToActiveChat,
  onOpenExtensionModal,
}) => {
  const [messages, setMessages] = useState<SimulatedMessage[]>([
    {
      id: 'msg-seed-1',
      sender: 'customer',
      type: 'text',
      text: 'Olá! Vi o anúncio de vocês no Instagram. Ainda tem disponibilidade para hoje?',
      timestamp: '10:24',
      status: 'read',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [showShortcutMenu, setShowShortcutMenu] = useState(false);
  const [activeAudioPlayingId, setActiveAudioPlayingId] = useState<string | null>(null);
  const [audioProgressMap, setAudioProgressMap] = useState<Record<string, number>>({});
  const [speedMap, setSpeedMap] = useState<Record<string, number>>({});
  const [testSentToast, setTestSentToast] = useState<string | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle external trigger from other tabs ("Testar no Simulador")
  useEffect(() => {
    if (!initialTestMessage) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (initialTestMessage.type === 'text') {
      const newMsg: SimulatedMessage = {
        id: 'msg-' + Date.now(),
        sender: 'bot',
        type: 'text',
        text: initialTestMessage.payload,
        timestamp: time,
        status: 'read',
      };
      setMessages((prev) => [...prev, newMsg]);
    } else if (initialTestMessage.type === 'audio') {
      const note = initialTestMessage.payload as VoiceNote;
      const audioUrl = URL.createObjectURL(note.audioBlob);
      const newMsg: SimulatedMessage = {
        id: 'msg-' + Date.now(),
        sender: 'bot',
        type: 'audio',
        audioUrl,
        audioDuration: note.duration,
        isPttVoiceNote: true,
        timestamp: time,
        status: 'read',
      };
      setMessages((prev) => [...prev, newMsg]);
    } else if (initialTestMessage.type === 'image') {
      const img = initialTestMessage.payload as VaultImage;
      const newMsg: SimulatedMessage = {
        id: 'msg-' + Date.now(),
        sender: 'bot',
        type: 'image',
        imageUrl: img.dataUrl,
        caption: img.caption,
        timestamp: time,
        status: 'read',
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  }, [initialTestMessage]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // Verifica se é atalho digitado (ex: /pix, /ola)
    const matchedReply = quickReplies.find(
      (r) => r.shortcut.toLowerCase() === inputText.trim().toLowerCase()
    );

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (matchedReply) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-' + Date.now(),
          sender: 'bot',
          type: 'text',
          text: matchedReply.content.replace('{nome}', 'Lucas'),
          timestamp: time,
          status: 'read',
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-' + Date.now(),
          sender: 'bot',
          type: 'text',
          text: inputText.trim(),
          timestamp: time,
          status: 'read',
        },
      ]);
    }

    setInputText('');
    setShowShortcutMenu(false);
  };

  const handleSimulateCustomerMessage = (text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + Date.now(),
        sender: 'customer',
        type: 'text',
        text,
        timestamp: time,
        status: 'read',
      },
    ]);
  };

  const handleSendQuickReply = (reply: QuickReply) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + Date.now(),
        sender: 'bot',
        type: 'text',
        text: reply.content.replace('{nome}', 'Lucas').replace('{produto}', 'nosso produto').replace('{valor}', 'R$ 97,00'),
        timestamp: time,
        status: 'read',
      },
    ]);
    setShowShortcutMenu(false);
  };

  const handleSendAudioNote = (note: VoiceNote) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const audioUrl = URL.createObjectURL(note.audioBlob);
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + Date.now(),
        sender: 'bot',
        type: 'audio',
        audioUrl,
        audioDuration: note.duration,
        isPttVoiceNote: true,
        timestamp: time,
        status: 'read',
      },
    ]);
    setShowShortcutMenu(false);
  };

  const handleSendImage = (img: VaultImage) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + Date.now(),
        sender: 'bot',
        type: 'image',
        imageUrl: img.dataUrl,
        caption: img.caption,
        timestamp: time,
        status: 'read',
      },
    ]);
    setShowShortcutMenu(false);
  };

  const toggleAudioPlay = (msgId: string, url: string, duration: number) => {
    if (activeAudioPlayingId === msgId) {
      audioElementsRef.current[msgId]?.pause();
      setActiveAudioPlayingId(null);
      return;
    }

    if (activeAudioPlayingId && audioElementsRef.current[activeAudioPlayingId]) {
      audioElementsRef.current[activeAudioPlayingId].pause();
    }

    let audio = audioElementsRef.current[msgId];
    if (!audio) {
      audio = new Audio(url);
      audioElementsRef.current[msgId] = audio;
    }

    const speed = speedMap[msgId] || 1;
    audio.playbackRate = speed;

    audio.ontimeupdate = () => {
      const prog = (audio.currentTime / (audio.duration || duration)) * 100;
      setAudioProgressMap((prev) => ({ ...prev, [msgId]: prog }));
    };

    audio.onended = () => {
      setActiveAudioPlayingId(null);
      setAudioProgressMap((prev) => ({ ...prev, [msgId]: 0 }));
    };

    setActiveAudioPlayingId(msgId);
    audio.play().catch(console.error);
  };

  const cycleSpeed = (msgId: string) => {
    const curr = speedMap[msgId] || 1;
    const next = curr === 1 ? 1.5 : curr === 1.5 ? 2 : 1;
    setSpeedMap((prev) => ({ ...prev, [msgId]: next }));
    if (audioElementsRef.current[msgId]) {
      audioElementsRef.current[msgId].playbackRate = next;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Column: Quick Palette & Controls */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            Paleta de Atalhos Rápidos
          </h3>
          <p className="text-xs text-slate-300 mb-3">
            Clique para disparar instantaneamente no chat simulado:
          </p>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {quickReplies.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSendQuickReply(r)}
                className="w-full text-left p-2 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700/50 text-xs transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="truncate mr-2">
                  <span className="font-mono text-emerald-400 font-bold mr-1.5">{r.shortcut}</span>
                  <span className="text-slate-300 group-hover:text-white">{r.title}</span>
                </div>
                <Send className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 shrink-0" />
              </button>
            ))}
          </div>

          {/* Quick Voice Notes */}
          <div className="mt-4 pt-3 border-t border-slate-700">
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              Áudios Gravados na Hora
            </h4>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {voiceNotes.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleSendAudioNote(v)}
                  className="w-full text-left p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-700/60 text-xs flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate text-slate-300 group-hover:text-white font-medium">
                    🎙️ {v.title}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {formatAudioDuration(v.duration)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Images */}
          <div className="mt-4 pt-3 border-t border-slate-700">
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              Imagens do Banco
            </h4>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {vaultImages.map((img) => (
                <button
                  key={img.id}
                  onClick={() => handleSendImage(img)}
                  className="w-full text-left p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-700/60 text-xs flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate text-slate-300 group-hover:text-white font-medium">
                    🖼️ {img.title}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {img.shortcut || 'foto'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customer simulation triggers */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-blue-400" />
            Simular Pergunta do Cliente:
          </h3>
          <div className="space-y-1.5">
            {[
              'Qual o valor do produto?',
              'Aceita PIX? Me manda os dados!',
              'Tem garantia se eu não gostar?',
              'Como funciona a entrega?'
            ].map((question, i) => (
              <button
                key={i}
                onClick={() => handleSimulateCustomerMessage(question)}
                className="w-full text-left text-xs p-2 rounded-xl bg-slate-900/50 hover:bg-slate-700/50 text-slate-300 border border-slate-800 cursor-pointer transition-colors"
              >
                💬 "{question}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: WhatsApp Web Authentic Interface */}
      <div className="lg:col-span-3">
        <div className="bg-[#111b21] border border-[#222e35] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[700px]">
          {/* Desktop Chrome Browser Bar */}
          <div className="bg-[#182229] px-4 py-2 border-b border-[#222e35] flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <div className="ml-2 px-3 py-0.5 bg-[#111b21] border border-[#2a3942] rounded-lg text-slate-300 text-[11px] font-mono flex items-center gap-1.5">
                <span className="text-emerald-400">🔒</span>
                <span>https://web.whatsapp.com</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px]">
                <div className={`w-2 h-2 rounded-full ${bridgeStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-semibold text-slate-200">
                  {bridgeStatus.connected
                    ? `Ponte PC Ativa • "${bridgeStatus.activeChat || 'Chat Pronto'}"`
                    : 'Ponte PC Desconectada'}
                </span>
              </div>

              {onOpenExtensionModal && (
                <button
                  onClick={onOpenExtensionModal}
                  className="px-2.5 py-0.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-md text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-colors"
                >
                  Conectar WhatsApp Web Real
                </button>
              )}
            </div>
          </div>

          {/* WhatsApp Web Header */}
          <div className="bg-[#202c33] px-4 py-3 border-b border-[#2a3942] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                  LM
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#202c33]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#e9edef] leading-tight">
                  Lucas Mendes • Lead Quente (Instagram)
                </h4>
                <p className="text-xs text-[#00a884] font-medium">online</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[#aebac1]">
              <button
                onClick={() => setMessages([
                  {
                    id: 'msg-seed-1',
                    sender: 'customer',
                    type: 'text',
                    text: 'Olá! Vi o anúncio de vocês no Instagram. Ainda tem disponibilidade para hoje?',
                    timestamp: '10:24',
                    status: 'read',
                  }
                ])}
                className="p-1.5 hover:text-white rounded-lg hover:bg-[#2a3942] cursor-pointer"
                title="Limpar histórico do teste"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <Search className="w-4 h-4 cursor-pointer hover:text-white" />
              <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
            </div>
          </div>

          {/* Chat Messages Stream (Wallpaper background style) */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{
              backgroundColor: '#0b141a',
              backgroundImage: 'radial-gradient(#182229 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* Encryption notice pill */}
            <div className="flex justify-center my-2">
              <span className="bg-[#182229] text-[#ffd279] text-[10px] px-3 py-1 rounded-md border border-[#2a3942] text-center max-w-sm">
                🔒 As mensagens são protegidas com a criptografia de ponta a ponta.
              </span>
            </div>

            {messages.map((msg) => {
              const isOutgoing = msg.sender === 'bot';

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-3 py-2 text-sm shadow-sm relative ${
                      isOutgoing
                        ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                        : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                    }`}
                  >
                    {/* TEXT MESSAGE */}
                    {msg.type === 'text' && (
                      <p className="whitespace-pre-wrap leading-relaxed text-[13px] break-words">
                        {msg.text}
                      </p>
                    )}

                    {/* IMAGE MESSAGE */}
                    {msg.type === 'image' && msg.imageUrl && (
                      <div className="space-y-1.5">
                        <img
                          src={msg.imageUrl}
                          alt="Enviada via WhatsApp"
                          className="rounded-lg max-h-64 w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {msg.caption && (
                          <p className="text-xs text-[#d1d7db] pt-1 whitespace-pre-wrap">
                            {msg.caption}
                          </p>
                        )}
                      </div>
                    )}

                    {/* AUDIO MESSAGE (PTT Authentic WhatsApp Web) */}
                    {msg.type === 'audio' && msg.audioUrl && (
                      <div className="flex items-center gap-3 py-1 min-w-[240px]">
                        <button
                          onClick={() => toggleAudioPlay(msg.id, msg.audioUrl!, msg.audioDuration || 10)}
                          className="w-10 h-10 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shrink-0 cursor-pointer shadow hover:brightness-110"
                        >
                          {activeAudioPlayingId === msg.id ? (
                            <Pause className="w-5 h-5 fill-[#111b21]" />
                          ) : (
                            <Play className="w-5 h-5 fill-[#111b21] ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1">
                          {/* Authentic Waveform Display */}
                          <div className="flex items-center gap-[2px] h-6 w-full">
                            {Array.from({ length: 26 }).map((_, barIdx) => {
                              const prog = audioProgressMap[msg.id] || 0;
                              const barThreshold = (barIdx / 26) * 100;
                              const isPlayed = barThreshold <= prog;

                              // Simulated authentic voice variation
                              const heightPercent = 25 + Math.sin(barIdx * 0.7) * 40 + (barIdx % 4) * 12;

                              return (
                                <div
                                  key={barIdx}
                                  className="flex-1 rounded-full transition-colors"
                                  style={{
                                    height: `${Math.max(20, Math.min(100, heightPercent))}%`,
                                    backgroundColor: isPlayed ? '#00a884' : '#8696a0',
                                  }}
                                />
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#8696a0] mt-1">
                            <span className="font-mono">
                              {formatAudioDuration(msg.audioDuration || 0)}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => cycleSpeed(msg.id)}
                                className="px-1.5 py-0.2 bg-[#182229] text-white font-mono text-[10px] rounded font-bold"
                              >
                                {speedMap[msg.id] || 1}x
                              </button>
                              <Mic className="w-3.5 h-3.5 text-[#00a884]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timestamp & Read Receipt */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696a0]">
                      <span>{msg.timestamp}</span>
                      {isOutgoing && (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Autocomplete Popup when typing / */}
          {showShortcutMenu && (
            <div className="bg-[#202c33] border-t border-[#2a3942] p-2 max-h-48 overflow-y-auto space-y-1">
              <span className="text-[11px] font-semibold text-[#00a884] px-2 block mb-1">
                Atalhos Disponíveis (Clique para Inserir):
              </span>
              {quickReplies.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSendQuickReply(r)}
                  className="px-3 py-1.5 rounded-lg hover:bg-[#111b21] cursor-pointer flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-[#00a884] font-bold">{r.shortcut}</span>
                  <span className="text-[#d1d7db]">{r.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chat Input Bar */}
          <div className="bg-[#202c33] px-3 py-2 border-t border-[#2a3942] flex items-center gap-2">
            <Smile className="w-5 h-5 text-[#8696a0] hover:text-[#d1d7db] cursor-pointer" />
            
            <button
              onClick={() => setShowShortcutMenu(!showShortcutMenu)}
              className="p-1.5 rounded-lg text-[#00a884] hover:bg-[#111b21] font-mono text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Abrir atalhos com /"
            >
              <Zap className="w-4 h-4" />
              <span>/atalhos</span>
            </button>

            <input
              type="text"
              placeholder="Digite uma mensagem ou /atalho (ex: /pix, /ola)..."
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (e.target.value.startsWith('/')) {
                  setShowShortcutMenu(true);
                } else if (showShortcutMenu && !e.target.value) {
                  setShowShortcutMenu(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 bg-[#2a3942] text-[#e9edef] text-sm px-4 py-2.5 rounded-lg focus:outline-none placeholder:text-[#8696a0]"
            />

            {inputText.trim() ? (
              <div className="flex items-center gap-1.5">
                {onSendToActiveChat && (
                  <button
                    onClick={async () => {
                      const ok = await onSendToActiveChat(inputText, 'Disparo do Simulador');
                      if (ok) {
                        setTestSentToast('Mensagem enviada para o WhatsApp Web!');
                        setTimeout(() => setTestSentToast(null), 2500);
                        handleSendMessage();
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shadow transition-transform active:scale-95"
                    title={bridgeStatus.connected ? `Disparar para ${bridgeStatus.activeChat || 'WhatsApp Web'}` : 'Disparar para o WhatsApp Web'}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Enviar no Web</span>
                  </button>
                )}
                <button
                  onClick={handleSendMessage}
                  className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] text-[#111b21] flex items-center justify-center cursor-pointer transition-colors shadow"
                  title="Enviar no simulador"
                >
                  <Send className="w-4 h-4 fill-[#111b21]" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (voiceNotes.length > 0) {
                    handleSendAudioNote(voiceNotes[0]);
                  } else {
                    alert('Grave um áudio primeiro na aba "Áudios Na Hora"!');
                  }
                }}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] text-[#111b21] flex items-center justify-center cursor-pointer transition-colors shadow"
                title="Enviar primeiro áudio PTT da lista"
              >
                <Mic className="w-4 h-4 fill-[#111b21]" />
              </button>
            )}
          </div>
          {testSentToast && (
            <div className="bg-emerald-500 text-slate-950 font-bold text-xs py-1 px-3 text-center">
              ✓ {testSentToast}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
