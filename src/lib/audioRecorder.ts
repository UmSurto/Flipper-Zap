/**
 * Audio Recorder & PTT Voice Note Engine
 * Gravação de áudios simulados na hora (Push-to-Talk) com waveform visual
 */

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // em segundos
  audioBlob: Blob | null;
  waveformData: number[];
}

export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  public async startRecording(onVolumeChange?: (volume: number) => void): Promise<void> {
    this.audioChunks = [];
    
    // Suporte aos formatos de áudio do WhatsApp (Opus/OGG/WebM)
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    let selectedMimeType = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        break;
      }
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Configura AnalyserNode para visualização em tempo real
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      if (onVolumeChange) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          onVolumeChange(Math.min(100, Math.round((avg / 128) * 100)));
          this.animationFrameId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(this.micStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Coleta a cada 100ms
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      throw err;
    }
  }

  public async stopRecording(): Promise<{ blob: Blob; mimeType: string; waveform: number[] }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Nenhuma gravação ativa'));
      }

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });

        // Limpa tracks do microfone
        if (this.micStream) {
          this.micStream.getTracks().forEach((track) => track.stop());
          this.micStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
          this.audioContext.close();
          this.audioContext = null;
        }

        // Gera waveform a partir dos dados do áudio
        const waveform = await extractWaveformFromBlob(blob, 28);

        resolve({ blob, mimeType, waveform });
      };

      this.mediaRecorder.stop();
    });
  }

  public cancelRecording(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioChunks = [];
  }
}

/**
 * Extrai 24 a 32 barras de intensidade para a forma de onda idêntica ao WhatsApp
 */
export async function extractWaveformFromBlob(blob: Blob, numBars = 28): Promise<number[]> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioCtx();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    const blockSize = Math.floor(channelData.length / numBars);
    const waveform: number[] = [];

    for (let i = 0; i < numBars; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j] || 0);
      }
      const avg = sum / blockSize;
      // Normaliza para escala 15 - 95%
      const normalized = Math.min(100, Math.max(15, Math.round(avg * 450)));
      waveform.push(normalized);
    }

    audioContext.close();
    return waveform;
  } catch (e) {
    console.warn('Erro ao decodificar waveform, usando fallback senoidal:', e);
    // Fallback estético realista estilo WhatsApp
    const fallback: number[] = [];
    for (let i = 0; i < numBars; i++) {
      const v = 20 + Math.sin(i * 0.4) * 35 + Math.sin(i * 0.8) * 20 + (i % 3) * 10;
      fallback.push(Math.min(95, Math.max(15, Math.round(v))));
    }
    return fallback;
  }
}

/**
 * Formata segundos em mm:ss
 */
export function formatAudioDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Converte arquivo de áudio carregado pelo usuário
 */
export async function processUploadedAudioFile(file: File): Promise<{
  blob: Blob;
  duration: number;
  waveform: number[];
  mimeType: string;
}> {
  const blob = file;
  const waveform = await extractWaveformFromBlob(blob, 28);
  
  // Obter duração exata criando elemento de áudio temporário
  const duration = await new Promise<number>((resolve) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(blob);
    audio.src = objectUrl;
    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      URL.revokeObjectURL(objectUrl);
      resolve(Math.round(dur));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(10); // fallback
    };
  });

  return {
    blob,
    duration: duration || 5,
    waveform,
    mimeType: file.type || 'audio/ogg'
  };
}
