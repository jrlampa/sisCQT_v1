
import React, { useEffect, useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useProject } from '../context/ProjectContext';

const ENERGY_PRICE_STORAGE_KEY = 'sisqat_energy_price_brl_kwh';
const DEFAULT_ENERGY_PRICE_BRL_KWH = 0.85;

const SustainabilityDashboard: React.FC = () => {
  const { project, activeScenario, activeResult: result, updateActiveScenario } = useProject();

  if (!project || !result || !activeScenario) {
    return <div className="p-8 text-center animate-pulse text-[10px] font-black uppercase text-blue-500">Carregando Dashboard de Sustentabilidade...</div>;
  }
  const { sustainability } = result;

  const defaultFromSettings = useMemo(() => {
    try {
      const raw = localStorage.getItem(ENERGY_PRICE_STORAGE_KEY);
      if (!raw) return DEFAULT_ENERGY_PRICE_BRL_KWH;
      const n = Number(String(raw).replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0) return DEFAULT_ENERGY_PRICE_BRL_KWH;
      return n;
    } catch {
      return DEFAULT_ENERGY_PRICE_BRL_KWH;
    }
  }, []);

  const effectiveEnergyPrice = useMemo(() => {
    const n = (activeScenario.params as any)?.energyPriceBrlKwh;
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n;
    return defaultFromSettings;
  }, [activeScenario.params, defaultFromSettings]);

  const [localEnergyPrice, setLocalEnergyPrice] = useState<string>(String(effectiveEnergyPrice).replace('.', ','));

  useEffect(() => {
    setLocalEnergyPrice(String(effectiveEnergyPrice).replace('.', ','));
  }, [effectiveEnergyPrice]);

  const commitEnergyPrice = () => {
    const v = Number(String(localEnergyPrice).replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) return;
    updateActiveScenario({
      params: {
        ...activeScenario.params,
        energyPriceBrlKwh: v,
      } as any,
    });
  };

  const nodeLossData = result.nodes
    .filter(n => n.id !== 'TRAFO' && (n.jouleLossWatts || 0) > 1)
    .map(n => ({
      name: n.id,
      loss: Number(n.jouleLossWatts?.toFixed(1))
    }))
    .sort((a, b) => b.loss - a.loss)
    .slice(0, 10);

  const stats = [
    { 
      label: 'Desperdício Anual', 
      value: `R$ ${sustainability.annualFinancialLossBrl.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
      sub: `${sustainability.annualEnergyLossKwh.toFixed(0)} kWh/ano`,
      icon: '💸',
      color: 'text-red-600'
    },
    { 
      label: 'Pegada de Carbono', 
      value: `${sustainability.annualCo2Kg.toFixed(0)} kg CO₂`, 
      sub: 'Emissão por perdas Joule',
      icon: '☁️',
      color: 'text-gray-600'
    },
    { 
      label: 'Compensação Necessária', 
      value: `${Math.ceil(sustainability.treesEquivalent)} Árvores`, 
      sub: 'Para neutralizar perdas/ano',
      icon: '🌳',
      color: 'text-green-600'
    },
    { 
      label: 'Economia em 10 Anos', 
      value: `R$ ${sustainability.potentialSavingsBrl10y.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
      sub: 'Com upgrade de condutores',
      icon: '✨',
      color: 'text-blue-600'
    }
  ];

  const pieData = [
    { name: 'Energia Útil', value: result.kpis.totalLoad * 0.95 },
    { name: 'Perda Joule', value: result.kpis.totalLoad * 0.05 },
  ];

  const COLORS = ['#3b82f6', '#ef4444'];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 p-8 rounded-[32px] border border-white/60 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 text-3xl shadow-lg shadow-green-100 border border-green-200">🌿</div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase leading-none">Sustentabilidade</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Análise de Eficiência e Impacto ESG</p>
          </div>
        </div>
        <div className="bg-white/60 px-6 py-3 rounded-2xl border border-green-100">
          <span className="text-[9px] font-black text-green-600 uppercase tracking-widest block mb-1">Custo de Energia (R$/kWh)</span>
          <div className="flex items-center gap-3">
            <input
              aria-label="Custo de energia (R$/kWh)"
              className="w-28 bg-white border border-green-100 rounded-xl px-3 py-2 text-sm font-black text-gray-700 outline-none focus:border-green-300"
              value={localEnergyPrice}
              onChange={(e) => setLocalEnergyPrice(e.target.value)}
              onBlur={commitEnergyPrice}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              inputMode="decimal"
            />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ex.: RJ 1,10</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="glass-dark p-6 rounded-[28px] border border-white/80 shadow-sm flex flex-col justify-between h-40">
            <div className="flex justify-between items-start">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{s.label}</span>
               <span className="text-xl">{s.icon}</span>
            </div>
            <div>
               <p className={`text-2xl font-black ${s.color} tracking-tighter`}>{s.value}</p>
               <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Maiores Perdas */}
        <div className="glass-dark rounded-[40px] p-8 shadow-sm border border-white/60">
           <h4 className="font-black text-gray-700 text-[11px] uppercase tracking-widest mb-8 flex items-center gap-2">
             <span className="w-2 h-4 bg-red-500 rounded-full"></span>
             Pontos Críticos de Desperdício (Watts)
           </h4>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nodeLossData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7ff" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'rgba(239, 68, 68, 0.05)'}} contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 900 }} />
                  <Bar dataKey="loss" fill="#ef4444" radius={[0, 8, 8, 0]} barSize={20} />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Breakdown de Energia */}
        <div className="glass-dark rounded-[40px] p-8 shadow-sm border border-white/60 flex flex-col">
          <h4 className="font-black text-gray-700 text-[11px] uppercase tracking-widest mb-8">Composição de Fluxo de Potência</h4>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-8 mt-4">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] font-black text-gray-500 uppercase">Utilidade</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-[10px] font-black text-gray-500 uppercase">Perdas</span>
               </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/40">
             <div className="bg-blue-50/50 p-6 rounded-[24px] border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Engenharia de Sustentabilidade</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Perdas técnicas Joule são proporcionais ao quadrado da corrente. Aumentar a seção do condutor nos pontos críticos identificados ao lado pode gerar um <strong>Payback Financeiro inferior a 24 meses</strong> e reduzir significativamente a pegada de CO₂ da distribuidora.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SustainabilityDashboard;
