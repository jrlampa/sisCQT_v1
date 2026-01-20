
import React, { useState } from 'react';
import { Project, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
  project: Project;
  user: User;
  onSwitchScenario: (id: string) => void;
  onCloneScenario: () => void;
  onDeleteScenario: (id: string) => void;
  onGoToHub: () => void;
  onLogout: () => void;
}

const LogoSidebar = ({ collapsed }: { collapsed: boolean }) => (
  <div className={`flex items-center select-none transition-all duration-500 ease-in-out ${collapsed ? 'justify-center w-full' : 'gap-3'}`}>
    <div className={`flex-shrink-0 flex items-center justify-center bg-[#004a80] rounded-xl shadow-lg shadow-blue-200/50 transition-all duration-500 ${collapsed ? 'w-10 h-10' : 'w-9 h-9'}`}>
      <span className="text-white font-black text-lg uppercase tracking-tighter">C</span>
    </div>
    {!collapsed && (
      <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
        <div className="flex items-baseline font-black tracking-tighter text-[#004a80] leading-none">
          <span className="text-xl lowercase">sis</span>
          <span className="text-xl uppercase ml-0.5">CQT</span>
        </div>
        <span className="text-[8px] text-blue-500 font-black uppercase tracking-[0.2em] mt-0.5">Enterprise AI</span>
      </div>
    )}
  </div>
);

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  setActiveView, 
  project, 
  user,
  onGoToHub,
  onLogout
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'editor', label: 'Rede', icon: '⚡' },
    { id: 'gis', label: 'GIS Map', icon: '🌍' },
    { id: 'solar', label: 'GD Solar', icon: '☀️' },
    { id: 'sustainability', label: 'ESG Hub', icon: '🌿' },
    { id: 'comparison', label: 'Cenários', icon: '⚖️' },
    { id: 'report', label: 'Memorial', icon: '📄' },
    { id: 'settings', label: 'Ajustes', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7ff] relative">
      
      {/* Sidebar Lateral (Desktop) */}
      <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-24' : 'w-72'} glass m-4 rounded-[32px] p-6 gap-6 shadow-2xl relative z-50 transition-all duration-500 ease-in-out`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-10 w-6 h-12 bg-white border border-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-600 shadow-lg z-50">
          {isCollapsed ? '▶' : '◀'}
        </button>

        <div className="py-2"><LogoSidebar collapsed={isCollapsed} /></div>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${activeView === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-gray-500 hover:bg-white/50'} ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <span className="text-xl">{item.icon}</span>
              {!isCollapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
           {!isCollapsed ? (
             <div onClick={() => setActiveView('billing')} className="glass-dark p-4 rounded-2xl border border-blue-50 cursor-pointer hover:shadow-lg transition-all group">
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#004a80] to-blue-600 flex items-center justify-center text-sm text-white font-black">{user.name.charAt(0).toUpperCase()}</div>
                   <div className="flex flex-col overflow-hidden">
                      <span className="text-[11px] font-black text-gray-800 truncate">{user.name}</span>
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">Plano {user.plan}</span>
                   </div>
                </div>
             </div>
           ) : (
             <div onClick={() => setActiveView('billing')} className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-[#004a80] to-blue-600 flex items-center justify-center text-sm text-white font-black cursor-pointer shadow-lg">{user.name.charAt(0).toUpperCase()}</div>
           )}
           <button onClick={onLogout} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-black text-[10px] uppercase tracking-widest ${isCollapsed ? 'justify-center' : ''}`}>
              <span>🚪</span> {!isCollapsed && 'Desconectar'}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden md:p-4">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-white/20 md:glass md:rounded-[32px] md:border md:border-white/40 shadow-sm">
          {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-white/40 flex justify-around items-center p-3 pb-6 z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[24px]">
        {menuItems.slice(0, 6).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${activeView === item.id ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <span className={`text-xl p-2 rounded-xl transition-all ${activeView === item.id ? 'bg-blue-100 scale-110' : ''}`}>{item.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
        <button onClick={onGoToHub} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-xl p-2">🏠</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Hub</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
