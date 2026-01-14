import React, { useState, useRef, useCallback } from 'react';
import { Sentence } from './types';
import { geminiService, decodeAudioData } from './services/geminiService';
import SentenceItem from './components/SentenceItem';
import WordModal from './components/WordModal';
import { Upload, BookOpen, Layers, MessageSquare, Trash2, Sparkles, Loader2 } from 'lucide-react';

const REPEAT_LIMIT = 10;

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  
  // Trạng thái luyện tập
  const [practicingId, setPracticingId] = useState<string | null>(null);
  const [repeatCount, setRepeatCount] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopRequestedRef = useRef(false);

  // Khởi tạo AudioContext sau tương tác của người dùng
  const ensureAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const handleProcessText = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const processed = await geminiService.splitSentences(inputText);
      const mapped = processed.map((s, idx) => ({
        id: `sentence-${Date.now()}-${idx}`,
        ...s
      }));
      setSentences(mapped);
    } catch (e) {
      console.error("Lỗi xử lý văn bản:", e);
      alert("Đã có lỗi xảy ra khi phân tích văn bản. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startPractice = useCallback(async (id: string) => {
    const ctx = ensureAudioContext();
    const sentence = sentences.find(s => s.id === id);
    if (!sentence) return;

    // Reset trạng thái
    setPracticingId(id);
    setRepeatCount(0);
    stopRequestedRef.current = false;
    
    setIsAudioLoading(true);
    const audioBytes = await geminiService.generateSpeech(sentence.text);
    setIsAudioLoading(false);
    
    if (!audioBytes) {
      alert("Không thể tạo giọng nói cho câu này.");
      setPracticingId(null);
      return;
    }

    const buffer = await decodeAudioData(audioBytes, ctx);

    for (let i = 1; i <= REPEAT_LIMIT; i++) {
      if (stopRequestedRef.current) break;
      
      setRepeatCount(i);
      await playBuffer(buffer, ctx);
      
      if (i < REPEAT_LIMIT && !stopRequestedRef.current) {
        // Nghỉ 1 giây giữa các lần lặp
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setPracticingId(null);
    setRepeatCount(0);
  }, [sentences]);

  const playBuffer = (buffer: AudioBuffer, ctx: AudioContext) => {
    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => resolve();
      source.start();
    });
  };

  const handleClear = () => {
    stopRequestedRef.current = true;
    setSentences([]);
    setInputText('');
    setPracticingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pb-20">
      {/* Header */}
      <header className="flex flex-col items-center mb-10 text-center">
        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg">
          <BookOpen size={28} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2 italic">EngRepeat AI</h1>
        <p className="text-slate-500 text-sm">Luyện nghe sâu bằng phương pháp lặp lại 10 lần (Shadowing)</p>
      </header>

      {/* Input Section */}
      {sentences.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <label className="flex items-center gap-2 mb-4 text-slate-700 font-semibold">
            <MessageSquare size={20} className="text-blue-500" />
            Nhập đoạn văn tiếng Anh
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Dán đoạn văn bạn muốn luyện tập vào đây..."
            className="w-full h-40 p-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none text-slate-800"
          />
          <button
            onClick={handleProcessText}
            disabled={isProcessing || !inputText.trim()}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Sparkles size={20} />
            )}
            {isProcessing ? 'Đang phân tích câu...' : 'Bắt đầu luyện tập'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white/80 backdrop-blur p-4 rounded-xl border border-slate-200 sticky top-4 z-20 shadow-sm">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <Layers size={20} className="text-blue-500" />
              Danh sách câu ({sentences.length})
            </h2>
            <button 
              onClick={handleClear}
              className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
            >
              <Trash2 size={16} /> Làm mới
            </button>
          </div>
          
          <div className="grid gap-4">
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

      {/* Modal */}
      {selectedWord && (
        <WordModal word={selectedWord} onClose={() => setSelectedWord(null)} />
      )}

      <footer className="mt-16 text-center text-slate-400 text-xs">
        <p>&copy; 2024 EngRepeat AI - Cải thiện phát âm của bạn</p>
      </footer>
    </div>
  );
};

export default App;