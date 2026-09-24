import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Send, 
  Trash2, 
  Edit3, 
  Zap,
  ArrowLeft,
  Timer,
  ExternalLink
} from 'lucide-react';
import { QuickReply, CategoryType } from '../types';
import { sendQueue } from '../lib/sendQueue';
import { TypingTimerSelector } from './TypingTimerSelector';

interface QuickRepliesTabProps {
  replies: QuickReply[];
  onSave: (reply: QuickReply) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTestInSimulator: (text: string) => void;
  onSendViaWhatsApp: (text: string) => void;
  onSendToActiveChat?: (text: string, title?: string) => Promise<boolean>;
  isBridgeConnected?: boolean;
  activeChatName?: string;
  onOpenExtensionModal?: () => void;
  onBackToHome?: () => void;
}

const CATEGORIES: { id: CategoryType | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'boas-vindas', label: 'Boas-Vindas' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'pagamento', label: 'Pagamentos & PIX' },
  { id: 'suporte', label: 'Suporte' },
  { id: 'pos-venda', label: 'Pós-Venda' },
  { id: 'catalogo', label: 'Catálogo' },
];

export const QuickRepliesTab: React.FC<QuickRepliesTabProps> = ({
  replies,
  onSave,
  onDelete,
  onTestInSimulator,
  onSendViaWhatsApp,
  onSendToActiveChat,
  isBridgeConnected = false,
  activeChatName = '',
  onOpenExtensionModal,
  onBackToHome,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'todas'>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentToast, setSentToast] = useState<{ id: string; name: string } | null>(null);
  const [itemTypingDelays, setItemTypingDelays] = useState<Record<string, number>>({});

  // Form states
  const [formData, setFormData] = useState<{
    title: string;
    shortcut: string;
    category: CategoryType;
    content: string;
  }>({
    title: '',
    shortcut: '',
    category: 'boas-vindas',
    content: '',
  });

  const filteredReplies = replies.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'todas' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenCreateModal = () => {
    setEditingReply(null);
    setFormData({
      title: '',
      shortcut: '/',
      category: 'boas-vindas',
      content: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: QuickReply) => {
    setEditingReply(item);
    setFormData({
      title: item.title,
      shortcut: item.shortcut,
      category: item.category,
      content: item.content,
    });
    setIsModalOpen(true);
  };

  const handleInsertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content + variable,
    }));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    let cleanShortcut = formData.shortcut.trim();
    if (!cleanShortcut.startsWith('/')) {
      cleanShortcut = '/' + cleanShortcut;
    }

    const payload: QuickReply = {
      id: editingReply ? editingReply.id : 'qr-' + Date.now(),
      title: formData.title.trim(),
      shortcut: cleanShortcut,
      category: formData.category,
      content: formData.content.trim(),
      usageCount: editingReply ? editingReply.usageCount : 0,
      createdAt: editingReply ? editingReply.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    await onSave(payload);
    setIsModalOpen(false);
  };

  const handleCopyText = async (item: QuickReply) => {
    const readyText = item.content
      .replace(/{nome}/g, 'Cliente')
      .replace(/{produto}/g, 'nosso produto')
      .replace(/{valor}/g, 'R$ 97,00')
      .replace(/{saudacao}/g, 'Olá');

    try {
      await navigator.clipboard.writeText(readyText);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
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
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <span>Respostas Rápidas & Atalhos</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Envio com fila sequencial e simulação de digitação no WhatsApp Web.
              </p>
            </div>
          </div>
          <button
            id="btn-create-quick-reply"
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Resposta</span>
          </button>
        </div>

        {/* Quick Filter & Search Bar */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-search-replies"
              type="text"
              placeholder="Buscar por atalho (/pix), título ou texto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Parallel Status Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${isBridgeConnected ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse' : 'bg-amber-400'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                {isBridgeConnected ? 'CONECTADO EM PARALELO AO WHATSAPP WEB' : 'CONEXÃO EM PARALELO (COMPUTADOR)'}
              </span>
              {isBridgeConnected ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ao Vivo
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Aguardando WhatsApp Web
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isBridgeConnected
                ? `Conversa ativa detectada na tela: ${activeChatName ? `"${activeChatName}"` : 'Nenhuma conversa aberta'}. Clique em "Enviar na Conversa" para disparar instantaneamente.`
                : 'Abra seu WhatsApp Web no computador e clique em "Ponte PC" no topo para ativar a integração paralela.'}
            </p>
          </div>
        </div>

        {!isBridgeConnected && onOpenExtensionModal && (
          <button
            onClick={onOpenExtensionModal}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap self-start sm:self-auto transition-colors"
          >
            Como Conectar
          </button>
        )}
      </div>

      {/* Grid of Quick Replies */}
      {filteredReplies.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-10 text-center">
          <Search className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-200">Nenhuma resposta encontrada</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Tente outro termo de busca ou cadastre uma nova resposta rápida.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-3 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            Cadastrar Resposta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredReplies.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 rounded-xl p-3.5 flex flex-col justify-between transition-all group shadow-sm"
            >
              <div>
                {/* Header Card: Shortcut, Categoria e Contador */}
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                      {item.shortcut}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-900 text-slate-400 uppercase tracking-wider truncate">
                      {item.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                    <strong className="text-slate-300">{item.usageCount || 0}x</strong>
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 text-sm mb-1.5 line-clamp-1" title={item.title}>
                  {item.title}
                </h3>

                {/* Content preview com altura balanceada */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto select-all">
                  {item.content}
                </div>
              </div>

              {/* Bottom Actions: Barra limpa e proporcional */}
              <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between gap-2">
                {/* Seletor Compacto de Temporizador */}
                <div className="flex items-center gap-1">
                  <span title="Simular 'Digitando...'">
                    <Timer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </span>
                  {[0, 2, 3, 5].map((sec) => {
                    const cur = itemTypingDelays[item.id] ?? 2;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setItemTypingDelays(prev => ({ ...prev, [item.id]: sec }))}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                          cur === sec
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                        title={`Simular digitação por ${sec}s`}
                      >
                        {sec === 0 ? '⚡0s' : `${sec}s`}
                      </button>
                    );
                  })}
                </div>

                {/* Apenas Ícones das Funções */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Copiar */}
                  <button
                    onClick={() => handleCopyText(item)}
                    className="p-1.5 rounded-lg bg-slate-700/90 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title={copiedId === item.id ? 'Texto copiado!' : 'Copiar texto'}
                    aria-label="Copiar texto"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Abrir Direto no WhatsApp Web Oficial */}
                  <button
                    onClick={() => {
                      const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(item.content)}`;
                      window.open(url, '_blank');
                    }}
                    className="p-1.5 rounded-lg bg-slate-700/90 hover:bg-slate-600 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Abrir diretamente no WhatsApp Web com esta mensagem pronta"
                    aria-label="Abrir no WhatsApp Web"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  {/* Editar */}
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-1.5 rounded-lg bg-slate-700/90 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Editar resposta rápida"
                    aria-label="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {/* Excluir */}
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 rounded-lg bg-slate-700/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Excluir resposta"
                    aria-label="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Disparar na Conversa Ativa / Fila */}
                  <button
                    onClick={() => {
                      const delay = itemTypingDelays[item.id] ?? 2;
                      sendQueue.enqueue({
                        title: item.title,
                        content: item.content,
                        type: 'text',
                        typingDelay: delay,
                        chatTarget: activeChatName || 'WhatsApp Web',
                      });
                      setSentToast({ id: item.id, name: activeChatName || 'WhatsApp Web' });
                      setTimeout(() => setSentToast(null), 2500);
                    }}
                    className={`p-1.5 rounded-lg cursor-pointer transition-all active:scale-95 ${
                      sentToast?.id === item.id
                        ? 'bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-400/20'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    }`}
                    title="Disparar na conversa ativa do WhatsApp Web (1 clique)"
                    aria-label="Disparar no WhatsApp"
                  >
                    {sentToast?.id === item.id ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm sm:text-base">
                {editingReply ? 'Renomear / Editar Resposta' : 'Nova Resposta Rápida'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Personalizado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Chave PIX, Boas-Vindas"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Atalho de Teclado (com /) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: /pix, /ola"
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as CategoryType })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="boas-vindas">Boas-Vindas</option>
                  <option value="vendas">Vendas</option>
                  <option value="pagamento">Pagamentos & PIX</option>
                  <option value="suporte">Suporte</option>
                  <option value="pos-venda">Pós-Venda</option>
                  <option value="catalogo">Catálogo</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Mensagem *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Suporta *negrito* e _itálico_
                  </span>
                </div>

                {/* Variáveis rápidas */}
                <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[11px] text-slate-400 font-medium mr-1 whitespace-nowrap">Inserir:</span>
                  {[
                    { tag: '{nome}', desc: 'Nome' },
                    { tag: '{produto}', desc: 'Produto' },
                    { tag: '{valor}', desc: 'Valor' },
                    { tag: '{saudacao}', desc: 'Saudação' }
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertVariable(v.tag)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-mono text-xs cursor-pointer whitespace-nowrap"
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={5}
                  required
                  placeholder="Escreva a mensagem aqui..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs sm:text-sm font-medium rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Salvar Resposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
