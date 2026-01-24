import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../server'; // Import the real app instance
import { mockDeep } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../utils/db';



const mockUser = {
  id: 'test-user-id',
  email: 'teste@im3brasil.com.br',
  name: 'Desenvolvedor Local',
  plan: 'Pro',
  createdAt: new Date(),
  updatedAt: new Date(),
  projects: [],
};

const mockProject = {
  id: 'prj-1',
  name: 'Test Project',
  userId: mockUser.id,
  metadata: {}, // Must match schema
  scenarios: [], // Must match schema
  activeScenarioId: 's1',
  updatedAt: new Date(),
  cables: {},
  ipTypes: {},
  reportConfig: {},
};

describe('API Endpoint Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    process.env.ENABLE_MOCK_AUTH = 'true'; // Ensure mock auth is enabled

    // Mock Prisma calls as needed for tests
    // @ts-ignore
    prisma.user.upsert.mockResolvedValue(mockUser);
    // @ts-ignore
    prisma.project.findMany.mockResolvedValue([mockProject]);
    // @ts-ignore
    prisma.project.create.mockImplementation(async (data) => {
      if (!data.data.name || !data.data.metadata || !data.data.userId) {
        throw new Error("Validation Error: Missing required fields");
      }
      return { ...mockProject, ...data.data, id: `new-prj-${Date.now()}` };
    });
    // @ts-ignore
    prisma.project.update.mockImplementation(async ({ where, data }) => {
        if (where.id !== 'prj-1') throw new Error("Not Found");
        return { ...mockProject, ...data };
    });
    // @ts-ignore
    prisma.project.delete.mockImplementation(async ({ where }) => {
        if (where.id !== 'prj-1') throw new Error("Not Found");
        return { ...mockProject, id: where.id };
    });

    // Manually set authToken for subsequent requests, reflecting what /auth/sync would return
    // In a real scenario, you'd call /api/auth/sync and extract the token.
    // For this test, we assume the user is authenticated via mock.
    authToken = 'dev-token-im3';
  });

  describe('GET /api/projects', () => {
    it('should return 401 Unauthorized without a token', async () => {
      await request(app).get('/api/projects').expect(401);
    });

    it('should return 200 OK with a valid mock token', async () => {
      await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then(res => {
          expect(res.body[0].id).toBe(mockProject.id);
        });
    });
  });

  describe('POST /api/projects', () => {
    it('should return 201 Created with valid data', async () => {
      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Valid Project', metadata: { sob: '123' }, userId: mockUser.id })
        .expect(201);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should return 204 No Content for a successful deletion', async () => {
        await request(app)
          .delete('/api/projects/prj-1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);
    });
  });
});
