
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
import { User, Project } from './types.ts';
import { useToast } from './context/ToastContext.tsx';
import { useProjectManagement } from './hooks/useProjectManagement.ts';

const AUTH_KEY = 'sisqat_user_session';

const ProjectRouteWrapper = ({ pm, user, onLogout }: { pm: any, user: User, onLogout: () => void }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId && pm.savedProjects[projectId]) {
      pm.setCurrentProjectId(projectId);
    } else if (projectId) {
      navigate('/hub');
    }
  }, [projectId, pm.savedProjects, navigate]);

  // Se o projeto ainda não foi carregado no estado, mas o ID é válido, mostramos loading.
  // Se o ID na URL não bate com o ID carregado, esperamos o efeito acima sincronizar.
  if (!pm.project || pm.project.id !== projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f0f4ff]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent animate-spin rounded-full"></div>
        <p className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Sincronizando Projeto...</p>
      </div>
    );
  }

  return (
    <Layout 
      project={pm.project}
      user={user}
      onGoToHub={() => navigate('/hub')}
      onSwitchScenario={(id) => pm.updateProject({ activeScenarioId: id })}
      onCloneScenario={pm.cloneScenario}
      onDeleteScenario={pm.deleteScenario}
      onLogout={onLogout}
    >
      <Outlet />
    </Layout>
  );
};

const App: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem(AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const pm = useProjectManagement();

  useEffect(() => {
    if (currentUser) sessionStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
    else sessionStorage.removeItem(AUTH_KEY);
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/hub" /> : <Login onLogin={(u) => { setCurrentUser(u); navigate('/hub'); }} />} />
      
      <Route path="/hub" element={
        currentUser ? (
          <ProjectHub 
            projects={pm.savedProjects}
            onSelect={(id) => navigate(`/project/${id}/dashboard`)}
            onCreate={(name, sob, pe, lat, lng) => {
              const id = pm.createProject(name, sob, pe, lat, lng);
              navigate(`/project/${id}/dashboard`);
            }}
            onUpdate={(id, name, sob, pe, lat, lng) => {
              pm.updateProject({ name, metadata: { ...pm.savedProjects[id].metadata, sob, electricPoint: pe, lat, lng } });
              showToast("Dados atualizados.");
            }}
            onDelete={pm.deleteProject}
            onDuplicate={pm.duplicateProject}
            user={currentUser}
            onLogout={handleLogout}
            onBilling={() => navigate('/billing')}
          />
        ) : <Navigate to="/login" />
      } />

      <Route path="/billing" element={
        currentUser ? (
          <div className="p-8 min-h-screen bg-[#f0f4ff]">
              <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 font-bold px-6 py-2 glass rounded-full hover:bg-white transition-all shadow-sm">← Voltar</button>
              <Billing user={currentUser} onUpdatePlan={(plan) => {
                setCurrentUser({...currentUser, plan});
                showToast(`Plano atualizado para ${plan}!`, "success");
              }} />
          </div>
        ) : <Navigate to="/login" />
      } />

      <Route path="/project/:projectId" element={currentUser ? <ProjectRouteWrapper pm={pm} user={currentUser} onLogout={handleLogout} /> : <Navigate to="/login" />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={
          pm.activeResult ? (
            <Dashboard 
              project={pm.project!} result={pm.activeResult} isCalculating={pm.isCalculating}
              onUpdateMetadata={(m) => pm.updateProject({ metadata: m })} 
            />
          ) : <div className="p-8 text-center animate-pulse text-[10px] font-black uppercase text-blue-500">Calculando...</div>
        } />
        <Route path="editor" element={
          pm.activeResult ? (
            <ProjectEditor 
              project={{...pm.project!, ...pm.activeScenario!}} 
              onUpdate={(n) => pm.updateActiveScenario({ nodes: n })} 
              onUpdateParams={(p) => pm.updateActiveScenario({ params: p })} 
              onOptimize={pm.optimizeActive}
              onRecalculate={pm.forceRecalculate}
              calculatedNodes={pm.activeResult.nodes}
              result={pm.activeResult}
            />
          ) : null
        } />
        <Route path="gis" element={pm.activeResult ? <GISView project={pm.project!} result={pm.activeResult} onUpdateNodes={(n) => pm.updateActiveScenario({ nodes: n })} /> : null} />
        <Route path="solar" element={pm.activeResult ? <SolarDashboard project={pm.project!} result={pm.activeResult} onUpdateParams={(p) => pm.updateActiveScenario({ params: p })} /> : null} />
        <Route path="sustainability" element={pm.activeResult ? <SustainabilityDashboard project={pm.project!} result={pm.activeResult} /> : null} />
        <Route path="comparison" element={
          <ComparisonView 
            project={pm.project!} results={pm.allResults} 
            onSwitchScenario={(id) => pm.updateProject({ activeScenarioId: id })} 
            onCloneScenario={pm.cloneScenario} onCreateEmptyScenario={pm.createEmptyScenario}
          />
        } />
        <Route path="ai-chat" element={pm.activeResult ? <Chatbot project={pm.project!} result={pm.activeResult} /> : null} />
        <Route path="report" element={pm.activeResult ? <ProjectReport project={pm.project!} activeScenario={pm.activeScenario!} result={pm.activeResult} allResults={pm.allResults} /> : null} />
        <Route path="settings" element={
          <Settings 
            project={pm.project!} 
            onUpdateCables={(c) => pm.updateProject({ cables: c })} 
            onUpdateIpTypes={(i) => pm.updateProject({ ipTypes: i })} 
            onUpdateReportConfig={(r) => pm.updateProject({ reportConfig: r })} 
          />
        } />
      </Route>

      <Route path="*" element={<Navigate to="/hub" />} />
    </Routes>
  );
};

export default App;
