
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sentence } from './types';
import { geminiService, decodeAudioData } from './services/geminiService';
import SentenceItem from './components/SentenceItem';
import WordModal from './components/WordModal';
import { Upload, BookOpen, Layers, MessageSquare, Trash2, Github, Sparkles } from 'lucide-react';

const REPEAT_LIMIT = 10;

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  
  // Practice state
  const [practicingId, setPracticingId] = useState<string | null>(null);
  const [repeatCount, setRepeatCount] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopRequestedRef = useRef(false);

  // Initialize Audio Context on user interaction if needed
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
  };

  const handleProcessText = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const processedSentences = await geminiService.splitSentences(inputText);
      const mapped = processedSentences.map((s, idx) => ({
        id: `s-${Date.now()}-${idx}`,
        ...s
      }));
      setSentences(mapped);
    } catch (e) {
      console.error("Process error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const startPractice = useCallback(async (id: string) => {
    initAudio();
    const sentence = sentences.find(s => s.id === id);
    if (!sentence) return;

    // Reset state for new practice
    setPracticingId(id);
    setRepeatCount(0);
    stopRequestedRef.current = false;
    
    setIsAudioLoading(true);
    const audioBytes = await geminiService.generateSpeech(sentence.text);
    setIsAudioLoading(false);
    
    if (!audioBytes || !audioContextRef.current) return;
    const buffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);

    for (let i = 1; i <= REPEAT_LIMIT; i++) {
      if (stopRequestedRef.current) break;
      
      setRepeatCount(i);
      await playBuffer(buffer);
      if (i < REPEAT_LIMIT) {
        // Small delay between repeats
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    // Check if we didn't start a new practice in the meantime
    setPracticingId(prev => prev === id ? null : prev);
    setRepeatCount(0);
  }, [sentences]);

  const playBuffer = (buffer: AudioBuffer) => {
    return new Promise<void>((resolve) => {
      if (!audioContextRef.current) return resolve();
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => resolve();
      source.start();
    });
  };

  const handleClear = () => {
    setSentences([]);
    setInputText('');
    setPracticingId(null);
    stopRequestedRef.current = true;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-24">
      {/* Header */}
      <header className="flex flex-col items-center mb-12 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl rotate-3">
          <BookOpen size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">EngRepeat AI</h1>
        <p className="text-slate-500 max-w-lg">
          Tách đoạn văn thành câu, cung cấp phiên âm IPA, dịch tiếng Việt và luyện nghe lặp lại 10 lần.
        </p>
      </header>

      {/* Main Content */}
      <main className="space-y-8">
        {sentences.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 transition-all">
            <div className="flex items-center gap-3 mb-6 text-blue-600 font-bold text-lg">
              <Upload size={24} />
              <h2>Dán đoạn văn tiếng Anh của bạn</h2>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ví dụ: Learning English is an exciting journey. Consistency is the key to success..."
              className="w-full h-48 p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg resize-none"
            />
            <button
              onClick={handleProcessText}
              disabled={isProcessing || !inputText.trim()}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 text-lg active:scale-95"
            >
              {isProcessing ? (
                <>
                  <Sparkles className="animate-pulse" size={24} />
                  Đang xử lý phiên âm & dịch...
                </>
              ) : (
                <>
                  <MessageSquare size={24} />
                  Bắt đầu học ngay
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4 sticky top-4 z-10 bg-slate-50/80 backdrop-blur-md py-3 px-2 rounded-xl">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Layers className="text-blue-500" size={24} />
                Danh sách luyện tập
              </h2>
              <button 
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
              >
                <Trash2 size={18} />
                Xóa tất cả
              </button>
            </div>
            
            <div className="space-y-4">
              {sentences.map((sentence) => (
                <SentenceItem
                  key={sentence.id}
                  sentence={sentence}
                  onWordClick={setSelectedWord}
                  onPractice={startPractice}
                  isPracticing={practicingId === sentence.id}
                  repeatCount={repeatCount}
                  totalRepeats={REPEAT_LIMIT}
                  isAudioLoading={isAudioLoading}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedWord && (
        <WordModal word={selectedWord} onClose={() => setSelectedWord(null)} />
      )}

      {/* Tips Section */}
      {sentences.length > 0 && (
        <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100 text-blue-800 shadow-sm">
          <h3 className="font-bold flex items-center gap-2 mb-2">
            <Sparkles size={18} />
            Mẹo học tập
          </h3>
          <ul className="text-sm space-y-1 list-disc list-inside opacity-90">
            <li>Nhấn vào <strong>từng từ</strong> để xem nghĩa chi tiết và cách phát âm riêng của từ đó.</li>
            <li>Dùng nút <strong>Lặp lại 10 lần</strong> để luyện shadowing (nói đuổi) cho đến khi trôi chảy.</li>
            <li>Phần phiên âm IPA dưới mỗi câu giúp bạn hình dung cách nối âm và trọng âm câu.</li>
          </ul>
        </div>
      )}

      <footer className="mt-20 pt-8 border-t border-slate-200 flex flex-col items-center gap-4 text-slate-400">
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-slate-600 transition-colors"><Github size={20} /></a>
        </div>
        <p className="text-xs font-medium uppercase tracking-widest">Powered by Gemini AI 2.5</p>
      </footer>
    </div>
  );
};

export default App;
