import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();
const showToastMock = vi.fn();

const privacyExportMock = vi.fn().mockResolvedValue({ ok: true });
const privacyDeleteAccountMock = vi.fn().mockResolvedValue({ success: true });
const logoutMock = vi.fn().mockResolvedValue(undefined);

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../context/ToastContext.tsx', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

vi.mock('../../services/apiService.ts', () => ({
  ApiService: {
    privacyExport: (...args: any[]) => privacyExportMock(...args),
    privacyDeleteAccount: (...args: any[]) => privacyDeleteAccountMock(...args),
    logout: (...args: any[]) => logoutMock(...args),
  },
}));

import { PrivacyActions } from '../PrivacyActions';

describe('PrivacyActions', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    showToastMock.mockReset();
    privacyExportMock.mockClear();
    privacyDeleteAccountMock.mockClear();
    logoutMock.mockClear();

    // jsdom não implementa URL.createObjectURL em alguns ambientes
    (globalThis as any).URL.createObjectURL = vi.fn(() => 'blob:mock');
    (globalThis as any).URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('export chama ApiService.privacyExport', async () => {
    render(
      <MemoryRouter>
        <PrivacyActions />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Baixar meus dados/i }));

    await waitFor(() => {
      expect(privacyExportMock).toHaveBeenCalledTimes(1);
    });
  });

  it('delete faz double-confirm e navega para /login', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockReturnValueOnce(true).mockReturnValueOnce(true);

    render(
      <MemoryRouter>
        <PrivacyActions />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Excluir conta/i }));

    await waitFor(() => {
      expect(privacyDeleteAccountMock).toHaveBeenCalledTimes(1);
    });

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });
});

