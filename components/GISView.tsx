
import React from 'react';
import GISMap from './GISMap';
import { useProject } from '../context/ProjectContext';

const GISView: React.FC = () => {
  const { project, activeResult: result, updateActiveScenario } = useProject();

  if (!project || !result) {
    return <div className="p-8 text-center animate-pulse text-[10px] font-black uppercase text-blue-500">Carregando GIS View...</div>;
  }
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-white/40 p-6 rounded-[32px] border border-white/60 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">🌍</div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase leading-none">Mapa de Rede Geoespacial</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Integração Nativa com PostGIS & Leaflet</p>
          </div>
        </div>
        <div className="flex gap-3">
           <div className="px-6 py-2 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col">
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">SRID Ativo</span>
              <span className="text-[10px] font-black text-blue-600">EPSG:4326 (WGS84)</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <GISMap />
        
        <div className="glass rounded-[32px] p-8 border border-white/60">
           <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
             <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
             Instruções de Campo
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/40 p-5 rounded-2xl border border-white/80">
                 <span className="text-xl mb-2 block">🖱️</span>
                 <p className="text-[10px] font-bold text-gray-600 uppercase leading-relaxed">Clique em qualquer local do mapa para abrir o diálogo de criação de novo poste ou trafo.</p>
              </div>
              <div className="bg-white/40 p-5 rounded-2xl border border-white/80">
                 <span className="text-xl mb-2 block">📍</span>
                 <p className="text-[10px] font-bold text-gray-600 uppercase leading-relaxed">Os pontos são persistidos no PostgreSQL usando tipos de geometria real, permitindo análise espacial futura.</p>
              </div>
              <div className="bg-white/40 p-5 rounded-2xl border border-white/80">
                 <span className="text-xl mb-2 block">📡</span>
                 <p className="text-[10px] font-bold text-gray-600 uppercase leading-relaxed">Dados em tempo real: Qualquer alteração via API reflete imediatamente para todos os engenheiros conectados.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default GISView;
