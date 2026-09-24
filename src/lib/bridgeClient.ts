/**
 * Cliente de Comunicação em Paralelo com WhatsApp Web (Desktop/PC)
 * Permite que o ZapBot Web detecte a conversa aberta no web.whatsapp.com e dispare com 1 clique.
 */

export interface BridgeStatus {
  connected: boolean;
  lastPing: number;
  activeChat: string;
  activePhone: string;
  pendingCommands: number;
  chatbotMasterEnabled?: boolean;
  lastSent?: {
    commandId: string;
    targetChat: string;
    title?: string;
    timestamp: number;
    success: boolean;
  };
}

export async function fetchBridgeStatus(): Promise<BridgeStatus> {
  try {
    const res = await fetch('/api/bridge/status');
    if (!res.ok) throw new Error('Falha ao obter status do bridge');
    return await res.json();
  } catch (err) {
    return {
      connected: false,
      lastPing: 0,
      activeChat: '',
      activePhone: '',
      pendingCommands: 0,
      chatbotMasterEnabled: true,
    };
  }
}

export async function sendCommandToActiveChat(
  content: string,
  title?: string,
  action: 'send_text' | 'send_audio' | 'send_image' = 'send_text',
  autoSend: boolean = true
): Promise<{ success: boolean; message: string; commandId?: string }> {
  try {
    const res = await fetch('/api/bridge/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        content,
        title: title || 'Mensagem',
        autoSend,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao enviar para o WhatsApp Web');
    }

    return {
      success: true,
      message: 'Comando enviado! O WhatsApp Web está processando o envio...',
      commandId: data.commandId,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Falha de conexão com o WhatsApp Web',
    };
  }
}

export async function syncLibraryToBridge(payload: {
  quickReplies?: any[];
  voiceNotes?: any[];
  vaultImages?: any[];
}): Promise<void> {
  try {
    await fetch('/api/bridge/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Falha ao sincronizar dados com o bridge:', e);
  }
}

export async function syncDataToBridge(
  quickReplies?: any[],
  voiceNotes?: any[],
  vaultImages?: any[]
): Promise<void> {
  return syncLibraryToBridge({ quickReplies, voiceNotes, vaultImages });
}

export async function toggleChatbotServer(enabled: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/bridge/chatbot/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    return Boolean(data.chatbotMasterEnabled);
  } catch (e) {
    console.error('Falha ao alternar chatbot no servidor:', e);
    return enabled;
  }
}

export async function syncChatbotToServer(triggers: any[], settings: any): Promise<void> {
  try {
    await fetch('/api/bridge/chatbot/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggers, settings }),
    });
  } catch (e) {
    console.error('Falha ao sincronizar gatilhos do chatbot:', e);
  }
}

export async function sendIncomingMessageToServer(
  text: string,
  leadName?: string,
  leadPhone?: string
): Promise<{ handled: boolean; replyText?: string }> {
  try {
    const res = await fetch('/api/bridge/incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, leadName, leadPhone }),
    });
    return await res.json();
  } catch (e) {
    return { handled: false };
  }
}

