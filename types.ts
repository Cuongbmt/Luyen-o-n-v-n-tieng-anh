
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

export interface PracticeState {
  currentSentenceId: string | null;
  repeatCount: number;
  isPlaying: boolean;
}
