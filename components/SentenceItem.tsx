
import React from 'react';
import { Sentence } from '../types';
import { Play, RotateCcw, Volume2, Loader2, Languages, Music } from 'lucide-react';

interface SentenceItemProps {
  sentence: Sentence;
  onWordClick: (word: string) => void;
  onPractice: (id: string) => void;
  isPracticing: boolean;
  repeatCount: number;
  totalRepeats: number;
  isAudioLoading: boolean;
}

const SentenceItem: React.FC<SentenceItemProps> = ({ 
  sentence, 
  onWordClick, 
  onPractice, 
  isPracticing, 
  repeatCount, 
  totalRepeats,
  isAudioLoading
}) => {
  // Simple word splitting
  const words = sentence.text.split(/\s+/);

  return (
    <div className={`p-6 rounded-2xl transition-all duration-300 border-2 ${isPracticing ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
      {/* English Text with clickable words */}
      <div className="flex flex-wrap gap-x-1.5 gap-y-1 mb-3">
        {words.map((word, i) => {
          const cleanWord = word.replace(/[.,!?;:()]/g, "");
          return (
            <span 
              key={i} 
              onClick={() => onWordClick(cleanWord)}
              className="text-xl font-medium cursor-pointer hover:text-blue-600 hover:underline decoration-blue-400 decoration-2 transition-colors"
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Phonetic & Translation */}
      <div className="space-y-2 mb-5">
        <div className="flex items-start gap-2 text-slate-500">
          <Music size={14} className="mt-1 flex-shrink-0" />
          <p className="text-sm font-mono italic leading-tight">{sentence.phonetic}</p>
        </div>
        <div className="flex items-start gap-2 text-slate-700">
          <Languages size={14} className="mt-1 flex-shrink-0 text-blue-500" />
          <p className="text-base font-medium leading-tight">{sentence.translation}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button 
          onClick={() => onPractice(sentence.id)}
          disabled={isPracticing && isAudioLoading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all shadow-sm ${
            isPracticing 
              ? 'bg-blue-600 text-white' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {isPracticing ? (
            isAudioLoading ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />
          ) : (
            <Play size={18} />
          )}
          {isPracticing ? 'Đang lặp lại...' : 'Lặp lại 10 lần'}
        </button>

        {isPracticing && (
          <div className="flex items-center gap-3">
             <div className="h-2 w-24 sm:w-32 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${(repeatCount / totalRepeats) * 100}%` }}
                />
             </div>
             <span className="text-sm font-bold text-blue-600 whitespace-nowrap">{repeatCount} / {totalRepeats}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentenceItem;
