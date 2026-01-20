
import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/geminiService';

const ImageAnalyzer: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!image) return;
    setLoading(true);
    const base64 = image.split(',')[1];
    const result = await GeminiService.analyzeInfrastructureImage(base64);
    setAnalysis(result);
    setLoading(false);
  };

  const triggerCapture = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full animate-in fade-in duration-700 pb-12 relative">
      {/* Overlay de Funcionalidade Desativada */}
      <div className="absolute inset-0 z-[100] bg-white/20 backdrop-blur-[2px] rounded-[40px] flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 p-8 rounded-[32px] shadow-2xl border border-blue-100 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl">🏗️</div>
              <div className="text-center">
                  <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Recurso em Manutenção</h3>
                  <p className="text-sm text-gray-500 font-medium">A Visão de Campo está sendo otimizada para o modo Scale-up.</p>
              </div>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">Lançamento em breve</span>
          </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 opacity-40">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <span className="text-3xl">📸</span> Visão de Campo Theseus
          </h2>
          <p className="text-sm text-gray-500 font-medium">Reconhecimento automático de ativos e diagnóstico de infraestrutura</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*" 
            capture="environment"
            onChange={handleFileUpload} 
            className="hidden"
          />
          <button 
            disabled
            className="bg-gray-200 border border-gray-300 text-gray-400 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed"
          >
            Indisponível
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 opacity-40 grayscale-[0.5]">
        <div className="flex flex-col gap-6">
          <div 
            className={`glass-dark rounded-[40px] h-[500px] flex items-center justify-center overflow-hidden relative border-2 border-dashed border-blue-100`}
          >
            <div className="text-center p-12">
              <div className="text-7xl mb-6 bg-blue-50 w-24 h-24 flex items-center justify-center rounded-3xl mx-auto shadow-inner">📷</div>
              <h4 className="text-lg font-black text-gray-400">Captura Desativada</h4>
            </div>
          </div>
          
          <button
            disabled
            className="w-full bg-gray-200 text-gray-400 py-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3"
          >
            ✨ Aguardando Reativação
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass-dark rounded-[40px] p-10 flex flex-col gap-6 min-h-[500px] shadow-sm border border-white/80">
            <header className="flex items-center justify-between border-b border-blue-50 pb-6">
                <h3 className="font-black text-gray-400 flex items-center gap-3">
                  <span className="w-2 h-6 bg-gray-200 rounded-full"></span>
                  RELATÓRIO DE INSPEÇÃO
                </h3>
            </header>
            <div className="flex flex-col items-center justify-center h-full mt-20 opacity-30 text-center">
                <div className="text-5xl mb-4">📑</div>
                <p className="text-base font-bold text-gray-400">Recurso Indisponível</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageAnalyzer;
