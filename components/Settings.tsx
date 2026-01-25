
import React, { useMemo, useState } from 'react';
import { Project, ReportConfig } from '../types';
import { useProject } from '../context/ProjectContext';
import { useToast } from '../context/ToastContext';
import { PrivacyActions } from './PrivacyActions.tsx';

const ENERGY_PRICE_STORAGE_KEY = 'sisqat_energy_price_brl_kwh';
const DEFAULT_ENERGY_PRICE_BRL_KWH = 0.85;

const Settings: React.FC = () => {
  const { project, updateProject } = useProject();
  const { showToast } = useToast();

  if (!project) {
    return <div className="p-8 text-center animate-pulse text-[10px] font-black uppercase text-blue-500">Carregando Configurações...</div>;
  }
  const [isSendingLogs, setIsSendingLogs] = useState(false);
  const [energyPriceInput, setEnergyPriceInput] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(ENERGY_PRICE_STORAGE_KEY);
      if (!raw) return String(DEFAULT_ENERGY_PRICE_BRL_KWH).replace('.', ',');
      return String(raw).replace('.', ',');
    } catch {
      return String(DEFAULT_ENERGY_PRICE_BRL_KWH).replace('.', ',');
    }
  });

  const parsedEnergyPrice = useMemo(() => {
    const n = Number(String(energyPriceInput).replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }, [energyPriceInput]);

  const applyEnergyPriceToProject = () => {
    if (!parsedEnergyPrice) {
      showToast('Informe um custo válido (ex.: 1,10).', 'warning');
      return;
    }
    try {
      localStorage.setItem(ENERGY_PRICE_STORAGE_KEY, String(parsedEnergyPrice));
    } catch {}

    updateProject({
      scenarios: project.scenarios.map((s) => ({
        ...s,
        params: {
          ...s.params,
          energyPriceBrlKwh: parsedEnergyPrice,
        },
        updatedAt: new Date().toISOString(),
      })),
    });
    showToast(`Custo padrão do kWh atualizado para R$ ${parsedEnergyPrice.toFixed(2).replace('.', ',')}.`, 'success');
  };

  const handleDeleteCable = (name: string) => {
    if (window.confirm(`Tem certeza que deseja apagar o cabo "${name}"? Esta ação não pode ser desfeita.`)) {
      const newCables = { ...project.cables };
      delete newCables[name];
      updateProject({ cables: newCables });
      showToast(`Cabo ${name} removido.`, 'info');
    }
  };

  const handleSendLogs = () => {
    setIsSendingLogs(true);
    
    const logData = {
      project: project.name,
      sob: project.metadata?.sob || 'N/A',
      scenarioCount: project.scenarios.length,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    const mailtoLink = `mailto:jonatas.lampa@im3brasil.com.br?subject=LOG DE ERRO - sisCQT - SOB ${project.metadata?.sob || 'N/A'}&body=Olá Jonatas,%0D%0A%0D%0ASegue log técnico para análise de erro no sistema:%0D%0A%0D%0A${encodeURIComponent(JSON.stringify(logData, null, 2))}`;
    
    setTimeout(() => {
      window.location.href = mailtoLink;
      setIsSendingLogs(false);
    }, 800);
  };
  
  const reportItems: { id: keyof ReportConfig; label: string }[] = [
    { id: 'showJustification', label: 'Justificativa de Engenharia' },
    { id: 'showUnifilar', label: 'Incluir Diagrama Unifilar' },
    { id: 'showKpis', label: 'Quadro de Resultados Consolidados' },
    { id: 'showComparison', label: 'Resumo Comparativo de Cenários' },
    { id: 'showTopology', label: 'Tabela de Topologia e Fluxos' },
    { id: 'showMaterials', label: 'Resumo Estimado de Materiais' },
    { id: 'showSignatures', label: 'Campos de Assinatura e Rodapé' }
  ];

  return (
    <div className="flex flex-col gap-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      <header>
        <h2 className="text-2xl font-bold text-gray-800 tracking-tighter uppercase">Centro de Ativos e Parâmetros</h2>
        <p className="text-sm text-gray-500 font-medium tracking-tight">Personalize os catálogos técnicos e opções do memorial</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LGPD / Privacidade */}
        <div className="lg:col-span-2">
          <PrivacyActions />
        </div>

        {/* Parâmetros de Sustentabilidade */}
        <section className="glass-dark rounded-[32px] p-8 border border-white/50 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
            🌿 Parâmetros de Sustentabilidade
          </h3>
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex flex-col gap-2">
              <label htmlFor="energy-price" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Custo padrão do kWh (R$/kWh)
              </label>
              <input
                id="energy-price"
                aria-label="Custo padrão do kWh (R$/kWh)"
                inputMode="decimal"
                className="w-48 bg-white/60 border border-green-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-green-300 transition-all"
                value={energyPriceInput}
                onChange={(e) => setEnergyPriceInput(e.target.value)}
              />
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                Exemplo: consumidor RJ ~ 1,10
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={applyEnergyPriceToProject}
                className="px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg shadow-green-100"
              >
                Aplicar no projeto
              </button>
            </div>
          </div>
        </section>

        {/* Gestão de Condutores */}
        <section className="glass-dark rounded-[32px] p-8 border border-white/50 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              🏗️ Catálogo de Condutores
            </h3>
            <button onClick={() => showToast("Função não implementada.", "warning")} className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">+ Novo Cabo</button>
          </div>
          <div className="flex flex-col gap-3">
            {(Object.entries(project.cables) as [string, { r: number, x: number, coef: number, ampacity: number }][]).map(([name, data]) => (
              <div key={name} className="flex items-center gap-4 bg-white/40 p-4 rounded-2xl border border-white/60 group hover:border-blue-200 transition-all">
                <div className="flex-1">
                  <p className="text-xs font-black text-gray-800">{name}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Ampacidade: {data.ampacity}A | Coef: {data.coef}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => showToast("Função não implementada.", "warning")} className="text-blue-600 font-black text-[10px] bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100">EDIT</button>
                  <button onClick={() => handleDeleteCable(name)} className="text-red-500 font-black text-[10px] bg-red-50 px-3 py-1 rounded-lg hover:bg-red-100">DELETE</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Configuração do Memorial Descritivo */}
        <section className="glass-dark rounded-[32px] p-8 border border-white/50 shadow-sm">
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
            📄 Opções do Memorial
          </h3>
          <div className="flex flex-col gap-4">
             {reportItems.map(item => (
               <label key={item.id} className="flex items-center gap-4 cursor-pointer p-3 rounded-xl hover:bg-white/40 transition-all border border-transparent hover:border-white/80">
                 <input 
                   type="checkbox" 
                   className="w-5 h-5 rounded-lg border-2 border-blue-200 text-blue-600 focus:ring-blue-500"
                   checked={project.reportConfig[item.id]}
                   onChange={(e) => updateProject({ reportConfig: { ...project.reportConfig, [item.id]: e.target.checked } })}
                 />
                 <span className="text-sm font-bold text-gray-600">{item.label}</span>
               </label>
             ))}
          </div>
        </section>

        {/* Suporte e Diagnóstico */}
        <section className="glass-dark rounded-[32px] p-8 border border-white/50 shadow-sm lg:col-span-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex gap-6 items-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-blue-100">🛠️</div>
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Suporte & Diagnóstico</h3>
                <p className="text-xs text-gray-500 font-medium">Encontrou algum erro? Envie os dados para análise do desenvolvedor.</p>
                <p className="text-[10px] text-blue-500 font-bold mt-1 uppercase">Contato: Jonatas Lampa (jonatas.lampa@im3brasil.com.br)</p>
              </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={handleSendLogs}
                disabled={isSendingLogs}
                className={`flex-1 md:flex-none px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isSendingLogs ? 'bg-gray-100 text-gray-400' : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white shadow-lg shadow-blue-50'}`}
              >
                {isSendingLogs ? 'Processando...' : '🚀 Enviar Logs de Erro'}
              </button>
              <a 
                href="mailto:jonatas.lampa@im3brasil.com.br?subject=Suporte Técnico sisCQT"
                className="flex-1 md:flex-none px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-[#004a80] text-white text-center hover:scale-105 transition-all shadow-xl shadow-blue-100"
              >
                Suporte Direto
              </a>
            </div>
          </div>
        </section>

        {/* Gestão de IP */}
        <section className="glass-dark rounded-[32px] p-8 border border-white/50 shadow-sm lg:col-span-2">
           <h3 className="font-bold text-gray-700 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
             <span className="w-1.5 h-4 bg-orange-400 rounded-full"></span>
             💡 Catálogo de Luminárias (IP)
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(project.ipTypes).map(([type, kva]) => (
                <div key={type} className="bg-white/40 border border-white/60 p-4 rounded-2xl flex flex-col gap-1 hover:border-blue-200 transition-all">
                   <p className="text-xs font-black text-gray-800">{type}</p>
                   <input 
                    type="number" step="0.01" 
                    aria-label={`Consumo unitário (${type}) em kVA`}
                    title={`Consumo unitário (${type}) em kVA`}
                    className="bg-transparent border-b border-yellow-200 outline-none text-[11px] font-bold text-blue-600 focus:border-blue-500 transition-all" 
                    value={kva}
                    onChange={(e) => {
                      const newIps = { ...project.ipTypes, [type]: Number(e.target.value) };
                      updateProject({ ipTypes: newIps });
                    }}
                  />
                   <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Consumo Unitário (kVA)</span>
                </div>
              ))}
           </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
