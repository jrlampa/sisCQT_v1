import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Legal } from '../Legal';

describe('Legal', () => {
  it('renderiza Termos e links essenciais', () => {
    render(
      <MemoryRouter>
        <Legal kind="terms" />
      </MemoryRouter>
    );

    expect(screen.getByText('Termos de Uso')).toBeInTheDocument();
    expect(screen.getByText(/Natureza da ferramenta/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Ver Termos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver Privacidade/i })).toBeInTheDocument();
  });

  it('renderiza Privacidade (LGPD) e seção de bases legais', () => {
    render(
      <MemoryRouter>
        <Legal kind="privacy" />
      </MemoryRouter>
    );

    expect(screen.getByText('Política de Privacidade (LGPD)')).toBeInTheDocument();
    expect(screen.getByText(/Bases legais \(LGPD\)/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Ver Termos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver Privacidade/i })).toBeInTheDocument();
  });
});

