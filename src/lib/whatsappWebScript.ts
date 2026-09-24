/**
 * WhatsApp Web Parallel Bridge & Desktop Script
 * Permite que o Flipper Zap rode em paralelo com o WhatsApp Web no Computador (PC),
 * acesse a conversa que está aberta na tela e dispare mensagens e modelos com 1 clique.
 */

import JSZip from 'jszip';
import { QuickReply, VoiceNote, VaultImage } from '../types';

export function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'https://web.whatsapp.com';
}

const DEFAULT_FALLBACK_REPLIES = [
  {
    id: 'qr-1',
    title: 'Boas-Vindas Pessoal & Acolhedora',
    shortcut: '/ola',
    category: 'boas-vindas',
    content: 'Olá, {nome}! Tudo bem por aí? 👋\n\nSou o assistente aqui da nossa equipe. Vi que você entrou em contato com interesse em {produto}.\n\nComo posso te ajudar da melhor forma hoje?',
    tags: ['atendimento', 'inicio']
  },
  {
    id: 'qr-2',
    title: 'Chave Pix com Instruções Claras',
    shortcut: '/pix',
    category: 'pagamento',
    content: 'Perfeito, {nome}! Aqui estão os dados para pagamento via *PIX*:\n\n🔑 *Chave PIX (CNPJ/Chave):* financeiro@suaempresa.com.br\n💼 *Titular:* Sua Empresa Soluções Ltda\n💰 *Valor:* {valor}\n\nAssim que fizer a transferência, me mande o comprovante aqui para liberarmos imediatamente o seu pedido! 🚀',
    tags: ['pix', 'fechamento', 'financeiro']
  },
  {
    id: 'qr-3',
    title: 'Apresentação de Preço e Benefícios',
    shortcut: '/preco',
    category: 'vendas',
    content: 'Ótima escolha, {nome}! O {produto} está em condição especial hoje:\n\n✅ Acesso Imediato e Vitalício\n✅ Suporte VIP no WhatsApp\n✅ Garantia incondicional de 7 dias\n\n💳 Em até 12x no cartão ou com *10% de desconto no PIX* por apenas *{valor}*.\n\nQuer que eu já reserve a sua vaga com essa condição?',
    tags: ['vendas', 'oferta', 'preco']
  },
  {
    id: 'qr-4',
    title: 'Quebra de Objeção: Segurança & Garantia',
    shortcut: '/garantia',
    category: 'vendas',
    content: 'Compreendo perfeitamente sua preocupação, {nome}! Fique 100% tranquilo(a).\n\n🛡️ Nós oferecemos *Garantia Blindada de 7 Dias*. Se por qualquer motivo não for exatamente o que você esperava, basta me mandar um "oi" aqui que devolvemos todo o seu investimento na hora, sem letras miúdas.\n\nO risco é todo nosso!',
    tags: ['garantia', 'confianca']
  },
  {
    id: 'qr-5',
    title: 'Envio de Rastreio & Pós-Venda',
    shortcut: '/rastreio',
    category: 'pos-venda',
    content: 'Boas notícias, {nome}! 📦\n\nSeu pedido foi faturado e despachado hoje com muito carinho. O código de rastreamento é:\n\n🔎 *Código:* BR987654321BR\n🚚 *Previsão de entrega:* 3 a 5 dias úteis.\n\nQualquer dúvida durante o transporte, conte comigo!',
    tags: ['pos-venda', 'rastreio', 'entrega']
  }
];

/**
 * Gera o script completo para ser executado no WhatsApp Web via Extensão Chrome ou Console F12.
 * Os modelos salvos são incorporados diretamente no script para estarem disponíveis imediatamente!
 */
