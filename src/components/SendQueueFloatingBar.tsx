import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Layers, 
  ChevronUp, 
  ChevronDown,
  Trash2,
  Mic,
  PenLine
} from 'lucide-react';
import { sendQueue, SendQueueItem, QueueNotification } from '../lib/sendQueue';

export const SendQueueFloatingBar: React.FC = () => {
  const [queue, setQueue] = useState<SendQueueItem[]>([]);
  const [activeItem, setActiveItem] = useState<SendQueueItem | null>(null);
  const [notification, setNotification] = useState<QueueNotification | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubQueue = sendQueue.subscribeQueue((items, active) => {
      setQueue(items);
      setActiveItem(active);
    });

    const unsubNotif = sendQueue.subscribeNotification((notif) => {
      setNotification(notif);
    });

    return () => {
      unsubQueue();
      unsubNotif();
    };
  }, []);

  const totalTasks = (activeItem ? 1 : 0) + queue.length;
  if (totalTasks === 0 && !notification) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 border border-slate-700/80 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
        {/* Banner de status ativo */}
        <div className="p-3.5 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            {activeItem?.status === 'simulating' ? (
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 animate-pulse">
                {activeItem.isAudio ? <Mic className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}
              </div>
            ) : notification?.type === 'success' ? (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
            )}

            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span className="truncate">
                  {notification?.title || (activeItem ? activeItem.title : 'Fila de Envios')}
                </span>
                {activeItem?.status === 'simulating' && (
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded-full font-mono font-bold whitespace-nowrap">
                    {activeItem.remainingSeconds}s
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {notification?.message || (activeItem ? `Enviando para ${activeItem.chatTarget || 'conversa ativa'}...` : `${queue.length} mensagens na fila`)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {queue.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                title={isExpanded ? 'Recolher detalhes' : 'Ver fila de mensagens'}
              >
                <span className="text-[10px] font-bold bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">
                  +{queue.length}
                </span>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            )}

            {activeItem && (
              <button
                onClick={() => sendQueue.cancelItem(activeItem.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                title="Cancelar este envio"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista expandida de itens aguardando na fila */}
        {isExpanded && queue.length > 0 && (
          <div className="max-h-56 overflow-y-auto p-2.5 bg-slate-950/60 divide-y divide-slate-800/60 text-xs">
            <div className="flex items-center justify-between pb-1.5 mb-1 px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Aguardando na Fila ({queue.length})
              </span>
              <button
                onClick={() => sendQueue.clearQueue()}
                className="text-[10px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpar fila</span>
              </button>
            </div>

            {queue.map((item, idx) => (
              <div key={item.id} className="py-2 px-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <strong className="text-white text-xs truncate block">{item.title}</strong>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      {item.isAudio ? '🎙️ Áudio' : '💬 Texto'} • {item.typingDelay}s de simulação
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => sendQueue.cancelItem(item.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                  title="Remover da fila"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
