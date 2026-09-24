/**
 * Media Vault & Clipboard Service
 * Gerencia o banco de dados de imagens para WhatsApp Business sem usar a galeria do celular.
 */

import { VaultImage } from '../types';

/**
 * Converte um arquivo de imagem em um objeto VaultImage pronto para salvar no IndexedDB
 */
export async function processImageUpload(
  file: File,
  title: string,
  category: string,
  shortcut: string,
  caption?: string,
  tags: string[] = []
): Promise<VaultImage> {
  const dataUrl = await readFileAsDataUrl(file);
  const dimensions = await getImageDimensions(dataUrl);

  return {
    id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    title: title.trim() || file.name.replace(/\.[^/.]+$/, ''),
    shortcut: shortcut.trim() ? (shortcut.startsWith('/') ? shortcut : '/' + shortcut) : undefined,
    imageBlob: file,
    dataUrl,
    mimeType: file.type || 'image/png',
    category: category || 'catalogo',
    caption: caption?.trim(),
    tags,
    fileSize: file.size,
    dimensions,
    createdAt: Date.now(),
  };
}

/**
 * Copia a imagem diretamente para a Área de Transferência (Clipboard).
 * Permite que o atendente aperte Ctrl+V no WhatsApp Web e envie a imagem
 * instantaneamente SEM precisar abrir a galeria do celular ou buscar nos arquivos!
 */
export async function copyImageToClipboard(source: Blob | string): Promise<{ success: boolean; message: string }> {
  try {
    let blob: Blob;
    if (typeof source === 'string') {
      const res = await fetch(source);
      blob = await res.blob();
    } else {
      blob = source;
    }

    // A API Clipboard do navegador exige PNG em muitos sistemas operacionais
    let targetBlob = blob;
    if (blob.type !== 'image/png') {
      targetBlob = await convertBlobToPng(blob);
    }

    if (navigator.clipboard && 'write' in navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ [targetBlob.type]: targetBlob });
      await navigator.clipboard.write([item]);
      return {
        success: true,
        message: 'Imagem copiada! Vá no WhatsApp Web e aperte Ctrl + V para enviar na hora.'
      };
    } else {
      throw new Error('Clipboard API não suportada neste navegador.');
    }
  } catch (err) {
    console.error('Falha ao copiar imagem para clipboard:', err);
    return {
      success: false,
      message: 'Não foi possível copiar diretamente para a área de transferência. Use o botão de download.'
    };
  }
}

/**
 * Converte qualquer Blob de imagem para PNG para máxima compatibilidade com a Clipboard API
 */
async function convertBlobToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(blob);
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          resolve(blob);
        }
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erro ao converter imagem para PNG'));
    };
    img.src = url;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = dataUrl;
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
