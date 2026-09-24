/**
 * Tipos e Interfaces do ZapBot Web
 * Automação para WhatsApp Business & WhatsApp Web
 */

export type CategoryType = 
  | 'boas-vindas' 
  | 'vendas' 
  | 'pagamento' 
  | 'suporte' 
  | 'pos-venda' 
  | 'catalogo' 
  | 'outros';

export interface QuickReply {
  id: string;
  title: string;
  shortcut: string; // Ex: /ola, /pix, /tabela
  content: string;
  category: CategoryType;
  usageCount: number;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface VoiceNote {
  id: string;
  title: string;
  shortcut: string; // Ex: /audio1, /explicacao
  duration: number; // em segundos
  audioBlob: Blob;
  mimeType: string;
  isSimulatedLive: boolean; // Flag PTT: simula gravação na hora
  waveformData: number[]; // Alturas de 0 a 100 para o visualizador
  fileSize: number;
  createdAt: number;
  notes?: string;
}

export interface VaultImage {
  id: string;
  title: string;
  shortcut?: string; // Ex: /foto1
  imageBlob: Blob;
  dataUrl: string; // preview base64
  mimeType: string;
  category: string;
  caption?: string; // Legenda que acompanha a imagem
  tags: string[];
  fileSize: number;
  dimensions?: { width: number; height: number };
  createdAt: number;
}

export interface VariablePreset {
  key: string;
  label: string;
  defaultValue: string;
  description: string;
}

export interface SimulatedMessage {
  id: string;
  sender: 'user' | 'bot' | 'customer';
  type: 'text' | 'audio' | 'image';
  text?: string;
  audioUrl?: string;
  audioDuration?: number;
  imageUrl?: string;
  caption?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isPttVoiceNote?: boolean;
}

export interface CustomerLead {
  id: string;
  name: string;
  phone: string;
  productInterest?: string;
  notes?: string;
}

export interface FollowUpRule {
  id: string;
  name: string;
  triggerDelayHours: number; // Ex: 24 (horas sem responder)
  triggerDelayMinutes?: number; // Para testes rápidos (ex: 2 min) ou custom
  messageTemplate: string;
  activeDays: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  activeTimeStart: string; // Ex: "08:00"
  activeTimeEnd: string; // Ex: "20:00"
  productTarget?: string;
  isActive: boolean;
  createdAt: number;
}

export interface FollowUpQueueItem {
  id: string;
  ruleId: string;
  ruleName: string;
  leadName: string;
  leadPhone: string;
  lastCustomerMessageAt: number;
  scheduledFor: number; // Timestamp do envio
  message: string;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  sentAt?: number;
  createdAt: number;
}

export interface ChatbotTrigger {
  id: string;
  title: string;
  keywords: string[];
  matchType: 'contains' | 'exact' | 'starts_with';
  responseMessage: string;
  responseAudioTitle?: string;
  responseImageTitle?: string;
  isActive: boolean;
  priority?: number;
  hitsCount: number;
  createdAt: number;
}

export interface ChatbotSettings {
  isMasterEnabled: boolean; // Chave mestre de ativação
  defaultFallbackMessage: string;
  fallbackEnabled: boolean;
  delaySeconds: number; // Simular digitação humana
  autoFollowUpOnNoReply: boolean;
}

