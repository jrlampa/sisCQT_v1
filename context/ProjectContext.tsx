// context/ProjectContext.tsx
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Project, EngineResult, Scenario, NetworkNode, User } from '../types';
import { ApiService } from '../services/apiService';
import { useToast } from './ToastContext';
import { createTemplateProject, generateId } from '../utils/projectUtils';
import { useProjectManagement } from '../hooks/useProjectManagement'; // Import the original hook

// 1. Define the Context Shape
interface ProjectContextType {
  savedProjects: Record<string, Project>;
  project: Project | null;
  activeScenario: Scenario | null;
  activeResult: EngineResult | null;
  allResults: Record<string, EngineResult>;
  isCalculating: boolean;
  setCurrentProjectId: (id: string | null) => void;
  createProject: (name: string, sob: string, pe: string, lat: number, lng: number) => string;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => Promise<void>;
  optimizeActive: () => Promise<void>;
  cloneScenario: () => void;
  createEmptyScenario: () => void;
  updateActiveScenario: (updates: Partial<Scenario>) => void;
  updateProject: (updates: Partial<Project>) => void;
  forceRecalculate: () => void;
  // Add other functions from useProjectManagement if needed
}

// Create the Context
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Create the Provider Component
interface ProjectProviderProps {
  children: React.ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  // Use the original useProjectManagement hook internally
  const pm = useProjectManagement();

  const contextValue = useMemo(() => ({
    savedProjects: pm.savedProjects,
    project: pm.project,
    activeScenario: pm.activeScenario,
    activeResult: pm.activeResult,
    allResults: pm.allResults,
    isCalculating: pm.isCalculating,
    setCurrentProjectId: pm.setCurrentProjectId,
    createProject: pm.createProject,
    duplicateProject: pm.duplicateProject,
    deleteProject: pm.deleteProject,
    optimizeActive: pm.optimizeActive,
    cloneScenario: pm.cloneScenario,
    createEmptyScenario: pm.createEmptyScenario,
    updateActiveScenario: pm.updateActiveScenario,
    updateProject: pm.updateProject,
    forceRecalculate: pm.forceRecalculate,
  }), [pm]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

// Create a custom hook to use the Project Context
export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};