
import React, { useState, useEffect } from 'react';
import { Project, User } from '../types';
import { useToast } from '../context/ToastContext.tsx';
import { createSampleProject } from '../utils/projectUtils';

interface ProjectHubProps {
  projects: Record<string, Project>;
  user: User;
  onSelect: (id: string) => void;
  onCreate: (name: string, sob: string, pe: string, lat: number, lng: number) => void;
  onUpdate: (id: string, name: string, sob: string, pe: string, lat: number, lng: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onLogout: () => void;
  onBilling: () => void;
}

const LogoSisCQT = () => (
  <div className="flex items-baseline font-black tracking-tighter text-[#004a80] select-none text-2xl">
    <span className="lowercase">si</span>
    <span className="uppercase">S</span>
    <span className="uppercase ml-1">C</span>
    <span className="uppercase ml-0.5">Q</span>
    <span className="uppercase ml-0.5">T</span>
  </div>
);

const ProjectHub: React.FC<ProjectHubProps> = ({ projects, user, onSelect, onCreate, onUpdate, onDelete, onDuplicate, onLogout, onBilling }) => {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [formProject, setFormProject] = useState({ name: '', sob: '', pe: '', lat: '-22.90', lng: '-43.17' });

  const projectList = (Object.values(projects) as Project[]).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const parseCoordinate = (val: string): number => {
    if (typeof val !== 'string') return 0;
    const normalized = val.replace(',', '.').replace(/[^\d.-]/g, '');
    return parseFloat(normalized);
  };

  const openCreateModal = () => {
    setEditingProjectId(null);
    setFormProject({ name: '', sob: '', pe: '', lat: '-22.90', lng: '-43.17' });
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, prj: Project) => {
    e.stopPropagation();
    setEditingProjectId(prj.id);
    setFormProject({ 
      name: prj.name, 
      sob: prj.metadata.sob, 
      pe: prj.metadata.electricPoint, 
      lat: prj.metadata.lat.toString(), 
      lng: prj.metadata.lng.toString() 
    });
    setIsModalOpen(true);
  };

  const handleLoadSample = () => {
    const sample = createSampleProject();
    if (projects[sample.id]) {
        onSelect(sample.id);
        return;
    }
    // Criação via bypass manual ou apenas selecionando se já existir
    onCreate(sample.name, sample.metadata.sob, sample.metadata.electricPoint, sample.metadata.lat, sample.metadata.lng);
  };

  const handleFormSubmit = () => {
    const { name, sob, pe, lat, lng } = formProject;
    const latNum = parseCoordinate(lat);
    const lngNum = parseCoordinate(lng);

    if (!name.trim() || !sob.trim() || !pe.trim()) {
      showToast("SOB, Ponto Elétrico e Nome são obrigatórios.", "warning");
      return;
    }

    if (isNaN(latNum) || isNaN(lngNum)) {
      showToast("Latitude e Longitude inválidas.", "error");
      return;
    }

    if (editingProjectId) {
      onUpdate(editingProjectId, name, sob, pe, latNum, lngNum);
    } else {
      onCreate(name, sob, pe, latNum, lngNum);
    }
    
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] p-8 flex flex-col items-center animate-in fade-in duration-700">
      <div className="w-full max-w-[1200px] flex flex-col flex-1 border-[3px] border-blue-500 rounded-lg overflow-hidden shadow-2xl bg-[#f0f4ff]">
        
        <header className="w-full p-6 flex justify-between items-center bg-[#f0f4ff] border-b border-blue-100">
          <div className="flex items-center gap-6">
            <LogoSisCQT />
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-[#004a80] uppercase tracking-tighter leading-none">HUB DE PROJETOS</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">ENTERPRISE AI</span>
                <span className="text-gray-300">•</span>
                <span className="text-[9px] font-bold text-gray-500">{user.email}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={onBilling} className="bg-white/80 border border-blue-100 px-6 py-2.5 rounded-full font-black text-blue-600 text-[10px] uppercase tracking-widest shadow-sm hover:bg-white transition-all">💳 PLANO: {user.plan.toUpperCase()}</button>
            <button onClick={onLogout} className="bg-red-50 text-red-500 px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">SAIR</button>
            <button onClick={openCreateModal} className="bg-[#004a80] text-white px-8 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 hover:scale-105 transition-all">+ NOVO PROJETO</button>
          </div>
        </header>

        <main className="flex-1 p-12 flex flex-col items-center justify-center relative">
          <div className="w-full max-w-5xl min-h-[400px] bg-white rounded-[40px] shadow-sm flex flex-col items-center border border-blue-100/50 p-8 relative overflow-hidden">
            <div className="absolute inset-4 border-2 border-dashed border-blue-50 rounded-[32px] pointer-events-none"></div>

            {projectList.length === 0 ? (
              <div className="flex flex-col items-center gap-6 z-10 py-20">
                <div className="w-24 h-24 bg-orange-50 rounded-2xl flex items-center justify-center text-5xl">📁</div>
                <h2 className="text-3xl font-black text-gray-300 uppercase tracking-tighter">Hub de Projetos Vazio</h2>
                <div className="flex gap-4 mt-2">
                    <button onClick={openCreateModal} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-200 hover:scale-105 transition-all">Criar Novo</button>
                    <button onClick={handleLoadSample} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-orange-200 hover:scale-105 transition-all">Carregar Exemplo</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full z-10 p-4">
                {projectList.map((prj) => (
                  <div key={prj.id} onClick={() => onSelect(prj.id)} className={`glass group p-6 rounded-[28px] border hover:shadow-xl transition-all cursor-pointer flex flex-col relative ${prj.id.includes('SAMPLE') ? 'border-orange-200 bg-orange-50/10' : 'border-blue-50'}`}>
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); onDuplicate(prj.id); }} className="p-2 bg-white rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm" title="Duplicar">👯</button>
                      <button onClick={(e) => openEditModal(e, prj)} className="p-2 bg-white rounded-lg text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-sm" title="Editar Informações">✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir projeto?')) onDelete(prj.id); }} className="p-2 bg-white rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Excluir">✕</button>
                    </div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter ${prj.id.includes('SAMPLE') ? 'bg-orange-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
                        {prj.id.includes('SAMPLE') ? 'DEMO ENGENHARIA' : `SOB ${prj.metadata.sob}`}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{prj.metadata.electricPoint}</span>
                    </div>
                    <h4 className="text-sm font-black text-gray-800 leading-tight mb-2 truncate">{prj.name}</h4>
                    <p className="text-[9px] text-gray-400 font-bold mb-6">{prj.metadata.city}</p>
                    <div className="mt-auto flex justify-between items-center pt-4 border-t border-blue-50">
                      <span className="text-[8px] font-bold text-gray-300">{new Date(prj.updatedAt).toLocaleDateString()}</span>
                      <span className="text-blue-600 font-black text-[10px] group-hover:translate-x-1 transition-transform uppercase">ABRIR ➔</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-blue-900/10 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="glass-dark w-full max-w-lg rounded-[40px] p-10 shadow-2xl border border-white/80 relative animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-[#004a80] mb-8 uppercase tracking-tighter">
              {editingProjectId ? 'Editar Estudo de Rede' : 'NOVO ESTUDO DE REDE'}
            </h2>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SOB*</label>
                  <div className="relative">
                    <input 
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg outline-none focus:border-blue-400 transition-all font-black text-blue-500" 
                      value={formProject.sob} 
                      onChange={e => setFormProject({...formProject, sob: e.target.value})} 
                    />
                    {!formProject.sob && <span className="absolute left-4 top-3 text-gray-300 pointer-events-none text-sm font-bold">Ex: 2024.0001</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PONTO ELÉTRICO*</label>
                  <div className="relative">
                    <input 
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg outline-none focus:border-blue-400 transition-all font-black text-blue-500" 
                      value={formProject.pe} 
                      onChange={e => setFormProject({...formProject, pe: e.target.value})} 
                    />
                    {!formProject.pe && <span className="absolute left-4 top-3 text-gray-300 pointer-events-none text-sm font-bold">BT-RJ-01</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NOME DO PROJETO*</label>
                <div className="relative">
                  <input 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg outline-none focus:border-blue-400 transition-all font-black text-blue-500" 
                    value={formProject.name} 
                    onChange={e => setFormProject({...formProject, name: e.target.value})} 
                  />
                  {!formProject.name && <span className="absolute left-4 top-3 text-gray-300 pointer-events-none text-sm font-bold">Ex: Reforço de Ramal - Barra</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">LATITUDE</label>
                  <input type="text" className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none font-bold text-gray-700" value={formProject.lat} onChange={e => setFormProject({...formProject, lat: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">LONGITUDE</label>
                  <input type="text" className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none font-bold text-gray-700" value={formProject.lng} onChange={e => setFormProject({...formProject, lng: e.target.value})} />
                </div>
              </div>
              <button onClick={handleFormSubmit} className="mt-4 bg-[#004a80] text-white py-5 rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] text-sm">
                {editingProjectId ? 'Salvar Alterações' : 'INICIAR PROJETO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectHub;
