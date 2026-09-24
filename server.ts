import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface BridgeCommand {
  id: string;
  action: 'send_text' | 'send_audio' | 'send_image';
  content: string;
  title?: string;
  autoSend: boolean;
  timestamp: number;
}

interface ChatbotServerTrigger {
  id: string;
  title: string;
  keywords: string[];
  matchType: 'contains' | 'exact' | 'starts_with';
  responseMessage: string;
  isActive: boolean;
}

interface BridgeState {
  lastPing: number;
  activeChat: string;
  activePhone: string;
  queue: BridgeCommand[];
  chatbotMasterEnabled: boolean;
  chatbotTriggers: ChatbotServerTrigger[];
  chatbotSettings: {
    delaySeconds: number;
    fallbackEnabled: boolean;
    defaultFallbackMessage: string;
  };
  lastSent?: {
    commandId: string;
    targetChat: string;
    title?: string;
    timestamp: number;
    success: boolean;
  };
  syncedData: {
    quickReplies: any[];
    voiceNotes: any[];
    vaultImages: any[];
    updatedAt: number;
  };
}

const defaultServerQuickReplies = [
  {
    id: 'qr-1',
    title: 'Boas-Vindas Pessoal & Acolhedora',
    shortcut: '/ola',
    category: 'boas-vindas',
    content: 'Olá, {nome}! Tudo bem por aí? 👋\n\nSou o assistente aqui da nossa equipe. Vi que você entrou em contato com interesse em {produto}.\n\nComo posso te ajudar da melhor forma hoje?',
    usageCount: 24,
  },
  {
    id: 'qr-2',
    title: 'Chave Pix com Instruções Claras',
    shortcut: '/pix',
    category: 'pagamento',
    content: 'Perfeito, {nome}! Aqui estão os dados para pagamento via *PIX*:\n\n🔑 *Chave PIX (CNPJ/Chave):* financeiro@suaempresa.com.br\n💼 *Titular:* Sua Empresa Soluções Ltda\n💰 *Valor:* {valor}\n\nAssim que fizer a transferência, me mande o comprovante aqui para liberarmos imediatamente o seu pedido! 🚀',
    usageCount: 42,
  },
  {
    id: 'qr-3',
    title: 'Apresentação de Preço e Benefícios',
    shortcut: '/preco',
    category: 'vendas',
    content: 'Ótima escolha, {nome}! O {produto} está em condição especial hoje:\n\n✅ Acesso Imediato e Vitalício\n✅ Suporte VIP no WhatsApp\n✅ Garantia incondicional de 7 dias\n\n💳 Em até 12x no cartão ou com *10% de desconto no PIX* por apenas *{valor}*.\n\nQuer que eu já reserve a sua vaga com essa condição?',
    usageCount: 31,
  },
  {
    id: 'qr-4',
    title: 'Quebra de Objeção: Segurança & Garantia',
    shortcut: '/garantia',
    category: 'vendas',
    content: 'Compreendo perfeitamente sua preocupação, {nome}! Fique 100% tranquilo(a).\n\n🛡️ Nós oferecemos *Garantia Blindada de 7 Dias*. Se por qualquer motivo não for exatamente o que você esperava, basta me mandar um "oi" aqui que devolvemos todo o seu investimento na hora, sem letras miúdas.\n\nO risco é todo nosso!',
    usageCount: 18,
  },
  {
    id: 'qr-5',
    title: 'Envio de Rastreio & Pós-Venda',
    shortcut: '/rastreio',
    category: 'pos-venda',
    content: 'Boas notícias, {nome}! 📦\n\nSeu pedido foi faturado e despachado hoje com muito carinho. O código de rastreamento é:\n\n🔎 *Código:* BR987654321BR\n🚚 *Previsão de entrega:* 3 a 5 dias úteis.\n\nQualquer dúvida durante o transporte, conte comigo!',
    usageCount: 15,
  }
];

