
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Project, EngineResult, User, Scenario, ProjectParams, NetworkNode } from './types.ts';
import { ElectricalEngine } from './services/electricalEngine.ts';
import { DEFAULT_CABLES, IP_TYPES } from './constants.ts';
import { useToast } from './context/ToastContext.tsx';

const LOCAL_STORAGE_KEY_HUB = 'sisqat_enterprise_hub_v4';
const AUTH_KEY = 'sisqat_user_session';

const createTemplateProject = (name: string, sob: string, pe: string, lat: number, lng: number): Project => ({
  id: 'PRJ-' + Date.now(),
  name: name,
  metadata: { 
    sob: sob, 
    electricPoint: pe, 
    lat: lat, 
    lng: lng, 
    client: '', 
    address: '', 
    district: '', 
    city: 'Rio de Janeiro' 
  },
  activeScenarioId: 'SCN-1',
  updatedAt: new Date().toISOString(),
  cables: DEFAULT_CABLES,
  ipTypes: IP_TYPES,
  reportConfig: {
    showJustification: true, showKpis: true, showTopology: true,
    showMaterials: true, showSignatures: true, showUnifilar: true
  },
  scenarios: [
    {
      id: 'SCN-1',
      name: 'ATUAL',
      updatedAt: new Date().toISOString(),
      params: { trafoKva: 75, profile: 'Massivos', classType: 'Automatic', manualClass: 'B', normativeTable: 'PRODIST' },
      nodes: [
        { id: 'TRAFO', parentId: '', meters: 0, cable: Object.keys(DEFAULT_CABLES)[4], loads: { mono: 2, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0 } },
      ]
    }
  ]
});

