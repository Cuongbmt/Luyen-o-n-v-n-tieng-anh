
import React, { useEffect, useState } from 'react';
import { WordInfo } from '../types';
import { geminiService, decodeAudioData } from '../services/geminiService';
import { Volume2, X, Loader2 } from 'lucide-react';

interface WordModalProps {
  word: string;
  onClose: () => void;
}

const WordModal: React.FC<WordModalProps> = ({ word, onClose }) => {
  const [info, setInfo] = useState<WordInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioLoading, setAudioLoading] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const data = await geminiService.getWordInfo(word);
        setInfo(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [word]);

  const playWord = async () => {
    if (!word || audioLoading) return;
    setAudioLoading(true);
    try {
      const audioBytes = await geminiService.generateSpeech(word);
      if (audioBytes) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      }
    } finally {
      setAudioLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-2xl font-bold text-slate-800">{word}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
              <p className="text-slate-500">Searching dictionary...</p>
            </div>
          ) : info ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Translation</p>
                <p className="text-xl text-blue-600 font-semibold">{info.translation}</p>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Pronunciation</p>
                  <p className="text-lg font-mono text-slate-700">{info.phonetic}</p>
                </div>
                <button 
                  onClick={playWord}
                  disabled={audioLoading}
                  className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {audioLoading ? <Loader2 className="animate-spin" size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-red-500">Could not find info for this word.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordModal;
