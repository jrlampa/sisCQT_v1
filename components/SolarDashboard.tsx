
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  ReferenceLine
} from 'recharts';
import { useProject } from '../context/ProjectContext';

const SolarDashboard: React.FC = () => {
  const { project, activeScenario, activeResult: result, updateActiveScenario } = useProject();

  if (!project || !activeScenario || !result) {
    return <div className="p-8 text-center animate-pulse text-[10px] font-black uppercase text-blue-500">Carregando Dashboard Solar...</div>;
  }
  const { gdImpact } = result;

  // Gerar perfil de tensão Trafo -> Fim de Linha (Pior caso)
  const voltageProfileData = result.nodes
    .sort((a, b) => (a.accumulatedCqt || 0) - (b.accumulatedCqt || 0))
    .map(n => ({
      name: n.id,
      nightVoltage: 100 - (n.accumulatedCqt || 0),
      dayVoltage: 100 + (n.solarVoltageRise || 0),
    }));

  const totalClientsGD = result.nodes.reduce((acc, n) => acc + (n.loads.solarQty || 0), 0);

  const stats = [
    { 
      label: 'Potência Solar Total', 
      value: `${gdImpact.totalInstalledKva.toFixed(1)} kVA`, 
      sub: `${totalClientsGD} Clientes com GD`,
      icon: '☀️',
      color: 'text-orange-600'
    },
    { 
      label: 'Elevação de Tensão', 
      value: `+${gdImpact.maxVoltageRise.toFixed(2)}%`, 
      sub: 'Pico ao meio-dia',
      icon: '📈',
      color: gdImpact.maxVoltageRise > 5 ? 'text-red-600' : 'text-blue-600'
    },
    { 
      label: 'Fluxo Reverso', 
      value: gdImpact.hasReverseFlow ? `${gdImpact.reverseFlowAmps.toFixed(1)} A` : 'Zero', 
      sub: gdImpact.hasReverseFlow ? 'Injeção na subestação' : 'Consumido na rede local',
      icon: '🔄',
      color: gdImpact.hasReverseFlow ? 'text-purple-600' : 'text-gray-400'
    },
    { 
      label: 'Autoconsumo Est.', 
      value: `${gdImpact.selfConsumptionRate.toFixed(1)}%`, 
      sub: 'Eficiência de uso local',
      icon: '🔋',
      color: 'text-green-600'
    }
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 p-8 rounded-[32px] border border-white/60 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 text-3xl shadow-lg border border-orange-200">☀️</div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase leading-none">Estudo de Impacto GD</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Análise de Geração Distribuída e Fluxo Reverso</p>
          </div>
        </div>
        <div className="flex gap-4">
           {updateActiveScenario && (
             <button 
                onClick={() => updateActiveScenario({params: {...activeScenario.params, includeGdInQt: !activeScenario.params.includeGdInQt}})}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${activeScenario.params.includeGdInQt ? 'bg-orange-500 border-orange-600 text-white shadow-lg animate-pulse' : 'bg-white border-blue-100 text-blue-400'}`}
             >
                {activeScenario.params.includeGdInQt ? 'Impacto na QT: ATIVO' : 'Impacto na QT: INATIVO'}
             </button>
           )}
           <div className="glass px-4 py-2 rounded-xl border border-orange-100 flex flex-col items-center">
             <span className="text-[9px] font-black text-orange-600 uppercase">Status GD</span>
             <span className="text-xs font-black text-gray-700">{gdImpact.hasReverseFlow ? 'REVERSO ATIVO' : 'CONJUNTO SAUDÁVEL'}</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="glass-dark p-6 rounded-[28px] border border-white/80 shadow-sm flex flex-col justify-between h-40 group hover:scale-[1.02] transition-all">
            <div className="flex justify-between items-start">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{s.label}</span>
               <span className="text-xl opacity-40 group-hover:opacity-100 transition-opacity">{s.icon}</span>
            </div>
            <div>
               <p className={`text-2xl font-black ${s.color} tracking-tighter`}>{s.value}</p>
               <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="glass-dark rounded-[40px] p-8 shadow-sm border border-white/60">
           <div className="flex justify-between items-center mb-10">
              <div>
                 <h4 className="font-black text-gray-700 text-[11px] uppercase tracking-widest">Gradiente de Tensão na Rede BT</h4>
                 <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Comparativo Dia (Geração) vs Noite (Carga)</p>
              </div>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2"><div className="w-3 h-1 bg-blue-500"></div><span className="text-[9px] font-black text-gray-500 uppercase">Noite (Carga)</span></div>
                 <div className="flex items-center gap-2"><div className="w-3 h-1 bg-orange-500"></div><span className="text-[9px] font-black text-gray-500 uppercase">Dia (Solar)</span></div>
              </div>
           </div>
           
           <div className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={voltageProfileData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 900 }} axisLine={false} />
                  <YAxis domain={[90, 110]} tick={{ fontSize: 10 }} axisLine={false} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 900, fontSize: '12px' }} />
                  <ReferenceLine y={105} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Limite +5%', position: 'right', fill: '#ef4444', fontSize: 10, fontWeight: 900 }} />
                  <ReferenceLine y={95} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: 'Limite -5%', position: 'right', fill: '#3b82f6', fontSize: 10, fontWeight: 900 }} />
                  
                  <Area type="monotone" dataKey="nightVoltage" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6" />
                  <Area type="monotone" dataKey="dayVoltage" stroke="#f97316" fillOpacity={0.1} fill="#f97316" />
                </AreaChart>
             </ResponsiveContainer>
           </div>

           <div className="mt-8 bg-blue-50/30 p-8 rounded-[32px] border border-blue-100 flex gap-6 items-center">
              <div className="text-4xl">🛡️</div>
              <div className="flex-1">
                <p className="text-xs font-black text-blue-600 uppercase mb-1">Diagnóstico de Proteção</p>
                <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                  {gdImpact.maxVoltageRise > 5 
                    ? `Atenção Crítica: O cenário de geração distribuída indica uma elevação de tensão de ${gdImpact.maxVoltageRise.toFixed(2)}%, o que ultrapassa o limite normativo. Recomenda-se o reforço dos condutores nos trechos iniciais ou a reconfiguração dos inversores para modo de absorção de reativos (Q(V)).`
                    : `Estabilidade Garantida: A rede possui robustez suficiente para absorver os ${gdImpact.totalInstalledKva.toFixed(1)} kVA instalados sem causar sobretensões prejudiciais aos consumidores vizinhos.`
                  }
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SolarDashboard;
