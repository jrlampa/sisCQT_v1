import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
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
    { label: 'Dashboard', icon: '📊', path: 'dashboard' },
    { label: 'Rede', icon: '⚡', path: 'editor' },
    { label: 'GIS Map', icon: '🌍', path: 'gis' },
    { label: 'GD Solar', icon: '☀️', path: 'solar' },
    { label: 'ESG Hub', icon: '🌿', path: 'sustainability' },
    { label: 'Cenários', icon: '⚖️', path: 'comparison' },
    { label: 'Memorial', icon: '📄', path: 'report' },
    { label: 'IA Theseus', icon: '🧠', path: 'ai-chat' },
  ];

  return (
    <div className="flex h-screen bg-[#f4f7ff] overflow-hidden">
      <aside className={`${isCollapsed ? 'w-24' : 'w-72'} glass m-4 rounded-[32px] p-6 flex flex-col gap-6 transition-all duration-500 shadow-2xl relative z-50`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-12 w-6 h-12 bg-white border border-blue-50 rounded-full flex items-center justify-center text-[10px] text-blue-500 shadow-lg">
          {isCollapsed ? '▶' : '◀'}
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#004a80] rounded-xl flex items-center justify-center text-white font-black shadow-lg">C</div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-xl font-black text-[#004a80] tracking-tighter leading-none">siSCQT</span>
              <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest mt-0.5">Enterprise AI</span>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={`/project/${project.id}/${item.path}`}
              className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-500 hover:bg-white/60'}`}
            >
              <span className="text-xl">{item.icon}</span>
              {!isCollapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/40 flex flex-col gap-2">
          <div className="flex items-center gap-3 p-3 bg-white/40 rounded-2xl border border-white/60">
             <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-black text-blue-600 uppercase">{user.name.charAt(0)}</div>
             {!isCollapsed && (
               <div className="flex flex-col overflow-hidden">
                 <span className="text-[10px] font-black text-gray-800 truncate">{user.name}</span>
                 <span className="text-[8px] font-bold text-blue-500 uppercase">{user.plan}</span>
               </div>
             )}
          </div>
          <button onClick={onGoToHub} className="w-full text-left p-3 text-[10px] font-black text-gray-400 hover:text-blue-600 transition-colors">🏠 VOLTAR AO HUB</button>
          <button onClick={onLogout} className="w-full text-left p-3 text-[10px] font-black text-red-400 hover:text-red-600 transition-colors">🚪 DESCONECTAR</button>
        </div>
      </aside>

      <main className="flex-1 p-4 overflow-hidden relative">
        <div className="h-full glass rounded-[40px] p-8 overflow-y-auto custom-scrollbar relative">
          <header className="flex justify-between items-center mb-8 border-b border-white/40 pb-6">
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cenário Ativo</span>
                <div className="flex items-center gap-2">
                   <h2 className="text-xl font-black text-[#004a80] uppercase tracking-tight">{activeScenario.name}</h2>
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="glass-dark px-4 py-2 rounded-xl flex flex-col items-end">
                   <span className="text-[8px] font-black text-gray-400 uppercase">Projeto</span>
                   <span className="text-[10px] font-black text-[#004a80]">{project.metadata.sob}</span>
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