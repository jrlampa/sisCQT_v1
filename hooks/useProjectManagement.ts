
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Project, EngineResult, Scenario, ProjectParams, NetworkNode } from '../types';
import { ElectricalEngine } from '../services/electricalEngine';
import { DEFAULT_CABLES, IP_TYPES } from '../constants';
import { useToast } from '../context/ToastContext';

const LOCAL_STORAGE_KEY_HUB = 'sisqat_enterprise_hub_v4';

const createTemplateProject = (name: string, sob: string, pe: string, lat: number, lng: number): Project => ({
  id: 'PRJ-' + Date.now(),
  name: name,
  metadata: { 
    sob, electricPoint: pe, lat, lng, client: '', address: '', district: '', city: 'Rio de Janeiro' 
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
      params: { trafoKva: 75, profile: 'Massivos', classType: 'Automatic', manualClass: 'B', normativeTable: 'PRODIST', includeGdInQt: false },
      nodes: [
        { id: 'TRAFO', parentId: '', meters: 0, cable: Object.keys(DEFAULT_CABLES)[4], loads: { mono: 2, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 } },
      ]
    }
  ]
});

export function useProjectManagement() {
  const { showToast } = useToast();
  
  const [savedProjects, setSavedProjects] = useState<Record<string, Project>>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_HUB);
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [allResults, setAllResults] = useState<Record<string, EngineResult>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [recalcTrigger, setRecalcTrigger] = useState(0);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_HUB, JSON.stringify(savedProjects));
  }, [savedProjects]);

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

    setIsCalculating(true);
    const timeoutId = setTimeout(() => {
      const results: Record<string, EngineResult> = {};
      try {
        for (const s of project.scenarios) {
          results[s.id] = ElectricalEngine.calculate(
            s.id, s.nodes, s.params, project.cables, project.ipTypes
          );
        }
        setAllResults(results);
      } catch (err) {
        console.error("Erro no motor de cálculo:", err);
      } finally {
        setIsCalculating(false);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [project, recalcTrigger]);

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

  const createProject = (name: string, sob: string, pe: string, lat: number, lng: number) => {
    const n = createTemplateProject(name, sob, pe, lat, lng);
    setSavedProjects(p => ({...p, [n.id]: n}));
    setCurrentProjectId(n.id);
    setActiveView('dashboard');
    showToast("Estudo iniciado com sucesso!");
  };

  const deleteProject = (id: string) => {
    setSavedProjects(p => { const {[id]: _, ...rest} = p; return rest; });
    showToast("Projeto excluído.");
  };

  const duplicateProject = (id: string) => {
    const source = savedProjects[id];
    const clone = {
      ...JSON.parse(JSON.stringify(source)), 
      id: 'PRJ-'+Date.now(), 
      name: source.name + ' (Cópia)',
      updatedAt: new Date().toISOString()
    };
    setSavedProjects(p => ({...p, [clone.id]: clone}));
    showToast("Projeto duplicado!");
  };

  const cloneScenario = () => {
    if (!project || !activeScenario) return;
    const newId = 'SCN-' + Date.now();
    const clone = { ...JSON.parse(JSON.stringify(activeScenario)), id: newId, name: `${activeScenario.name} (Cópia)`, updatedAt: new Date().toISOString() };
    updateProject({ scenarios: [...project.scenarios, clone], activeScenarioId: newId });
    showToast("Cenário clonado!");
  };

  const createEmptyScenario = () => {
    if (!project) return;
    const newId = 'SCN-' + Date.now();
    const newScenario: Scenario = {
      id: newId, name: `CENÁRIO ${project.scenarios.length + 1}`, updatedAt: new Date().toISOString(),
      params: { trafoKva: 75, profile: 'Massivos', classType: 'Automatic', manualClass: 'B', normativeTable: 'PRODIST', includeGdInQt: false },
      nodes: [{ id: 'TRAFO', parentId: '', meters: 0, cable: Object.keys(DEFAULT_CABLES)[4], loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 } }]
    };
    updateProject({ scenarios: [...project.scenarios, newScenario], activeScenarioId: newId });
    showToast("Novo cenário vazio criado.");
  };

  const optimizeActive = () => {
    if (!project || !activeScenario) return;
    try {
      const optimizedNodes = ElectricalEngine.optimize(activeScenario.id, activeScenario.nodes, activeScenario.params, project.cables, project.ipTypes);
      updateActiveScenario({ nodes: optimizedNodes });
      showToast("Auto-dimensionamento concluído.");
    } catch (err) {
      showToast("Erro durante otimização.", "error");
    }
  };

  return {
    savedProjects,
    project,
    activeScenario,
    activeResult,
    allResults,
    activeView,
    isCalculating,
    setActiveView,
    setCurrentProjectId,
    createProject,
    deleteProject,
    duplicateProject,
    updateProject,
    updateActiveScenario,
    cloneScenario,
    createEmptyScenario,
    deleteScenario: (id: string) => {
        if (!project || project.scenarios.length <= 1) return;
        const newScenarios = project.scenarios.filter(s => s.id !== id);
        updateProject({ scenarios: newScenarios, activeScenarioId: newScenarios[0].id });
        showToast("Cenário removido.");
    },
    optimizeActive,
    forceRecalculate: () => {
        setRecalcTrigger(p => p + 1);
        showToast("Sincronizando engine...", "info");
    }
  };
}
