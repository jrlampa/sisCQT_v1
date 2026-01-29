import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server';
import { prisma } from '../utils/db';
import { issueLocalSessionToken } from '../utils/tokenUtils';

const mockUser = {
  id: 'test-user-id',
  email: 'teste@im3brasil.com.br',
  name: 'Desenvolvedor Local',
  plan: 'Pro',
  createdAt: new Date(),
  updatedAt: new Date(),
  projects: [],
};

describe('Sessão local (offline-first)', () => {
  it('deve aceitar token local no authMiddleware', async () => {
    // @ts-ignore - prisma é mockado pelo vitest
    prisma.user.findUnique.mockResolvedValueOnce(mockUser);

    const localToken = await issueLocalSessionToken(mockUser as any);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${localToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
    });
  });
});

