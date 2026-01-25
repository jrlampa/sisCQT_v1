import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Login from '../Login';
import { useMsal } from '@azure/msal-react';
import { ApiService } from '../../services/apiService'; // Import ApiService to mock it
import { MemoryRouter } from 'react-router-dom';

// Mock do Google Login para não depender de provider/context
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login-mock">GoogleLogin</div>,
}));

// Mock the useToast hook
vi.mock('../../context/ToastContext.tsx', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock the ApiService
vi.mock('../../services/apiService', () => ({
  ApiService: {
    syncUser: vi.fn(),
    me: vi.fn().mockResolvedValue({ // Mock me() for the checkAuth in App.tsx to work
      id: 'mock-user-id',
      email: 'mock@example.com',
      name: 'Mock User',
      plan: 'Free',
      projects: [],
    }),
    logout: vi.fn(),
  },
}));

// Mock the @azure/msal-react hook directly
vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(), // Return vi.fn directly
  MsalProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, // Simple mock provider
}));


describe('Login Component', () => {
  it('should render the login component with all elements', async () => {
    vi.mocked(useMsal).mockReturnValue({ // Use vi.mocked to cast useMsal to its mocked type
      instance: { loginPopup: vi.fn() },
      inProgress: 'none',
      accounts: [],
    });

    render(
      <MemoryRouter>
        <Login onLogin={() => {}} />
      </MemoryRouter>
    );

    // Check for the main title and subtitle
    expect(screen.getByText('Engenharia Digital')).toBeDefined();
    expect(screen.getByText(/IM3: entre com Microsoft 365/i)).toBeDefined();

    // Check for the main login button
    const loginButton = screen.getByRole('button', { name: /ENTRAR COM MICROSOFT 365/i });
    expect(loginButton).toBeDefined();

    // Check for the developer mode button
    const devLoginButton = screen.getByRole('button', { name: /MODO DESENVOLVEDOR \(MOCK\)/i });
    expect(devLoginButton).toBeDefined();
  });

  it('should show loading state when a login is in progress', async () => {
    vi.spyOn(ApiService, 'syncUser').mockResolvedValue({ // Mock API call
      id: 'mock-user-id',
      email: 'mock@example.com',
      name: 'Mock User',
      plan: 'Free',
      projects: [],
    });

    vi.mocked(useMsal).mockReturnValue({
      instance: {
        loginPopup: vi.fn().mockResolvedValue({
          accessToken: 'mock-access-token',
        }),
      },
      inProgress: 'none', // Initially not in progress
      accounts: [],
    });

    render(
      <MemoryRouter>
        <Login onLogin={() => {}} />
      </MemoryRouter>
    );

    const loginButton = screen.getByRole('button', { name: /ENTRAR COM MICROSOFT 365/i });
    fireEvent.click(loginButton); // Simulate click

    await waitFor(() => { // Wait for the button to become disabled
      expect(loginButton).toBeDisabled();
    });
  });
});
