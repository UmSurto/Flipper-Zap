import React, { useState } from 'react';
import { 
  Send, 
  ExternalLink, 
  Copy, 
  Check, 
  Monitor, 
  User, 
  FileText, 
  Image as ImageIcon,
  Zap,
  Phone,
  Timer
} from 'lucide-react';
import { QuickReply, VoiceNote, VaultImage } from '../types';
import { buildWhatsAppWebUrl } from '../lib/whatsappWebScript';
import { copyImageToClipboard } from '../lib/mediaVault';
import { sendQueue } from '../lib/sendQueue';
import { TypingTimerSelector } from './TypingTimerSelector';

interface QuickSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickReplies: QuickReply[];
  voiceNotes: VoiceNote[];
  vaultImages: VaultImage[];
  initialText?: string;
  isBridgeConnected?: boolean;
  activeChatName?: string;
  defaultTypingDelay?: number;
  onSendToActiveChat?: (text: string, title?: string) => Promise<boolean>;
}

export const QuickSendModal: React.FC<QuickSendModalProps> = ({
  isOpen,
  onClose,
  quickReplies,
  voiceNotes,
  vaultImages,
  initialText = '',
  isBridgeConnected = false,
  activeChatName = '',
  defaultTypingDelay = 2,
}) => {
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedReplyId, setSelectedReplyId] = useState<string>('');
  const [messageText, setMessageText] = useState(initialText || (quickReplies[0]?.content || ''));
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImageToast, setCopiedImageToast] = useState(false);
  const [typingDelay, setTypingDelay] = useState<number>(defaultTypingDelay);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    setPhone(raw);
  };

  const handleSelectReply = (id: string) => {
    setSelectedReplyId(id);
    const reply = quickReplies.find((r) => r.id === id);
    if (reply) {
      let populated = reply.content;
      if (customerName.trim()) {
        populated = populated.replace(/{nome}/g, customerName.trim());
      }
      setMessageText(populated);
    }
  };

  const formattedMessage = messageText
    .replace(/{nome}/g, customerName.trim() || 'Cliente')
    .replace(/{produto}/g, 'nosso produto')
    .replace(/{valor}/g, 'R$ 97,00');

  const cleanPhoneWithCountry = phone.startsWith('55') || phone.length > 11 ? phone : '55' + phone;
  const webUrl = buildWhatsAppWebUrl(cleanPhoneWithCountry, formattedMessage);
  const apiDesktopUrl = `https://api.whatsapp.com/send?phone=${cleanPhoneWithCountry}&text=${encodeURIComponent(formattedMessage)}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(webUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenWhatsAppWeb = () => {
    window.open(webUrl, '_blank');
  };

  const handleOpenDesktop = () => {
    window.open(apiDesktopUrl, '_blank');
  };

  const handleEnqueueSend = () => {
    const selected = quickReplies.find(r => r.id === selectedReplyId);
    const title = selected ? selected.title : 'Mensagem Rápida';

    // Adiciona à fila em segundo plano e fecha modal imediatamente!
    sendQueue.enqueue({
      title,
      content: formattedMessage,
      type: 'text',
      typingDelay,
      chatTarget: activeChatName || 'WhatsApp Web',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white whitespace-nowrap">Disparo Direto para WhatsApp</h3>
              <p className="text-xs text-slate-400 whitespace-nowrap">Envio instantâneo com temporizador de digitação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Dados do Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nome do Cliente:</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Mariana Silva"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp (com DDD):</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Ex: 11999998888"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Seleção Rápida de Script / Resposta */}
          {quickReplies.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Preencher com Script Pronto:</span>
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {quickReplies.slice(0, 8).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectReply(r.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap cursor-pointer transition-colors ${
                      selectedReplyId === r.id
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Texto da Mensagem */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mensagem que será enviada:
            </label>
            <textarea
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite sua mensagem de vendas..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* OPÇÃO DE TEMPORIZADOR DE DIGITAÇÃO HUMANIZADA */}
          <div className="bg-slate-900/80 border border-slate-700/80 p-3 rounded-xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
                Simular "Digitando..." antes de enviar:
              </span>
            </div>
            <TypingTimerSelector
              value={typingDelay}
              onChange={setTypingDelay}
              size="sm"
            />
          </div>

          {/* Banco de Fotos Rápido */}
          {vaultImages.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Anexar Imagem de Produto (Copia para Área de Transferência):</span>
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {vaultImages.slice(0, 6).map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={async () => {
                      const success = await copyImageToClipboard(img.dataUrl);
                      if (success) {
                        setCopiedImageToast(true);
                        setTimeout(() => setCopiedImageToast(false), 2000);
                      }
                    }}
                    className="flex items-center gap-2 p-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    <img src={img.dataUrl} alt={img.title} className="w-6 h-6 rounded object-cover" referrerPolicy="no-referrer" />
                    <span className="text-[11px] truncate max-w-[100px]">{img.title}</span>
                  </button>
                ))}
              </div>
              {copiedImageToast && (
                <span className="text-[11px] text-emerald-400 font-semibold block mt-1 whitespace-nowrap">
                  ✓ Imagem copiada! Cole com Ctrl+V na conversa.
                </span>
              )}
            </div>
          )}

          {/* DISPARO NA FILA (Sem travar a tela) */}
          <div className="bg-emerald-950/40 border border-emerald-500/40 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 whitespace-nowrap">
                <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                Disparo na Fila (Não trava sua tela):
              </span>
              <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                {isBridgeConnected ? `Destino: "${activeChatName || 'Conversa Ativa'}"` : 'WhatsApp Web'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              O sistema adiciona à fila e você pode trocar de conversa livremente. Uma notificação avisará quando estiver digitando e quando for enviada.
            </p>
            <button
              type="button"
              onClick={handleEnqueueSend}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-98"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Enviar com Fila & Digitação ({typingDelay}s)</span>
            </button>
          </div>

          {/* Ações Alternativas de Disparo */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleOpenWhatsAppWeb}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-700 text-slate-100 font-bold text-xs sm:text-sm rounded-xl transition-all border border-slate-700 cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir Novo Chat por Link</span>
            </button>

            <button
              onClick={handleOpenDesktop}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Monitor className="w-4 h-4" />
              <span>App Desktop</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center p-2.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl cursor-pointer"
              title="Copiar Link wa.me"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
