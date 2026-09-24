import React from 'react';
import { Timer, Zap, Mic, PenLine } from 'lucide-react';

interface TypingTimerSelectorProps {
  value: number; // em segundos (0 = direto)
  onChange: (seconds: number) => void;
  isAudio?: boolean;
  audioDuration?: number;
  size?: 'sm' | 'md';
  labelPrefix?: string;
}

export const TypingTimerSelector: React.FC<TypingTimerSelectorProps> = ({
  value,
  onChange,
  isAudio = false,
  audioDuration,
  size = 'sm',
  labelPrefix
}) => {
  const options = isAudio
    ? [
        { label: '0s (Direto)', value: 0 },
        { label: '3s gravando', value: 3 },
        { label: '5s gravando', value: 5 },
        ...(audioDuration ? [{ label: `${Math.round(audioDuration)}s (Total)`, value: Math.round(audioDuration) }] : []),
      ]
    : [
        { label: '0s (Direto)', value: 0 },
        { label: '2s', value: 2 },
        { label: '3s', value: 3 },
        { label: '5s', value: 5 },
        { label: '10s', value: 10 },
      ];

  const isSmall = size === 'sm';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {labelPrefix && (
        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 whitespace-nowrap">
          {isAudio ? <Mic className="w-3 h-3 text-emerald-400" /> : <PenLine className="w-3 h-3 text-emerald-400" />}
          <span>{labelPrefix}:</span>
        </span>
      )}

      <div className="inline-flex items-center bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
              }}
              title={opt.value === 0 ? 'Disparo imediato sem simulação' : `Simular ${isAudio ? 'gravação' : 'digitação'} por ${opt.value} segundos`}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isSmall ? 'text-[10px]' : 'text-xs py-1'
              } ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