const bridgeState: BridgeState = {
  lastPing: 0,
  activeChat: '',
  activePhone: '',
  queue: [],
  chatbotMasterEnabled: true,
  chatbotTriggers: [],
  chatbotSettings: {
    delaySeconds: 2,
    fallbackEnabled: true,
    defaultFallbackMessage: 'Recebi sua mensagem! Já estou consultando as informações do seu atendimento e te respondo em um instante.',
  },
  syncedData: {
    quickReplies: defaultServerQuickReplies,
    voiceNotes: [],
    vaultImages: [],
    updatedAt: Date.now(),
  },
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS middleware for web.whatsapp.com access
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Bridge Status check
  app.get('/api/bridge/status', (req, res) => {
    const isConnected = Date.now() - bridgeState.lastPing < 10000;
    res.json({
      connected: isConnected,
      lastPing: bridgeState.lastPing,
      activeChat: isConnected ? bridgeState.activeChat : '',
      activePhone: isConnected ? bridgeState.activePhone : '',
      pendingCommands: bridgeState.queue.length,
      chatbotMasterEnabled: bridgeState.chatbotMasterEnabled,
      lastSent: bridgeState.lastSent,
    });
  });

  // Toggle Master Chatbot
  app.post('/api/bridge/chatbot/toggle', (req, res) => {
    const { enabled } = req.body || {};
    bridgeState.chatbotMasterEnabled = Boolean(enabled);
    res.json({ ok: true, chatbotMasterEnabled: bridgeState.chatbotMasterEnabled });
  });

  // Sync Chatbot Triggers and Settings from Client
  app.post('/api/bridge/chatbot/sync', (req, res) => {
    const { triggers, settings } = req.body || {};
    if (Array.isArray(triggers)) {
      bridgeState.chatbotTriggers = triggers;
    }
    if (settings) {
      bridgeState.chatbotSettings = { ...bridgeState.chatbotSettings, ...settings };
      if (typeof settings.isMasterEnabled === 'boolean') {
        bridgeState.chatbotMasterEnabled = settings.isMasterEnabled;
      }
    }
    res.json({ ok: true, triggersCount: (bridgeState.chatbotTriggers || []).length, chatbotMasterEnabled: bridgeState.chatbotMasterEnabled });
  });

  // Incoming message from WhatsApp Web (or simulator) to trigger auto-replies
  app.post('/api/bridge/incoming', (req, res) => {
    const { text, leadName, leadPhone } = req.body || {};
    if (!text) {
      res.json({ handled: false, reason: 'empty_text' });
      return;
    }

    if (!bridgeState.chatbotMasterEnabled) {
      res.json({ handled: false, reason: 'chatbot_disabled' });
      return;
    }

    const cleanText = String(text).toLowerCase().trim();
    let matchedTrigger: ChatbotServerTrigger | null = null;

    const activeTriggers = (bridgeState.chatbotTriggers || []).filter(t => t.isActive);
    for (const trig of activeTriggers) {
      for (const kw of trig.keywords) {
        const cleanKw = kw.toLowerCase().trim();
        if (!cleanKw) continue;
        if (trig.matchType === 'exact' && cleanText === cleanKw) {
          matchedTrigger = trig;
          break;
        } else if (trig.matchType === 'starts_with' && cleanText.startsWith(cleanKw)) {
          matchedTrigger = trig;
          break;
        } else if (cleanText.includes(cleanKw)) {
          matchedTrigger = trig;
          break;
        }
      }
      if (matchedTrigger) break;
    }

    let replyTemplate = '';
    if (matchedTrigger) {
      replyTemplate = matchedTrigger.responseMessage;
    } else if (bridgeState.chatbotSettings?.fallbackEnabled && bridgeState.chatbotSettings?.defaultFallbackMessage) {
      replyTemplate = bridgeState.chatbotSettings.defaultFallbackMessage;
    }

    if (replyTemplate) {
      const now = new Date();
      const hour = now.getHours();
      const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
      const parsedText = replyTemplate
        .replace(/\{nome\}/gi, leadName || 'Cliente')
        .replace(/\{saudacao\}/gi, saudacao)
        .replace(/\{produto\}/gi, 'nosso produto')
        .replace(/\{valor\}/gi, 'R$ 97,00');

      const command: BridgeCommand = {
        id: 'cmd_bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        action: 'send_text',
        content: parsedText,
        title: matchedTrigger ? `Bot: ${matchedTrigger.title}` : 'Bot: Resposta Automática',
        autoSend: true,
        timestamp: Date.now(),
      };

      bridgeState.queue.push(command);
      res.json({ handled: true, triggerId: matchedTrigger?.id, replyText: parsedText });
      return;
    }

    res.json({ handled: false, reason: 'no_match' });
  });

  // Ping from WhatsApp Web script (heartbeat and polling pending commands)
  app.post('/api/bridge/ping', (req, res) => {
    const { activeChat, activePhone } = req.body || {};
    bridgeState.lastPing = Date.now();
    if (activeChat !== undefined) bridgeState.activeChat = activeChat || '';
    if (activePhone !== undefined) bridgeState.activePhone = activePhone || '';

    // Deliver queued commands and drain queue
    const commandsToDeliver = [...bridgeState.queue];
    bridgeState.queue = [];

    res.json({
      ok: true,
      commands: commandsToDeliver,
      serverTime: Date.now(),
    });
  });

  // ZapBot enqueues a message to send directly into active WhatsApp Web chat
  app.post('/api/bridge/send', (req, res) => {
    const { action, content, title, autoSend = true } = req.body || {};
    if (!content) {
      res.status(400).json({ error: 'Conteúdo obrigatório' });
      return;
    }

    const command: BridgeCommand = {
      id: 'cmd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      action: action || 'send_text',
      content,
      title: title || 'Mensagem',
      autoSend: Boolean(autoSend),
      timestamp: Date.now(),
    };

    bridgeState.queue.push(command);
    res.json({
      success: true,
      commandId: command.id,
      message: 'Comando enviado para o WhatsApp Web',
    });
  });

  // WhatsApp Web confirms execution of a command
  app.post('/api/bridge/confirm', (req, res) => {
    const { commandId, targetChat, title, success = true } = req.body || {};
    bridgeState.lastSent = {
      commandId,
      targetChat: targetChat || bridgeState.activeChat || 'Conversa atual',
      title,
      timestamp: Date.now(),
      success,
    };
    res.json({ ok: true });
  });

  // Sync ZapBot items (replies, audios, images) so WhatsApp Web sidebar has them
  app.post('/api/bridge/sync-data', (req, res) => {
    const { quickReplies, voiceNotes, vaultImages } = req.body || {};
    if (quickReplies) bridgeState.syncedData.quickReplies = quickReplies;
    if (voiceNotes) bridgeState.syncedData.voiceNotes = voiceNotes;
    if (vaultImages) bridgeState.syncedData.vaultImages = vaultImages;
    bridgeState.syncedData.updatedAt = Date.now();
    res.json({ ok: true, updatedAt: bridgeState.syncedData.updatedAt });
  });

  // WhatsApp Web gets current synchronized items
  app.get('/api/bridge/sync-data', (req, res) => {
    res.json(bridgeState.syncedData);
  });

  // Serve executable bridge script for web.whatsapp.com
  app.get('/api/bridge/script.js', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const serverUrl = `${protocol}://${host}`;
    const embeddedRepliesJson = JSON.stringify(bridgeState.syncedData.quickReplies || defaultServerQuickReplies);

    res.type('application/javascript');
    res.send(`(function() {
  if (window.__ZAPBOT_BRIDGE_LOADED__) {
    console.log('[ZapBot Web] Ponte já está ativa.');
    if (window.__ZAPBOT_NOTIFY__) {
      window.__ZAPBOT_NOTIFY__('⚡ Flipper Zap já está conectado nesta aba do WhatsApp Web!');
    }
    return;
  }
  window.__ZAPBOT_BRIDGE_LOADED__ = true;

  var SERVER_URL = '${serverUrl}';
  var EMBEDDED_ITEMS = ${embeddedRepliesJson};
  var lastActiveChat = '';
  var isPolling = false;
  var cachedItems = EMBEDDED_ITEMS;

  try {
    var stored = localStorage.getItem('flipper_zap_replies');
    if (stored) {
      var parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedItems = parsed;
      }
    }
  } catch(e) {}

  console.log('[ZapBot Web] Iniciando conexão paralela com:', SERVER_URL);

  function showToast(text, color) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;background:' + (color || '#00a884') + ';color:#ffffff;padding:10px 18px;border-radius:10px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;z-index:9999999;box-shadow:0 6px 20px rgba(0,0,0,0.4);display:flex;align-items:center;gap:8px;transition:all 0.3s ease;pointer-events:none;';
    toast.innerHTML = '⚡ ' + text;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3500);
  }
  window.__ZAPBOT_NOTIFY__ = showToast;

  function getActiveChat() {
    var header = document.querySelector('#main header');
    if (!header) return { name: '', phone: '' };

    var titleEl = header.querySelector('span[dir="auto"][title]') ||
                  header.querySelector('div[role="button"] span[dir="auto"]') ||
                  header.querySelector('span[title]') ||
                  header.querySelector('span[dir="auto"]');

    var name = titleEl ? (titleEl.getAttribute('title') || titleEl.innerText || '').trim() : '';
    return { name: name || 'Conversa Ativa', phone: '' };
  }

  function getChatInput() {
    return document.querySelector('#main footer div[contenteditable="true"]') ||
           document.querySelector('#main div[contenteditable="true"][data-tab="10"]') ||
           document.querySelector('#main div[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"][data-tab="10"]');
  }

  function sendTextToChat(text, autoSend, commandId) {
    var chatInfo = getActiveChat();
    var chatInput = getChatInput();

    if (!chatInput) {
      showToast('Abra uma conversa no WhatsApp Web antes de enviar!', '#ea3943');
      return false;
    }

    var firstName = chatInfo.name.split(' ')[0] || 'Cliente';
    if (/^[+0-9\\s()-]+$/.test(firstName)) {
      firstName = 'Cliente';
    }

    var hour = new Date().getHours();
    var saudacao = hour < 12 ? 'Bom dia' : (hour < 18 ? 'Boa tarde' : 'Boa noite');

    var processedText = text
      .replace(/{nome}/g, firstName)
      .replace(/{saudacao}/g, saudacao)
      .replace(/{produto}/g, 'nosso produto')
      .replace(/{valor}/g, 'R$ 97,00');

    chatInput.focus();
    document.execCommand('insertText', false, processedText);
    chatInput.dispatchEvent(new InputEvent('input', { bubbles: true }));

    if (autoSend) {
      setTimeout(function() {
        var sendBtn = document.querySelector('#main footer button[aria-label="Enviar"]') ||
                       document.querySelector('#main span[data-icon="send"]') ||
                       document.querySelector('#main span[data-icon="wds-send"]') ||
                       document.querySelector('span[data-icon="send"]');

        if (sendBtn) {
          (sendBtn.closest('button') || sendBtn).click();
          showToast('Mensagem enviada para ' + chatInfo.name + '!', '#00a884');
        } else {
          var enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
          chatInput.dispatchEvent(enterEvent);
          showToast('Mensagem inserida para ' + chatInfo.name + '!', '#00a884');
        }

        if (commandId) {
          fetch(SERVER_URL + '/api/bridge/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              commandId: commandId,
              targetChat: chatInfo.name,
              success: true
            })
          }).catch(function(err){ console.error(err); });
        }
      }, 250);
    } else {
      showToast('Texto inserido na conversa com ' + chatInfo.name + '!', '#00a884');
    }

    return true;
  }

  function createDockedWidget() {
    if (document.getElementById('zapbot-docked-panel')) return;

    var panel = document.createElement('div');
    panel.id = 'zapbot-docked-panel';
    panel.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;font-family:Segoe UI,Helvetica,Arial,sans-serif;';

    var fab = document.createElement('button');
    fab.id = 'zapbot-fab';
    fab.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 16px;background:#00a884;color:#ffffff;border:none;border-radius:24px;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,0.4);transition:all 0.2s;';
    fab.innerHTML = '<span style="font-size:16px;">⚡</span> <span>ZapBot Conectado</span> <span id="zapbot-chat-tag" style="background:rgba(0,0,0,0.25);padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Detectando...</span>';

    var menu = document.createElement('div');
    menu.id = 'zapbot-menu';
    menu.style.cssText = 'display:none;position:absolute;bottom:54px;right:0;width:340px;max-height:480px;background:#111b21;color:#e9edef;border-radius:16px;border:1px solid #2a3942;box-shadow:0 12px 36px rgba(0,0,0,0.6);overflow:hidden;flex-direction:column;';

    menu.innerHTML = [
      '<div style="padding:12px 16px;background:#202c33;border-bottom:1px solid #2a3942;display:flex;align-items:center;justify-content:space-between;">',
      '  <div>',
      '    <strong style="color:#00a884;font-size:14px;display:flex;align-items:center;gap:6px;">⚡ ZapBot Business PC</strong>',
      '    <div id="zapbot-menu-chat" style="font-size:11px;color:#8696a0;margin-top:2px;">Detectando conversa...</div>',
      '  </div>',
      '  <button id="zapbot-close-menu" style="background:transparent;border:none;color:#8696a0;cursor:pointer;font-size:16px;">✕</button>',
      '</div>',
      '<div style="padding:8px 12px;background:#182229;border-bottom:1px solid #222e35;display:flex;gap:6px;">',
      '  <input id="zapbot-search" placeholder="Pesquisar atalho..." style="width:100%;padding:6px 10px;background:#111b21;border:1px solid #2a3942;border-radius:8px;color:#e9edef;font-size:12px;outline:none;" />',
      '</div>',
      '<div id="zapbot-items-list" style="flex:1;overflow-y:auto;max-height:340px;padding:8px;">',
      '  <div style="padding:20px;text-align:center;color:#8696a0;font-size:12px;">Sincronizando com o ZapBot Web...</div>',
      '</div>',
      '<div style="padding:8px 12px;background:#202c33;border-top:1px solid #2a3942;font-size:11px;color:#8696a0;display:flex;justify-content:space-between;align-items:center;">',
      '  <span>Pressione ⚡ para enviar direto</span>',
      '  <a href="' + SERVER_URL + '" target="_blank" style="color:#00a884;text-decoration:none;font-weight:600;">Abrir Painel ↗</a>',
      '</div>'
    ].join('');

    panel.appendChild(fab);
    panel.appendChild(menu);
    document.body.appendChild(panel);

    fab.onclick = function() {
      var isVisible = menu.style.display === 'flex';
      menu.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) updateMenuList('');
    };

    var closeBtn = menu.querySelector('#zapbot-close-menu');
    if (closeBtn) closeBtn.onclick = function() { menu.style.display = 'none'; };

    var searchInput = menu.querySelector('#zapbot-search');
    if (searchInput) searchInput.oninput = function(e) { updateMenuList(e.target.value); };
  }

  function loadLibraryData() {
    fetch(SERVER_URL + '/api/bridge/sync-data')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.quickReplies && data.quickReplies.length > 0) {
          cachedItems = data.quickReplies;
          try {
            localStorage.setItem('flipper_zap_replies', JSON.stringify(cachedItems));
          } catch(e) {}
        }
        updateMenuList('');
      })
      .catch(function(err){
        if (cachedItems.length === 0) cachedItems = EMBEDDED_ITEMS;
        updateMenuList('');
      });
  }

  function updateMenuList(query) {
    var list = document.getElementById('zapbot-items-list');
    if (!list) return;

    var q = (query || '').toLowerCase();
    var filtered = cachedItems.filter(function(item) {
      return (item.shortcut || '').toLowerCase().includes(q) ||
             (item.title || '').toLowerCase().includes(q) ||
             (item.content || '').toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:#8696a0;font-size:12px;">Nenhum item encontrado.</div>';
      return;
    }

    list.innerHTML = '';
    filtered.forEach(function(item) {
      var card = document.createElement('div');
      card.style.cssText = 'padding:8px 10px;margin-bottom:6px;background:#182229;border:1px solid #222e35;border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;';

      var info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';
      info.innerHTML = '<div style="display:flex;align-items:center;gap:6px;"><span style="color:#00a884;font-family:monospace;font-size:11px;font-weight:700;">' + item.shortcut + '</span><strong style="color:#e9edef;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.title + '</strong></div><div style="color:#8696a0;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">' + (item.content || '').replace(/\\n/g, ' ') + '</div>';

      var btn = document.createElement('button');
      btn.style.cssText = 'padding:6px 12px;background:#00a884;color:#ffffff;border:none;border-radius:8px;font-weight:700;font-size:11px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;';
      btn.innerHTML = '⚡ Enviar';
      btn.onclick = function() {
        sendTextToChat(item.content, true);
      };

      card.appendChild(info);
      card.appendChild(btn);
      list.appendChild(card);
    });
  }

  function pollServer() {
    if (isPolling) return;
    isPolling = true;

    var chat = getActiveChat();
    lastActiveChat = chat.name;

    var tag = document.getElementById('zapbot-chat-tag');
    if (tag) tag.innerText = chat.name || 'Sem chat';

    var menuChat = document.getElementById('zapbot-menu-chat');
    if (menuChat) menuChat.innerText = chat.name ? ('Chat ativo: ' + chat.name) : 'Nenhum chat aberto';

    fetch(SERVER_URL + '/api/bridge/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activeChat: chat.name,
        activePhone: chat.phone
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.commands && data.commands.length > 0) {
        data.commands.forEach(function(cmd) {
          console.log('[ZapBot Web] Comando recebido do painel:', cmd);
          if (cmd.action === 'send_text') {
            sendTextToChat(cmd.content, cmd.autoSend, cmd.id);
          }
        });
      }
    })
    .catch(function(err) {})
    .finally(function() {
      isPolling = false;
      setTimeout(pollServer, 1500);
    });
  }

  createDockedWidget();
  loadLibraryData();
  pollServer();

  var lastObservedMsgText = '';
  function setupIncomingMessageObserver() {
    var mainEl = document.querySelector('#main');
    if (!mainEl) {
      setTimeout(setupIncomingMessageObserver, 2000);
      return;
    }
    try {
      var observer = new MutationObserver(function() {
        var incomingMsgs = document.querySelectorAll('#main .message-in');
        if (incomingMsgs.length > 0) {
          var lastMsg = incomingMsgs[incomingMsgs.length - 1];
          var textEl = lastMsg.querySelector('.selectable-text') || lastMsg.querySelector('span[dir="ltr"]') || lastMsg;
          var text = (textEl.innerText || '').trim();
          if (text && text !== lastObservedMsgText) {
            lastObservedMsgText = text;
            var chat = getActiveChat();
            fetch(SERVER_URL + '/api/bridge/incoming', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: text,
                leadName: chat.name,
                leadPhone: chat.phone
              })
            }).catch(function() {});
          }
        }
      });
      observer.observe(mainEl, { childList: true, subtree: true });
    } catch (e) {}
  }
  setupIncomingMessageObserver();

  showToast('Flipper Zap conectado em paralelo com seu WhatsApp Web!', '#00a884');
})();`);
  });

  // Vite middleware for development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
