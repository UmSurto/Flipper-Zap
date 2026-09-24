import React, { useState } from 'react';
import { 
  Bot, 
  Power, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft, 
  MessageSquare, 
  Sliders, 
  Search, 
  Play, 
  Tag, 
  Clock, 
  Info,
  CornerDownRight,
  Shield,
  Zap
} from 'lucide-react';
import { ChatbotTrigger, ChatbotSettings } from '../types';

interface ChatbotTabProps {
  triggers: ChatbotTrigger[];
  settings: ChatbotSettings;
  onSaveTrigger: (trigger: ChatbotTrigger) => Promise<void>;
  onDeleteTrigger: (id: string) => Promise<void>;
  onSaveSettings: (settings: ChatbotSettings) => Promise<void>;
  onToggleMaster: (enabled: boolean) => Promise<void>;
  onBackToHome: () => void;
}

export const ChatbotTab: React.FC<ChatbotTabProps> = ({
  triggers,
  settings,
  onSaveTrigger,
  onDeleteTrigger,
  onSaveSettings,
  onToggleMaster,
  onBackToHome,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<ChatbotTrigger | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [matchType, setMatchType] = useState<'contains' | 'exact' | 'starts_with'>('contains');
  const [responseMessage, setResponseMessage] = useState('');

  // Fallback config state
  const [fallbackMessage, setFallbackMessage] = useState(settings.defaultFallbackMessage);
  const [fallbackEnabled, setFallbackEnabled] = useState(settings.fallbackEnabled);
  const [delaySeconds, setDelaySeconds] = useState(settings.delaySeconds || 2);

  // Test Console state
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{
    matched: boolean;
    triggerTitle?: string;
    parsedReply?: string;
  } | null>(null);

  const openTriggerModal = (trigger?: ChatbotTrigger) => {
    if (trigger) {
      setEditingTrigger(trigger);
      setTitle(trigger.title);
      setKeywordsInput(trigger.keywords.join(', '));
      setMatchType(trigger.matchType);
      setResponseMessage(trigger.responseMessage);
    } else {
      setEditingTrigger(null);
      setTitle('');
      setKeywordsInput('');
      setMatchType('contains');
      setResponseMessage('');
    }
    setIsModalOpen(true);
  };

  const handleSaveTriggerForm = async () => {
    if (!title.trim() || !keywordsInput.trim() || !responseMessage.trim()) return;

    const keywords = keywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const saved: ChatbotTrigger = {
      id: editingTrigger ? editingTrigger.id : 'trig_' + Date.now(),
      title: title.trim(),
      keywords,
      matchType,
      responseMessage: responseMessage.trim(),
      isActive: editingTrigger ? editingTrigger.isActive : true,
      priority: editingTrigger?.priority || 1,
      hitsCount: editingTrigger ? editingTrigger.hitsCount : 0,
      createdAt: editingTrigger ? editingTrigger.createdAt : Date.now(),
    };

    await onSaveTrigger(saved);
    setIsModalOpen(false);
  };

  const handleToggleTriggerActive = async (trigger: ChatbotTrigger) => {
    await onSaveTrigger({
      ...trigger,
      isActive: !trigger.isActive,
    });
  };

  const handleSaveSettingsForm = async () => {
    await onSaveSettings({
      ...settings,
      fallbackEnabled,
      defaultFallbackMessage: fallbackMessage,
      delaySeconds,
    });
  };

  // Testa a mensagem no simulador de gatilhos
  const handleRunTest = () => {
    if (!testInput.trim()) return;

    if (!settings.isMasterEnabled) {
      setTestResult({
        matched: false,
        triggerTitle: 'Chave Mestre Desligada',
        parsedReply: 'O robô está desativado na chave geral. Ative a chave mestre para responder.',
      });
      return;
    }

    const clean = testInput.toLowerCase().trim();
    let found: ChatbotTrigger | null = null;

    const activeTriggers = triggers.filter(t => t.isActive);
    for (const t of activeTriggers) {
      for (const kw of t.keywords) {
        const cleanKw = kw.toLowerCase().trim();
        if (!cleanKw) continue;
        if (t.matchType === 'exact' && clean === cleanKw) {
          found = t;
          break;
        } else if (t.matchType === 'starts_with' && clean.startsWith(cleanKw)) {
          found = t;
          break;
        } else if (clean.includes(cleanKw)) {
          found = t;
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      const parsed = found.responseMessage
        .replace(/\{nome\}/gi, 'Mariana')
        .replace(/\{saudacao\}/gi, 'Olá')
        .replace(/\{produto\}/gi, 'nosso kit principal')
        .replace(/\{valor\}/gi, 'R$ 97,00');

      setTestResult({
        matched: true,
        triggerTitle: found.title,
        parsedReply: parsed,
      });
    } else if (fallbackEnabled && fallbackMessage) {
      setTestResult({
        matched: true,
        triggerTitle: 'Mensagem Padrão (Sem gatilho direto)',
        parsedReply: fallbackMessage.replace(/\{nome\}/gi, 'Mariana'),
      });
    } else {
      setTestResult({
        matched: false,
        triggerTitle: 'Nenhum gatilho compatível',
        parsedReply: 'Nenhuma resposta automática disparada (sem palavras-chave correspondentes).',
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header com Botão Voltar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            title="Voltar para a tela principal"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Início</span>
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Bot className="w-6 h-6 text-emerald-400" />
              <span>Autoatendimento & Chatbot com Gatilhos</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Chave de ativação geral para responder todos os clientes e regras por palavras-chave.
            </p>
          </div>
        </div>

        <button
          onClick={() => openTriggerModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-500/20 transition-all active:scale-95 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Gatilho de Venda</span>
        </button>
      </div>

      {/* CHAVE MESTRE DE ATIVAÇÃO GERAL (DESTAQUE MÁXIMO) */}
      <div className={`p-6 rounded-3xl border transition-all shadow-xl ${
        settings.isMasterEnabled 
          ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/50 shadow-emerald-500/10' 
          : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 whitespace-nowrap">
              <Shield className="w-3.5 h-3.5" />
              <span>Chave Geral de Atendimento</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-3 flex-wrap">
              <span>Status do Autoatendimento:</span>
              <span className={`text-base font-extrabold px-3 py-0.5 rounded-full whitespace-nowrap ${
                settings.isMasterEnabled 
                  ? 'bg-emerald-500 text-slate-950 animate-pulse' 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {settings.isMasterEnabled ? 'LIGADO' : 'DESLIGADO'}
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {settings.isMasterEnabled
                ? '🟢 Quando ativado, todas as novas mensagens recebidas no seu WhatsApp Web serão processadas e respondidas automaticamente pelos gatilhos cadastrados.'
                : '⚪ O robô está em pausa. Nenhuma mensagem recebida receberá respostas automáticas até que a chave seja ativada.'}
            </p>
          </div>

          <button
            onClick={() => onToggleMaster(!settings.isMasterEnabled)}
            className={`px-6 py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-95 shadow-lg shrink-0 ${
              settings.isMasterEnabled 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 ring-4 ring-emerald-500/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Power className="w-5 h-5" />
            <span>{settings.isMasterEnabled ? 'Desativar Robô' : 'Ligar Autoatendimento'}</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Gatilhos de Venda & Testador */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Lista de Gatilhos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Gatilhos por Palavra-Chave ({triggers.length})</span>
            </h3>
            <span className="text-xs text-slate-400">
              {triggers.filter(t => t.isActive).length} ativos
            </span>
          </div>

          <div className="space-y-3">
            {triggers.map(trigger => (
              <div 
                key={trigger.id}
                className={`p-5 rounded-2xl border transition-all ${
                  trigger.isActive 
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700' 
                    : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold text-white">{trigger.title}</h4>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-mono whitespace-nowrap">
                        {trigger.matchType === 'exact' ? 'Frase Exata' : trigger.matchType === 'starts_with' ? 'Começa com' : 'Contém palavra'}
                      </span>
                      {trigger.hitsCount > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold whitespace-nowrap">
                          {trigger.hitsCount} disparos
                        </span>
                      )}
                    </div>

                    {/* Chips de Palavras-Chave */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {trigger.keywords.map(kw => (
                        <span 
                          key={kw} 
                          className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md text-[11px] font-mono font-semibold whitespace-nowrap"
                        >
                          "{kw}"
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Ativo / Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleTriggerActive(trigger)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                        trigger.isActive 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-slate-800 text-slate-500'
                      }`}
                      title={trigger.isActive ? 'Desativar este gatilho' : 'Ativar este gatilho'}
                    >
                      {trigger.isActive ? 'Ativo' : 'Pausado'}
                    </button>

                    <button
                      onClick={() => openTriggerModal(trigger)}
                      className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                      title="Editar gatilho"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteTrigger(trigger.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Excluir gatilho"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Resposta do Gatilho */}
                <div className="mt-3.5 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed font-sans">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <CornerDownRight className="w-3 h-3 text-emerald-400" />
                    <span>Resposta Automática:</span>
                  </div>
                  "{trigger.responseMessage}"
                </div>
              </div>
            ))}
          </div>

          {/* Configuração de Mensagem Padrão (Fallback) */}
          <div className="mt-6 p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Mensagem Padrão (Sem Palavra-Chave)</h4>
                <p className="text-xs text-slate-400">Enviada quando a mensagem do cliente não combina com nenhum gatilho acima.</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fallbackEnabled}
                  onChange={e => setFallbackEnabled(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-300">Ativar Fallback</span>
              </label>
            </div>

            <textarea
              rows={2}
              value={fallbackMessage}
              onChange={e => setFallbackMessage(e.target.value)}
              disabled={!fallbackEnabled}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs disabled:opacity-50 focus:border-emerald-400 focus:outline-none"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Delay de resposta: <strong>{delaySeconds} segundos</strong>
              </span>
              <button
                onClick={handleSaveSettingsForm}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>

        {/* Coluna 3: Testador Interativo de Gatilhos */}
        <div className="space-y-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Testador de Gatilhos em Tempo Real</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Digite uma mensagem como se fosse um cliente para testar se o gatilho responde corretamente.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRunTest()}
                placeholder="Ex: quanto custa? / qual a chave pix?"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-400 focus:outline-none"
              />

              <button
                onClick={handleRunTest}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Testar Resposta</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                testResult.matched 
                  ? 'bg-emerald-950/40 border-emerald-500/40' 
                  : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Resultado:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    testResult.matched ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {testResult.triggerTitle}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 leading-relaxed">
                  "{testResult.parsedReply}"
                </div>
              </div>
            )}
          </div>

          {/* Dicas de Vendas com Chatbot */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2 text-slate-400">
            <strong className="text-white block font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Dicas de Vendas Flipper Zap</span>
            </strong>
            <p>
              • Use o gatilho <strong>"quanto custa"</strong> para enviar o preço e já oferecer o link de pagamento ou chave Pix com desconto especial.
            </p>
            <p>
              • Ative a tag <strong>&#123;nome&#125;</strong> na mensagem para que o cliente sinta um atendimento 100% humanizado e personalizado.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: CRIAR / EDITAR GATILHO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <span>{editingTrigger ? 'Editar Gatilho' : 'Novo Gatilho de Venda'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título do Gatilho *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Preço e Condições de Pagamento"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Palavras-Chave (separadas por vírgula) *</label>
                  <span className="text-[10px] text-slate-400">Ex: preco, valor, quanto custa</span>
                </div>
                <input
                  type="text"
                  value={keywordsInput}
                  onChange={e => setKeywordsInput(e.target.value)}
                  placeholder="preco, quanto custa, valor, tabela"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipo de Correspondência</label>
                <select
                  value={matchType}
                  onChange={e => setMatchType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-400 focus:outline-none"
                >
                  <option value="contains">Contém qualquer uma das palavras (Recomendado)</option>
                  <option value="starts_with">Começa com a palavra</option>
                  <option value="exact">Frase idêntica / exata</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Resposta Automática *</label>
                  <span className="text-[10px] text-slate-400">&#123;nome&#125;, &#123;saudacao&#125;, &#123;produto&#125;, &#123;valor&#125;</span>
                </div>
                <textarea
                  rows={4}
                  value={responseMessage}
                  onChange={e => setResponseMessage(e.target.value)}
                  placeholder="Olá {nome}! Nosso kit principal sai por apenas R$ 97,00 hoje..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-400 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTriggerForm}
                disabled={!title.trim() || !keywordsInput.trim() || !responseMessage.trim()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
              >
                Salvar Gatilho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
