import React from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useProject } from '../context/ProjectContext';

const Dashboard: React.FC = () => {
  const { project, activeResult: result, isCalculating, activeMonteCarlo, isMonteCarloRunning, runMonteCarlo } = useProject();
  if (!project || !result) {
    return <div className="p-8 text-center animate-pulse text-[10px] font-black uppercase text-blue-500">Carregando Dashboard...</div>;
  }
  const stats = [
    { label: 'Carga Trafo', value: `${result.kpis.trafoOccupation.toFixed(1)}%`, icon: '🏬', status: result.kpis.trafoOccupation > 100 ? 'critical' : 'ok' },
    { label: 'Queda de Tensão', value: `${result.kpis.maxCqt.toFixed(2)}%`, icon: '📉', status: result.kpis.maxCqt > 6 ? 'warning' : 'ok' },
    { label: 'Potência Total', value: `${result.kpis.totalLoad.toFixed(1)} kVA`, icon: '⚡', status: 'neutral' },
    { label: 'Consumidores', value: String(result.kpis.totalCustomers), icon: '🏠', status: 'neutral' },
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
      
      {/* KPI Grid Light Glass */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass p-8 rounded-[40px] border-white group relative overflow-hidden transition-all duration-500 hover:bg-white/60">
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-[0.05] group-hover:scale-125 transition-transform">{stat.icon}</div>
            <div className="flex justify-between items-start mb-8 relative z-10">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</span>
               <span className="text-xl group-hover:animate-bounce">{stat.icon}</span>
            </div>
            <p className={`text-4xl font-black tracking-tighter relative z-10
              ${stat.status === 'critical' ? 'text-red-500' : 
                stat.status === 'warning' ? 'text-orange-500' : 
                stat.status === 'positive' ? 'text-green-600' : 'text-blue-900'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-10 rounded-[48px] border-white">
          <header className="mb-12 flex justify-between items-end">
            <div>
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-[0.2em]">Fluxo de Corrente por Trecho</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest opacity-70">Monitoramento térmico em tempo real</p>
            </div>
            <div className="flex gap-6">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Demanda</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200"></div><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Limite</span></div>
            </div>
          </header>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(0,0,0,0.02)" />
                 <XAxis dataKey="id" tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                 <YAxis unit="A" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                 <Tooltip 
                    cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} 
                    contentStyle={{ borderRadius: '24px', border: 'none', fontWeight: 900, boxShadow: '0 20px 60px rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }} 
                 />
                 <Bar dataKey="current" fill="#3b82f6" radius={[12, 12, 12, 12]} barSize={24} />
                 <Bar dataKey="limit" fill="#f1f5f9" radius={[12, 12, 12, 12]} barSize={24} />
               </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-10 rounded-[48px] border-white flex flex-col">
          <h4 className="font-black text-slate-800 text-xs uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
            Diagnóstico IA
          </h4>
          <div className="space-y-4 flex-1 custom-scrollbar overflow-y-auto pr-3">
            {result.warnings.length > 0 ? (
               result.warnings.map((w, i) => (
                 <div key={i} className="flex gap-4 items-start p-5 bg-white/40 rounded-3xl border border-orange-100 hover:border-orange-200 transition-all">
                   <div className="w-10 h-10 shrink-0 bg-orange-50 rounded-2xl flex items-center justify-center text-xl">⚡</div>
                   <p className="text-[11px] font-bold text-slate-700 leading-relaxed pt-1 uppercase tracking-tight">{w}</p>
                 </div>
               ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-3xl mb-6">✓</div>
                <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Sistema Estável</p>
              </div>
            )}
          </div>
          <button className="mt-10 w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">
            Consultar Analista Theseus
          </button>
        </div>
      </div>

      {/* Monte Carlo (sob demanda) */}
      <div className="glass p-10 rounded-[48px] border-white">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h4 className="font-black text-slate-800 text-xs uppercase tracking-[0.2em]">Simulação Monte Carlo</h4>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest opacity-70">
              Variabilidade de carga/GD e risco de violação (sob demanda)
            </p>
          </div>
          <button
            onClick={() => runMonteCarlo(1000)}
            disabled={isMonteCarloRunning}
            className="px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all border border-white/60 bg-blue-600 text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isMonteCarloRunning ? 'Rodando...' : 'Rodar Simulação'}
          </button>
        </header>

        {!activeMonteCarlo ? (
          <div className="py-10 text-center opacity-60">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Clique em “Rodar Simulação” para gerar o histograma e métricas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeMonteCarlo.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(0,0,0,0.02)" />
                    <XAxis dataKey="x" tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      contentStyle={{ borderRadius: '24px', border: 'none', fontWeight: 900, boxShadow: '0 20px 60px rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}
                      labelFormatter={(v) => `Max CQT ≤ ${v}%`}
                    />
                    <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="glass-dark p-6 rounded-[28px] border border-white/80">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Índice de Estabilidade</div>
                <div className="text-3xl font-black tracking-tighter text-blue-900 mt-2">
                  {(activeMonteCarlo.stabilityIndex * 100).toFixed(0)}%
                </div>
              </div>
              <div className="glass-dark p-6 rounded-[28px] border border-white/80">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Risco de Falha</div>
                <div className="text-3xl font-black tracking-tighter text-red-500 mt-2">
                  {(activeMonteCarlo.failureRisk * 100).toFixed(1)}%
                </div>
              </div>
              <div className="glass-dark p-6 rounded-[28px] border border-white/80">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">P95 (Max CQT)</div>
                <div className="text-3xl font-black tracking-tighter text-orange-600 mt-2">
                  {activeMonteCarlo.p95Cqt.toFixed(2)}%
                </div>
              </div>
              <div className="glass-dark p-6 rounded-[28px] border border-white/80">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Média (Max CQT)</div>
                <div className="text-3xl font-black tracking-tighter text-slate-800 mt-2">
                  {activeMonteCarlo.avgMaxCqt.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;