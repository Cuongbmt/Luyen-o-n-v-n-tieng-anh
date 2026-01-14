import { GoogleGenAI, Modality, Type } from "@google/genai";
import { WordInfo, Sentence } from "../types";

// Khởi tạo AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  /**
   * Tách văn bản thành các câu kèm phiên âm và dịch thuật
   */
  async splitSentences(text: string): Promise<Omit<Sentence, 'id'>[]> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Phân tích đoạn văn tiếng Anh sau. Tách nó thành từng câu riêng biệt. Với mỗi câu, hãy cung cấp: 
      1. Bản dịch tiếng Việt chính xác.
      2. Phiên âm IPA (International Phonetic Alphabet) cho toàn bộ câu đó.
      Trả về kết quả dưới dạng JSON array. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "Câu tiếng Anh gốc" },
              translation: { type: Type.STRING, description: "Bản dịch tiếng Việt" },
              phonetic: { type: Type.STRING, description: "Phiên âm IPA của cả câu" }
            },
            required: ["text", "translation", "phonetic"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Lỗi parse JSON sentences:", e);
      return [{ text, translation: "Không thể dịch câu này", phonetic: "N/A" }];
    }
  },

  /**
   * Tra cứu thông tin chi tiết một từ
   */
  async getWordInfo(word: string): Promise<WordInfo> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tra từ điển cho từ tiếng Anh: "${word}". Cung cấp bản dịch tiếng Việt và phiên âm IPA.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            translation: { type: Type.STRING },
            phonetic: { type: Type.STRING }
          },
          required: ["word", "translation", "phonetic"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  },

  /**
   * Chuyển văn bản thành giọng nói (TTS)
   */
  async generateSpeech(text: string): Promise<Uint8Array | null> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Giọng nam trầm ấm, dễ nghe
            },
          },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return null;
      return decodeBase64(base64Audio);
    } catch (error) {
      console.error("Lỗi tạo giọng nói:", error);
      return null;
    }
  }
};

/**
 * Giải mã Base64 thành Uint8Array
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Giải mã dữ liệu PCM từ API thành AudioBuffer để phát
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}