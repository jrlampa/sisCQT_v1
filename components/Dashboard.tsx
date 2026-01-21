
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
  // FIX: useToast hook should be called instead of shadowing the function name
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
      current: Number((n.calculatedLoad || 0).toFixed(1)),
      limit: project.cables[n.cable]?.ampacity || 100
    }))
    .slice(0, 15);

  return (
    <div className={`flex flex-col gap-8 pb-20 transition-all duration-500 ${isCalculating ? 'opacity-60 blur-[2px]' : 'opacity-100'}`}>
      
      {/* Sincronismo BE */}
      <div className="flex items-center gap-2 px-6 py-2 bg-white/40 rounded-full w-fit border border-white/60 animate-in fade-in">
        <span className={`w-2 h-2 rounded-full ${isCalculating ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></span>
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
            {isCalculating ? 'Processando Sincronismo Theseus Core...' : 'Cálculos em Tempo Real Ativos'}
        </span>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass-dark rounded-[32px] p-8 border border-white/80 shadow-sm flex flex-col justify-between h-44 hover:scale-[1.03] transition-all">
            <div className="flex justify-between items-start">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
               <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className={`text-3xl font-black tracking-tighter
              ${stat.status === 'critical' ? 'text-red-600' : 
                stat.status === 'warning' ? 'text-orange-500' : 
                stat.status === 'positive' ? 'text-green-600' : 'text-gray-800'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Carregamento Principal */}
        <div className="lg:col-span-2 glass-dark rounded-[40px] p-10 shadow-sm border border-white/80">
          <header className="mb-8">
            <h4 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em]">Fluxo de Corrente Longitudinal</h4>
            <p className="text-[10px] text-gray-400 font-bold mt-1">Comparativo Ampacidade Nominal vs Carga Diversificada</p>
          </header>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="id" tick={{ fontSize: 10, fontWeight: 900 }} axisLine={false} />
                 <YAxis unit="A" tick={{ fontSize: 10 }} axisLine={false} />
                 <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: 900, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                 <Bar dataKey="current" fill="#004a80" radius={[10, 10, 0, 0]} barSize={30} />
                 <Bar dataKey="limit" fill="#cbd5e1" radius={[10, 10, 0, 0]} barSize={30} opacity={0.3} />
               </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notificações de IA Contextual */}
        <div className="glass-dark rounded-[40px] p-10 shadow-sm border border-white/80 flex flex-col">
          <h4 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] mb-8">Diagnósticos Theseus AI</h4>
          <div className="space-y-6 flex-1">
            {result.warnings.length > 0 ? (
               result.warnings.map((w, i) => (
                 <div key={i} className="flex gap-4 items-start p-4 bg-orange-50 rounded-2xl border border-orange-100 animate-in slide-in-from-right-4">
                   <span className="text-xl">⚡</span>
                   <p className="text-[11px] font-bold text-orange-800 leading-tight">{w}</p>
                 </div>
               ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-2xl mb-4">🛡️</div>
                <p className="text-xs font-black uppercase text-gray-500">Rede Nominal</p>
                <p className="text-[10px] font-bold text-gray-400 mt-2 px-10">Não foram detectadas violações de limites normativos no cenário ativo.</p>
              </div>
            )}
          </div>
          <button className="mt-8 w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 transition-all">
            Abrir Theseus Chat ➔
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
