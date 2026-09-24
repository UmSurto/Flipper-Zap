/**
 * Fila Assíncrona de Disparos em Segundo Plano & Temporizador de Digitação Humanizada
 * Flipper Zap Business
 */

import { sendCommandToActiveChat, fetchBridgeStatus, BridgeStatus } from './bridgeClient';

export type AppTheme = 'white' | 'black' | 'vorcarus';

export interface SendQueueItem {
  id: string;
  title: string;
  type: 'text' | 'audio' | 'image';
  content: string;
  chatTarget?: string;
  typingDelay: number; // em segundos
  isAudio?: boolean;
  status: 'queued' | 'simulating' | 'sending' | 'sent' | 'failed';
  remainingSeconds: number;
  error?: string;
  addedAt: number;
}

export type QueueNotification = {
  id: string;
  type: 'info' | 'typing' | 'recording' | 'success' | 'error';
  title: string;
  message: string;
  countdown?: number;
  timestamp: number;
};

// Listeners
type QueueListener = (items: SendQueueItem[], activeItem: SendQueueItem | null) => void;
type NotificationListener = (notification: QueueNotification | null) => void;

class SendQueueManager {
  private queue: SendQueueItem[] = [];
  private activeItem: SendQueueItem | null = null;
  private isProcessing: boolean = false;
  private queueListeners: Set<QueueListener> = new Set();
  private notificationListeners: Set<NotificationListener> = new Set();
  private countdownTimer: any = null;

  constructor() {
    // Carrega tema salvo ou padrão
  }

  public subscribeQueue(listener: QueueListener): () => void {
    this.queueListeners.add(listener);
    listener([...this.queue], this.activeItem);
    return () => this.queueListeners.delete(listener);
  }

  public subscribeNotification(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  private notifyQueueChange() {
    const list = [...this.queue];
    const active = this.activeItem ? { ...this.activeItem } : null;
    this.queueListeners.forEach(fn => fn(list, active));
  }

  public notify(notif: QueueNotification | null) {
    this.notificationListeners.forEach(fn => fn(notif));
  }

  /**
   * Adiciona um disparo à fila e retorna IMEDIATAMENTE sem bloquear a tela do usuário
   */
  public enqueue(task: {
    title: string;
    type?: 'text' | 'audio' | 'image';
    content: string;
    chatTarget?: string;
    typingDelay?: number;
    isAudio?: boolean;
  }): string {
    const id = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const delay = typeof task.typingDelay === 'number' ? task.typingDelay : this.getDefaultDelay();

    const item: SendQueueItem = {
      id,
      title: task.title || 'Mensagem',
      type: task.type || (task.isAudio ? 'audio' : 'text'),
      content: task.content,
      chatTarget: task.chatTarget || '',
      typingDelay: Math.max(0, delay),
      isAudio: Boolean(task.isAudio),
      status: 'queued',
      remainingSeconds: Math.max(0, delay),
      addedAt: Date.now(),
    };

    this.queue.push(item);
    this.notifyQueueChange();

    // Notificação breve de que entrou na fila
    if (this.queue.length > 1 || this.activeItem) {
      this.notify({
        id: 'notif_' + Date.now(),
        type: 'info',
        title: 'Entrou na Fila de Disparo',
        message: `"${item.title}" aguardando envio (${this.queue.length} na fila)`,
        timestamp: Date.now(),
      });
      setTimeout(() => {
        // Se a notificação não foi sobrescrita, esconde
      }, 2500);
    }

    // Inicia processamento se ocioso
    this.processNext();
    return id;
  }

  /**
   * Remove item da fila
   */
  public cancelItem(id: string) {
    if (this.activeItem && this.activeItem.id === id) {
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      this.activeItem = null;
      this.notify(null);
      this.processNext();
    } else {
      this.queue = this.queue.filter(i => i.id !== id);
    }
    this.notifyQueueChange();
  }

  /**
   * Limpa fila
   */
  public clearQueue() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.queue = [];
    this.activeItem = null;
    this.notify(null);
    this.notifyQueueChange();
  }

