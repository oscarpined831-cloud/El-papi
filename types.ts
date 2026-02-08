
export interface AnalysisResponse {
  autoRevision: string;
  golpeRealidad: string;
  focoInquebrantable: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ChatHistoryItem {
  id: string;
  timestamp: number;
  userInput: string;
  aiResponse: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
