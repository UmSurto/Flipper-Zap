import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  Send, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Timer,
  Sliders,
  Settings2,
  Play,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { FollowUpRule, FollowUpQueueItem } from '../types';
import { BridgeStatus } from '../lib/bridgeClient';
import { sendQueue } from '../lib/sendQueue';

interface FollowUpTabProps {
  rules: FollowUpRule[];
  queue: FollowUpQueueItem[];
  onSaveRule: (rule: FollowUpRule) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onSaveQueueItem: (item: FollowUpQueueItem) => Promise<void>;
  onDeleteQueueItem: (id: string) => Promise<void>;
  onUpdateQueueStatus: (id: string, status: 'pending' | 'sent' | 'cancelled' | 'failed') => Promise<void>;
  onSendToActiveChat?: (text: string, title?: string) => Promise<boolean>;
  bridgeStatus: BridgeStatus;
  onBackToHome: () => void;
}

export const FollowUpTab: React.FC<FollowUpTabProps> = ({
  rules,
  queue,
  onSaveRule,
  onDeleteRule,
  onSaveQueueItem,
  onDeleteQueueItem,
  onUpdateQueueStatus,
  onSendToActiveChat,
  bridgeStatus,
  onBackToHome,
}) => {
  const [subTab, setSubTab] = useState<'queue' | 'calendar' | 'rules'>('queue');
  const [now, setNow] = useState(Date.now());

  // Atualiza o relógio a cada segundo para o cronômetro regressivo
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Estado para modal de novo lead na fila
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState(rules[0]?.id || '');
  const [customMessage, setCustomMessage] = useState('');
  const [customDelayHours, setCustomDelayHours] = useState('24');
  const [customDelayMinutes, setCustomDelayMinutes] = useState('0');

  // Estado para modal de regra
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FollowUpRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleDelayHours, setRuleDelayHours] = useState('24');
  const [ruleMessage, setRuleMessage] = useState('');
  const [ruleActiveDays, setRuleActiveDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [ruleTimeStart, setRuleTimeStart] = useState('08:30');
  const [ruleTimeEnd, setRuleTimeEnd] = useState('20:00');

  // Estado para o calendário
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

  const openNewLeadModal = (targetDate?: Date) => {
    setLeadName('');
    setLeadPhone(bridgeStatus.activePhone || '');
    const firstRule = rules[0];
    if (firstRule) {
      setSelectedRuleId(firstRule.id);
      setCustomMessage(firstRule.messageTemplate);
      setCustomDelayHours(String(firstRule.triggerDelayHours));
    }
    if (targetDate) {
      // Calcula horas até a data alvo
      const diffMs = targetDate.getTime() - Date.now();
      const diffHrs = Math.max(1, Math.round(diffMs / 3600000));
      setCustomDelayHours(String(diffHrs));
    }
    setIsNewLeadModalOpen(true);
  };

  const handleCreateLeadItem = async () => {
    if (!leadName.trim() || !customMessage.trim()) return;

    const delayMs = (parseInt(customDelayHours || '24') * 3600 + parseInt(customDelayMinutes || '0') * 60) * 1000;
    const ruleObj = rules.find(r => r.id === selectedRuleId);

    const newItem: FollowUpQueueItem = {
      id: 'fq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ruleId: selectedRuleId,
      ruleName: ruleObj ? ruleObj.name : 'Follow-up Personalizado',
      leadName: leadName.trim(),
      leadPhone: leadPhone.trim(),
      lastCustomerMessageAt: Date.now(),
      scheduledFor: Date.now() + Math.max(10000, delayMs),
      message: customMessage.trim(),
      status: 'pending',
      createdAt: Date.now(),
    };

    await onSaveQueueItem(newItem);
    setIsNewLeadModalOpen(false);
  };

  const openRuleModal = (rule?: FollowUpRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleName(rule.name);
      setRuleDelayHours(String(rule.triggerDelayHours));
      setRuleMessage(rule.messageTemplate);
      setRuleActiveDays(rule.activeDays);
      setRuleTimeStart(rule.activeTimeStart);
      setRuleTimeEnd(rule.activeTimeEnd);
    } else {
      setEditingRule(null);
      setRuleName('');
      setRuleDelayHours('24');
      setRuleMessage('Olá, {nome}! Tudo bem? Vi que você entrou em contato ontem sobre nossos produtos. Ficou alguma dúvida sobre formas de pagamento ou entrega? Consigo segurar o desconto para você!');
      setRuleActiveDays([1, 2, 3, 4, 5, 6]);
      setRuleTimeStart('08:30');
      setRuleTimeEnd('20:00');
    }
    setIsRuleModalOpen(true);
  };

  const handleSaveRuleForm = async () => {
    if (!ruleName.trim() || !ruleMessage.trim()) return;

    const hours = Math.max(1, parseInt(ruleDelayHours || '24'));
    const saved: FollowUpRule = {
      id: editingRule ? editingRule.id : 'rule_' + Date.now(),
      name: ruleName.trim(),
      triggerDelayHours: hours,
      triggerDelayMinutes: hours * 60,
      messageTemplate: ruleMessage.trim(),
      activeDays: ruleActiveDays,
      activeTimeStart: ruleTimeStart,
      activeTimeEnd: ruleTimeEnd,
      isActive: true,
      createdAt: editingRule ? editingRule.createdAt : Date.now(),
    };

    await onSaveRule(saved);
    setIsRuleModalOpen(false);
  };

  const formatCountdownDetailed = (targetTime: number) => {
    const diff = targetTime - now;
    if (diff <= 0) return 'Pronto para disparo';

    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    if (hours > 0) return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };

  const handleTriggerNow = async (item: FollowUpQueueItem) => {
    sendQueue.enqueue({
      title: `Follow-up: ${item.leadName}`,
      content: item.message,
      type: 'text',
      typingDelay: 2,
      chatTarget: item.leadName || 'WhatsApp Web',
    });
    await onUpdateQueueStatus(item.id, 'sent');
  };

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Helper para renderizar dias do mês no calendário
  const renderCalendar = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const calendarCells = [];
    for (let i = 0; i < firstDay; i++) {
      calendarCells.push(<div key={`empty-${i}`} className="p-2 sm:p-3 min-h-[70px] bg-slate-900/20 border border-slate-800/40 rounded-xl opacity-20" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      const isSelected = selectedCalendarDay === dateStr;

      // Filtra follow-ups desse dia
      const itemsThisDay = queue.filter(item => {
        const itemDate = new Date(item.scheduledFor);
        return itemDate.getFullYear() === year && itemDate.getMonth() === month && itemDate.getDate() === d;
      });

      calendarCells.push(
        <div
          key={`day-${d}`}
          onClick={() => setSelectedCalendarDay(isSelected ? null : dateStr)}
          className={`p-2.5 sm:p-3 min-h-[75px] rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            isSelected 
              ? 'bg-emerald-950/50 border-emerald-400 shadow-lg shadow-emerald-500/20' 
              : isToday 
                ? 'bg-slate-900 border-emerald-500/50' 
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isToday ? 'text-emerald-400' : 'text-slate-300'}`}>
              {d}
            </span>
            {isToday && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                Hoje
              </span>
            )}
          </div>

          <div className="mt-1 space-y-1">
            {itemsThisDay.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-semibold truncate">
                  ⏱️ {itemsThisDay.length} {itemsThisDay.length === 1 ? 'disparo' : 'disparos'}
                </span>
              </div>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  openNewLeadModal(new Date(year, month, d, 14, 0));
                }}
                className="opacity-0 hover:opacity-100 text-[10px] text-slate-500 hover:text-emerald-400 font-semibold"
              >
                + Agendar
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Controles de Mês */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-bold text-white">
              {monthNames[month]} {year}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentCalendarDate(new Date(year, month - 1, 1))}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentCalendarDate(new Date())}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Hoje
            </button>
            <button
              onClick={() => setCurrentCalendarDate(new Date(year, month + 1, 1))}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dias da Semana */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold text-slate-400 py-1">
          {dayNames.map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Grade do Mês */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarCells}
        </div>

        {/* Painel do Dia Selecionado */}
        {selectedCalendarDay && (
          <div className="mt-4 p-4 bg-slate-900 border border-emerald-500/40 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Disparos agendados para {selectedCalendarDay}</span>
              </h4>
              <button
                onClick={() => {
                  const parts = selectedCalendarDay.split('-');
                  openNewLeadModal(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 14, 0));
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar para este dia</span>
              </button>
            </div>

            {queue.filter(item => {
              const itemDate = new Date(item.scheduledFor);
              const [y, m, d] = selectedCalendarDay.split('-').map(Number);
              return itemDate.getFullYear() === y && itemDate.getMonth() === m - 1 && itemDate.getDate() === d;
            }).length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum follow-up programado para esta data.</p>
            ) : (
              <div className="space-y-2">
                {queue.filter(item => {
                  const itemDate = new Date(item.scheduledFor);
                  const [y, m, d] = selectedCalendarDay.split('-').map(Number);
                  return itemDate.getFullYear() === y && itemDate.getMonth() === m - 1 && itemDate.getDate() === d;
                }).map(item => (
                  <div key={item.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <strong className="text-white">{item.leadName}</strong>
                      <span className="text-slate-400 ml-2">({new Date(item.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                      <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">{item.message}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' :
                      item.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-amber-500/20 text-amber-300'
                    }`}>
                      {item.status === 'sent' ? 'Enviado' : item.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const pendingItems = queue.filter(q => q.status === 'pending');
  const finishedItems = queue.filter(q => q.status !== 'pending');

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-amber-400" />
                <span>Follow-up Automático & Calendário</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Envio automático para clientes que não responderam após 24h, 48h ou horários programados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openNewLeadModal()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-amber-500/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Programar Follow-up</span>
          </button>

          <button
            onClick={() => openRuleModal()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all whitespace-nowrap"
          >
            <Sliders className="w-4 h-4" />
            <span>Nova Regra</span>
          </button>
        </div>
      </div>

      {/* Navegação entre Sub-abas */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setSubTab('queue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'queue'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Timer className="w-4 h-4" />
          <span>Fila ao Vivo ({pendingItems.length})</span>
        </button>

        <button
          onClick={() => setSubTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'calendar'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Calendário de Envios</span>
        </button>

        <button
          onClick={() => setSubTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'rules'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Regras de Tempo ({rules.length})</span>
        </button>
      </div>

      {/* SUB-ABA 1: FILA DE DISPAROS AO VIVO */}
      {subTab === 'queue' && (
        <div className="space-y-6">
          {/* Card informativo de operação */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-300">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white block font-semibold">Como funciona o envio automático no computador:</strong>
              <p>
                Basta manter esta janela aberta e seu WhatsApp Web conectado no computador. Quando o cronômetro zerar (ex: 24 horas sem resposta), o Flipper Zap envia a mensagem programada diretamente para o lead!
              </p>
            </div>
          </div>

          {/* Fila Ativa */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span>Leads Aguardando Disparo ({pendingItems.length})</span>
              <span className="text-xs text-slate-400 font-normal">Atualizado a cada segundo</span>
            </h3>

            {pendingItems.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <Clock className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">Nenhum follow-up pendente no momento</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Adicione leads que pararam de responder para que o robô faça a recuperação 24h automaticamente.
                </p>
                <button
                  onClick={() => openNewLeadModal()}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Programar Primeiro Lead</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingItems.map((item) => {
                  const isReady = item.scheduledFor <= now;
                  return (
                    <div 
                      key={item.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isReady 
                          ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/10' 
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{item.leadName}</h4>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              {item.leadPhone && <span>{item.leadPhone} •</span>}
                              <span>{item.ruleName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Cronômetro Regressivo */}
                        <div className="text-right">
                          <div className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold inline-flex items-center gap-1.5 ${
                            isReady 
                              ? 'bg-amber-500 text-slate-950 animate-pulse' 
                              : 'bg-slate-800 text-amber-400 border border-slate-700'
                          }`}>
                            <Timer className="w-3.5 h-3.5" />
                            <span>{formatCountdownDetailed(item.scheduledFor)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            Disparo às {new Date(item.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {/* Mensagem que será disparada */}
                      <div className="mt-3.5 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed font-sans">
                        "{item.message}"
                      </div>

                      {/* Ações */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => onUpdateQueueStatus(item.id, 'cancelled')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                          title="Cancelar se o cliente já respondeu"
                        >
                          Cancelar Lembrete
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onDeleteQueueItem(item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="Remover da fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleTriggerNow(item)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                            title="Disparar na conversa aberta do WhatsApp Web"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>Disparar Agora</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Histórico Recente de Follow-ups (Enviados ou Cancelados) */}
          {finishedItems.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 mb-3">Histórico de Disparos Recentes</h3>
              <div className="space-y-2">
                {finishedItems.slice(0, 5).map(item => (
                  <div key={item.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        item.status === 'sent' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`} />
                      <strong>{item.leadName}</strong>
                      <span className="text-slate-500 truncate max-w-xs">{item.message}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-500">
                        {item.sentAt ? new Date(item.sentAt).toLocaleTimeString() : 'Cancelado'}
                      </span>
                      <button
                        onClick={() => onDeleteQueueItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: CALENDÁRIO */}
      {subTab === 'calendar' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          {renderCalendar()}
        </div>
      )}

      {/* SUB-ABA 3: REGRAS DE TEMPO */}
      {subTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Regras de Tempo Configuradas</h3>
              <p className="text-xs text-slate-400">Modelos pré-definidos para agendamentos rápidos (24h, 48h, 2h).</p>
            </div>
            <button
              onClick={() => openRuleModal()}
              className="px-3.5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Regra</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map(rule => (
              <div key={rule.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-mono font-bold">
                      ⏱️ {rule.triggerDelayHours}h de espera
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {rule.activeTimeStart} às {rule.activeTimeEnd}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{rule.name}</h4>
                  <p className="text-xs text-slate-300 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl leading-relaxed">
                    "{rule.messageTemplate}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Dias ativos: {rule.activeDays.map(d => dayNames[d]).join(', ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openRuleModal(rule)}
                      className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                      title="Editar regra"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Excluir regra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: PROGRAMAR NOVO FOLLOW-UP (LEAD) */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>Programar Follow-up para Lead</span>
              </h3>
              <button onClick={() => setIsNewLeadModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome do Cliente / Lead *</label>
                  <input
                    type="text"
                    value={leadName}
                    onChange={e => setLeadName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone (opcional)</label>
                  <input
                    type="text"
                    value={leadPhone}
                    onChange={e => setLeadPhone(e.target.value)}
                    placeholder="Ex: 11988887777"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Escolha de Regra Pré-definida */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Modelo de Regra</label>
                <select
                  value={selectedRuleId}
                  onChange={e => {
                    setSelectedRuleId(e.target.value);
                    const found = rules.find(r => r.id === e.target.value);
                    if (found) {
                      setCustomMessage(found.messageTemplate);
                      setCustomDelayHours(String(found.triggerDelayHours));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
                >
                  {rules.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.triggerDelayHours}h)</option>
                  ))}
                  <option value="custom">Personalizado...</option>
                </select>
              </div>

              {/* Tempo de Espera */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Horas de Espera *</label>
                  <input
                    type="number"
                    min="0"
                    value={customDelayHours}
                    onChange={e => setCustomDelayHours(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Minutos Adicionais</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customDelayMinutes}
                    onChange={e => setCustomDelayMinutes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Mensagem a Ser Enviada */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Mensagem do Lembrete *</label>
                  <span className="text-[10px] text-slate-400">Tags: &#123;nome&#125;, &#123;saudacao&#125;, &#123;produto&#125;</span>
                </div>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsNewLeadModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateLeadItem}
                disabled={!leadName.trim() || !customMessage.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
              >
                Iniciar Cronômetro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR REGRA */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>{editingRule ? 'Editar Regra de Follow-up' : 'Nova Regra de Follow-up'}</span>
              </h3>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome da Regra *</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={e => setRuleName(e.target.value)}
                  placeholder="Ex: Recuperação 24h - Lead Sem Resposta"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tempo (Horas) *</label>
                  <input
                    type="number"
                    min="1"
                    value={ruleDelayHours}
                    onChange={e => setRuleDelayHours(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Início Horário</label>
                  <input
                    type="time"
                    value={ruleTimeStart}
                    onChange={e => setRuleTimeStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fim Horário</label>
                  <input
                    type="time"
                    value={ruleTimeEnd}
                    onChange={e => setRuleTimeEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dias da Semana Permitidos */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Dias da Semana Permitidos</label>
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((name, idx) => {
                    const isSelected = ruleActiveDays.includes(idx);
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => {
                          if (isSelected) {
                            setRuleActiveDays(ruleActiveDays.filter(d => d !== idx));
                          } else {
                            setRuleActiveDays([...ruleActiveDays, idx]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-amber-500 text-slate-950' 
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Texto do Modelo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Texto da Mensagem *</label>
                  <span className="text-[10px] text-slate-400">&#123;nome&#125;, &#123;saudacao&#125;, &#123;produto&#125;, &#123;valor&#125;</span>
                </div>
                <textarea
                  rows={4}
                  value={ruleMessage}
                  onChange={e => setRuleMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRuleForm}
                disabled={!ruleName.trim() || !ruleMessage.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
              >
                Salvar Regra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
