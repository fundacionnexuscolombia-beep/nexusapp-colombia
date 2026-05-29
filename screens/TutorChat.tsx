
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateTutorResponse } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { Message } from '../types';

const TutorChat: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: '¡Hola! Soy tu Tutor Nexus. Usa tus gemas 💎 para generar preguntas de práctica de las distintas materias.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gemBalance, setGemBalance] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch initial gem balance
  useEffect(() => {
    const fetchGems = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('ai_gems')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setGemBalance(profile.ai_gems ?? 0);
        }
      }
    };
    fetchGems();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // 1. Verificación del balance de Gemas
    try {
      if (gemBalance !== null && gemBalance <= 0) {
        const limitMsg: Message = {
          role: 'model',
          text: 'Te has quedado sin gemas 💎 por el momento. ¡Comunícate con soporte para recargar tu cuenta y seguir obteniendo preguntas de práctica!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, { role: 'user', text: input, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, limitMsg]);
        setInput('');
        return;
      }
    } catch (err) {
      console.error("Error verificando límite:", err);
    }

    const userMsg: Message = {
      role: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await generateTutorResponse(input, history);

      // Descontar una gema tras una solicitud exitosa
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('ai_gems').eq('id', user.id).single();
        const currentGems = profile?.ai_gems ?? 0;
        const newBalance = Math.max(0, currentGems - 1);
        
        await supabase.from('profiles').update({ ai_gems: newBalance }).eq('id', user.id);
        setGemBalance(newBalance);
      }

      const modelMsg: Message = {
        role: 'model',
        text: response || 'Lo siento, no pude procesar tu solicitud.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      let errorMessage = 'Error conectando con el Tutor. Por favor intenta de nuevo.';

      if (error instanceof Error) {
        errorMessage = error.message;
        // Try to parse JSON error from GoogleGenAI
        try {
          if (errorMessage.includes('{')) {
            const parsed = JSON.parse(errorMessage.substring(errorMessage.indexOf('{')));
            if (parsed.error && parsed.error.message) {
              errorMessage = `Error (${parsed.error.code || 'API'}): ${parsed.error.message}`;
              if (parsed.error.status === 'UNAVAILABLE') {
                errorMessage = 'El Tutor está un poco ocupado (Sobrecarga del sistema). Por favor intenta de nuevo en unos segundos.';
              }
              if (parsed.error.code === 429 || parsed.error.message.includes('Quota exceeded')) {
                errorMessage = 'Se ha excedido la cuota gratuita de la API de Google Gemini. Por favor intenta más tarde o verifica tu API Key.';
              }
            }
          }
        } catch (e) {
          // Fallback to raw message if parsing fails
        }
      }

      const errMsg: Message = {
        role: 'model',
        text: errorMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center p-4 justify-between w-full">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="flex items-center justify-center size-10 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800">
              <span className="material-symbols-outlined text-[#0d131b] dark:text-white">arrow_back_ios_new</span>
            </button>
            <div className="flex flex-col">
              <h1 className="text-[#0d131b] dark:text-white text-lg font-bold leading-tight">Chat del Tutor IA</h1>
              <div className="flex items-center gap-1.5">
                <span className="size-2 bg-green-500 rounded-full"></span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">En línea ahora</span>
              </div>
            </div>
          </div>
          {gemBalance !== null && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/40 dark:to-blue-900/40 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 shadow-sm">
                <span className="text-[16px] leading-none drop-shadow-sm">💎</span>
                <span className="text-indigo-800 dark:text-indigo-200 font-bold text-sm">{gemBalance}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 mr-1 font-medium tracking-wide uppercase">Gemas disponibles</span>
            </div>
          )}
        </div>
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {/* Recordatorio Banner */}
        <div className="mb-4">
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10">
            <div className="flex flex-col gap-1">
              <p className="text-primary text-sm font-bold leading-tight uppercase tracking-wider">Recordatorio de aprendizaje</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm font-normal leading-relaxed">No resuelvo exámenes, te ayudo a aprender de forma sencilla para que alcances tu título de bachiller.</p>
            </div>
            <a className="text-xs font-bold leading-normal tracking-wide flex items-center gap-1 text-primary hover:underline" href="#">
              Saber más sobre Nexus
              <span className="material-symbols-outlined !text-[16px]">arrow_forward</span>
            </a>
          </div>
        </div>

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'items-end gap-3'} max-w-full`}>
            {msg.role === 'model' && (
              <div className="bg-primary/10 rounded-full p-1 shrink-0">
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8" style={{ backgroundImage: `url(https://picsum.photos/seed/ai-tutor/100/100)` }}></div>
              </div>
            )}
            <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
              {msg.role === 'model' && <p className="text-slate-400 text-[11px] font-medium ml-1">Tutor Nexus</p>}
              <div className={`text-base font-normal leading-normal rounded-xl px-4 py-3 shadow-sm border ${msg.role === 'user' ? 'bg-primary text-white border-primary rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-gray-100 dark:border-gray-700 rounded-bl-none'}`}>
                {msg.text}
              </div>
              <p className="text-slate-400 text-[11px] font-medium px-1">{msg.role === 'user' ? `Visto ${msg.timestamp}` : msg.timestamp}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic ml-12">
            <span className="animate-pulse">Tutor Nexus está pensando...</span>
          </div>
        )}
      </main>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-900 pt-2 pb-24 px-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar scroll-smooth">
          {['Preguntas Generales Lenguaje', 'Preguntas Principales Matemáticas', 'Preguntas Bases Ciencias'].map((chip, i) => (
            <button key={i} onClick={() => setInput(chip)} className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 px-4 cursor-pointer hover:bg-primary/10 transition-colors shadow-sm">
              <span className={`material-symbols-outlined text-${['blue', 'orange', 'green'][i]}-600 dark:text-${['blue', 'orange', 'green'][i]}-400 !text-[20px]`}>{['menu_book', 'calculate', 'biotech'][i]}</span>
              <p className="text-slate-700 dark:text-indigo-100 text-[13px] font-semibold whitespace-nowrap">{chip}</p>
              <div className="flex items-center justify-center bg-white dark:bg-indigo-950 rounded-full px-1.5 border border-indigo-100 dark:border-indigo-800 ml-1">
                <span className="text-[10px]">💎 1</span>
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shrink-0 border-2 border-primary/20" style={{ backgroundImage: `url(https://picsum.photos/seed/diego/100/100)` }}></div>
          <div className="flex flex-1 items-end bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-2 focus-within:border-primary transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 text-base py-4 resize-none max-h-60 overflow-y-auto block w-full leading-relaxed"
              placeholder="Escribe tu duda aquí..."
              rows={1}
              style={{ minHeight: '56px' }}
            />
            <div className="flex items-center gap-1 mb-2 shrink-0">
              <button className="flex items-center justify-center p-2 text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">photo_camera</span>
              </button>
              <button className="flex items-center justify-center p-2 text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">mic</span>
              </button>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`flex items-center justify-center size-10 rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-95 transition-all ${isLoading ? 'opacity-50' : ''}`}
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorChat;
