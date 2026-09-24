import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Edit3,
  Copy, 
  Check, 
  Download, 
  Play, 
  Maximize2, 
  Folder,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { VaultImage } from '../types';
import { processImageUpload, copyImageToClipboard, formatFileSize } from '../lib/mediaVault';
import { sendQueue } from '../lib/sendQueue';

interface MediaVaultTabProps {
  images: VaultImage[];
  onSave: (image: VaultImage) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTestInSimulator: (image: VaultImage) => void;
  onSendToActiveChat?: (text: string, title?: string) => Promise<boolean>;
  isBridgeConnected?: boolean;
  activeChatName?: string;
  onBackToHome?: () => void;
}

const CATEGORIES = [
  { id: 'todas', label: 'Todas' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'vendas', label: 'Tabelas & Ofertas' },
  { id: 'depoimentos', label: 'Depoimentos' },
  { id: 'comprovantes', label: 'Comprovantes' },
  { id: 'banners', label: 'Banners' },
];

export const MediaVaultTab: React.FC<MediaVaultTabProps> = ({
  images,
  onSave,
  onDelete,
  onTestInSimulator,
  onSendToActiveChat,
  isBridgeConnected = false,
  activeChatName = '',
  onBackToHome,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<VaultImage | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Edit / Rename Image Modal state
  const [editingImage, setEditingImage] = useState<VaultImage | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editShortcut, setEditShortcut] = useState('');
  const [editCategory, setEditCategory] = useState('catalogo');
  const [editCaption, setEditCaption] = useState('');

  // Upload Form states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadShortcut, setUploadShortcut] = useState('');
  const [uploadCategory, setUploadCategory] = useState('catalogo');
  const [uploadCaption, setUploadCaption] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredImages = images.filter((img) => {
    return selectedCategory === 'todas' || img.category === selectedCategory;
  });

  const handleCopyImage = async (img: VaultImage) => {
    const res = await copyImageToClipboard(img.imageBlob);
    if (res.success) {
      setCopiedId(img.id);
      setToastMessage(res.message);
      setTimeout(() => {
        setCopiedId(null);
        setToastMessage(null);
      }, 3000);
    } else {
      alert(res.message);
    }
  };

  const handleDownload = (img: VaultImage) => {
    const a = document.createElement('a');
    a.href = img.dataUrl;
    a.download = `${img.title.toLowerCase().replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handleOpenEditModal = (img: VaultImage) => {
    setEditingImage(img);
    setEditTitle(img.title);
    setEditShortcut(img.shortcut || '');
    setEditCategory(img.category);
    setEditCaption(img.caption || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingImage || !editTitle.trim()) return;

    let cleanShortcut = editShortcut.trim();
    if (cleanShortcut && !cleanShortcut.startsWith('/')) {
      cleanShortcut = '/' + cleanShortcut;
    }

    const updated: VaultImage = {
      ...editingImage,
      title: editTitle.trim(),
      shortcut: cleanShortcut,
      category: editCategory,
      caption: editCaption.trim(),
    };

    await onSave(updated);
    setEditingImage(null);
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsProcessing(true);
    try {
      const processed = await processImageUpload(
        uploadFile,
        uploadTitle,
        uploadCategory,
        uploadShortcut,
        uploadCaption
      );
      await onSave(processed);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadShortcut('');
      setUploadCaption('');
    } catch (err) {
      console.error(err);
      alert('Erro ao armazenar imagem no banco de dados.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setUploadFile(file);
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
        setIsUploadModalOpen(true);
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400/40 text-xs sm:text-sm font-semibold">
          <Check className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

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
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Folder className="w-5 h-5 text-emerald-400" />
                  <span>Banco de Imagens (Sem Galeria)</span>
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full whitespace-nowrap">
                  Zero Galeria
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Copie imagens direto para o WhatsApp Web (Ctrl + V) sem poluir a galeria do celular.
              </p>
            </div>
          </div>

          <button
            id="btn-upload-image"
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>Adicionar Imagem</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-4 text-center transition-colors bg-slate-900/40 cursor-pointer"
        onClick={() => setIsUploadModalOpen(true)}
      >
        <ImageIcon className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
        <p className="text-xs sm:text-sm font-semibold text-slate-300">
          Clique ou arraste imagens aqui para salvar no banco
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Armazenadas no banco local com atalhos de envio rápido
        </p>
      </div>

      {/* Grid of Images */}
      {filteredImages.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-10 text-center">
          <ImageIcon className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-200">Nenhuma imagem nesta categoria</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Cadastre imagens para enviar aos clientes sem depender da galeria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              className="bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 rounded-2xl overflow-hidden flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Image Preview Thumbnail with Zoom */}
                <div 
                  className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer" 
                  onClick={() => setPreviewModalImage(img)}
                >
                  <img
                    src={img.dataUrl}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                    <span className="text-[11px] text-white flex items-center gap-1 font-medium bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm whitespace-nowrap">
                      <Maximize2 className="w-3 h-3" /> Ampliar
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap">
                      {formatFileSize(img.fileSize)}
                    </span>
                  </div>

                  {img.shortcut && (
                    <span className="absolute top-2 left-2 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow whitespace-nowrap">
                      {img.shortcut}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <h3 className="font-bold text-slate-100 text-sm truncate flex-1">{img.title}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(img)}
                        className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-700 cursor-pointer"
                        title="Renomear / Editar imagem"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(img.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-700 cursor-pointer"
                        title="Excluir do banco"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-400 mb-1.5 whitespace-nowrap">
                    {img.category}
                  </span>

                  {img.caption && (
                    <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-800 line-clamp-2">
                      💬 <span className="italic">{img.caption}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3.5 pt-0 space-y-2">
                <button
                  id={`btn-copy-img-${img.id}`}
                  onClick={() => handleCopyImage(img)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer whitespace-nowrap"
                  title="Copia a imagem para colar com Ctrl+V no WhatsApp Web"
                >
                  {copiedId === img.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copiado! Cole com Ctrl+V</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Imagem (Ctrl + V)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  {img.caption && (
                    <button
                      onClick={() => {
                        sendQueue.enqueue({
                          title: `Legenda: ${img.title}`,
                          content: img.caption || '',
                          type: 'text',
                          typingDelay: 2,
                          chatTarget: activeChatName || 'WhatsApp Web',
                        });
                        setToastMessage('Legenda adicionada à fila de envio!');
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
                      title="Enviar legenda na conversa aberta via fila sequencial"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      <span>Legenda</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDownload(img)}
                    className="flex items-center justify-center p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg cursor-pointer"
                    title="Baixar imagem no computador"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Zoom Preview */}
      {previewModalImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" 
          onClick={() => setPreviewModalImage(null)}
        >
          <div 
            className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">{previewModalImage.title}</h3>
                <p className="text-xs text-slate-400">{previewModalImage.shortcut || 'Sem atalho'} • {formatFileSize(previewModalImage.fileSize)}</p>
              </div>
              <button onClick={() => setPreviewModalImage(null)} className="text-slate-400 hover:text-white text-base">✕</button>
            </div>
            <div className="p-3 max-h-[60vh] flex items-center justify-center bg-black/50">
              <img src={previewModalImage.dataUrl} alt={previewModalImage.title} className="max-h-[50vh] max-w-full object-contain rounded-lg" referrerPolicy="no-referrer" />
            </div>
            {previewModalImage.caption && (
              <div className="p-3 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-300">
                <strong>Legenda:</strong> {previewModalImage.caption}
              </div>
            )}
            <div className="p-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => handleCopyImage(previewModalImage)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Imagem (Ctrl + V)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Nova Imagem */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm sm:text-base">Guardar Imagem no Banco</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitUpload} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Selecione a Imagem (PNG, JPG, WEBP) *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadFile(f);
                      if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Personalizado da Imagem *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tabela de Preços, Foto do Produto"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Atalho de Teclado
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: /tabela, /foto1"
                    value={uploadShortcut}
                    onChange={(e) => setUploadShortcut(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="catalogo">Catálogo</option>
                    <option value="vendas">Tabelas & Ofertas</option>
                    <option value="depoimentos">Depoimentos</option>
                    <option value="comprovantes">Comprovantes</option>
                    <option value="banners">Banners</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Legenda Opcional
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Segue a tabela com as condições exclusivas de hoje! 🚀"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs sm:text-sm rounded-xl font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? 'Armazenando...' : 'Salvar Imagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar / Renomear Imagem Existente */}
      {editingImage && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm sm:text-base">Renomear Imagem</h3>
              <button onClick={() => setEditingImage(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Personalizado *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Atalho de Teclado
                  </label>
                  <input
                    type="text"
                    value={editShortcut}
                    onChange={(e) => setEditShortcut(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="catalogo">Catálogo</option>
                    <option value="vendas">Tabelas & Ofertas</option>
                    <option value="depoimentos">Depoimentos</option>
                    <option value="comprovantes">Comprovantes</option>
                    <option value="banners">Banners</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Legenda Opcional
                </label>
                <textarea
                  rows={2}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingImage(null)}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs sm:text-sm rounded-xl font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
