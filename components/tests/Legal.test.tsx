import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Legal } from '../Legal';

describe('Legal', () => {
  it('deve renderizar Política de Privacidade e links essenciais', () => {
    render(
      <MemoryRouter>
        <Legal kind="privacy" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Política de Privacidade \(LGPD\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Última atualização/i)).toBeInTheDocument();
    expect(screen.getByText(/Seus direitos/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Voltar/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /Ver Termos/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /Ver Privacidade \(LGPD\)/i })).toHaveAttribute('href', '/privacy');
  });

  it('deve renderizar Termos de Uso e links essenciais', () => {
    render(
      <MemoryRouter>
        <Legal kind="terms" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Termos de Uso/i })).toBeInTheDocument();
    expect(screen.getByText(/Uso permitido/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Voltar/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /Ver Termos/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /Ver Privacidade \(LGPD\)/i })).toHaveAttribute('href', '/privacy');
  });
});

