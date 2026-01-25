import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PrivacyActions } from '../PrivacyActions';
import { ApiService } from '../../services/apiService.ts';

const { mockShowToast, mockNavigate } = vi.hoisted(() => ({
  mockShowToast: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('../../context/ToastContext.tsx', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('PrivacyActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Stubs para evitar side-effects reais no JSDOM
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    // confirm pode não existir em alguns ambientes; garantimos e "resetamos"
    // @ts-expect-error - allow overriding in tests
    window.confirm = vi.fn();
  });

  it('deve exportar dados LGPD e mostrar toast de sucesso', async () => {
    vi.spyOn(ApiService, 'privacyExport').mockResolvedValue({ ok: true });

    render(
      <MemoryRouter>
        <PrivacyActions />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Baixar meus dados/i }));

    await waitFor(() => {
      expect(ApiService.privacyExport).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Export LGPD gerado (download iniciado).', 'success');
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('deve fazer double-confirm, excluir conta, deslogar e navegar para /login', async () => {
    // @ts-expect-error - mocked in tests
    window.confirm
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);

    vi.spyOn(ApiService, 'privacyDeleteAccount').mockResolvedValue({ success: true });
    vi.spyOn(ApiService, 'logout').mockResolvedValue();

    render(
      <MemoryRouter>
        <PrivacyActions />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Excluir conta/i }));

    await waitFor(() => {
      expect(ApiService.privacyDeleteAccount).toHaveBeenCalledTimes(1);
      expect(ApiService.logout).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith('Conta excluída. Você foi desconectado.', 'success');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});

