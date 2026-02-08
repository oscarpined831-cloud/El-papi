
import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

export class PapirrinService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  private getChat() {
    if (!this.chatSession) {
      this.chatSession = this.ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.9,
          topP: 0.95,
          topK: 64,
        },
      });
    }
    return this.chatSession;
  }

  async analyzeIdea(userInput: string) {
    try {
      const chat = this.getChat();
      const response = await chat.sendMessage({ message: userInput });
      return response.text;
    } catch (error: any) {
      console.error("Error in PapirrinService:", error);
      // Reset session on fatal errors to allow retry
      if (error.message?.includes('404') || error.message?.includes('400')) {
        this.chatSession = null;
      }
      throw error;
    }
  }

  async generateAudioResponse(text: string) {
    try {
      // Re-init AI just in case API key changed (if that's a thing in this env)
      const ttsAi = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ttsAi.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Di con tono norteño, rudo y firme: ${text.substring(0, 500)}` }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' }, 
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return null;

      return base64Audio;
    } catch (error) {
      console.error("Audio generation error:", error);
      return null;
    }
  }

  resetSession() {
    this.chatSession = null;
  }
}

export const papirrinService = new PapirrinService();