export function generateWhatsAppWebParallelScript(
  appOrigin: string,
  quickReplies: QuickReply[] = [],
  voiceNotes: VoiceNote[] = [],
  vaultImages: VaultImage[] = []
): string {
  const itemsToEmbed = quickReplies && quickReplies.length > 0
    ? quickReplies.map(q => ({
        id: q.id,
        title: q.title,
        shortcut: q.shortcut,
        category: q.category || 'geral',
        content: q.content,
        tags: q.tags || []
      }))
    : DEFAULT_FALLBACK_REPLIES;

  const audiosToEmbed = (voiceNotes || []).map(v => ({
    id: v.id,
    title: v.title,
    shortcut: v.shortcut,
    duration: v.duration
  }));

  const imagesToEmbed = (vaultImages || []).map(img => ({
    id: img.id,
    title: img.title,
    shortcut: img.shortcut,
    caption: img.caption || ''
  }));

  const jsonReplies = JSON.stringify(itemsToEmbed);
  const jsonAudios = JSON.stringify(audiosToEmbed);
  const jsonImages = JSON.stringify(imagesToEmbed);

  return `(function() {
  if (window.__FLIPPER_ZAP_LOADED__) {
    console.log('[Flipper Zap] Conector já ativo nesta aba.');
    if (window.__FLIPPER_ZAP_NOTIFY__) {
      window.__FLIPPER_ZAP_NOTIFY__('⚡ Flipper Zap já está conectado nesta aba do WhatsApp Web!');
    }
    return;
  }
  window.__FLIPPER_ZAP_LOADED__ = true;

  var SERVER_URL = '${appOrigin}';
  var EMBEDDED_REPLIES = ${jsonReplies};
  var EMBEDDED_AUDIOS = ${jsonAudios};
  var EMBEDDED_IMAGES = ${jsonImages};

  var lastActiveChat = '';
  var isPolling = false;
  var currentTab = 'replies'; // 'replies' | 'audios' | 'images'
  var activeCategory = 'todas';

  // Carrega modelos do cache local do WhatsApp Web ou do pacote inicial
  var cachedItems = EMBEDDED_REPLIES;
  try {
    var stored = localStorage.getItem('flipper_zap_replies');
    if (stored) {
      var parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedItems = parsed;
      }
    }
  } catch(e) {}

  if (!cachedItems || cachedItems.length === 0) {
    cachedItems = EMBEDDED_REPLIES;
  }

  var cachedAudios = EMBEDDED_AUDIOS;
  var cachedImages = EMBEDDED_IMAGES;

  console.log('[Flipper Zap] Carregado com', cachedItems.length, 'modelos de mensagens.');

  // Cria notificação visual discreta no WhatsApp Web
  function showToast(text, color) {
    var existing = document.getElementById('flipper-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'flipper-toast';
    toast.style.cssText = 'position:fixed;top:24px;right:24px;background:' + (color || '#00a884') + ';color:#ffffff;padding:12px 20px;border-radius:12px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;z-index:9999999;box-shadow:0 8px 24px rgba(0,0,0,0.5);display:flex;align-items:center;gap:10px;transition:all 0.3s ease;pointer-events:none;';
    toast.innerHTML = '<span style="font-size:16px;">⚡</span> <span>' + text + '</span>';
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3500);
  }
  window.__FLIPPER_ZAP_NOTIFY__ = showToast;

  // Detecta a conversa atualmente aberta na tela do WhatsApp Web
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

  // Encontra a caixa de texto da conversa aberta no WhatsApp Web
  function getChatInput() {
    return document.querySelector('#main footer div[contenteditable="true"]') ||
           document.querySelector('#main div[contenteditable="true"][role="textbox"]') ||
           document.querySelector('#main div[contenteditable="true"][data-tab="10"]') ||
           document.querySelector('#main div[contenteditable="true"]') ||
           document.querySelector('footer div[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"][role="textbox"]');
  }

  // Dispara ou insere o envio no WhatsApp Web
  function sendTextToChat(text, autoSend, commandId) {
    var chatInfo = getActiveChat();
    var chatInput = getChatInput();

    if (!chatInput) {
      showToast('Abra uma conversa no WhatsApp Web antes de enviar!', '#ea3943');
      return false;
    }

    // Substitui variáveis dinâmicas {nome}, {saudacao}, etc.
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

    // Limpa caixa antes de inserir
    try {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
    } catch(e) {}

    var ok = false;
    try {
      ok = document.execCommand('insertText', false, processedText);
    } catch(e) {}

    if (!ok || chatInput.innerText.trim() === '') {
      chatInput.innerHTML = '';
      var span = document.createElement('span');
      span.className = 'selectable-text copyable-text';
      span.innerText = processedText;
      chatInput.appendChild(span);
    }

    chatInput.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: processedText,
      inputType: 'insertText'
    }));
    chatInput.dispatchEvent(new Event('change', { bubbles: true }));

    if (autoSend) {
      setTimeout(function() {
        var sendBtn = document.querySelector('#main footer button[aria-label="Enviar"]') ||
                      document.querySelector('footer button[aria-label="Enviar"]') ||
                      document.querySelector('#main footer button[data-tab="11"]') ||
                      document.querySelector('footer button[data-tab="11"]') ||
                      document.querySelector('#main footer span[data-icon="send"]') ||
                      document.querySelector('#main footer span[data-icon="wds-send"]') ||
                      document.querySelector('footer button:has(span[data-icon="send"])') ||
                      document.querySelector('footer button:has(span[data-icon="wds-send"])') ||
                      document.querySelector('footer span[data-icon="send"]') ||
                      document.querySelector('footer span[data-icon="wds-send"]');

        if (sendBtn) {
          (sendBtn.closest('button') || sendBtn).click();
          showToast('✅ Enviado para ' + chatInfo.name + '!', '#00a884');
        } else {
          var enterDown = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          chatInput.dispatchEvent(enterDown);
          showToast('✅ Enviado para ' + chatInfo.name + '!', '#00a884');
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
          }).catch(function(){});
        }
      }, 200);
    } else {
      showToast('Texto inserido na conversa com ' + chatInfo.name + '!', '#00a884');
    }

    return true;
  }

  // Cria a barra lateral e o botão flutuante no WhatsApp Web
  function createDockedWidget() {
    if (document.getElementById('flipper-zap-panel')) return;

    var panel = document.createElement('div');
    panel.id = 'flipper-zap-panel';
    panel.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;font-family:Segoe UI,Helvetica,Arial,sans-serif;';

    // Botão flutuante minimalista
    var fab = document.createElement('button');
    fab.id = 'flipper-zap-fab';
    fab.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 16px;background:#00a884;color:#ffffff;border:none;border-radius:24px;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 4px 18px rgba(0,0,0,0.45);transition:all 0.2s;';
    fab.innerHTML = '<span style="font-size:16px;">⚡</span> <span>Flipper Zap</span> <span id="flipper-chat-tag" style="background:rgba(0,0,0,0.3);padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Detectando...</span>';

    // Painel expansível de modelos
    var menu = document.createElement('div');
    menu.id = 'flipper-zap-menu';
    menu.style.cssText = 'display:none;position:absolute;bottom:54px;right:0;width:370px;max-height:520px;background:#111b21;color:#e9edef;border-radius:16px;border:1px solid #2a3942;box-shadow:0 12px 36px rgba(0,0,0,0.65);overflow:hidden;flex-direction:column;';

    menu.innerHTML = [
      '<div style="padding:12px 16px;background:#202c33;border-bottom:1px solid #2a3942;display:flex;align-items:center;justify-content:space-between;">',
      '  <div>',
      '    <strong style="color:#00a884;font-size:14px;display:flex;align-items:center;gap:6px;">⚡ Flipper Zap - Modelos Salvos</strong>',
      '    <div id="flipper-menu-chat" style="font-size:11px;color:#8696a0;margin-top:2px;">Detectando conversa...</div>',
      '  </div>',
      '  <div style="display:flex;align-items:center;gap:8px;">',
      '    <button id="flipper-btn-sync" title="Sincronizar novos modelos do painel" style="background:#2a3942;border:none;color:#e9edef;cursor:pointer;font-size:11px;padding:4px 8px;border-radius:6px;font-weight:600;">🔄 Sincronizar</button>',
      '    <button id="flipper-close-menu" style="background:transparent;border:none;color:#8696a0;cursor:pointer;font-size:16px;">✕</button>',
      '  </div>',
      '</div>',
      '<div style="padding:8px 12px;background:#182229;border-bottom:1px solid #222e35;display:flex;gap:6px;">',
      '  <input id="flipper-search" placeholder="Buscar por atalho (/pix) ou texto..." style="width:100%;padding:7px 12px;background:#111b21;border:1px solid #2a3942;border-radius:8px;color:#e9edef;font-size:12px;outline:none;" />',
      '</div>',
      '<div id="flipper-items-list" style="flex:1;overflow-y:auto;max-height:360px;padding:10px;">',
      '</div>',
      '<div style="padding:8px 14px;background:#202c33;border-top:1px solid #2a3942;font-size:11px;color:#8696a0;display:flex;justify-content:space-between;align-items:center;">',
      '  <span id="flipper-models-count">' + cachedItems.length + ' modelos disponíveis</span>',
      '  <a href="' + SERVER_URL + '" target="_blank" style="color:#00a884;text-decoration:none;font-weight:700;">Abrir Flipper Zap ↗</a>',
      '</div>'
    ].join('');

    panel.appendChild(fab);
    panel.appendChild(menu);
    document.body.appendChild(panel);

    fab.onclick = function() {
      var isVisible = menu.style.display === 'flex';
      menu.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        updateMenuList('');
        loadLibraryData(false);
      }
    };

    var closeBtn = menu.querySelector('#flipper-close-menu');
    if (closeBtn) closeBtn.onclick = function() { menu.style.display = 'none'; };

    var syncBtn = menu.querySelector('#flipper-btn-sync');
    if (syncBtn) syncBtn.onclick = function() { loadLibraryData(true); };

    var searchInput = menu.querySelector('#flipper-search');
    if (searchInput) searchInput.oninput = function(e) { updateMenuList(e.target.value); };
  }

  // Atualiza lista de itens no menu do WhatsApp Web
  function updateMenuList(query) {
    var list = document.getElementById('flipper-items-list');
    var countEl = document.getElementById('flipper-models-count');
    if (!list) return;

    var items = cachedItems && cachedItems.length > 0 ? cachedItems : EMBEDDED_REPLIES;
    if (countEl) countEl.innerText = items.length + ' modelos disponíveis';

    var q = (query || '').toLowerCase().trim();
    var filtered = items.filter(function(item) {
      if (!q) return true;
      return (item.shortcut || '').toLowerCase().includes(q) ||
             (item.title || '').toLowerCase().includes(q) ||
             (item.content || '').toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      list.innerHTML = '<div style="padding:30px 20px;text-align:center;color:#8696a0;font-size:12px;">Nenhum modelo encontrado para "' + query + '".</div>';
      return;
    }

    list.innerHTML = '';
    filtered.forEach(function(item) {
      var card = document.createElement('div');
      card.style.cssText = 'padding:10px 12px;margin-bottom:8px;background:#182229;border:1px solid #222e35;border-radius:10px;display:flex;flex-direction:column;gap:6px;transition:border 0.2s;';

      var headerRow = document.createElement('div');
      headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
      headerRow.innerHTML = '<div style="display:flex;align-items:center;gap:6px;overflow:hidden;"><span style="color:#00a884;background:#00a88420;padding:1px 6px;border-radius:6px;font-family:monospace;font-size:11px;font-weight:700;">' + (item.shortcut || '/msg') + '</span><strong style="color:#e9edef;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (item.title || 'Modelo') + '</strong></div>';

      var preview = document.createElement('div');
      preview.style.cssText = 'color:#8696a0;font-size:11px;line-height:1.4;max-height:48px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;';
      preview.innerText = item.content || '';

      var actionsRow = document.createElement('div');
      actionsRow.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:2px;';

      // Botão Inserir (coloca na caixa para editar antes)
      var insertBtn = document.createElement('button');
      insertBtn.style.cssText = 'padding:5px 10px;background:#202c33;color:#8696a0;border:1px solid #2a3942;border-radius:6px;font-weight:600;font-size:11px;cursor:pointer;';
      insertBtn.innerText = 'Inserir';
      insertBtn.title = 'Coloca o texto no campo sem disparar';
      insertBtn.onclick = function() {
        sendTextToChat(item.content, false);
      };

      // Botão Enviar com 1 clique
      var sendBtn = document.createElement('button');
      sendBtn.style.cssText = 'padding:5px 12px;background:#00a884;color:#ffffff;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;';
      sendBtn.innerHTML = '⚡ Enviar';
      sendBtn.title = 'Dispara imediatamente na conversa';
      sendBtn.onclick = function() {
        sendTextToChat(item.content, true);
      };

      actionsRow.appendChild(insertBtn);
      actionsRow.appendChild(sendBtn);

      card.appendChild(headerRow);
      card.appendChild(preview);
      card.appendChild(actionsRow);
      list.appendChild(card);
    });
  }

  // Sincroniza dados com o servidor Flipper Zap
  function loadLibraryData(forceNotify) {
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
        if (forceNotify) {
          showToast('Modelos sincronizados com sucesso!', '#00a884');
        }
      })
      .catch(function(err) {
        console.warn('[Flipper Zap] Usando modelos locais incorporados:', err);
        if (cachedItems.length === 0) {
          cachedItems = EMBEDDED_REPLIES;
        }
        updateMenuList('');
        if (forceNotify) {
          showToast('Usando modelos locais salvos!', '#3b82f6');
        }
      });
  }

  // Loop de comunicação contínua (Heartbeat & Polling de comandos do painel Flipper Zap)
  function pollServer() {
    if (isPolling) return;
    isPolling = true;

    var chat = getActiveChat();
    lastActiveChat = chat.name;

    // Atualiza tags de conversa ativa
    var tag = document.getElementById('flipper-chat-tag');
    if (tag) tag.innerText = chat.name || 'Sem chat';

    var menuChat = document.getElementById('flipper-menu-chat');
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
          console.log('[Flipper Zap] Comando recebido:', cmd);
          if (cmd.action === 'send_text') {
            sendTextToChat(cmd.content, cmd.autoSend, cmd.id);
          }
        });
      }
    })
    .catch(function() {})
    .finally(function() {
      isPolling = false;
      setTimeout(pollServer, 1500);
    });
  }

  // Inicializa a interface e a sincronização
  createDockedWidget();
  updateMenuList('');
  loadLibraryData(false);
  pollServer();
  showToast('Flipper Zap conectado ao WhatsApp Web!', '#00a884');
})();`;
}

