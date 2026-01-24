
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Project, EngineResult, MonteCarloResult, Scenario, NetworkNode } from '../types';
import { ApiService } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { createTemplateProject, createWelcomeProject, generateId } from '../utils/projectUtils';

export function useProjectManagement() {
  const { showToast } = useToast();
  const [savedProjects, setSavedProjects] = useState<Record<string, Project>>({});
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<Record<string, EngineResult>>({});
  const [calcErrors, setCalcErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [recalcTrigger, setRecalcTrigger] = useState(0);
  const [monteCarloResults, setMonteCarloResults] = useState<Record<string, MonteCarloResult>>({});
  const [isMonteCarloRunning, setIsMonteCarloRunning] = useState(false);
  const [serverConstants, setServerConstants] = useState<{
    cables: Project['cables'];
    ipTypes: Project['ipTypes'];
    dmdiTables: Record<string, any[]>;
    profiles: Record<string, any>;
  } | null>(null);

  const reloadFromBackend = useCallback(() => {
    ApiService.getProjects()
      .then(setSavedProjects)
      .catch((err: any) => {
        if (err?.message !== 'Sessão expirada') {
          showToast("Erro ao carregar projetos do servidor", "error");
        }
      });

    ApiService.getConstants()
      .then((c) => setServerConstants({ cables: c.cables, ipTypes: c.ipTypes, dmdiTables: c.dmdiTables, profiles: c.profiles }))
      .catch(() => {});
  }, [showToast]);

  // Carregamento inicial do Backend + recarrega ao autenticar/desautenticar
  useEffect(() => {
    reloadFromBackend();
    const handler = () => reloadFromBackend();
    window.addEventListener('sisqat_auth_changed', handler);
    return () => window.removeEventListener('sisqat_auth_changed', handler);
  }, [reloadFromBackend]);

  const project = useMemo(() => 
    currentProjectId ? savedProjects[currentProjectId] : null, 
  [currentProjectId, savedProjects]);

  const activeScenario = useMemo(() => {
    if (!project) return null;
    return project.scenarios.find(s => s.id === project.activeScenarioId) || project.scenarios[0];
  }, [project]);

  // Sincronismo do Motor de Cálculo (Backend)
  useEffect(() => {
    if (!project) return;
    setIsCalculating(true);
    const timeoutId = setTimeout(async () => {
      const results: Record<string, EngineResult> = {};
      const errors: Record<string, string> = {};

      for (const s of project.scenarios) {
        try {
          results[s.id] = await ApiService.calculateScenario({
            scenarioId: s.id,
            nodes: s.nodes,
            params: s.params,
            cables: project.cables,
            ips: project.ipTypes,
          });
        } catch (err: any) {
          const details = Array.isArray(err?.details)
            ? err.details
                .slice(0, 3)
                .map((d: any) => (d?.path ? `${d.path}: ${d.message || 'inválido'}` : d?.message))
                .filter(Boolean)
                .join(' | ')
            : null;

          const msg = [
            err?.message || (typeof err === 'string' ? err : null) || 'Falha ao calcular o cenário.',
            details ? `(${details})` : null,
          ]
            .filter(Boolean)
            .join(' ');
          errors[s.id] = msg;
        }
      }

      setAllResults(results);
      setCalcErrors(errors);

      if (Object.keys(errors).length > 0) {
        showToast("Um ou mais cenários falharam no motor de cálculo.", "error");
      }
      setIsCalculating(false);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [project, recalcTrigger]);

  const updateProject = useCallback((updates: Partial<Project>) => {
    if (!currentProjectId) return;
    const projectToUpdate = savedProjects[currentProjectId];
    if (!projectToUpdate) return;
    
    const updated = { ...projectToUpdate, ...updates, updatedAt: new Date().toISOString() };
    setSavedProjects(prev => ({ ...prev, [currentProjectId]: updated }));
    ApiService.updateProject(currentProjectId, updates); // Use PUT for updates
  }, [currentProjectId, savedProjects]);

  const updateActiveScenario = useCallback((updates: Partial<Scenario>) => {
    if (!project || !activeScenario) return;
    const newScenarios = project.scenarios.map(s => 
      s.id === project.activeScenarioId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    updateProject({ scenarios: newScenarios });
  }, [project, activeScenario, updateProject]);

  return {
    savedProjects, project, activeScenario, activeResult: activeScenario ? allResults[activeScenario.id] : null,
    allResults,
    calcErrors,
    activeCalcError: activeScenario ? (calcErrors[activeScenario.id] || null) : null,
    monteCarloResults,
    activeMonteCarlo: activeScenario ? (monteCarloResults[activeScenario.id] || null) : null,
    isMonteCarloRunning,
    backendConstants: serverConstants,
    isCalculating,
    setCurrentProjectId,
    createProject: async (name: string, sob: string, pe: string, lat: number, lng: number) => {
      const c = serverConstants ?? (await ApiService.getConstants());
      const n = createTemplateProject(name, sob, pe, lat, lng, { cables: c.cables, ipTypes: c.ipTypes });
      setSavedProjects(p => ({ ...p, [n.id]: n }));
      ApiService.createProject(n); // Use POST for creation
      return n.id;
    },
    importXlsxProject: async (file: File) => {
      showToast('Importando XLSX...', 'info');
      const { project: prj } = await ApiService.importXlsx(file);
      setSavedProjects((p) => ({ ...p, [prj.id]: prj }));
      return prj.id;
    },
    createWelcomeProject: async () => {
      const c = serverConstants ?? (await ApiService.getConstants());
      const prj = createWelcomeProject({ cables: c.cables, ipTypes: c.ipTypes });
      setSavedProjects((p) => ({ ...p, [prj.id]: prj }));
      ApiService.createProject(prj);
      return prj.id;
    },
    // Add missing method to duplicate an entire project
    duplicateProject: (id: string) => {
      const prj = savedProjects[id];
      if (!prj) return;
      const newId = generateId('PRJ');
      const newPrj: Project = { 
        ...prj, 
        id: newId, 
        name: `${prj.name} (Cópia)`, 
        updatedAt: new Date().toISOString() 
      };
      setSavedProjects(p => ({ ...p, [newId]: newPrj }));
      ApiService.createProject(newPrj); // Duplication is a form of creation
    },
    deleteProject: async (id: string) => {
      await ApiService.deleteProject(id);
      setSavedProjects(p => { const { [id]: _, ...rest } = p; return rest; });
    },
    optimizeActive: async () => {
      if (!project || !activeScenario) return;
      showToast("Otimizando rede via Backend...", "info");
      const optimizedNodes = await ApiService.optimizeScenario({
        scenarioId: activeScenario.id, nodes: activeScenario.nodes, params: activeScenario.params, cables: project.cables, ips: project.ipTypes
      });
      updateActiveScenario({ nodes: optimizedNodes });
      showToast("Otimização concluída!", "success");
    },
    runMonteCarlo: async (iterations: number = 1000) => {
      if (!project || !activeScenario) return;
      setIsMonteCarloRunning(true);
      try {
        const res = await ApiService.runMonteCarlo({
          scenarioId: activeScenario.id,
          nodes: activeScenario.nodes,
          params: activeScenario.params,
          cables: project.cables,
          ips: project.ipTypes,
          iterations,
          seed: activeScenario.id,
        });
        setMonteCarloResults((prev) => ({ ...prev, [activeScenario.id]: res }));
        showToast("Simulação Monte Carlo concluída!", "success");
      } catch (e: any) {
        showToast(e?.message || "Falha ao executar Monte Carlo.", "error");
      } finally {
        setIsMonteCarloRunning(false);
      }
    },
    // Add missing method to clone the current scenario within a project
    cloneScenario: () => {
      if (!project || !activeScenario) return;
      const newScenario: Scenario = {
        ...activeScenario,
        id: generateId('SCN'),
        name: `${activeScenario.name} (Cópia)`,
        updatedAt: new Date().toISOString()
      };
      updateProject({ scenarios: [...project.scenarios, newScenario], activeScenarioId: newScenario.id });
    },
    // Add missing method to create a new empty study scenario
    createEmptyScenario: () => {
      if (!project) return;
      const newScenario: Scenario = {
        id: generateId('SCN'),
        name: `CENÁRIO ${project.scenarios.length + 1}`,
        updatedAt: new Date().toISOString(),
        params: { ...project.scenarios[0].params },
        nodes: [{ 
          id: 'TRAFO', 
          parentId: '', 
          meters: 0, 
          cable: Object.keys(project.cables)[4] || "3x95+54.6mm² Al", 
          loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 } 
        }]
      };
      updateProject({ scenarios: [...project.scenarios, newScenario], activeScenarioId: newScenario.id });
    },
    updateActiveScenario,
    updateProject,
    forceRecalculate: () => setRecalcTrigger(p => p + 1)
  };
}
