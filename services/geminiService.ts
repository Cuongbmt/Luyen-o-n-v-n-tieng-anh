
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { WordInfo, Sentence } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  async splitSentences(text: string): Promise<Omit<Sentence, 'id'>[]> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Split the following English text into individual sentences. For each sentence, provide its Vietnamese translation and its International Phonetic Alphabet (IPA) pronunciation for the whole sentence. Return as a clean JSON array of objects. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The original English sentence" },
              translation: { type: Type.STRING, description: "Vietnamese translation" },
              phonetic: { type: Type.STRING, description: "IPA pronunciation for the whole sentence" }
            },
            required: ["text", "translation", "phonetic"]
          }
        }
      }
    });
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse split sentences JSON", e);
      // Fallback
      return [{ text, translation: "Lỗi xử lý", phonetic: "N/A" }];
    }
  },

  async getWordInfo(word: string): Promise<WordInfo> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide the Vietnamese translation and international phonetic alphabet (IPA) for the English word: "${word}".`,
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
    return JSON.parse(response.text);
  },

  async generateSpeech(text: string): Promise<Uint8Array | null> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return null;
      return decode(base64Audio);
    } catch (error) {
      console.error("TTS generation failed", error);
      return null;
    }
  }
};

// Audio Utilities
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
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
