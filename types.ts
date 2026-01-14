
export interface Sentence {
  id: string;
  text: string;
  translation: string;
  phonetic: string;
}

export interface WordInfo {
  word: string;
  translation: string;
  phonetic: string;
}

export interface Lesson {
  id: string;
  title: string;
  fullText: string;
  sentences: Sentence[];
  createdAt: number;
}

export interface PracticeState {
  currentSentenceId: string | null;
  repeatCount: number;
  isPlaying: boolean;
}