const App: React.FC = () => {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem(AUTH_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [savedProjects, setSavedProjects] = useState<Record<string, Project>>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_HUB);
    try { return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  
  const [allResults, setAllResults] = useState<Record<string, EngineResult>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    ElectricalEngine.runUnitTestCqt();
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_HUB, JSON.stringify(savedProjects));
  }, [savedProjects]);

  useEffect(() => {
    if (currentUser) sessionStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
    else sessionStorage.removeItem(AUTH_KEY);
  }, [currentUser]);

  const project = useMemo(() => currentProjectId ? savedProjects[currentProjectId] : null, [currentProjectId, savedProjects]);

  const activeScenario = useMemo(() => {
    if (!project) return null;
    return project.scenarios.find(s => s.id === project.activeScenarioId) || project.scenarios[0];
  }, [project]);

  useEffect(() => {
    if (!project) {
      setAllResults({});
      return;
    }

    let isMounted = true;
    setIsCalculating(true);

    const timeoutId = setTimeout(() => {
      if (!isMounted) return;
      
      const results: Record<string, EngineResult> = {};
      try {
        for (const s of project.scenarios) {
          results[s.id] = ElectricalEngine.calculate(
            s.id, 
            s.nodes, 
            s.params, 
            project.cables, 
            project.ipTypes
          );
        }
        if (isMounted) setAllResults(results);
      } catch (err) {
        console.error("Erro no motor de cálculo:", err);
        showToast("Falha crítica no motor de cálculo. Revise a topologia.", "error");
      } finally {
        if (isMounted) setIsCalculating(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [project, showToast]);

  const activeResult = useMemo(() => {
    if (!activeScenario) return null;
    return allResults[activeScenario.id] || null;
  }, [activeScenario, allResults]);

  const updateProject = useCallback((updates: Partial<Project>) => {
    if (!currentProjectId) return;
    setSavedProjects(prev => ({
      ...prev,
      [currentProjectId]: { ...prev[currentProjectId], ...updates, updatedAt: new Date().toISOString() }
    }));
  }, [currentProjectId]);

  const updateActiveScenario = useCallback((updates: Partial<Scenario>) => {
    if (!project || !activeScenario) return;
    const newScenarios = project.scenarios.map(s => 
      s.id === project.activeScenarioId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    updateProject({ scenarios: newScenarios });
  }, [project, activeScenario, updateProject]);

  const handleUpdateNodes = (nodes: NetworkNode[]) => updateActiveScenario({ nodes });
  const handleUpdateParams = (params: ProjectParams) => updateActiveScenario({ params });

  const handleCloneScenario = () => {
    if (!project || !activeScenario) return;
    const newId = 'SCN-' + Date.now();
    const clone: Scenario = {
      ...JSON.parse(JSON.stringify(activeScenario)),
      id: newId,
      name: `${activeScenario.name} (Cópia)`,
      updatedAt: new Date().toISOString()
    };
    updateProject({ 
      scenarios: [...project.scenarios, clone],
      activeScenarioId: newId 
    });
    showToast("Cenário clonado com sucesso!");
  };

  const handleCreateEmptyScenario = () => {
    if (!project) return;
    const newId = 'SCN-' + Date.now();
    const newScenario: Scenario = {
      id: newId,
      name: `CENÁRIO ${project.scenarios.length + 1}`,
      updatedAt: new Date().toISOString(),
      params: { 
        trafoKva: 75, 
        profile: 'Massivos', 
        classType: 'Automatic', 
        manualClass: 'B', 
        normativeTable: 'PRODIST' 
      },
      nodes: [
        { id: 'TRAFO', parentId: '', meters: 0, cable: Object.keys(DEFAULT_CABLES)[4], loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0 } },
      ]
    };
    updateProject({ 
      scenarios: [...project.scenarios, newScenario],
      activeScenarioId: newId 
    });
    showToast("Novo cenário vazio criado.");
  };

  const handleDeleteScenario = (id: string) => {
    if (!project || project.scenarios.length <= 1) return;
    const newScenarios = project.scenarios.filter(s => s.id !== id);
    updateProject({ 
      scenarios: newScenarios,
      activeScenarioId: newScenarios[0].id 
    });
    showToast("Cenário removido.");
  };

  const handleOptimizeActive = () => {
    if (!project || !activeScenario) return;
    try {
      const optimizedNodes = ElectricalEngine.optimize(
        activeScenario.id, 
        activeScenario.nodes, 
        activeScenario.params, 
        project.cables, 
        project.ipTypes
      );
      handleUpdateNodes(optimizedNodes);
    } catch (err) {
      showToast("Erro durante auto-dimensionamento.", "error");
    }
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  if (!project) {
    return (
      <ProjectHub 
        projects={savedProjects}
        onSelect={(id) => { 
          setAllResults({}); 
          setCurrentProjectId(id); 
          setActiveView('dashboard'); 
        }}
        onCreate={(name, sob, pe, lat, lng) => {
          const n = createTemplateProject(name, sob, pe, lat, lng);
          setSavedProjects(p => ({...p, [n.id]: n}));
          setAllResults({});
          setCurrentProjectId(n.id);
          setActiveView('dashboard');
          showToast("Projeto criado com sucesso!");
        }}
        onUpdate={(id, name, sob, pe, lat, lng) => {
          setSavedProjects(prev => ({
            ...prev,
            [id]: {
              ...prev[id],
              name: name,
              updatedAt: new Date().toISOString(),
              metadata: {
                ...prev[id].metadata,
                sob: sob,
                electricPoint: pe,
                lat: lat,
                lng: lng
              }
            }
          }));
          showToast("Informações do projeto atualizadas.");
        }}
        onDelete={(id) => {
          setSavedProjects(p => { const {[id]: _, ...rest} = p; return rest; });
          showToast("Projeto excluído.");
        }}
        onDuplicate={(id) => {
          const source = savedProjects[id];
          const clone = {
            ...JSON.parse(JSON.stringify(source)), 
            id: 'PRJ-'+Date.now(), 
            name: source.name + ' (Cópia)',
            updatedAt: new Date().toISOString()
          };
          setSavedProjects(p => ({...p, [clone.id]: clone}));
          showToast("Projeto duplicado!");
        }}
        user={currentUser}
        onLogout={() => {
           setCurrentUser(null);
           showToast("Sessão encerrada.");
        }}
        onBilling={() => setActiveView('billing')}
      />
    );
  }

  if (activeView === 'billing') {
      return (
          <div className="p-8">
              <button onClick={() => setActiveView('dashboard')} className="mb-4 text-blue-600 font-bold px-6 py-2 glass rounded-full hover:bg-white transition-all">← Voltar</button>
              <Billing user={currentUser} onUpdatePlan={(plan) => {
                setCurrentUser({...currentUser, plan});
                showToast(`Plano atualizado para ${plan}!`, "success");
              }} />
          </div>
      );
  }

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-in fade-in py-32">
      <div className="relative">
        <div className="w-20 h-20 bg-blue-100/50 backdrop-blur-md rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-black text-xs uppercase">BT</div>
      </div>
      <div className="text-center">
        <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Sincronizando Engenharia</p>
        <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-tight">Resolvendo Fluxo de Carga Theseus 3.1...</p>
      </div>
    </div>
  );

  return (
    <Layout 
      activeView={activeView} setActiveView={setActiveView}
      project={project}
      user={currentUser}
      onGoToHub={() => { setCurrentProjectId(null); setAllResults({}); }}
      onSwitchScenario={(id) => updateProject({ activeScenarioId: id })}
      onCloneScenario={handleCloneScenario}
      onDeleteScenario={handleDeleteScenario}
      onLogout={() => {
        setCurrentUser(null);
        showToast("Sessão encerrada.");
      }}
    >
      {!activeResult && activeView !== 'settings' ? renderLoadingState() : (
        <>
          {activeView === 'dashboard' && (
            <Dashboard 
              project={project} 
              result={activeResult!} 
              isCalculating={isCalculating}
              setActiveView={setActiveView} 
              onUpdateMetadata={(metadata) => updateProject({ metadata })} 
            />
          )}
          {activeView === 'editor' && (
            <ProjectEditor 
              project={{...project, ...activeScenario!}} 
              onUpdate={handleUpdateNodes} 
              onUpdateParams={handleUpdateParams} 
              onOptimize={handleOptimizeActive}
              calculatedNodes={activeResult!.nodes}
              result={activeResult!}
            />
          )}
          {activeView === 'comparison' && (
            <ComparisonView 
              project={project} 
              results={allResults} 
              setActiveView={setActiveView} 
              onSwitchScenario={(id) => updateProject({ activeScenarioId: id })} 
              onCloneScenario={handleCloneScenario}
              onCreateEmptyScenario={handleCreateEmptyScenario}
            />
          )}
          {activeView === 'ai-chat' && <Chatbot project={project} result={activeResult!} />}
          {activeView === 'report' && <ProjectReport project={project} activeScenario={activeScenario!} result={activeResult!} />}
          {activeView === 'settings' && (
            <Settings 
              project={project} 
              onUpdateCables={(cables) => updateProject({ cables })} 
              onUpdateIpTypes={(ipTypes) => updateProject({ ipTypes })} 
              onUpdateReportConfig={(reportConfig) => updateProject({ reportConfig })} 
            />
          )}
        </>
      )}
    </Layout>
  );
};

export default App;
