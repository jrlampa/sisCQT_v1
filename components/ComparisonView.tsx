
import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';

const ComparisonView: React.FC = () => {
  const { project, allResults: results, updateProject, cloneScenario, createEmptyScenario } = useProject();

  if (!project || !results) {
    return <div className="p-8 text-center animate-pulse text-[10px] font-black uppercase text-blue-500">Carregando Comparador...</div>;
  }
  const [showMenu, setShowMenu] = useState(false);
  const scenarios = project.scenarios;
  
  // Encontrar os melhores valores para cada KPI
  const getBest = (kpi: keyof EngineResult['kpis'], mode: 'min' | 'max' = 'min') => {
    const values = scenarios.map(s => results[s.id]?.kpis[kpi] || 0);
    return mode === 'min' ? Math.min(...values) : Math.max(...values);
  };

  const bestMaxCqt = getBest('maxCqt', 'min');

  const handleCreate = (type: 'empty' | 'clone') => {
    if (type === 'empty') createEmptyScenario();
    else cloneScenario();
    setShowMenu(false);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500 pb-10">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tighter uppercase">Matriz de Comparação</h2>
          <p className="text-gray-500 text-sm font-medium">Análise técnica comparativa entre os cenários do projeto</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="bg-[#004a80] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all flex items-center gap-2"
          >
            <span>➕</span> Novo Cenário
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
              <div className="absolute right-0 mt-3 w-56 glass-dark border border-white/60 rounded-[24px] shadow-2xl p-2 z-20 animate-in slide-in-from-top-2">
                <button 
                  onClick={() => handleCreate('empty')}
                  className="w-full text-left px-4 py-3 hover:bg-white/60 rounded-xl transition-all flex flex-col"
                >
                  <span className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">Cenário Vazio</span>
                  <span className="text-[8px] text-gray-400 font-bold uppercase">estudo do zero</span>
                </button>
                <div className="h-px bg-white/20 my-1"></div>
                <button 
                  onClick={() => handleCreate('clone')}
                  className="w-full text-left px-4 py-3 hover:bg-white/60 rounded-xl transition-all flex flex-col"
                >
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Clonar Ativo</span>
                  <span className="text-[8px] text-blue-400 font-bold uppercase">copiar topologia atual</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="overflow-x-auto rounded-[32px] glass border border-white/50 shadow-2xl">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white/30">
              <th className="px-8 py-8 text-left text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b border-white/20">Métricas de Performance</th>
              {scenarios.map(s => (
                <th key={s.id} className="px-8 py-8 text-center min-w-[240px] border-b border-white/20">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-black text-gray-800">{s.name}</span>
                    <button 
                      onClick={() => updateProject({ activeScenarioId: s.id })}
                      className={`px-4 py-1.5 text-[10px] font-bold rounded-full shadow-lg transition-all ${project.activeScenarioId === s.id ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:scale-105'}`}
                    >
                      {project.activeScenarioId === s.id ? 'Ativo' : 'Selecionar'}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {/* Queda de Tensão */}
            <tr className="hover:bg-white/20 transition-colors">
              <td className="px-8 py-6">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-700">Queda de Tensão Máxima</span>
                  <span className="text-[10px] text-gray-400">Limite normativo: 6.00%</span>
                </div>
              </td>
              {scenarios.map(s => {
                const val = results[s.id]?.kpis.maxCqt || 0;
                const isBest = val === bestMaxCqt && val > 0;
                return (
                  <td key={s.id} className="px-8 py-6 text-center">
                    <span className={`text-lg font-black ${val > 6 ? 'text-red-500' : isBest ? 'text-green-500' : 'text-blue-600'}`}>
                      {val.toFixed(2)}%
                    </span>
                    {isBest && <div className="text-[8px] font-bold text-green-500 uppercase mt-1">Eficiência Máxima</div>}
                  </td>
                );
              })}
            </tr>

            {/* Ocupação Trafo */}
            <tr className="hover:bg-white/20 transition-colors">
              <td className="px-8 py-6">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-700">Ocupação do Transformador</span>
                  <span className="text-[10px] text-gray-400">Carga Total / Potência Nominal</span>
                </div>
              </td>
              {scenarios.map(s => {
                const val = results[s.id]?.kpis.trafoOccupation || 0;
                const isOver = val > 100;
                return (
                  <td key={s.id} className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`text-lg font-black ${isOver ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                        {val.toFixed(1)}%
                      </span>
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${isOver ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(val, 100)}%` }}></div>
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Demanda Total */}
            <tr className="hover:bg-white/20 transition-colors">
              <td className="px-8 py-6">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-700">Demanda Estimada Total</span>
                  <span className="text-[10px] text-gray-400">Soma vetorial (Diversificada + IP + Esp)</span>
                </div>
              </td>
              {scenarios.map(s => (
                <td key={s.id} className="px-8 py-6 text-center">
                  <span className="text-lg font-black text-gray-800">
                    {(results[s.id]?.kpis.totalLoad || 0).toFixed(2)} <span className="text-xs font-medium text-gray-400">kVA</span>
                  </span>
                </td>
              ))}
            </tr>

             {/* Consumidores */}
             <tr className="hover:bg-white/20 transition-colors">
              <td className="px-8 py-6">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-700">Total de Consumidores</span>
                  <span className="text-[10px] text-gray-400">Mono + Bi + Tri + Pontuais</span>
                </div>
              </td>
              {scenarios.map(s => (
                <td key={s.id} className="px-8 py-6 text-center">
                  <span className="text-lg font-black text-purple-600">
                    {results[s.id]?.kpis.totalCustomers || 0}
                  </span>
                </td>
              ))}
            </tr>

            {/* Warnings */}
            <tr className="bg-red-50/10">
              <td className="px-8 py-6">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-red-600">Alertas Técnicos</span>
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Erros e Sobrecargas</span>
                </div>
              </td>
              {scenarios.map(s => {
                const warnings = results[s.id]?.warnings.length || 0;
                return (
                  <td key={s.id} className="px-8 py-6 text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${warnings > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      <span className="text-xs font-black">{warnings > 0 ? `${warnings} Alertas` : 'OK'}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="glass-dark p-8 rounded-[32px] border-l-4 border-blue-500">
          <h4 className="font-bold text-gray-800 mb-2">Dica de Engenharia</h4>
          <p className="text-xs text-gray-500 leading-relaxed italic">
            "A comparação de cenários 'ATUAL' vs 'PROJETADO' é fundamental para justificar investimentos em obras de rede. Use o cenário 'ATUAL+NC' para validar se a rede suporta novos pedidos de ligação sem necessidade de reforço imediato."
          </p>
        </div>
        <div className="glass-dark p-8 rounded-[32px] border-l-4 border-purple-500">
          <h4 className="font-bold text-gray-800 mb-2">Metodologia Theseus</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Os cálculos acima utilizam fator de diversidade (DMDI) dinâmico baseado na norma {project.scenarios[0].params.normativeTable}. A variabilidade entre cenários reflete diretamente a elasticidade da rede perante novos fluxos de carga.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;