/**
 * Gera o Bookmarklet de 1 clique para arrastar para a barra de favoritos
 */
export function generateBookmarklet(appOrigin: string): string {
  return `javascript:(function(){var s=document.createElement('script');s.src='${appOrigin}/api/bridge/script.js';document.body.appendChild(s);})();`;
}

export function generateWhatsAppWebBookmarklet(
  quickReplies?: QuickReply[],
  voiceNotes?: VoiceNote[],
  vaultImages?: VaultImage[]
): string {
  const origin = getAppOrigin();
  return generateBookmarklet(origin);
}

export function buildWhatsAppWebUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  if (cleanPhone) {
    return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://web.whatsapp.com/send?text=${encodedText}`;
}

export function getFullF12Script(
  appOrigin: string,
  quickReplies?: QuickReply[],
  voiceNotes?: VoiceNote[],
  vaultImages?: VaultImage[]
): string {
  return generateWhatsAppWebParallelScript(appOrigin, quickReplies, voiceNotes, vaultImages);
}

/**
 * Gera e faz o download direto de um arquivo .ZIP contendo a extensão completa
 * com todos os modelos de mensagens salvos já incorporados!
 */
export async function downloadChromeExtensionZip(
  appOrigin: string,
  quickReplies: QuickReply[] = [],
  voiceNotes: VoiceNote[] = [],
  vaultImages: VaultImage[] = []
): Promise<void> {
  const zip = new JSZip();
  const scriptContent = generateWhatsAppWebParallelScript(
    appOrigin, 
    quickReplies, 
    voiceNotes, 
    vaultImages
  );

  const manifest = {
    manifest_version: 3,
    name: "Flipper Zap - Conector Oficial WhatsApp Web",
    version: "1.0.1",
    description: "Conecta o Flipper Zap ao WhatsApp Web com todos os modelos salvos prontos para disparo com 1 clique.",
    permissions: ["activeTab", "scripting", "storage"],
    host_permissions: [
      "https://web.whatsapp.com/*",
      "https://*.whatsapp.com/*",
      "*://*/*"
    ],
    content_scripts: [
      {
        matches: ["https://web.whatsapp.com/*"],
        js: ["content.js"],
        run_at: "document_idle"
      }
    ]
  };

  const modelsData = {
    quickReplies: quickReplies || [],
    voiceNotes: voiceNotes || [],
    vaultImages: vaultImages || [],
    exportedAt: new Date().toISOString(),
    version: "1.0.1"
  };

  const readme = `=====================================================================
FLIPPER ZAP - EXTENSÃO OFICIAL PARA WHATSAPP WEB
=====================================================================

Esta extensão já contém todos os seus modelos de respostas rápidas
e textos prontos para disparo no WhatsApp Web com 1 clique!

COMO INSTALAR NO GOOGLE CHROME, MICROSOFT EDGE OU BRAVE:

1. Extraia/descompacte este arquivo .ZIP em uma pasta no seu computador.
2. Abra o seu navegador e acesse a página de extensões:
   - No Google Chrome: chrome://extensions
   - No Microsoft Edge: edge://extensions
   - No Brave Browser:  brave://extensions
3. No canto superior direito, ative a chave:
   [x] Modo do desenvolvedor
4. Clique no botão "Carregar sem compactação" (Load unpacked) no canto superior esquerdo.
5. Selecione a pasta onde você descompactou os arquivos (onde está o manifest.json).

PRONTO!
Agora abra https://web.whatsapp.com no seu navegador.
O botão "⚡ Flipper Zap" aparecerá no canto inferior direito do WhatsApp Web,
com todos os seus modelos carregados para envio instantâneo com 1 clique!
=====================================================================`;

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("content.js", scriptContent);
  zip.file("models.json", JSON.stringify(modelsData, null, 2));
  zip.file("LEIA-ME_COMO_INSTALAR.txt", readme);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "flipper-zap-extensao-whatsapp.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