  /**
   * Processador de 1 item por vez em segundo plano
   */
  private async processNext() {
    if (this.isProcessing || this.activeItem) return;
    if (this.queue.length === 0) {
      this.notifyQueueChange();
      return;
    }

    this.isProcessing = true;
    const current = this.queue.shift()!;
    this.activeItem = current;
    this.notifyQueueChange();

    const targetChat = current.chatTarget || 'WhatsApp Web';

    // 1. FASE DE TEMPORIZADOR DE "DIGITANDO..." OU "GRAVANDO ÁUDIO..."
    if (current.typingDelay > 0) {
      current.status = 'simulating';
      current.remainingSeconds = current.typingDelay;
      this.notifyQueueChange();

      // Loop do cronômetro regressivo
      await new Promise<void>((resolve) => {
        let remaining = current.typingDelay;

        // Notifica o estado de digitação/gravação
        const updateTypingNotification = (secs: number) => {
          this.notify({
            id: 'typing_' + current.id,
            type: current.isAudio ? 'recording' : 'typing',
            title: current.isAudio ? '🎙️ Gravando Áudio...' : '✍️ Digitando Mensagem...',
            message: `${current.title} (${secs}s restantes)`,
            countdown: secs,
            timestamp: Date.now(),
          });
        };

        updateTypingNotification(remaining);

        this.countdownTimer = setInterval(() => {
          remaining -= 1;
          current.remainingSeconds = remaining;
          this.notifyQueueChange();

          if (remaining > 0) {
            updateTypingNotification(remaining);
          } else {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
            resolve();
          }
        }, 1000);
      });
    }

    // 2. FASE DE DISPARO REAL
    current.status = 'sending';
    this.notifyQueueChange();

    this.notify({
      id: 'sending_' + current.id,
      type: 'info',
      title: '⚡ Disparando...',
      message: `Enviando "${current.title}" para ${targetChat}...`,
      timestamp: Date.now(),
    });

    try {
      const bridgeStatus = await fetchBridgeStatus();
      const actionType = current.type === 'audio' ? 'send_audio' : current.type === 'image' ? 'send_image' : 'send_text';

      if (bridgeStatus.connected) {
        const result = await sendCommandToActiveChat(
          current.content, 
          current.title, 
          actionType, 
          true
        );

        if (result.success) {
          current.status = 'sent';
          this.notify({
            id: 'sent_' + current.id,
            type: 'success',
            title: '✅ Disparado no WhatsApp Web!',
            message: `"${current.title}" enviado na conversa "${bridgeStatus.activeChat || targetChat}"!`,
            timestamp: Date.now(),
          });
        } else {
          current.status = 'failed';
          current.error = result.message;
          this.notify({
            id: 'failed_' + current.id,
            type: 'error',
            title: '⚠️ Erro no Disparo',
            message: result.message || 'Falha ao conectar com WhatsApp Web',
            timestamp: Date.now(),
          });
        }
      } else {
        // Conexão oficial direta via URL quando a extensão não está conectada
        const textToSend = current.content;
        const targetDigits = (current.chatTarget || '').replace(/\D/g, '');
        const waUrl = targetDigits.length >= 10
          ? `https://web.whatsapp.com/send?phone=${targetDigits}&text=${encodeURIComponent(textToSend)}`
          : `https://web.whatsapp.com/send?text=${encodeURIComponent(textToSend)}`;

        if (typeof window !== 'undefined') {
          window.open(waUrl, '_blank');
        }

        current.status = 'sent';
        this.notify({
          id: 'sent_' + current.id,
          type: 'success',
          title: '🌐 Aberto no WhatsApp Web!',
          message: `"${current.title}" carregado no WhatsApp Web! Conecte a extensão para envio 100% automático em segundo plano.`,
          timestamp: Date.now(),
        });
      }
    } catch (err: any) {
      current.status = 'failed';
      current.error = err.message;
      this.notify({
        id: 'failed_' + current.id,
        type: 'error',
        title: '⚠️ Erro',
        message: err.message || 'Erro ao processar envio',
        timestamp: Date.now(),
      });
    }

    // Mantém notificação visível por 3 segundos
    setTimeout(() => {
      // Se não há outra ativa, limpa
      if (!this.activeItem || this.activeItem.id === current.id) {
        this.notify(null);
      }
    }, 3200);

    // Finaliza este item e avança para o próximo
    this.activeItem = null;
    this.isProcessing = false;
    this.notifyQueueChange();

    // Pequeno intervalo de 350ms para humanização entre mensagens em sequência
    setTimeout(() => {
      this.processNext();
    }, 350);
  }

  // PREFERÊNCIAS: Delay padrão
  public getDefaultDelay(): number {
    try {
      const saved = localStorage.getItem('flipper_default_delay');
      if (saved !== null) {
        return Math.max(0, parseInt(saved, 10));
      }
    } catch (e) {}
    return 2; // Padrão: 2 segundos de digitação humanizada
  }

  public setDefaultDelay(seconds: number): void {
    try {
      localStorage.setItem('flipper_default_delay', String(seconds));
    } catch (e) {}
  }

  // PREFERÊNCIAS: Tema
  public getTheme(): AppTheme {
    try {
      const saved = localStorage.getItem('flipper_theme') as AppTheme;
      if (saved === 'white' || saved === 'black' || saved === 'vorcarus') {
        return saved;
      }
    } catch (e) {}
    return 'black'; // Padrão escuro
  }

  public setTheme(theme: AppTheme): void {
    try {
      localStorage.setItem('flipper_theme', theme);
    } catch (e) {}
  }
}

export const sendQueue = new SendQueueManager();
