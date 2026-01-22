import React, { useState, useRef } from 'react';
import { Project, User } from '../types';
import { useToast } from '../context/ToastContext.tsx';
import { KmlService } from '../services/kmlService';
import { useProject } from '../context/ProjectContext';

const ProjectHub: React.FC<{ user: User; onLogout: () => void; onBilling: () => void; }> = ({ user, onLogout, onBilling }) => {
  const { showToast } = useToast();
  const { savedProjects, createProject, updateProject, deleteProject, duplicateProject, setCurrentProjectId } = useProject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [formProject, setFormProject] = useState({ name: '', sob: '', pe: '', lat: '-22.90', lng: '-43.17' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectList = (Object.values(savedProjects) as Project[]).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const handleFormSubmit = () => {
    const { name, sob, pe, lat, lng } = formProject;
    if (!name.trim() || !sob.trim()) return showToast("Preencha os campos obrigatórios", "warning");
    
    if (editingProjectId) {
      updateProject({ 
        id: editingProjectId, 
        name, 
        metadata: { sob, electricPoint: pe, lat: parseFloat(lat), lng: parseFloat(lng) } 
      });
    }
    else {
      createProject(name, sob, pe, parseFloat(lat), parseFloat(lng));
    }
    
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-transparent p-10 flex flex-col items-center animate-in fade-in duration-1000">
      <div className="w-full max-w-6xl flex flex-col gap-10">
        
        <header className="w-full flex justify-between items-center glass p-8 rounded-[40px] border-white/80 shadow-2xl">
          <div className="flex items-center gap-8">
            <div className="text-3xl font-black tracking-tighter text-blue-600">siSCQT</div>
            <div className="h-10 w-px bg-gray-200"></div>
            <div className="flex flex-col">
              <h1 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Hub de Engenharia</h1>
              <span className="text-[10px] font-bold text-gray-700">{user.email}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onBilling} className="bg-white/60 px-6 py-3 rounded-2xl font-black text-blue-600 text-[10px] uppercase tracking-widest border border-white hover:bg-white transition-all shadow-sm">💳 {user.plan}</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white/60 px-6 py-3 rounded-2xl font-black text-gray-600 text-[10px] uppercase tracking-widest border border-white hover:bg-white transition-all shadow-sm">🌍 Importar</button>
            <button onClick={() => { setEditingProjectId(null); setIsModalOpen(true); }} className="bg-blue-600 px-8 py-3 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all">+ Novo Projeto</button>
            <button onClick={onLogout} className="bg-red-50 text-red-500 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Sair</button>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projectList.length === 0 ? (
            <div className="col-span-full py-32 flex flex-col items-center opacity-30">
               <div className="text-7xl mb-6">📁</div>
               <p className="font-black text-sm uppercase tracking-[0.2em]">Nenhum estudo encontrado</p>
               <button onClick={() => handleCreateProject('Estudo Exemplo', '2024.0001', 'BT-RJ-01', -22.9, -43.1)} className="mt-6 text-xs font-black text-blue-600 underline">Carregar Demo</button>
            </div>
          ) : (
            projectList.map((prj) => (
              <div key={prj.id} onClick={() => handleSelectProject(prj.id)} className="glass-dark p-8 rounded-[40px] group cursor-pointer hover:scale-[1.02] hover:shadow-2xl transition-all duration-500 relative border-white/60">
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                   <button onClick={(e) => { e.stopPropagation(); handleDuplicateProject(prj.id); }} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sm shadow-xl">👯</button>
                   <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(prj.id); }} className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-sm text-red-500 shadow-xl">✕</button>
                </div>
                <div className="flex flex-col h-full">
                   <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full w-fit uppercase tracking-widest mb-6">SOB {prj.metadata.sob}</span>
                   <h3 className="text-lg font-black text-gray-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{prj.name}</h3>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-10">{prj.metadata.city || 'Local não definido'}</p>
                   <div className="mt-auto flex justify-between items-center pt-6 border-t border-gray-50">
                      <span className="text-[9px] font-bold text-gray-300 uppercase">{new Date(prj.updatedAt).toLocaleDateString()}</span>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter translate-x-2 group-hover:translate-x-0 transition-transform">Abrir Estudo ➔</span>
                   </div>
                </div>
              </div>
            ))
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 backdrop-blur-md bg-white/10">
          <div className="glass-dark w-full max-w-lg rounded-[48px] p-12 shadow-2xl border-white relative animate-in zoom-in-95 duration-500">
            <h2 className="text-2xl font-black text-[#004a80] mb-10 uppercase tracking-tighter">Configurar Novo Estudo</h2>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SOB / ID</label>
                    <input className="w-full bg-white/50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-blue-400 transition-all" value={formProject.sob} onChange={e => setFormProject({...formProject, sob: e.target.value})} />
                 </div>
                 <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ponto Elétrico</label>
                    <input className="w-full bg-white/50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-blue-400 transition-all" value={formProject.pe} onChange={e => setFormProject({...formProject, pe: e.target.value})} />
                 </div>
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título do Estudo</label>
                 <input className="w-full bg-white/50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-blue-400 transition-all" value={formProject.name} onChange={e => setFormProject({...formProject, name: e.target.value})} />
              </div>
              <button onClick={handleFormSubmit} className="mt-6 bg-blue-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all">Inicializar Workspace ➔</button>
              <button onClick={() => setIsModalOpen(false)} className="text-[10px] font-black text-gray-300 hover:text-gray-500 transition-colors uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      
      <input type="file" ref={fileInputRef} className="hidden" accept=".kml,.kmz" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          setIsImporting(true);
          try {
            const data = await KmlService.parseFile(file);
            handleCreateProject(file.name, 'KML.' + Math.floor(Math.random()*1000), 'BT-IMP', data.metadata.lat || -22.9, data.metadata.lng || -43.1);
            showToast("Importação KML concluída!", "success");
          } catch(err) { showToast("Falha no KML", "error"); }
          finally { setIsImporting(false); }
        }
      }} />
    </div>
  );
};

export default ProjectHub;