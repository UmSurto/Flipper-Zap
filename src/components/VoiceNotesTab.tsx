import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  Upload, 
  Download, 
  Radio, 
  Check, 
  X, 
  Zap,
  ArrowLeft,
  Timer
} from 'lucide-react';
import { VoiceNote } from '../types';
import { 
  AudioService, 
  formatAudioDuration, 
  processUploadedAudioFile 
} from '../lib/audioRecorder';
import { sendQueue } from '../lib/sendQueue';

interface VoiceNotesTabProps {
  voiceNotes: VoiceNote[];
  onSave: (voiceNote: VoiceNote) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTestInSimulator: (audioNote: VoiceNote) => void;
  onSendToActiveChat?: (text: string, title?: string) => Promise<boolean>;
  isBridgeConnected?: boolean;
  activeChatName?: string;
  onBackToHome?: () => void;
}

export const VoiceNotesTab: React.FC<VoiceNotesTabProps> = ({
  voiceNotes,
  onSave,
  onDelete,
  onTestInSimulator,
  onSendToActiveChat,
  isBridgeConnected = false,
  activeChatName = '',
  onBackToHome,
}) => {
  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micVolume, setMicVolume] = useState(0);
  const [audioDelays, setAudioDelays] = useState<Record<string, number>>({});
  const [sentToast, setSentToast] = useState<{ id: string; name: string } | null>(null);
  const audioServiceRef = useRef<AudioService | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Modal para salvar áudio recém gravado (renomear na hora)
  const [pendingAudio, setPendingAudio] = useState<{
    blob: Blob;
    mimeType: string;
    waveform: number[];
    duration: number;
    title: string;
    shortcut: string;
    notes: string;
  } | null>(null);

  // Modal para editar/renomear áudio existente
  const [editingNote, setEditingNote] = useState<VoiceNote | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editShortcut, setEditShortcut] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Playback states
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, number>>({});
  const [playbackSpeed, setPlaybackSpeed] = useState<Record<string, number>>({});
  const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadShortcut, setUploadShortcut] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioServiceRef.current) audioServiceRef.current.cancelRecording();
      if (activeAudioElementRef.current) {
        activeAudioElementRef.current.pause();
        activeAudioElementRef.current = null;
      }
    };
  }, []);

  // START RECORDING
  const handleStartRecording = async () => {
    try {
      audioServiceRef.current = new AudioService();
      await audioServiceRef.current.startRecording((vol) => {
        setMicVolume(vol);
      });

      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Acesso ao microfone negado ou não suportado.');
      console.error(err);
    }
  };

  // STOP RECORDING -> Abre tela de confirmação e personalização de nome
  const handleStopRecording = async () => {
    if (!audioServiceRef.current) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    try {
      const { blob, mimeType, waveform } = await audioServiceRef.current.stopRecording();
      setIsRecording(false);
      setMicVolume(0);

      const nextNum = voiceNotes.length + 1;
      setPendingAudio({
        blob,
        mimeType,
        waveform,
        duration: recordingSeconds || 3,
        title: `Áudio #${nextNum}`,
        shortcut: `/audio${nextNum}`,
        notes: '',
      });
    } catch (err) {
      console.error('Erro ao finalizar gravação:', err);
      setIsRecording(false);
    }
  };

  const handleCancelRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioServiceRef.current) {
      audioServiceRef.current.cancelRecording();
    }
    setIsRecording(false);
    setMicVolume(0);
    setRecordingSeconds(0);
  };

  // CONFIRMAR SALVAMENTO DO ÁUDIO GRAVADO COM NOME PERSONALIZADO
  const handleSavePendingAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAudio || !pendingAudio.title.trim()) return;

    let cleanShortcut = pendingAudio.shortcut.trim();
    if (cleanShortcut && !cleanShortcut.startsWith('/')) {
      cleanShortcut = '/' + cleanShortcut;
    }

    const newVoiceNote: VoiceNote = {
      id: 'vn-' + Date.now(),
      title: pendingAudio.title.trim(),
      shortcut: cleanShortcut || `/audio${voiceNotes.length + 1}`,
      duration: pendingAudio.duration,
      audioBlob: pendingAudio.blob,
      mimeType: pendingAudio.mimeType,
      isSimulatedLive: true,
      waveformData: pendingAudio.waveform,
      fileSize: pendingAudio.blob.size,
      createdAt: Date.now(),
      notes: pendingAudio.notes.trim() || 'Nota de voz PTT gravada no ZapBot.',
    };

    await onSave(newVoiceNote);
    setPendingAudio(null);
  };

  // EDITAR / RENOMEAR ÁUDIO EXISTENTE
  const handleOpenEditModal = (note: VoiceNote) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditShortcut(note.shortcut);
    setEditNotes(note.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editTitle.trim()) return;

    let cleanShortcut = editShortcut.trim();
    if (cleanShortcut && !cleanShortcut.startsWith('/')) {
      cleanShortcut = '/' + cleanShortcut;
    }

    const updated: VoiceNote = {
      ...editingNote,
      title: editTitle.trim(),
      shortcut: cleanShortcut || editingNote.shortcut,
      notes: editNotes.trim(),
    };

    await onSave(updated);
    setEditingNote(null);
  };

  // PLAY AUDIO
  const handleTogglePlay = (note: VoiceNote) => {
    if (playingId === note.id) {
      if (activeAudioElementRef.current) {
        activeAudioElementRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    if (activeAudioElementRef.current) {
      activeAudioElementRef.current.pause();
      activeAudioElementRef.current = null;
    }

    const audioUrl = URL.createObjectURL(note.audioBlob);
    const audio = new Audio(audioUrl);
    const speed = playbackSpeed[note.id] || 1;
    audio.playbackRate = speed;

    audio.ontimeupdate = () => {
      const progress = (audio.currentTime / (audio.duration || note.duration)) * 100;
      setPlaybackProgress((prev) => ({ ...prev, [note.id]: progress }));
    };

    audio.onended = () => {
      setPlayingId(null);
      setPlaybackProgress((prev) => ({ ...prev, [note.id]: 0 }));
      URL.revokeObjectURL(audioUrl);
    };

    activeAudioElementRef.current = audio;
    setPlayingId(note.id);
    audio.play().catch(console.error);
  };

  // CICLAR VELOCIDADE (1x -> 1.5x -> 2x)
  const handleCycleSpeed = (noteId: string) => {
    const currentSpeed = playbackSpeed[noteId] || 1;
    const nextSpeed = currentSpeed === 1 ? 1.5 : currentSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed((prev) => ({ ...prev, [noteId]: nextSpeed }));

    if (playingId === noteId && activeAudioElementRef.current) {
      activeAudioElementRef.current.playbackRate = nextSpeed;
    }
  };

  // DOWNLOAD AUDIO
  const handleDownloadAudio = (note: VoiceNote) => {
    const url = URL.createObjectURL(note.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = note.mimeType.includes('wav') ? 'wav' : note.mimeType.includes('ogg') ? 'ogg' : 'webm';
    a.download = `${note.title.toLowerCase().replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // IMPORTAR ARQUIVO EXTERNO
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsProcessingUpload(true);
    try {
      const processed = await processUploadedAudioFile(selectedFile);
      const nextNum = voiceNotes.length + 1;
      let cleanShortcut = uploadShortcut.trim();
      if (cleanShortcut && !cleanShortcut.startsWith('/')) {
        cleanShortcut = '/' + cleanShortcut;
      }

      const newVoiceNote: VoiceNote = {
        id: 'vn-' + Date.now(),
        title: uploadTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, ''),
        shortcut: cleanShortcut || `/audio${nextNum}`,
        duration: processed.duration,
        audioBlob: processed.blob,
        mimeType: processed.mimeType,
        isSimulatedLive: true,
        waveformData: processed.waveform,
        fileSize: selectedFile.size,
        createdAt: Date.now(),
        notes: uploadNotes.trim() || 'Importado e convertido para PTT.',
      };

      await onSave(newVoiceNote);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setUploadTitle('');
      setUploadShortcut('');
      setUploadNotes('');
    } catch (err) {
      console.error(err);
      alert('Erro ao converter arquivo de áudio.');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0"
                title="Voltar para a tela principal"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Início</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-400" />
                  <span>Áudios PTT (Gravados na Hora)</span>
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full whitespace-nowrap">
                  Push-to-Talk
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Grave mensagens de voz que são enviadas com simulação de "Gravando áudio...".
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium text-xs sm:text-sm cursor-pointer transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Áudio</span>
          </button>
        </div>

        {/* Live Recording Area */}
        <div className="mt-4 pt-4 border-t border-slate-700/60">
          {!isRecording ? (
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-xs sm:text-sm">Gravar Mensagem de Voz</h3>
                  <p className="text-[11px] text-slate-400">
                    O áudio será salvo com microfone verde e forma de onda.
                  </p>
                </div>
              </div>

              <button
                id="btn-start-record-audio"
                onClick={handleStartRecording}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer whitespace-nowrap"
              >
                <Mic className="w-4 h-4" />
                <span>Gravar Áudio</span>
              </button>
            </div>
          ) : (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-600/50">
                  <Mic className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-300 text-xs sm:text-sm tracking-wide whitespace-nowrap">
                      Gravando Áudio...
                    </span>
                    <span className="font-mono font-bold text-white text-sm bg-rose-900/60 px-2 py-0.5 rounded">
                      {formatAudioDuration(recordingSeconds)}
                    </span>
                  </div>

                  {/* Volume indicator */}
                  <div className="flex items-center gap-1 mt-1.5 h-3">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full transition-all duration-75"
                        style={{
                          height: `${Math.max(3, Math.min(14, (micVolume * (i % 2 === 0 ? 1 : 0.7)) / 5))}px`,
                          backgroundColor: i < (micVolume / 100) * 14 ? '#f43f5e' : '#475569',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelRecording}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                >
                  Cancelar
                </button>

                <button
                  id="btn-stop-record-audio"
                  onClick={handleStopRecording}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-md shadow-rose-600/30 whitespace-nowrap"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Concluir</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Notes Grid */}
      {voiceNotes.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-10 text-center">
          <Mic className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-200">Nenhum áudio salvo</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Grave suas mensagens de vendas para enviar aos clientes com um clique.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {voiceNotes.map((note) => {
            const isThisPlaying = playingId === note.id;
            const progress = playbackProgress[note.id] || 0;
            const speed = playbackSpeed[note.id] || 1;

            return (
              <div
                key={note.id}
                className="bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Header info */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                        {note.shortcut}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        PTT
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(note)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                        title="Renomear / Editar áudio"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(note.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                        title="Excluir áudio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-100 text-sm mb-1 line-clamp-1">{note.title}</h3>
                  {note.notes && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-1">{note.notes}</p>
                  )}

                  {/* WhatsApp-Style Audio Player Box */}
                  <div className="bg-[#111b21] border border-[#222e35] rounded-xl p-3 flex items-center gap-3">
                    <button
                      onClick={() => handleTogglePlay(note)}
                      className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-transform active:scale-95"
                    >
                      {isThisPlaying ? (
                        <Pause className="w-4 h-4 fill-slate-900" />
                      ) : (
                        <Play className="w-4 h-4 fill-slate-900 ml-0.5" />
                      )}
                    </button>

                    {/* Waveform & Progress */}
                    <div className="flex-1">
                      <div className="flex items-center gap-[2.5px] h-6 w-full overflow-hidden">
                        {(note.waveformData || []).map((height, i) => {
                          const barProgress = (i / note.waveformData.length) * 100;
                          const hasPlayed = barProgress <= progress;

                          return (
                            <div
                              key={i}
                              className="flex-1 min-w-[2px] max-w-[5px] rounded-full transition-all"
                              style={{
                                height: `${Math.max(15, Math.min(100, height))}%`,
                                backgroundColor: hasPlayed ? '#00a884' : '#8696a0',
                              }}
                            />
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[11px] text-[#8696a0]">
                        <span className="font-mono">
                          {formatAudioDuration(
                            isThisPlaying
                              ? ((progress / 100) * note.duration)
                              : note.duration
                          )}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCycleSpeed(note.id)}
                            className="px-1.5 py-0.5 bg-[#202c33] hover:bg-[#2a3942] text-slate-300 font-mono text-[10px] rounded cursor-pointer font-bold whitespace-nowrap"
                          >
                            {speed}x
                          </button>
                          <Mic className="w-3.5 h-3.5 text-[#00a884]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Temporizador de Simulação "Gravando áudio..." */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-700/50">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Timer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Gravação:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 2, 4, 6].map((sec) => {
                      const cur = audioDelays[note.id] ?? 3;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setAudioDelays(prev => ({ ...prev, [note.id]: sec }))}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                            cur === sec
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                          title={`Simular "Gravando áudio..." por ${sec}s`}
                        >
                          {sec === 0 ? '⚡ 0s' : `${sec}s`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {(note.fileSize / 1024).toFixed(0)} KB
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownloadAudio(note)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap"
                      title="Baixar arquivo PTT para arrastar no WhatsApp"
                    >
                      <Download className="w-3 h-3" />
                      <span>Baixar PTT</span>
                    </button>

                    <button
                      onClick={() => {
                        const delay = audioDelays[note.id] ?? 3;
                        sendQueue.enqueue({
                          title: note.title,
                          content: `🎙️ [Áudio Gravado na Hora: ${note.title}]`,
                          type: 'audio',
                          isAudio: true,
                          typingDelay: delay,
                          chatTarget: activeChatName || 'WhatsApp Web',
                        });
                        setSentToast({ id: note.id, name: activeChatName || 'WhatsApp Web' });
                        setTimeout(() => setSentToast(null), 2500);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-sm whitespace-nowrap transition-transform active:scale-95 ${
                        sentToast?.id === note.id
                          ? 'bg-emerald-400 text-slate-950 font-extrabold'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                      title="Adicionar à fila com simulação de gravação de áudio"
                    >
                      {sentToast?.id === note.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Na Fila!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Enviar na Conversa</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Salvar Áudio Gravado (Personalizar Nome e Atalho) */}
      {pendingAudio && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm sm:text-base">Salvar Áudio Gravado</h3>
              <button
                onClick={() => setPendingAudio(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePendingAudio} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Personalizado do Áudio *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Apresentação do Produto, Chave PIX"
                  value={pendingAudio.title}
                  onChange={(e) => setPendingAudio({ ...pendingAudio, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Atalho de Teclado (com /)
                </label>
                <input
                  type="text"
                  placeholder="Ex: /audio_apresentacao"
                  value={pendingAudio.shortcut}
                  onChange={(e) => setPendingAudio({ ...pendingAudio, shortcut: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Usar quando o cliente perguntar o preço"
                  value={pendingAudio.notes}
                  onChange={(e) => setPendingAudio({ ...pendingAudio, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setPendingAudio(null)}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs sm:text-sm rounded-xl font-medium cursor-pointer"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Salvar Áudio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar / Renomear Áudio Existente */}
      {editingNote && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm sm:text-base">Renomear Áudio PTT</h3>
              <button
                onClick={() => setEditingNote(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Personalizado *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Atalho de Teclado (com /)
                </label>
                <input
                  type="text"
                  value={editShortcut}
                  onChange={(e) => setEditShortcut(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs sm:text-sm rounded-xl font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Áudio */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm sm:text-base">Importar Áudio Externo</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadFile} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Arquivo de Áudio (.mp3, .wav, .ogg, .m4a) *
                </label>
                <input
                  type="file"
                  required
                  accept="audio/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Áudio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Explicação Promoção"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Atalho de Teclado
                </label>
                <input
                  type="text"
                  placeholder="Ex: /promocao"
                  value={uploadShortcut}
                  onChange={(e) => setUploadShortcut(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs sm:text-sm rounded-xl font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingUpload}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingUpload ? 'Processando...' : 'Salvar no Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
