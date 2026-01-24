
import React, { useState, useRef, useEffect } from 'react';
import { ApiService } from '../services/apiService';
import { Project, EngineResult } from '../types';
import { useProject } from '../context/ProjectContext';

const Chatbot: React.FC = () => {
  const { project, activeResult: result } = useProject();

  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Olá Engenheiro! Sou o Theseus. Analisei os fluxos de carga e as quedas de tensão do seu cenário atual. Estou pronto para otimizar essa rede com você. O que deseja validar agora?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!project || !result) {
    return <div className="p-8 text-center animate-pulse text-[10px] font-black uppercase text-blue-500">Carregando Chatbot...</div>;
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Preparar contexto técnico detalhado para a IA
    const criticalPoints = result.nodes.filter(n => {
      const cable = (project.cables as any)?.[n.cable];
      return (n.calculatedLoad || 0) > (cable?.ampacity || 0) || (n.accumulatedCqt || 0) > 6;
    });

    const technicalContext = {
      scenarioName: project.scenarios.find(s => s.id === result.scenarioId)?.name || 'Desconhecido',
      kpis: result.kpis,
      warnings: result.warnings,
      criticalNodes: criticalPoints.map(n => ({
        id: n.id,
        corrente: n.calculatedLoad?.toFixed(1) + 'A',
        quedaTensao: n.accumulatedCqt?.toFixed(2) + '%',
        cabo: n.cable
      }))
    };

    try {
      // Usando ApiService para delegar ao backend ou fallback local
      const response = await ApiService.askAI(userMsg, technicalContext);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (err) {
      const msg =
        (err as any)?.message ||
        "Desculpe, ocorreu um erro ao processar sua solicitação técnica.";
      setMessages(prev => [...prev, { role: 'ai', text: msg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-4xl mx-auto w-full animate-in zoom-in-95 duration-300">
      <header className="flex items-center gap-4 bg-white/40 p-6 rounded-3xl border border-white/60">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg shadow-blue-200 border border-blue-400">⚡</div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Theseus: Inteligência de Rede</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-blue-600 font-black tracking-widest uppercase">Expert Normativa BT</span>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Interface Theseus Core 3.1</span>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200">
            Sincronizado
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 scroll-smooth custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm transition-all ${
            m.role === 'user' 
              ? 'bg-blue-600 text-white self-end rounded-br-none' 
              : 'glass-dark text-gray-700 self-start rounded-bl-none border-l-4 border-blue-500'
          }`}>
            <div className="whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="glass-dark self-start p-4 rounded-3xl flex gap-2 items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-.5s]"></div>
          </div>
        )}
      </div>

      <div className="glass-dark p-3 rounded-full flex items-center gap-3 border border-white/80 shadow-inner">
        <input 
          className="flex-1 bg-transparent px-6 py-2 outline-none text-gray-700 font-medium text-sm placeholder:text-gray-400"
          placeholder="Peça ao Theseus para analisar o carregamento ou sugerir cabos..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          ➔
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
