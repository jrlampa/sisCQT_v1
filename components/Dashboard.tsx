import React from 'react';
import { Project, EngineResult } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  project: Project;
  result: EngineResult;
  isCalculating?: boolean;
  onUpdateMetadata: (metadata: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ project, result, isCalculating }) => {
  const stats = [
    { label: 'Carga Trafo', value: `${result.kpis.trafoOccupation.toFixed(1)}%`, icon: '🏬', status: result.kpis.trafoOccupation > 100 ? 'critical' : 'ok' },
    { label: 'Queda de Tensão', value: `${result.kpis.maxCqt.toFixed(2)}%`, icon: '📉', status: result.kpis.maxCqt > 6 ? 'warning' : 'ok' },
    { label: 'Potência Total', value: `${result.kpis.totalLoad.toFixed(1)} kVA`, icon: '⚡', status: 'neutral' },
    { label: 'Consumidores', value: result.kpis.totalCustomers, icon: '🏠', status: 'neutral' },
    { label: 'Emissão CO2', value: `${result.sustainability.annualCo2Kg.toFixed(0)} kg`, icon: '🌿', status: 'positive' }
  ];

  const chartData = result.nodes
    .filter(n => n.id !== 'TRAFO')
    .map(n => ({ 
      id: n.id, 
      current: Number((n.calculatedLoad || 0).toFixed(1)),
      limit: project.cables[n.cable]?.ampacity || 100
    }))
    .slice(0, 12);

  return (
    <div className={`flex flex-col gap-10 pb-16 transition-all duration-700 ${isCalculating ? 'opacity-40 blur-[2px]' : 'opacity-100'}`}>
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass p-8 rounded-[40px] border-white/90 hover:bg-white/70 transition-all duration-500 group relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-[0.03] group-hover:scale-125 transition-transform">{stat.icon}</div>
            <div className="flex justify-between items-start mb-8 relative z-10">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{stat.label}</span>
               <span className="text-xl group-hover:animate-bounce">{stat.icon}</span>
            </div>
            <p className={`text-4xl font-black tracking-tighter relative z-10
              ${stat.status === 'critical' ? 'text-red-500' : 
                stat.status === 'warning' ? 'text-orange-500' : 
                stat.status === 'positive' ? 'text-green-600' : 'text-[#004a80]'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Loading Profile Chart */}
        <div className="lg:col-span-2 glass-dark rounded-[48px] p-10 border-white/60">
          <header className="mb-12 flex justify-between items-end">
            <div>
                <h4 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em]">Fluxo de Corrente por Trecho</h4>
                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest opacity-70">Monitoramento térmico da topologia em cascata</p>
            </div>
            <div className="flex gap-6">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600 shadow-lg shadow-blue-100"></div><span className="text-[9px] font-black text-gray-400 uppercase">Demanda</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-200"></div><span className="text-[9px] font-black text-gray-400 uppercase">Limite Cabo</span></div>
            </div>
          </header>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(0,0,0,0.03)" />
                 <XAxis dataKey="id" tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                 <YAxis unit="A" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                 <Tooltip 
                    cursor={{fill: 'rgba(59, 130, 246, 0.03)'}} 
                    contentStyle={{ borderRadius: '24px', border: 'none', fontWeight: 900, boxShadow: '0 20px 60px rgba(0,74,128,0.1)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(15px)' }} 
                 />
                 <Bar dataKey="current" fill="#2563eb" radius={[12, 12, 12, 12]} barSize={24} />
                 <Bar dataKey="limit" fill="#f1f5f9" radius={[12, 12, 12, 12]} barSize={24} />
               </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intelligence Warnings */}
        <div className="glass-dark rounded-[48px] p-10 border-white/60 flex flex-col">
          <h4 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
            <span className="w-2.5 h-6 bg-blue-600 rounded-full"></span>
            Diagnóstico Theseus
          </h4>
          <div className="space-y-4 flex-1 custom-scrollbar overflow-y-auto pr-3">
            {result.warnings.length > 0 ? (
               result.warnings.map((w, i) => (
                 <div key={i} className="flex gap-4 items-start p-5 bg-white/50 rounded-3xl border border-orange-100 hover:border-orange-200 transition-all group">
                   <div className="w-10 h-10 shrink-0 bg-orange-100 rounded-2xl flex items-center justify-center text-xl group-hover:rotate-12 transition-transform">⚡</div>
                   <p className="text-[11px] font-bold text-gray-700 leading-relaxed pt-1 uppercase tracking-tight">{w}</p>
                 </div>
               ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-10">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-4xl mb-6 border border-green-100 shadow-inner">✓</div>
                <p className="text-xs font-black uppercase text-gray-500 tracking-widest">Rede Nominal</p>
                <p className="text-[10px] font-bold text-gray-400 mt-2 px-8">Sem violações normativas detectadas no cenário atual.</p>
              </div>
            )}
          </div>
          <button className="mt-10 w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 group">
            Consultar Analista IA <span className="group-hover:translate-x-1 transition-transform">➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;