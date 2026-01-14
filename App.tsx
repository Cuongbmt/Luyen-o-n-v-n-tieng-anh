import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sentence, Lesson } from './types';
import { geminiService, decodeAudioData } from './services/geminiService';
import SentenceItem from './components/SentenceItem';
import WordModal from './components/WordModal';
import { BookOpen, Layers, MessageSquare, Trash2, Sparkles, Loader2, History, ChevronRight, Clock } from 'lucide-react';

const REPEAT_LIMIT = 10;
const STORAGE_KEY = 'engrepeat_history';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [history, setHistory] = useState<Lesson[]>([]);
  
  // Trạng thái luyện tập
  const [practicingId, setPracticingId] = useState<string | null>(null);
  const [repeatCount, setRepeatCount] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopRequestedRef = useRef(false);

  // Load history từ localStorage khi khởi động
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Lỗi load lịch sử:", e);
      }
    }
  }, []);

  const ensureAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const saveToHistory = (newSentences: Sentence[], text: string) => {
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
      fullText: text,
      sentences: newSentences,
      createdAt: Date.now()
    };
    
    const updatedHistory = [newLesson, ...history].slice(0, 20); // Lưu tối đa 20 bài gần nhất
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
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
      saveToHistory(mapped, inputText);
    } catch (e) {
      console.error("Lỗi xử lý văn bản:", e);
      alert("Lỗi kết nối API hoặc định dạng văn bản. Hãy chắc chắn bạn đã cấu hình API_KEY trên Vercel.");
    } finally {
      setIsProcessing(false);
    }
  };

  const loadLesson = (lesson: Lesson) => {
    setSentences(lesson.sentences);
    setInputText(lesson.fullText);
  };

  const deleteLesson = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(l => l.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const startPractice = useCallback(async (id: string) => {
    const ctx = ensureAudioContext();
    const sentence = sentences.find(s => s.id === id);
    if (!sentence) return;

    setPracticingId(id);
    setRepeatCount(0);
    stopRequestedRef.current = false;
    
    setIsAudioLoading(true);
    const audioBytes = await geminiService.generateSpeech(sentence.text);
    setIsAudioLoading(false);
    
    if (!audioBytes) {
      alert("Không thể tạo giọng nói. Kiểm tra lại API Key.");
      setPracticingId(null);
      return;
    }

    const buffer = await decodeAudioData(audioBytes, ctx);

    for (let i = 1; i <= REPEAT_LIMIT; i++) {
      if (stopRequestedRef.current) break;
      setRepeatCount(i);
      await playBuffer(buffer, ctx);
      if (i < REPEAT_LIMIT && !stopRequestedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 800));
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
    setPracticingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pb-20 min-h-screen">
      <header className="flex flex-col items-center mb-10 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl">
          <BookOpen size={32} />
        </div>
        <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">EngRepeat AI</h1>
        <p className="text-slate-500 font-medium">Làm chủ tiếng Anh qua 10 lần lặp lại</p>
      </header>

      {sentences.length === 0 ? (
        <div className="grid gap-8">
          {/* Input Panel */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <label className="flex items-center gap-2 mb-4 text-slate-700 font-bold text-lg">
              <MessageSquare size={24} className="text-blue-500" />
              Nhập nội dung mới
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Dán đoạn văn tiếng Anh bạn vừa copy vào đây để bắt đầu học..."
              className="w-full h-48 p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white transition-all outline-none text-lg text-slate-800 leading-relaxed"
            />
            <button
              onClick={handleProcessText}
              disabled={isProcessing || !inputText.trim()}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-3 text-lg"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
              {isProcessing ? 'Đang phân tích...' : 'Bắt đầu học ngay'}
            </button>
          </div>

          {/* History Panel */}
          {history.length > 0 && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-bold text-slate-700 px-2 text-xl">
                <History size={22} className="text-indigo-500" />
                Lịch sử học tập
              </h3>
              <div className="grid gap-3">
                {history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => loadLesson(item)}
                    className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-500 flex-shrink-0 transition-colors">
                        <Clock size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-800 truncate">{item.title}</p>
                        <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()} • {item.sentences.length} câu</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => deleteLesson(e, item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 sticky top-4 z-20 shadow-lg">
            <div>
              <h2 className="font-black text-slate-800 text-xl">Bài học hiện tại</h2>
              <p className="text-xs text-slate-500">Nhấn vào từng từ để xem nghĩa và phát âm</p>
            </div>
            <button 
              onClick={handleClear}
              className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 px-4 py-2 rounded-xl transition-all font-bold flex items-center gap-2 border border-transparent hover:border-red-100"
            >
              <Trash2 size={18} /> Đổi bài khác
            </button>
          </div>
          
          <div className="grid gap-6">
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

      {selectedWord && (
        <WordModal word={selectedWord} onClose={() => setSelectedWord(null)} />
      )}
    </div>
  );
};

export default App;