import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ToastProvider } from '../context/ToastContext';

const getProjectsMock = vi.fn();
const getConstantsMock = vi.fn();

vi.mock('../services/apiService', () => {
  return {
    ApiService: {
      getProjects: (...args: any[]) => getProjectsMock(...args),
      getConstants: (...args: any[]) => getConstantsMock(...args),
    },
  };
});

import { useProjectManagement } from '../hooks/useProjectManagement';

describe('useProjectManagement', () => {
  it('não deve disparar loop de sincronização de projetos (dedup em StrictMode)', async () => {
    // Mantém a 1ª chamada "em voo" tempo suficiente para capturar o duplo-invoke do StrictMode.
    getProjectsMock.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({}), 25)));
    getConstantsMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ cables: {}, ipTypes: {}, dmdiTables: {}, profiles: {} }), 25)
        )
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <ToastProvider>{children}</ToastProvider>
      </React.StrictMode>
    );

    renderHook(() => useProjectManagement(), { wrapper });

    await waitFor(() => {
      expect(getProjectsMock).toHaveBeenCalledTimes(1);
      expect(getConstantsMock).toHaveBeenCalledTimes(1);
    });
  });
});

