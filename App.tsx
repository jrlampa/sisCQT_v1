
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, Outlet } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import ProjectHub from './components/ProjectHub.tsx';
import ProjectEditor from './components/ProjectEditor.tsx';
import Chatbot from './components/Chatbot.tsx';
import ComparisonView from './components/ComparisonView.tsx';
import ProjectReport from './components/ProjectReport.tsx';
import Settings from './components/Settings.tsx';
import Login from './components/Login.tsx';
import Billing from './components/Billing.tsx';
import GISView from './components/GISView.tsx';
import SustainabilityDashboard from './components/SustainabilityDashboard.tsx';
import SolarDashboard from './components/SolarDashboard.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import { Legal } from './components/Legal.tsx';
import { User } from './types.ts';
import { useToast } from './context/ToastContext.tsx';

import { ApiService } from './services/apiService.ts';
import { ProjectProvider, useProject } from './context/ProjectContext';

const ProjectRouteWrapper = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { savedProjects, setCurrentProjectId, project, updateProject } = useProject();

  useEffect(() => {
    if (projectId && savedProjects[projectId]) {
      setCurrentProjectId(projectId);
    } else if (projectId && Object.keys(savedProjects).length > 0) {
      navigate('/hub');
    }
  }, [projectId, savedProjects, navigate, setCurrentProjectId]);

  if (!project || project.id !== projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f0f4ff]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent animate-spin rounded-full"></div>
        <p className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Sincronizando Projeto...</p>
      </div>
    );
  }

  return (
    <Layout 
      project={project}
      user={user}
      onGoToHub={() => navigate('/hub')}
      onSwitchScenario={(id) => updateProject({ activeScenarioId: id })}
      onLogout={onLogout}
    >
      <Outlet />
    </Layout>
  );
};

const App: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);



  // Verifica autenticação no mount
  useEffect(() => {
    const checkAuth = async () => {
      // BACKDOOR: Apenas em modo DEV, se a URL tiver ?backdoor=true, faz login automático
      if (import.meta.env.DEV) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('backdoor') === 'true') {
          try {
            const user = await ApiService.syncUser('dev-token-im3');
            setCurrentUser(user);
            setIsAuthLoading(false);
            return;
          } catch (e) {
            console.error("Backdoor failed", e);
          }
        }
      }

      try {
        const user = await ApiService.me();
        setCurrentUser(user);
      } catch (e) {
        setCurrentUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await ApiService.logout();
    } finally {
      setCurrentUser(null);
      navigate('/login');
    }
  };

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    navigate('/hub');
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8faff]">
        <div className="w-16 h-1 w-full max-w-[200px] bg-blue-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 animate-[loading_1.5s_infinite_linear]"></div>
        </div>
        <div className="mt-6 flex flex-col items-center">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Autenticando na Rede...</span>
            {import.meta.env.DEV && (
              <button 
                onClick={() => window.location.href = window.location.pathname + '?backdoor=true'}
                className="mt-8 text-[9px] font-black text-gray-400 hover:text-blue-500 underline uppercase tracking-tighter"
              >
                Está demorando? Clique para forçar acesso de teste.
              </button>
            )}
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <ProjectProvider>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to="/hub" /> : <Login onLogin={handleLogin} />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/terms" element={<Legal kind="terms" />} />
        <Route element={<ProtectedRoute user={currentUser} isLoading={isAuthLoading} />}>
          <Route path="/hub" element={
            <ProjectHub 
              user={currentUser!}
              onLogout={handleLogout}
              onBilling={() => navigate('/billing')}
              onSelectProject={(id) => navigate(`/project/${id}`)}
            />
          } />
          <Route path="/billing" element={
            <div className="p-8 min-h-screen bg-[#f0f4ff]">
                <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 font-bold px-6 py-2 glass rounded-full hover:bg-white transition-all shadow-sm">← Voltar</button>
                <Billing user={currentUser!} onUpdatePlan={(plan) => {
                  setCurrentUser({...currentUser!, plan});
                  showToast(`Plano atualizado para ${plan}!`, "success");
                }} />
            </div>
          } />
          <Route path="/project/:projectId" element={<ProjectRouteWrapper user={currentUser!} onLogout={handleLogout} />}>
            <Route index element={<Navigate to="dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="editor" element={<ProjectEditor />} />
            <Route path="gis" element={<GISView />} />
            <Route path="solar" element={<SolarDashboard />} />
            <Route path="sustainability" element={<SustainabilityDashboard />} />
            <Route path="comparison" element={<ComparisonView />} />
            <Route path="ai-chat" element={<Chatbot />} />
            <Route path="report" element={<ProjectReport />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/hub" />} />
      </Routes>
    </ProjectProvider>
  );
};

export default App;
