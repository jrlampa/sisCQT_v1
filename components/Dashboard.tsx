
import React, { useState, useEffect, useMemo } from 'react';
import { Project, EngineResult } from '../types';
import { 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useToast } from '../context/ToastContext';

interface DashboardProps {
  project: Project;
  result: EngineResult;
  isCalculating?: boolean;
  onUpdateMetadata: (metadata: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ project, result, isCalculating, onUpdateMetadata }) => {
  const { showToast } = useToast();
  
  const stats = [
    { label: 'Ocupação do Trafo', value: `${result.kpis.trafoOccupation.toFixed(1)}%`, icon: '🏬', status: result.kpis.trafoOccupation > 100 ? 'critical' : 'ok' },
    { label: 'Queda de Tensão Máx', value: `${result.kpis.maxCqt.toFixed(2)}%`, icon: '📉', status: result.kpis.maxCqt > 6 ? 'warning' : 'ok' },
    { label: 'Carga Instalada', value: `${result.kpis.totalLoad.toFixed(2)} kVA`, icon: '⚡', status: 'neutral' },
    { label: 'Consumidores', value: result.kpis.totalCustomers, icon: '🏠', status: 'neutral' },
    { label: 'Redução CO2 Est.', value: `${result.sustainability.annualCo2Kg.toFixed(0)} kg`, icon: '🌿', status: 'positive' }
  ];

  const chartData = result.nodes
    .filter(n => n.id !== 'TRAFO')
    .map(n => ({ 
      id: n.id, 
      current: Number((n.calculatedLoad || 0).toFixed(1)), // Arredondamento apenas para o gráfico
      limit: project.cables[n.cable]?.ampacity || 100
    }))
    .slice(0, 15);

  return (
    <div className={`flex flex-col gap-8 pb-20 transition-all duration-700 ${isCalculating ? 'opacity-50 blur-[4px]' : 'opacity-100'}`}>
      
      {/* Barra de Status Enterprise */}
      <div className="flex items-center gap-3 px-8 py-3 bg-white/60 rounded-full w-fit border border-white shadow-sm animate-in fade-in slide-in-from-left-4">
        <div className="relative flex items-center justify-center">
            <span className={`absolute w-3 h-3 rounded-full ${isCalculating ? 'bg-blue-500 animate-ping' : 'bg-green-500 opacity-20'}`}></span>
            <span className={`w-2 h-2 rounded-full ${isCalculating ? 'bg-blue-600' : 'bg-green-500'}`}></span>
        </div>
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            {isCalculating ? 'Calculando Topologia...' : 'Motor de Cálculo em Tempo Real Online'}
        </span>
      </div>

      {/* Grid de KPIs - Design Premium Glassmorphism Light */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass rounded-[32px] p-8 border border-white hover:scale-[1.03] hover:bg-white/60 transition-all duration-500 group">
            <div className="flex justify-between items-start mb-6">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">{stat.label}</span>
               <span className="text-2xl filter drop-shadow-sm">{stat.icon}</span>
            </div>
            <p className={`text-4xl font-black tracking-tighter
              ${stat.status === 'critical' ? 'text-red-600' : 
                stat.status === 'warning' ? 'text-orange-500' : 
                stat.status === 'positive' ? 'text-green-600' : 'text-[#004a80]'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Carregamento */}
        <div className="lg:col-span-2 glass rounded-[40px] p-10 border border-white">
          <header className="mb-10 flex justify-between items-end">
            <div>
                <h4 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em]">Perfil de Corrente de Rede</h4>
                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Trechos em cascata a partir do transformador</p>
            </div>
            <div className="flex gap-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#004a80]"></div><span className="text-[9px] font-black text-gray-400 uppercase">Carga</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-200"></div><span className="text-[9px] font-black text-gray-400 uppercase">Limite</span></div>
            </div>
          </header>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                 <XAxis dataKey="id" tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                 <YAxis unit="A" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                 <Tooltip 
                    cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} 
                    contentStyle={{ borderRadius: '24px', border: 'none', fontWeight: 900, boxShadow: '0 20px 50px rgba(0,74,128,0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }} 
                 />
                 <Bar dataKey="current" fill="#004a80" radius={[12, 12, 4, 4]} barSize={32} />
                 <Bar dataKey="limit" fill="#e2e8f0" radius={[12, 12, 4, 4]} barSize={32} opacity={0.5} />
               </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notificações Theseus Core */}
        <div className="glass rounded-[40px] p-10 border border-white flex flex-col bg-gradient-to-br from-white/40 to-white/10">
          <h4 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
            Diagnóstico Cognitivo
          </h4>
          <div className="space-y-6 flex-1 custom-scrollbar overflow-y-auto pr-2">
            {result.warnings.length > 0 ? (
               result.warnings.map((w, i) => (
                 <div key={i} className="flex gap-4 items-start p-5 bg-orange-50/50 rounded-3xl border border-orange-100 hover:bg-orange-100/50 transition-colors group">
                   <span className="text-xl group-hover:scale-110 transition-transform">⚡</span>
                   <p className="text-[11px] font-bold text-orange-800 leading-relaxed">{w}</p>
                 </div>
               ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-10">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-3xl mb-6 shadow-inner">✅</div>
                <p className="text-xs font-black uppercase text-gray-500 tracking-widest">Rede Nominal</p>
                <p className="text-[10px] font-bold text-gray-400 mt-2 px-6">Todos os parâmetros técnicos estão em conformidade com as normas vigentes.</p>
              </div>
            )}
          </div>
          <button className="mt-10 w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:scale-[1.02] hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
            Analista de IA Theseus ➔
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
