
import React, { useState, useEffect } from 'react';
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
import { User } from './types.ts';
import { useToast } from './context/ToastContext.tsx';
import { useProjectManagement } from './hooks/useProjectManagement.ts';

const AUTH_KEY = 'sisqat_user_session';

const App: React.FC = () => {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem(AUTH_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const pm = useProjectManagement();

  useEffect(() => {
    if (currentUser) sessionStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
    else sessionStorage.removeItem(AUTH_KEY);
  }, [currentUser]);

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  if (!pm.project) {
    return (
      <ProjectHub 
        projects={pm.savedProjects}
        onSelect={(id) => { pm.setCurrentProjectId(id); pm.setActiveView('dashboard'); }}
        onCreate={pm.createProject}
        onUpdate={(id, name, sob, pe, lat, lng) => {
          pm.updateProject({ name, metadata: { ...pm.savedProjects[id].metadata, sob, electricPoint: pe, lat, lng } });
          showToast("Metadados atualizados.");
        }}
        onDelete={pm.deleteProject}
        onDuplicate={pm.duplicateProject}
        user={currentUser}
        onLogout={() => setCurrentUser(null)}
        onBilling={() => pm.setActiveView('billing')}
      />
    );
  }

  if (pm.activeView === 'billing') {
      return (
          <div className="p-8">
              <button onClick={() => pm.setActiveView('dashboard')} className="mb-4 text-blue-600 font-bold px-6 py-2 glass rounded-full hover:bg-white transition-all">← Voltar</button>
              <Billing user={currentUser} onUpdatePlan={(plan) => {
                setCurrentUser({...currentUser, plan});
                showToast(`Upgrade para ${plan} realizado!`, "success");
              }} />
          </div>
      );
  }

  return (
    <Layout 
      activeView={pm.activeView} setActiveView={pm.setActiveView}
      project={pm.project}
      user={currentUser}
      onGoToHub={() => pm.setCurrentProjectId(null)}
      onSwitchScenario={(id) => pm.updateProject({ activeScenarioId: id })}
      onCloneScenario={pm.cloneScenario}
      onDeleteScenario={pm.deleteScenario}
      onLogout={() => setCurrentUser(null)}
    >
      {!pm.activeResult && pm.activeView !== 'settings' ? (
        <div className="flex flex-col items-center justify-center h-full py-32"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent animate-spin rounded-full"></div></div>
      ) : (
        <>
          {pm.activeView === 'dashboard' && (
            <Dashboard 
              project={pm.project} result={pm.activeResult!} isCalculating={pm.isCalculating}
              setActiveView={pm.setActiveView} onUpdateMetadata={(m) => pm.updateProject({ metadata: m })} 
            />
          )}
          {pm.activeView === 'editor' && (
            <ProjectEditor 
              project={{...pm.project, ...pm.activeScenario!}} 
              onUpdate={(n) => pm.updateActiveScenario({ nodes: n })} 
              onUpdateParams={(p) => pm.updateActiveScenario({ params: p })} 
              onOptimize={pm.optimizeActive}
              onRecalculate={pm.forceRecalculate}
              calculatedNodes={pm.activeResult!.nodes}
              result={pm.activeResult!}
            />
          )}
          {pm.activeView === 'gis' && (
            <GISView 
              project={pm.project} result={pm.activeResult!} 
              onUpdateNodes={(n) => pm.updateActiveScenario({ nodes: n })} 
            />
          )}
          {pm.activeView === 'solar' && (
            <SolarDashboard 
              project={pm.project} result={pm.activeResult!} 
              onUpdateParams={(p) => pm.updateActiveScenario({ params: p })}
            />
          )}
          {pm.activeView === 'sustainability' && <SustainabilityDashboard project={pm.project} result={pm.activeResult!} />}
          {pm.activeView === 'comparison' && (
            <ComparisonView 
              project={pm.project} results={pm.allResults} setActiveView={pm.setActiveView} 
              onSwitchScenario={(id) => pm.updateProject({ activeScenarioId: id })} 
              onCloneScenario={pm.cloneScenario} onCreateEmptyScenario={pm.createEmptyScenario}
            />
          )}
          {pm.activeView === 'ai-chat' && <Chatbot project={pm.project} result={pm.activeResult!} />}
          {pm.activeView === 'report' && <ProjectReport project={pm.project} activeScenario={pm.activeScenario!} result={pm.activeResult!} />}
          {pm.activeView === 'settings' && (
            <Settings 
              project={pm.project} 
              onUpdateCables={(c) => pm.updateProject({ cables: c })} 
              onUpdateIpTypes={(i) => pm.updateProject({ ipTypes: i })} 
              onUpdateReportConfig={(r) => pm.updateProject({ reportConfig: r })} 
            />
          )}
        </>
      )}
    </Layout>
  );
};

export default App;
