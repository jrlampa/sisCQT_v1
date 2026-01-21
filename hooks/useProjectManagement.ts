
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Project, EngineResult, Scenario, ProjectParams, NetworkNode } from '../types';
import { ApiService } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { createTemplateProject, generateId } from '../utils/projectUtils';

export function useProjectManagement() {
  const { showToast } = useToast();
  
  const [savedProjects, setSavedProjects] = useState<Record<string, Project>>({});
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<Record<string, EngineResult>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [recalcTrigger, setRecalcTrigger] = useState(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carregamento Inicial via API
  useEffect(() => {
    ApiService.getProjects().then(setSavedProjects);
  }, []);

  // Persistência com Debounce via API Service
  useEffect(() => {
    if (Object.keys(savedProjects).length > 0) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(() => {
        Object.values(savedProjects).forEach(p => ApiService.saveProject(p));
      }, 1000); 
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [savedProjects]);

  const project = useMemo(() => 
    currentProjectId ? savedProjects[currentProjectId] : null, 
  [currentProjectId, savedProjects]);

  const activeScenario = useMemo(() => {
    if (!project) return null;
    return project.scenarios.find(s => s.id === project.activeScenarioId) || project.scenarios[0];
  }, [project]);

  // Efeito de Cálculo Sincronizado com API
  useEffect(() => {
    if (!project) {
      setAllResults({});
      return;
    }

    setIsCalculating(true);
    const timeoutId = setTimeout(async () => {
      const results: Record<string, EngineResult> = {};
      try {
        for (const s of project.scenarios) {
          results[s.id] = await ApiService.calculateScenario({
            scenarioId: s.id,
            nodes: s.nodes,
            params: s.params,
            cables: project.cables,
            ips: project.ipTypes
          });
        }
        setAllResults(results);
      } catch (err) {
        console.error("Erro no sincronismo do motor:", err);
        showToast("Falha ao processar cálculos de rede.", "error");
      } finally {
        setIsCalculating(false);
      }
    }, 300); // Aumento leve no throttle para estabilidade

    return () => clearTimeout(timeoutId);
  }, [project, recalcTrigger, showToast]);

  const activeResult = useMemo(() => {
    if (!activeScenario) return null;
    return allResults[activeScenario.id] || null;
  }, [activeScenario, allResults]);

  const updateProject = useCallback((updates: Partial<Project>) => {
    if (!currentProjectId) return;
    setSavedProjects(prev => ({
      ...prev,
      [currentProjectId]: { 
        ...prev[currentProjectId], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      }
    }));
  }, [currentProjectId]);

  const updateActiveScenario = useCallback((updates: Partial<Scenario>) => {
    if (!project || !activeScenario) return;
    const newScenarios = project.scenarios.map(s => 
      s.id === project.activeScenarioId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    updateProject({ scenarios: newScenarios });
  }, [project, activeScenario, updateProject]);

  return {
    savedProjects,
    project,
    activeScenario,
    activeResult,
    allResults,
    isCalculating,
    setCurrentProjectId,
    createProject: (name: string, sob: string, pe: string, lat: number, lng: number) => {
      const n = createTemplateProject(name, sob, pe, lat, lng);
      setSavedProjects(p => ({...p, [n.id]: n}));
      return n.id;
    },
    deleteProject: (id: string) => {
      setSavedProjects(p => { const {[id]: _, ...rest} = p; return rest; });
      showToast("Projeto removido.");
    },
    duplicateProject: (id: string) => {
      const source = savedProjects[id];
      const clone = {
        ...JSON.parse(JSON.stringify(source)), 
        id: generateId('PRJ'), 
        name: source.name + ' (Cópia)',
        updatedAt: new Date().toISOString()
      };
      setSavedProjects(p => ({...p, [clone.id]: clone}));
      showToast("Projeto duplicado.");
    },
    updateProject,
    updateActiveScenario,
    cloneScenario: () => {
      if (!project || !activeScenario) return;
      const newId = generateId('SCN');
      const clone = { 
        ...JSON.parse(JSON.stringify(activeScenario)), 
        id: newId, 
        name: `${activeScenario.name} (Cópia)`, 
        updatedAt: new Date().toISOString() 
      };
      updateProject({ scenarios: [...project.scenarios, clone], activeScenarioId: newId });
      showToast("Cenário duplicado.");
    },
    createEmptyScenario: () => {
      if (!project) return;
      const newId = generateId('SCN');
      const newScenario: Scenario = {
        id: newId, 
        name: `CENÁRIO ${project.scenarios.length + 1}`, 
        updatedAt: new Date().toISOString(),
        params: { trafoKva: 75, profile: 'Massivos', classType: 'Automatic', manualClass: 'B', normativeTable: 'PRODIST', includeGdInQt: false },
        nodes: [{ id: 'TRAFO', parentId: '', meters: 0, cable: "3x95+54.6mm² Al", loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 } }]
      };
      updateProject({ scenarios: [...project.scenarios, newScenario], activeScenarioId: newId });
    },
    deleteScenario: (id: string) => {
      if (!project || project.scenarios.length <= 1) return;
      const filtered = project.scenarios.filter(s => s.id !== id);
      updateProject({ scenarios: filtered, activeScenarioId: filtered[0].id });
    },
    optimizeActive: async () => {
      if (!project || !activeScenario) return;
      const { ElectricalEngine } = await import('../services/electricalEngine');
      const optimizedNodes = ElectricalEngine.optimize(
        activeScenario.id, 
        activeScenario.nodes, 
        activeScenario.params, 
        project.cables, 
        project.ipTypes
      );
      updateActiveScenario({ nodes: optimizedNodes });
      showToast("Auto-dimensionamento concluído.");
    },
    forceRecalculate: () => setRecalcTrigger(p => p + 1)
  };
}
