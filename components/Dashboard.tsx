
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
  const [localLat, setLocalLat] = useState(project.metadata.lat.toString());
  const [localLng, setLocalLng] = useState(project.metadata.lng.toString());
  const [isSimulating, setIsSimulating] = useState(false);
  const [stochasticResult, setStochasticResult] = useState(result.stochastic);

  useEffect(() => {
    setLocalLat(project.metadata.lat.toString());
    setLocalLng(project.metadata.lng.toString());
  }, [project.metadata.lat, project.metadata.lng]);

  const activeScenario = project.scenarios.find(s => s.id === project.activeScenarioId)!;

  const handleMonteCarlo = () => {
    setIsSimulating(true);
    const worker = new Worker(new URL('../services/electricalWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'MONTE_CARLO_RESULT') {
        setStochasticResult(payload);
        setIsSimulating(false);
        showToast("Análise estocástica concluída com 1500 iterações.", "success");
        worker.terminate();
      } else if (type === 'ERROR') {
        showToast("Erro ao processar simulação.", "error");
        setIsSimulating(false);
        worker.terminate();
      }
    };

    worker.onerror = () => {
      showToast("Falha no thread de cálculo.", "error");
      setIsSimulating(false);
      worker.terminate();
    };

    worker.postMessage({
      type: 'RUN_MONTE_CARLO',
      payload: {
        nodes: activeScenario.nodes,
        params: activeScenario.params,
        cables: project.cables,
        ips: project.ipTypes,
        iterations: 1500
      }
    });
  };

  const reliabilityIndex = useMemo(() => {
    const { maxCqt, trafoOccupation } = result.kpis;
    const scoreCqt = Math.max(0, 100 - (maxCqt / 6) * 100);
    let scoreTrafo = 100;
    if (trafoOccupation > 80) {
      scoreTrafo = Math.max(0, 100 - ((trafoOccupation - 80) / 40) * 100);
    }
    return Math.round((scoreCqt * 0.7) + (scoreTrafo * 0.3));
  }, [result.kpis.maxCqt, result.kpis.trafoOccupation]);

  const getReliabilityColor = (val: number) => {
    if (val > 85) return 'text-green-600';
    if (val > 60) return 'text-orange-500';
    return 'text-red-600';
  };

  const stats = [
    { label: 'Índice Confiabilidade', value: `${reliabilityIndex}`, icon: '🛡️', color: getReliabilityColor(reliabilityIndex) },
    { label: 'Carga Instalada', value: `${result.kpis.totalLoad.toFixed(2)} kVA`, icon: '⚡', color: 'text-blue-700' },
    { label: 'Ocupação Trafo', value: `${result.kpis.trafoOccupation.toFixed(1)}%`, icon: '🏬', color: result.kpis.trafoOccupation > 100 ? 'text-red-600' : 'text-green-600' },
    { label: 'Queda Máxima', value: `${result.kpis.maxCqt.toFixed(2)}%`, icon: '📉', color: result.kpis.maxCqt > 6 ? 'text-orange-600' : 'text-blue-600' },
    { label: 'Unid. Consumidoras', value: result.kpis.totalCustomers, icon: '🏠', color: 'text-purple-600' },
  ];

  const chartData = result.nodes
    .filter(n => n.id !== 'TRAFO')
    .map(n => ({ 
      id: n.id, 
      current: Number((n.calculatedLoad || 0).toFixed(1)), 
      limit: project.cables[n.cable]?.ampacity || 0 
    }))
    .slice(-10);

  return (
    <div className={`flex flex-col gap-6 animate-in fade-in duration-500 pb-20 transition-opacity duration-300 ${isCalculating ? 'opacity-70' : 'opacity-100'}`}>
      
      {/* Geotecnia */}
      <section className="glass-dark rounded-[32px] p-6 md:p-8 border border-white/80 shadow-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-[#004a80] rounded-full"></div>
            <h3 className="text-lg font-black text-gray-800 uppercase tracking-tighter">Dados do Local</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-blue-500 uppercase ml-1">SOB</span>
              <input className="bg-white/60 border border-blue-100 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={project.metadata.sob} onChange={e => onUpdateMetadata({...project.metadata, sob: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-blue-500 uppercase ml-1">Ponto Elétrico</span>
              <input className="bg-white/60 border border-blue-100 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={project.metadata.electricPoint} onChange={e => onUpdateMetadata({...project.metadata, electricPoint: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[9px] font-black text-blue-500 uppercase ml-1">Cliente / Local</span>
              <input className="bg-white/60 border border-blue-100 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={project.metadata.client} onChange={e => onUpdateMetadata({...project.metadata, client: e.target.value})} />
            </div>
          </div>
        </div>
      </section>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`glass-dark rounded-[24px] p-6 border-l-4 shadow-sm flex flex-col justify-between h-32 transition-all hover:scale-105 ${stat.label === 'Índice Confiabilidade' ? 'border-indigo-500 bg-indigo-50/10' : 'border-blue-50'}`}>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${stat.color} tracking-tighter`}>{stat.value}</span>
              <span className="text-xl opacity-20">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Carregamento */}
        <div className="glass-dark rounded-[32px] p-8 shadow-sm border border-white/50">
          <h4 className="font-black text-gray-700 text-[10px] uppercase tracking-widest mb-6">Fluxo de Corrente por Trecho</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7ff" />
                 <XAxis dataKey="id" tick={{ fontSize: 9, fontWeight: 900 }} axisLine={false} />
                 <YAxis unit="A" tick={{ fontSize: 9 }} axisLine={false} />
                 <Tooltip cursor={{fill: '#f0f4ff'}} contentStyle={{ borderRadius: '12px', border: 'none', fontWeight: 900 }} />
                 <Bar dataKey="current" fill="#3b82f6" radius={[4, 4, 0, 0]} />
               </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Análise Probabilística Monte Carlo */}
        <div className="glass-dark rounded-[32px] p-8 shadow-sm border border-white/50 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="font-black text-gray-700 text-[10px] uppercase tracking-widest">Estresse Estocástico (Monte Carlo)</h4>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Simulação de Risco de Falha</p>
            </div>
            <button 
              onClick={handleMonteCarlo}
              disabled={isSimulating}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isSimulating ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'}`}
            >
              {isSimulating ? 'Simulando...' : 'Rodar Análise'}
            </button>
          </div>

          {stochasticResult ? (
            <div className="flex flex-col gap-6 animate-in zoom-in-95 duration-500">
              <div className="flex justify-around items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                 <div className="text-center">
                    <span className="text-[8px] font-black text-blue-400 uppercase">Estabilidade</span>
                    <p className={`text-xl font-black ${stochasticResult.stabilityIndex > 90 ? 'text-green-600' : 'text-red-500'}`}>{stochasticResult.stabilityIndex.toFixed(1)}%</p>
                 </div>
                 <div className="w-px h-8 bg-blue-200"></div>
                 <div className="text-center">
                    <span className="text-[8px] font-black text-blue-400 uppercase">P95 (Worst Case)</span>
                    <p className="text-xl font-black text-gray-700">{stochasticResult.p95Cqt.toFixed(2)}%</p>
                 </div>
              </div>

              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stochasticResult.distribution}>
                    <defs>
                      <linearGradient id="probColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip labelFormatter={(val) => `CQT: ${val}%`} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="y" stroke="#3b82f6" fillOpacity={1} fill="url(#probColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[9px] text-gray-500 font-medium leading-relaxed bg-white/40 p-3 rounded-xl border border-white/60">
                💡 {stochasticResult.stabilityIndex > 95 
                  ? "O dimensionamento atual é resiliente mesmo sob stress máximo de carga." 
                  : "Atenção: Existe risco moderado de queda de tensão em horários de pico atípicos."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] text-center opacity-40">
               <span className="text-4xl mb-4">🎲</span>
               <p className="text-[10px] font-black uppercase text-gray-500">Nenhuma simulação ativa</p>
               <p className="text-[8px] font-bold text-gray-400 mt-2 px-10">Rode a simulação para validar o comportamento probabilístico da sua topologia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
