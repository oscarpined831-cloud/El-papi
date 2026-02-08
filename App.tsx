
import React, { useState, useEffect, useRef } from 'react';
import { papirrinService } from './services/geminiService';
import { AppState, ChatHistoryItem } from './types';
import { LOADING_MESSAGES } from './constants';
import BrutalButton from './components/BrutalButton';

const STORAGE_KEY = 'papirrin_history_v3';

// Utility for decoding audio
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
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
};

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    let interval: any;
    if (status === AppState.LOADING) {
      let i = 0;
      interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[i % LOADING_MESSAGES.length]);
        i++;
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    
    setStatus(AppState.LOADING);
    const currentUserInput = input;
    setInput('');
    
    try {
      const result = await papirrinService.analyzeIdea(currentUserInput);
      const newEntry: ChatHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        userInput: currentUserInput,
        aiResponse: result || 'Algo salió mal, pero no tanto como tu idea.'
      };
      
      setHistory(prev => [newEntry, ...prev]);
      setStatus(AppState.SUCCESS);
    } catch (error) {
      console.error(error);
      setStatus(AppState.ERROR);
    }
  };

  const playAudio = async (text: string, id: string) => {
    if (!text || audioLoadingId) return;
    
    setAudioLoadingId(id);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      const base64 = await papirrinService.generateAudioResponse(text);
      
      if (base64) {
        const audioBuffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (error) {
      console.error("Audio playback error:", error);
    } finally {
      setAudioLoadingId(null);
    }
  };

  const clearHistory = () => {
    if (confirm('¿Seguro que quieres borrar tus humillaciones pasadas, güey?')) {
      setHistory([]);
      papirrinService.resetSession();
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const renderSection = (title: string, content: string, color: string) => (
    <div key={title} className="mb-4">
      <h4 className={`text-sm font-black mb-1 uppercase ${color}`}>{title}</h4>
      <div className="text-gray-300 leading-relaxed whitespace-pre-wrap font-medium text-sm md:text-base">
        {content}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <header className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-orange-600 mb-2 drop-shadow-lg tracking-tighter">
          PAPIRRIN V3.0
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-400 italic">
          "SINCERIDAD BRUTAL O NADA, GÜEY"
        </p>
      </header>

      <main className="max-w-4xl w-full">
        <div className="mb-8 relative">
          <textarea
            className="w-full h-40 p-6 bg-zinc-900 text-green-500 font-bold text-lg neo-brutalist-border brutal-shadow focus:outline-none focus:ring-2 focus:ring-orange-600 resize-none placeholder:text-zinc-700"
            placeholder="¿Qué pendejada traes hoy? Suéltala..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status === AppState.LOADING}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) handleAnalyze();
            }}
          />
          <div className="absolute -top-3 -left-3 bg-orange-600 text-white px-2 py-1 text-xs font-black uppercase neo-brutalist-border">
            Nueva Misión
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-between items-center mb-12">
          <div className="flex gap-4">
            <BrutalButton 
              onClick={handleAnalyze} 
              isLoading={status === AppState.LOADING}
              className="text-lg"
            >
              Ejecutar ⚡
            </BrutalButton>
            
            {history.length > 0 && (
              <BrutalButton 
                onClick={clearHistory} 
                variant="danger"
                className="text-lg"
              >
                Limpiar 💀
              </BrutalButton>
            )}
          </div>
          <span className="text-zinc-500 font-bold text-sm hidden md:block">
            CTRL + ENTER PARA ENVIAR
          </span>
        </div>

        {status === AppState.LOADING && (
          <div className="flex flex-col items-center justify-center p-12 mb-8 bg-zinc-900 neo-brutalist-border brutal-shadow animate-pulse">
            <div className="w-16 h-16 border-8 border-orange-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-2xl font-black text-orange-600 uppercase text-center">{loadingMsg}</p>
          </div>
        )}

        {status === AppState.ERROR && (
          <div className="p-8 mb-8 bg-red-900 neo-brutalist-border brutal-shadow text-white text-center">
            <h2 className="text-3xl font-black mb-2 uppercase">¡VALIÓ MADRE!</h2>
            <p className="text-xl font-bold">Algo falló. Probablemente tu idea es tan mala que rompió el servidor.</p>
            <BrutalButton onClick={() => setStatus(AppState.IDLE)} className="mt-4" variant="danger">Intentar de nuevo</BrutalButton>
          </div>
        )}

        <div className="space-y-12">
          {history.length > 0 ? (
            history.map((item) => (
              <div key={item.id} className="relative group">
                {/* User Input bubble/card */}
                <div className="mb-4 ml-auto max-w-[90%] md:max-w-[80%]">
                   <div className="bg-zinc-800 p-4 neo-brutalist-border border-zinc-700 italic text-zinc-400 font-bold">
                     <span className="text-orange-500 mr-2">TU:</span> "{item.userInput}"
                   </div>
                </div>

                {/* AI Response card */}
                <div className="neo-brutalist-border bg-zinc-950 p-6 brutal-shadow-active md:brutal-shadow transition-all group-hover:scale-[1.01]">
                   <div className="flex justify-between items-start mb-6 border-b-2 border-zinc-800 pb-2">
                     <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                       Papirrin V3.0 dice...
                     </h3>
                     <div className="flex gap-2">
                        <button 
                          onClick={() => playAudio(item.aiResponse, item.id)}
                          disabled={!!audioLoadingId}
                          className={`p-2 neo-brutalist-border bg-green-600 text-white hover:bg-green-500 active:translate-y-1 disabled:opacity-50`}
                          title="Escuchar madrazo"
                        >
                          {audioLoadingId === item.id ? '⌛' : '🔊'}
                        </button>
                        <span className="text-[10px] text-zinc-600 font-mono mt-1 hidden sm:block">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                     </div>
                   </div>

                   <div className="space-y-4">
                     {item.aiResponse.split(/\d\.\s\*\*/).filter(s => s.trim()).map((chunk, idx) => {
                       const titles = ["EL ESPEJO", "EL MADRAZO", "EL CAMINO"];
                       const colors = ["text-blue-500", "text-red-500", "text-green-500"];
                       const cleanContent = chunk.includes('**') ? chunk.split('**')[1]?.trim() || chunk : chunk;
                       
                       return renderSection(titles[idx] || "ANÁLISIS", cleanContent, colors[idx] || "text-white");
                     })}
                   </div>
                </div>
              </div>
            ))
          ) : (
            status !== AppState.LOADING && (
              <div className="text-center py-20 border-4 border-dashed border-zinc-800">
                <p className="text-zinc-600 text-2xl font-black uppercase opacity-30">No hay historial. Estás limpio (por ahora).</p>
              </div>
            )
          )}
        </div>
      </main>

      <footer className="mt-20 py-8 text-zinc-600 font-bold uppercase text-sm tracking-widest text-center border-t border-zinc-800 w-full max-w-4xl">
        Papirrin V3.0 © {new Date().getFullYear()} - Sin miedos, sin filtros, puro jale.
      </footer>
    </div>
  );
};

export default App;
