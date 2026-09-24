import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Upload, 
  Zap, 
  Monitor, 
  Terminal, 
  RefreshCw, 
  Sparkles,
  ShieldCheck,
  FolderArchive
} from 'lucide-react';
import { QuickReply, VoiceNote, VaultImage } from '../types';
import { 
  downloadChromeExtensionZip, 
  getFullF12Script, 
  getAppOrigin 
} from '../lib/whatsappWebScript';
import { BridgeStatus, fetchBridgeStatus } from '../lib/bridgeClient';

interface WebExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickReplies: QuickReply[];
  voiceNotes: VoiceNote[];
  vaultImages: VaultImage[];
  bridgeStatus?: BridgeStatus;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export const WebExtensionModal: React.FC<WebExtensionModalProps> = ({
  isOpen,
  onClose,
  quickReplies,
  voiceNotes,
  vaultImages,
  bridgeStatus = {
    connected: false,
    lastPing: 0,
    activeChat: '',
    activePhone: '',
    pendingCommands: 0,
  },
  onExportBackup,
  onImportBackup,
}) => {
  const [copiedF12, setCopiedF12] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [liveStatus, setLiveStatus] = useState<BridgeStatus>(bridgeStatus);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const appOrigin = getAppOrigin();

  const handleRefreshStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await fetchBridgeStatus();
      setLiveStatus(status);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsCheckingStatus(false), 500);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadChromeExtensionZip(appOrigin, quickReplies, voiceNotes, vaultImages);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Falha ao gerar ZIP:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleCopyF12 = async () => {
    const fullScript = getFullF12Script(appOrigin, quickReplies, voiceNotes, vaultImages);
    await navigator.clipboard.writeText(fullScript);
    setCopiedF12(true);
    setTimeout(() => setCopiedF12(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      setImportStatus('Backup importado com sucesso!');
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  const isConnected = liveStatus.connected || bridgeStatus.connected;
  const currentChat = liveStatus.activeChat || bridgeStatus.activeChat;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">Conexão Oficial com WhatsApp Web</h3>
              <p className="text-xs text-slate-400">Integração real para disparar mensagens e áudios com 1 clique</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white text-base px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status em Tempo Real */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isConnected 
              ? 'bg-emerald-950/60 border-emerald-500/60' 
              : 'bg-rose-950/40 border-rose-500/50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                isConnected 
                  ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' 
                  : 'bg-rose-400'
              }`} />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  {isConnected ? '🟢 WhatsApp Web Conectado em Tempo Real' : '🔴 WhatsApp Web Não Conectado'}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isConnected
                    ? `Conversa aberta na tela: "${currentChat || 'Nenhuma conversa selecionada'}". Os envios acontecem direto nela!`
                    : 'Conecte usando a Extensão Oficial ou o Código F12 abaixo:'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRefreshStatus}
                disabled={isCheckingStatus}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                title="Verificar se o WhatsApp Web já respondeu"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                <span>Testar Conexão</span>
              </button>

              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Abrir WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Opção 1: Baixar Extensão Chrome (Recomendado) */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <FolderArchive className="w-4 h-4 text-emerald-400" />
                  Extensão Oficial para Chrome / Edge / Brave (Recomendado)
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                Permanente
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Instale em 10 segundos no seu navegador. A extensão já baixa com todos os seus <strong>{quickReplies.length} modelos de mensagens e atalhos</strong> prontos para envio com 1 clique no WhatsApp Web!
            </p>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-800 text-emerald-400 font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{quickReplies.length} modelos sincronizados e inclusos no arquivo .ZIP</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-400">Passo 1:</span>
                <span>Clique no botão verde abaixo para baixar o arquivo <strong>.ZIP</strong> da extensão e descompacte a pasta no seu computador.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-400">Passo 2:</span>
                <span>Abra seu navegador e acesse <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded font-mono">chrome://extensions</code> (ou <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded font-mono">edge://extensions</code>).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-400">Passo 3:</span>
                <span>Ative a chave <strong>"Modo do desenvolvedor"</strong> no canto superior e clique em <strong>"Carregar sem compactação"</strong> selecionando a pasta descompactada!</span>
              </div>
            </div>

            <button
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.99]"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Arquivo ZIP Baixado com Sucesso!</span>
                </>
              ) : isDownloadingZip ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gerando Extensão...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>📥 Baixar Extensão Flipper Zap (.zip)</span>
                </>
              )}
            </button>
          </div>

          {/* Opção 2: Conexão Imediata via Console F12 */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  Conexão Instantânea pelo Console (F12) - Sem Instalar Nada
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 uppercase">
                Imediato
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Na aba do seu <strong>web.whatsapp.com</strong>, aperte <strong>F12</strong> (ou botão direito &gt; Inspecionar &gt; Console), cole o código com Ctrl+V e aperte <strong>Enter</strong>:
            </p>

            <button
              onClick={handleCopyF12}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.99]"
            >
              {copiedF12 ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Código Copiado! Cole no Console (F12) e aperte Enter</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>⚡ Copiar Código do Conector (F12)</span>
                </>
              )}
            </button>
          </div>

          {/* Backup e Exportação */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              {importStatus ? (
                <span className="text-emerald-400 font-semibold">{importStatus}</span>
              ) : (
                <span>Backup de respostas rápidas, áudios e imagens</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onExportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Dados</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Restaurar</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

