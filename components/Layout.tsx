import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Project, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  project: Project;
  user: User;
  onSwitchScenario: (id: string) => void;
  onGoToHub: () => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, project, user, onSwitchScenario, onGoToHub, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const activeScenario = project.scenarios.find(s => s.id === project.activeScenarioId) || project.scenarios[0];

  const menuItems = [
    { label: 'Visão Geral', icon: '📊', path: 'dashboard' },
    { label: 'Editor de Rede', icon: '⚡', path: 'editor' },
    { label: 'Mapa GIS', icon: '🌍', path: 'gis' },
    { label: 'Impacto Solar', icon: '☀️', path: 'solar' },
    { label: 'Painel ESG', icon: '🌿', path: 'sustainability' },
    { label: 'Comparativos', icon: '⚖️', path: 'comparison' },
    { label: 'Memorial', icon: '📄', path: 'report' },
    { label: 'Analista IA', icon: '🧠', path: 'ai-chat' },
  ];

  return (
    <div className="flex h-screen bg-transparent overflow-hidden fade-in-blur">
      {/* Sidebar Glass Light */}
      <aside className={`${isCollapsed ? 'w-24' : 'w-72'} glass m-6 rounded-[32px] p-6 flex flex-col gap-8 transition-all duration-500 shadow-xl relative z-50`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="absolute -right-3 top-12 w-7 h-7 bg-white border border-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-500 shadow-lg hover:scale-110 transition-transform"
        >
          {isCollapsed ? '→' : '←'}
        </button>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg">S</div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-xl font-black text-slate-800 tracking-tighter leading-none uppercase">siSCQT</span>
              <span className="text-[8px] font-black uppercase text-blue-600 tracking-widest mt-1 opacity-70">Enterprise AI</span>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={`/project/${project.id}/${item.path}`}
              className={({ isActive }) => `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white text-blue-600 shadow-md scale-[1.02] border-white' : 'text-slate-500 hover:bg-white/30 hover:text-blue-600'}`}
            >
              <span className="text-xl">{item.icon}</span>
              {!isCollapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/40 flex flex-col gap-3">
          <div className="flex items-center gap-3 p-4 bg-white/30 rounded-3xl border border-white/60">
             <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-black text-blue-600 uppercase">{(user.name || '?').charAt(0)}</div>
             {!isCollapsed && (
               <div className="flex flex-col overflow-hidden">
                 <span className="text-xs font-black text-slate-800 truncate">{user.name}</span>
                 <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">{user.plan}</span>
               </div>
             )}
          </div>
          <button onClick={onGoToHub} className="w-full text-left px-4 py-2 text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">🏠 Projetos</button>
          <button onClick={onLogout} className="w-full text-left px-4 py-2 text-[10px] font-black text-red-400 hover:text-red-500 transition-colors uppercase tracking-widest">🚪 Logout</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-hidden">
        <div className="h-full glass-dark rounded-[48px] p-10 overflow-y-auto custom-scrollbar relative">
          <header className="flex justify-between items-center mb-10 pb-8 border-b border-slate-200/30">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Cenário Ativo</span>
                <div className="flex items-center gap-3">
                   <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{activeScenario.name}</h2>
                   <div className="px-3 py-1 bg-white/90 rounded-full border border-blue-50 flex items-center gap-2 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[9px] font-black text-green-600 uppercase">Live Data</span>
                   </div>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="bg-white/50 px-6 py-3 rounded-2xl border border-white flex flex-col items-end shadow-sm">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocolo SOB</span>
                   <span className="text-xs font-black text-blue-800 uppercase">{project.metadata.sob}</span>
                </div>
             </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;