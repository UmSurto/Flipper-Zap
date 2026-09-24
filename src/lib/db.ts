/**
 * IndexedDB Database Service para ZapBot Web
 * Armazenamento permanente de respostas rápidas, áudios PTT e imagens
 * Sem necessidade de usar galeria do celular/computador.
 */

import { 
  QuickReply, 
  VoiceNote, 
  VaultImage, 
  CategoryType,
  FollowUpRule,
  FollowUpQueueItem,
  ChatbotTrigger,
  ChatbotSettings
} from '../types';

const DB_NAME = 'ZapBotBusinessDB';
const DB_VERSION = 2;

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('quick_replies')) {
        const qrStore = db.createObjectStore('quick_replies', { keyPath: 'id' });
        qrStore.createIndex('category', 'category', { unique: false });
        qrStore.createIndex('shortcut', 'shortcut', { unique: false });
      }

      if (!db.objectStoreNames.contains('voice_notes')) {
        const vnStore = db.createObjectStore('voice_notes', { keyPath: 'id' });
        vnStore.createIndex('shortcut', 'shortcut', { unique: false });
      }

      if (!db.objectStoreNames.contains('vault_images')) {
        const viStore = db.createObjectStore('vault_images', { keyPath: 'id' });
        viStore.createIndex('category', 'category', { unique: false });
      }

      if (!db.objectStoreNames.contains('follow_up_rules')) {
        db.createObjectStore('follow_up_rules', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('follow_up_queue')) {
        const fqStore = db.createObjectStore('follow_up_queue', { keyPath: 'id' });
        fqStore.createIndex('status', 'status', { unique: false });
        fqStore.createIndex('scheduledFor', 'scheduledFor', { unique: false });
      }

      if (!db.objectStoreNames.contains('chatbot_triggers')) {
        const ctStore = db.createObjectStore('chatbot_triggers', { keyPath: 'id' });
        ctStore.createIndex('priority', 'priority', { unique: false });
      }

      if (!db.objectStoreNames.contains('chatbot_settings')) {
        db.createObjectStore('chatbot_settings', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// ==========================================
// RESPOSTAS RÁPIDAS (QUICK REPLIES)
// ==========================================

export async function getAllQuickReplies(): Promise<QuickReply[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('quick_replies', 'readonly');
    const store = tx.objectStore('quick_replies');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveQuickReply(item: QuickReply): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('quick_replies', 'readwrite');
    const store = tx.objectStore('quick_replies');
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteQuickReply(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('quick_replies', 'readwrite');
    const store = tx.objectStore('quick_replies');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function incrementQuickReplyUsage(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('quick_replies', 'readwrite');
    const store = tx.objectStore('quick_replies');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const item = getReq.result as QuickReply;
        item.usageCount = (item.usageCount || 0) + 1;
        item.updatedAt = Date.now();
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ==========================================
// ÁUDIOS GRAVADOS NA HORA (VOICE NOTES - PTT)
// ==========================================

export async function getAllVoiceNotes(): Promise<VoiceNote[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('voice_notes', 'readonly');
    const store = tx.objectStore('voice_notes');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVoiceNote(item: VoiceNote): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('voice_notes', 'readwrite');
    const store = tx.objectStore('voice_notes');
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVoiceNote(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('voice_notes', 'readwrite');
    const store = tx.objectStore('voice_notes');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// BANCO DE DADOS DE IMAGENS (VAULT)
// ==========================================

export async function getAllVaultImages(): Promise<VaultImage[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vault_images', 'readonly');
    const store = tx.objectStore('vault_images');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVaultImage(item: VaultImage): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vault_images', 'readwrite');
    const store = tx.objectStore('vault_images');
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVaultImage(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vault_images', 'readwrite');
    const store = tx.objectStore('vault_images');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// FOLLOW-UP PROGRAMADO (REGRAS E FILA)
// ==========================================

export async function getAllFollowUpRules(): Promise<FollowUpRule[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('follow_up_rules', 'readonly');
      const store = tx.objectStore('follow_up_rules');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function saveFollowUpRule(rule: FollowUpRule): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('follow_up_rules', 'readwrite');
    const store = tx.objectStore('follow_up_rules');
    const req = store.put(rule);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFollowUpRule(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('follow_up_rules', 'readwrite');
    const store = tx.objectStore('follow_up_rules');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllFollowUpQueue(): Promise<FollowUpQueueItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('follow_up_queue', 'readonly');
      const store = tx.objectStore('follow_up_queue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function saveFollowUpQueueItem(item: FollowUpQueueItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('follow_up_queue', 'readwrite');
    const store = tx.objectStore('follow_up_queue');
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFollowUpQueueItem(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('follow_up_queue', 'readwrite');
    const store = tx.objectStore('follow_up_queue');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateFollowUpQueueStatus(
  id: string, 
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('follow_up_queue', 'readwrite');
    const store = tx.objectStore('follow_up_queue');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const item = getReq.result as FollowUpQueueItem;
        item.status = status;
        if (status === 'sent') item.sentAt = Date.now();
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ==========================================
// AUTOATENDIMENTO / CHATBOT COM GATILHOS
// ==========================================

export async function getAllChatbotTriggers(): Promise<ChatbotTrigger[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('chatbot_triggers', 'readonly');
      const store = tx.objectStore('chatbot_triggers');
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => (a.priority || 1) - (b.priority || 1));
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function saveChatbotTrigger(trigger: ChatbotTrigger): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chatbot_triggers', 'readwrite');
    const store = tx.objectStore('chatbot_triggers');
    const req = store.put(trigger);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteChatbotTrigger(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chatbot_triggers', 'readwrite');
    const store = tx.objectStore('chatbot_triggers');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function incrementChatbotTriggerHit(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('chatbot_triggers', 'readwrite');
    const store = tx.objectStore('chatbot_triggers');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const item = getReq.result as ChatbotTrigger;
        item.hitsCount = (item.hitsCount || 0) + 1;
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => resolve();
  });
}

const DEFAULT_CHATBOT_SETTINGS: ChatbotSettings = {
  isMasterEnabled: true,
  defaultFallbackMessage: "Recebi sua mensagem! Já estou consultando as informações do seu pedido e te respondo em um instante.",
  fallbackEnabled: true,
  delaySeconds: 2,
  autoFollowUpOnNoReply: true,
};

export async function getChatbotSettings(): Promise<ChatbotSettings> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('chatbot_settings', 'readonly');
      const store = tx.objectStore('chatbot_settings');
      const req = store.get('main_settings');
      req.onsuccess = () => resolve(req.result || DEFAULT_CHATBOT_SETTINGS);
      req.onerror = () => resolve(DEFAULT_CHATBOT_SETTINGS);
    });
  } catch (e) {
    return DEFAULT_CHATBOT_SETTINGS;
  }
}

export async function saveChatbotSettings(settings: ChatbotSettings): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chatbot_settings', 'readwrite');
    const store = tx.objectStore('chatbot_settings');
    const req = store.put({ id: 'main_settings', ...settings });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// SEED INICIAL COM DADOS PROFISSIONAIS
// ==========================================

export async function seedInitialDataIfEmpty(): Promise<void> {
  const existingReplies = await getAllQuickReplies();
  if (existingReplies.length > 0) return;

  const defaultReplies: QuickReply[] = [
    {
      id: 'qr-1',
      title: 'Boas-Vindas Pessoal & Acolhedora',
      shortcut: '/ola',
      category: 'boas-vindas',
      content: 'Olá, {nome}! Tudo bem por aí? 👋\n\nSou o assistente aqui da nossa equipe. Vi que você entrou em contato com interesse em {produto}.\n\nComo posso te ajudar da melhor forma hoje?',
      usageCount: 24,
      tags: ['atendimento', 'inicio'],
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'qr-2',
      title: 'Chave Pix com Instruções Claras',
      shortcut: '/pix',
      category: 'pagamento',
      content: 'Perfeito, {nome}! Aqui estão os dados para pagamento via *PIX*:\n\n🔑 *Chave PIX (CNPJ/Chave):* financeiro@suaempresa.com.br\n💼 *Titular:* Sua Empresa Soluções Ltda\n💰 *Valor:* {valor}\n\nAssim que fizer a transferência, me mande o comprovante aqui para liberarmos imediatamente o seu pedido! 🚀',
      usageCount: 42,
      tags: ['pix', 'fechamento', 'financeiro'],
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'qr-3',
      title: 'Apresentação de Preço e Benefícios',
      shortcut: '/preco',
      category: 'vendas',
      content: 'Ótima escolha, {nome}! O {produto} está em condição especial hoje:\n\n✅ Acesso Imediato e Vitalício\n✅ Suporte VIP no WhatsApp\n✅ Garantia incondicional de 7 dias\n\n💳 Em até 12x no cartão ou com *10% de desconto no PIX* por apenas *{valor}*.\n\nQuer que eu já reserve a sua vaga com essa condição?',
      usageCount: 31,
      tags: ['vendas', 'oferta', 'preco'],
      createdAt: Date.now() - 86400000 * 4,
      updatedAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'qr-4',
      title: 'Quebra de Objeção: Segurança & Garantia',
      shortcut: '/garantia',
      category: 'vendas',
      content: 'Compreendo perfeitamente sua preocupação, {nome}! Fique 100% tranquilo(a).\n\n🛡️ Nós oferecemos *Garantia Blindada de 7 Dias*. Se por qualquer motivo não for exatamente o que você esperava, basta me mandar um "oi" aqui que devolvemos todo o seu investimento na hora, sem letras miúdas.\n\nO risco é todo nosso!',
      usageCount: 18,
      tags: ['garantia', 'confianca'],
      createdAt: Date.now() - 86400000 * 1,
      updatedAt: Date.now() - 86400000 * 1,
    },
    {
      id: 'qr-5',
      title: 'Envio de Rastreio & Pós-Venda',
      shortcut: '/rastreio',
      category: 'pos-venda',
      content: 'Boas notícias, {nome}! 📦\n\nSeu pedido foi faturado e despachado hoje com muito carinho. O código de rastreamento é:\n\n🔎 *Código:* BR987654321BR\n🚚 *Previsão de entrega:* 3 a 5 dias úteis.\n\nQualquer dúvida durante o transporte, conte comigo!',
      usageCount: 15,
      tags: ['pos-venda', 'rastreio', 'entrega'],
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 5,
    }
  ];

  for (const qr of defaultReplies) {
    await saveQuickReply(qr);
  }

  // Gera um áudio sintetizado em WAV de demonstração (simulando áudio gravado na hora)
  try {
    const sampleWav = createSilentWavBlob(4); // 4 segundos de áudio de demonstração
    const sampleVoiceNote: VoiceNote = {
      id: 'vn-sample-1',
      title: 'Áudio Apresentação VIP (Na Hora)',
      shortcut: '/audio_ola',
      duration: 14,
      audioBlob: sampleWav,
      mimeType: 'audio/wav',
      isSimulatedLive: true,
      waveformData: [25, 40, 65, 80, 50, 30, 70, 90, 85, 60, 45, 75, 95, 80, 60, 40, 30, 55, 70, 40, 20],
      fileSize: 48200,
      createdAt: Date.now() - 3600000 * 2,
      notes: 'Áudio gravado como se fosse na hora para criar conexão humanizada com o cliente.'
    };
    await saveVoiceNote(sampleVoiceNote);
  } catch (e) {
    console.warn('Could not seed sample audio', e);
  }

  // Gera imagens de catálogo de demonstração usando Canvas para não depender de redes externas
  try {
    const canvas1 = document.createElement('canvas');
    canvas1.width = 600;
    canvas1.height = 400;
    const ctx1 = canvas1.getContext('2d');
    if (ctx1) {
      // Background gradient
      const grad = ctx1.createLinearGradient(0, 0, 600, 400);
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(1, '#059669');
      ctx1.fillStyle = grad;
      ctx1.fillRect(0, 0, 600, 400);

      // Card overlay
      ctx1.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx1.roundRect(40, 40, 520, 320, 16);
      ctx1.fill();

      // Text
      ctx1.fillStyle = '#FFFFFF';
      ctx1.font = 'bold 28px sans-serif';
      ctx1.fillText('TABELA DE PREÇOS & COMBOS', 70, 100);

      ctx1.fillStyle = '#34D399';
      ctx1.font = 'bold 20px sans-serif';
      ctx1.fillText('WhatsApp Business Pro - 2026', 70, 140);

      ctx1.fillStyle = '#E2E8F0';
      ctx1.font = '16px sans-serif';
      ctx1.fillText('• Plano Individual: R$ 97,00 (Acesso Vitalício)', 70, 190);
      ctx1.fillText('• Plano Equipe (até 5 atendentes): R$ 197,00', 70, 230);
      ctx1.fillText('• Bônus: Script de Vendas + Áudios Prontos', 70, 270);

      ctx1.fillStyle = '#10B981';
      ctx1.roundRect(70, 300, 220, 36, 8);
      ctx1.fill();
      ctx1.fillStyle = '#FFFFFF';
      ctx1.font = 'bold 14px sans-serif';
      ctx1.fillText('DESCONTO PIX: 10% OFF', 90, 324);

      const blob1 = await new Promise<Blob>((resolve) => canvas1.toBlob((b) => resolve(b || new Blob()), 'image/png'));
      const sampleImg1: VaultImage = {
        id: 'img-sample-1',
        title: 'Tabela de Preços & Planos 2026',
        shortcut: '/tabela',
        imageBlob: blob1,
        dataUrl: canvas1.toDataURL('image/png'),
        mimeType: 'image/png',
        category: 'catalogo',
        caption: 'Aqui está nossa tabela completa com os planos especiais e bônus inclusos! 🚀',
        tags: ['tabela', 'valores', 'planos'],
        fileSize: blob1.size,
        dimensions: { width: 600, height: 400 },
        createdAt: Date.now() - 3600000 * 5,
      };
      await saveVaultImage(sampleImg1);
    }

    // Segunda imagem: Selo de Garantia e Confiança
    const canvas2 = document.createElement('canvas');
    canvas2.width = 600;
    canvas2.height = 400;
    const ctx2 = canvas2.getContext('2d');
    if (ctx2) {
      const grad2 = ctx2.createLinearGradient(0, 0, 600, 400);
      grad2.addColorStop(0, '#1E293B');
      grad2.addColorStop(1, '#0284C7');
      ctx2.fillStyle = grad2;
      ctx2.fillRect(0, 0, 600, 400);

      ctx2.fillStyle = '#FFFFFF';
      ctx2.font = 'bold 32px sans-serif';
      ctx2.fillText('🛡️ GARANTIA BLINDADA', 80, 120);

      ctx2.fillStyle = '#38BDF8';
      ctx2.font = '22px sans-serif';
      ctx2.fillText('7 DIAS DE EXPERIÊNCIA TOTAL', 80, 170);

      ctx2.fillStyle = '#E2E8F0';
      ctx2.font = '16px sans-serif';
      ctx2.fillText('Se você não notar aumento nas conversões do seu WhatsApp,', 80, 230);
      ctx2.fillText('devolvemos 100% do seu dinheiro via Pix imediatamente.', 80, 260);

      const blob2 = await new Promise<Blob>((resolve) => canvas2.toBlob((b) => resolve(b || new Blob()), 'image/png'));
      const sampleImg2: VaultImage = {
        id: 'img-sample-2',
        title: 'Certificado de Garantia Blindada 7 Dias',
        shortcut: '/selo_garantia',
        imageBlob: blob2,
        dataUrl: canvas2.toDataURL('image/png'),
        mimeType: 'image/png',
        category: 'vendas',
        caption: 'Compre sem risco nenhum! Nossa garantia é de 7 dias incondicionais.',
        tags: ['garantia', 'confianca', 'seguranca'],
        fileSize: blob2.size,
        dimensions: { width: 600, height: 400 },
        createdAt: Date.now() - 3600000 * 4,
      };
      await saveVaultImage(sampleImg2);
    }
  } catch (e) {
    console.warn('Could not seed sample images', e);
  }

  // Seed Follow-Up Rules
  try {
    const existingRules = await getAllFollowUpRules();
    if (existingRules.length === 0) {
      const defaultRules: FollowUpRule[] = [
        {
          id: 'rule-24h-vendas',
          name: 'Recuperação 24h - Lead Sem Resposta',
          triggerDelayHours: 24,
          triggerDelayMinutes: 1440,
          messageTemplate: 'Olá, {nome}! Tudo bem? Vi que conversamos ontem sobre {produto}. Ficou com alguma dúvida sobre o funcionamento ou formas de pagamento? Consigo segurar o bônus especial para você fechar hoje!',
          activeDays: [1, 2, 3, 4, 5, 6],
          activeTimeStart: '08:30',
          activeTimeEnd: '20:00',
          productTarget: 'Todos os Produtos',
          isActive: true,
          createdAt: Date.now() - 86400000 * 2,
        },
        {
          id: 'rule-2h-pix',
          name: 'Cobrança Pix Pendente (2 Horas)',
          triggerDelayHours: 2,
          triggerDelayMinutes: 120,
          messageTemplate: '{saudacao} {nome}! Passando para avisar que o seu pedido do {produto} está reservado no estoque aguardando a confirmação do pagamento. Deseja que eu gere uma nova chave Pix com desconto facilitado?',
          activeDays: [0, 1, 2, 3, 4, 5, 6],
          activeTimeStart: '08:00',
          activeTimeEnd: '21:30',
          productTarget: 'Pedidos Pendentes',
          isActive: true,
          createdAt: Date.now() - 86400000,
        },
        {
          id: 'rule-48h-cupom',
          name: 'Reativação 48h - Cupom Especial 10% OFF',
          triggerDelayHours: 48,
          triggerDelayMinutes: 2880,
          messageTemplate: 'Opa {nome}! Passando rapidinho porque o gerente liberou um cupom com 10% OFF + Frete Grátis para você fechar o {produto} hoje. Posso ativar essa condição para você?',
          activeDays: [1, 2, 3, 4, 5],
          activeTimeStart: '09:00',
          activeTimeEnd: '18:30',
          productTarget: 'Leads Frios',
          isActive: true,
          createdAt: Date.now() - 86400000 * 3,
        }
      ];
      for (const r of defaultRules) {
        await saveFollowUpRule(r);
      }
    }
  } catch (e) {
    console.warn('Erro ao inicializar regras de follow-up', e);
  }

  // Seed Follow-Up Queue Items
  try {
    const existingQueue = await getAllFollowUpQueue();
    if (existingQueue.length === 0) {
      const defaultQueue: FollowUpQueueItem[] = [
        {
          id: 'queue-lead-1',
          ruleId: 'rule-24h-vendas',
          ruleName: 'Recuperação 24h - Lead Sem Resposta',
          leadName: 'Carlos Eduardo',
          leadPhone: '11988887777',
          lastCustomerMessageAt: Date.now() - 3600000 * 23.5,
          scheduledFor: Date.now() + 3600000 * 0.5,
          message: 'Olá, Carlos! Tudo bem? Vi que conversamos ontem sobre o kit promocional. Ficou com alguma dúvida sobre o funcionamento ou formas de pagamento? Consigo segurar o bônus especial para você fechar hoje!',
          status: 'pending',
          createdAt: Date.now() - 3600000 * 23.5,
        },
        {
          id: 'queue-lead-2',
          ruleId: 'rule-2h-pix',
          ruleName: 'Cobrança Pix Pendente (2 Horas)',
          leadName: 'Juliana Martins',
          leadPhone: '21977776666',
          lastCustomerMessageAt: Date.now() - 3600000 * 1.2,
          scheduledFor: Date.now() + 3600000 * 0.8,
          message: 'Boa tarde Juliana! Passando para avisar que o seu pedido está reservado no estoque aguardando a confirmação do pagamento. Deseja que eu gere uma nova chave Pix com desconto facilitado?',
          status: 'pending',
          createdAt: Date.now() - 3600000 * 1.2,
        },
        {
          id: 'queue-lead-3',
          ruleId: 'rule-48h-cupom',
          ruleName: 'Reativação 48h - Cupom Especial 10% OFF',
          leadName: 'Rafael Souza',
          leadPhone: '31999991111',
          lastCustomerMessageAt: Date.now() - 3600000 * 36,
          scheduledFor: Date.now() + 3600000 * 12,
          message: 'Opa Rafael! Passando rapidinho porque o gerente liberou um cupom com 10% OFF + Frete Grátis para você fechar o pedido hoje. Posso ativar essa condição para você?',
          status: 'pending',
          createdAt: Date.now() - 3600000 * 36,
        }
      ];
      for (const q of defaultQueue) {
        await saveFollowUpQueueItem(q);
      }
    }
  } catch (e) {
    console.warn('Erro ao inicializar fila de follow-up', e);
  }

  // Seed Chatbot Triggers
  try {
    const existingTriggers = await getAllChatbotTriggers();
    if (existingTriggers.length === 0) {
      const defaultTriggers: ChatbotTrigger[] = [
        {
          id: 'trig-saudacao',
          title: 'Saudação Inicial / Olá / Bom dia',
          keywords: ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'tudo bem'],
          matchType: 'contains',
          responseMessage: '{saudacao}, {nome}! Seja muito bem-vindo(a) à nossa loja! Sou o assistente virtual do Flipper Zap. Como posso te ajudar hoje?',
          isActive: true,
          priority: 2,
          hitsCount: 42,
          createdAt: Date.now() - 86400000 * 4,
        },
        {
          id: 'trig-preco',
          title: 'Interesse em Preço / Valor / Quanto Custa',
          keywords: ['preço', 'preco', 'valor', 'quanto custa', 'tabela', 'valores', 'quanto e', 'quanto é', 'orcamento', 'orçamento'],
          matchType: 'contains',
          responseMessage: '{saudacao} {nome}! Nosso {produto} está com condição especial exclusiva saindo por apenas {valor} com envio prioritário! 🎉 Posso te mandar as condições facilitadas no Pix e Cartão?',
          isActive: true,
          priority: 1,
          hitsCount: 68,
          createdAt: Date.now() - 86400000 * 5,
        },
        {
          id: 'trig-pix',
          title: 'Chave Pix / Como Pagar / Pagamento',
          keywords: ['pix', 'chave pix', 'pagar', 'pagamento', 'cartão', 'cartao', 'boleto', 'parcela', 'parcelamento'],
          matchType: 'contains',
          responseMessage: 'Trabalhamos com Pix com 5% de desconto à vista ou Cartão em até 12x! 💳 Chave Pix CNPJ: 12.345.678/0001-99. Assim que fizer, é só me mandar o comprovante aqui que já reservo o seu pedido!',
          isActive: true,
          priority: 1,
          hitsCount: 35,
          createdAt: Date.now() - 86400000 * 3,
        },
        {
          id: 'trig-catalogo',
          title: 'Catálogo de Produtos & Fotos',
          keywords: ['catalogo', 'catálogo', 'foto', 'fotos', 'modelos', 'ver produtos', 'opções', 'opcoes'],
          matchType: 'contains',
          responseMessage: 'Com certeza, {nome}! Segue abaixo nosso catálogo com os modelos mais vendidos e kits promocionais da semana. Dá uma olhada e me diz qual chamou mais sua atenção!',
          isActive: true,
          priority: 3,
          hitsCount: 19,
          createdAt: Date.now() - 86400000 * 2,
        },
        {
          id: 'trig-frete',
          title: 'Prazo de Entrega / Frete / Envio',
          keywords: ['prazo', 'entrega', 'chega quando', 'envio', 'frete', 'rastreio', 'rastreamento'],
          matchType: 'contains',
          responseMessage: 'Despachamos todos os pedidos em até 24 horas úteis com código de rastreamento enviado direto no seu WhatsApp! Qual o seu CEP ou cidade para eu simular a entrega mais rápida?',
          isActive: true,
          priority: 2,
          hitsCount: 26,
          createdAt: Date.now() - 86400000 * 2,
        }
      ];
      for (const t of defaultTriggers) {
        await saveChatbotTrigger(t);
      }
    }
  } catch (e) {
    console.warn('Erro ao inicializar gatilhos do chatbot', e);
  }
}

// Cria um Blob de áudio WAV válido com tom suave para testes
function createSilentWavBlob(durationSeconds: number): Blob {
  const sampleRate = 44100;
  const numChannels = 1;
  const totalSamples = sampleRate * durationSeconds;
  const blockAlign = numChannels * 2;
  const byteRate = sampleRate * blockAlign;
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  // data chunk identifier
  writeString(view, 36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  // Gera uma onda senoidal suave (tom de 440Hz com envelope)
  const freq = 440;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Amplitude modulation to sound pleasant
    const env = Math.sin((Math.PI * i) / totalSamples);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.15 * env;
    const intSample = Math.max(-32768, Math.min(32767, sample * 32767));
    view.setInt16(44 + i * 2, intSample, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
