import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server'; // Import the real app instance
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

const validProjectPayload = {
  id: 'prj-new-1',
  name: 'Valid Project',
  metadata: {
    sob: '123',
    electricPoint: 'PE-1',
    lat: -23.0,
    lng: -43.0,
    city: 'Rio de Janeiro',
  },
  activeScenarioId: 'SCN-1',
  cables: {
    '3x95+54.6mm² Al': { r: 0.32, x: 0.08, coef: 0.0891, ampacity: 250 },
  },
  ipTypes: {
    'Sem IP': 0,
  },
  reportConfig: {
    showJustification: true,
    showKpis: true,
    showTopology: true,
    showMaterials: true,
    showSignatures: true,
    showUnifilar: true,
    showComparison: false,
  },
  scenarios: [
    {
      id: 'SCN-1',
      name: 'ATUAL',
      updatedAt: new Date().toISOString(),
      params: {
        trafoKva: 75,
        profile: 'Massivos',
        classType: 'Automatic',
        manualClass: 'B',
        normativeTable: 'PRODIST',
        includeGdInQt: false,
      },
      nodes: [
        {
          id: 'TRAFO',
          parentId: '',
          meters: 0,
          cable: '3x95+54.6mm² Al',
          loads: {
            mono: 0,
            bi: 0,
            tri: 0,
            pointQty: 0,
            pointKva: 0,
            ipType: 'Sem IP',
            ipQty: 0,
            solarKva: 0,
            solarQty: 0,
          },
        },
      ],
    },
  ],
};

describe('API Endpoint Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Mock Prisma calls as needed for tests
    // @ts-ignore
    prisma.user.upsert.mockResolvedValue(mockUser);
    // @ts-ignore
    prisma.project.findMany.mockResolvedValue([mockProject]);
    // @ts-ignore
    prisma.project.findFirst.mockImplementation(async ({ where }) => {
      if (where?.id === 'prj-1' && where?.userId === mockUser.id) return { id: 'prj-1' };
      return null;
    });
    // @ts-ignore
    prisma.project.create.mockImplementation(async (data) => {
      if (!data.data.name || !data.data.metadata || !data.data.userId) {
        throw new Error("Validation Error: Missing required fields");
      }
      return { ...mockProject, ...data.data };
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

    // GIS: evita qualquer acesso real ao PostGIS durante os testes
    // (o controller usa `prisma.$queryRaw` como template tag)
    // @ts-ignore
    prisma.$queryRaw?.mockResolvedValue?.([
      {
        id: 'node-1',
        name: 'Nó 1',
        type: 'TRAFO',
        properties: { foo: 'bar' },
        geometry: { type: 'Point', coordinates: [-43.0, -23.0] },
      },
    ]);

    // Manually set authToken for subsequent requests, reflecting what /auth/sync would return
    // In a real scenario, you'd call /api/auth/sync and extract the token.
    // For this test, we assume the user is authenticated via mock.
    authToken = 'dev-token-im3';
  });

  describe('GET /api/auth/me', () => {
    it('deve retornar 401 sem token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false });
    });

    it('deve retornar o usuário com token mock', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      });
    });
  });

  describe('LGPD endpoints', () => {
    it('GET /api/privacy/export deve retornar 401 sem token', async () => {
      const res = await request(app).get('/api/privacy/export');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false });
    });

    it('GET /api/privacy/export deve retornar 200 com token mock', async () => {
      // @ts-ignore
      prisma.subscription.findMany.mockResolvedValueOnce([
        { id: 'sub-1', provider: 'stripe', status: 'active', userId: mockUser.id, subscriptionId: 'sub_stripe_1' },
      ]);

      const res = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('exportedAt');
      expect(res.body).toHaveProperty('user.email', mockUser.email);
      expect(res.body).toHaveProperty('data.projects');
      expect(Array.isArray(res.body.data.projects)).toBe(true);
      expect(res.body.data.projects[0].id).toBe(mockProject.id);
      expect(res.body).toHaveProperty('data.subscriptions');
      expect(Array.isArray(res.body.data.subscriptions)).toBe(true);
    });

    it('POST /api/privacy/delete deve exigir confirmação', async () => {
      const res = await request(app)
        .post('/api/privacy/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ success: false, error: 'Dados inválidos.' });
    });

    it('POST /api/privacy/delete deve retornar 200 com confirmação', async () => {
      // @ts-ignore
      prisma.subscription.deleteMany.mockResolvedValueOnce({ count: 1 });
      // @ts-ignore
      prisma.project.deleteMany.mockResolvedValueOnce({ count: 1 });
      // @ts-ignore
      prisma.user.delete.mockResolvedValueOnce({ id: mockUser.id });

      const res = await request(app)
        .post('/api/privacy/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirm: true })
        .expect(200);
      expect(res.body).toMatchObject({ success: true });
    });
  });

  describe('Health endpoints', () => {
    it('GET /api/healthz deve retornar 200', async () => {
      const res = await request(app).get('/api/healthz').expect(200);
      expect(res.body).toMatchObject({ success: true });
    });

    it('GET /api/readyz deve retornar 200 quando DB responde', async () => {
      // @ts-ignore
      prisma.$queryRawUnsafe?.mockReset?.();
      // 1) SELECT 1
      // 2) PostGIS check (pg_extension)
      // @ts-ignore
      prisma.$queryRawUnsafe?.mockResolvedValueOnce?.([{ ok: 1 }])?.mockResolvedValueOnce?.([{ extname: 'postgis' }]);
      const res = await request(app).get('/api/readyz').expect(200);
      expect(res.body).toMatchObject({ success: true });
    });

    it('GET /api/readyz deve retornar 503 quando PostGIS não está presente', async () => {
      // @ts-ignore
      prisma.$queryRawUnsafe?.mockReset?.();
      // DB ok, PostGIS ausente
      // @ts-ignore
      prisma.$queryRawUnsafe?.mockResolvedValueOnce?.([{ ok: 1 }])?.mockResolvedValueOnce?.([]);
      const res = await request(app).get('/api/readyz').expect(503);
      expect(res.body).toMatchObject({ success: false, error: 'readyz falhou' });
    });

    it('GET /api/readyz deve retornar 503 quando DB falha', async () => {
      // @ts-ignore
      prisma.$queryRawUnsafe?.mockReset?.();
      // @ts-ignore
      prisma.$queryRawUnsafe?.mockRejectedValue?.(new Error('DB down'));
      const res = await request(app).get('/api/readyz').expect(503);
      expect(res.body).toMatchObject({ success: false });
    });
  });

  describe('GET /api/constants', () => {
    it('deve retornar constantes públicas (sem auth)', async () => {
      const res = await request(app).get('/api/constants').expect(200);
      expect(res.body).toHaveProperty('cables');
      expect(res.body).toHaveProperty('ipTypes');
      expect(res.body).toHaveProperty('dmdiTables');
      expect(res.body).toHaveProperty('profiles');
    });
  });

  describe('GET /api/projects', () => {
    it('should return 401 Unauthorized without a token', async () => {
      const res = await request(app).get('/api/projects').expect(401);
      expect(res.body).toMatchObject({ success: false, error: 'Token não fornecido' });
    });

    it('should return 200 OK with a valid mock token', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].id).toBe(mockProject.id);
      // Garante o filtro por ownership no backend
      // @ts-ignore
      expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: mockUser.id } }));
    });
  });

  describe('POST /api/projects', () => {
    it('should return 201 Created with valid data', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validProjectPayload);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: validProjectPayload.id, userId: mockUser.id });
    });

    it('deve retornar 400 para payload inválido (Zod)', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ id: '', name: '' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ success: false, error: 'Dados inválidos.' });
      expect(res.body.details).toBeInstanceOf(Array);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('deve retornar 404 quando projeto não pertence ao usuário', async () => {
      const res = await request(app)
        .put('/api/projects/nao-existe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Novo nome' });
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: 'Projeto não encontrado.' });
    });

    it('deve retornar 400 para update inválido (Zod)', async () => {
      const res = await request(app)
        .put('/api/projects/prj-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ success: false, error: 'Dados inválidos.' });
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should return 204 No Content for a successful deletion', async () => {
        await request(app)
          .delete('/api/projects/prj-1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);
    });

    it('deve retornar 404 quando projeto não pertence ao usuário', async () => {
      const res = await request(app)
        .delete('/api/projects/nao-existe')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: 'Projeto não encontrado.' });
    });
  });

  describe('POST /api/calculate', () => {
    it('deve retornar 400 para payload inválido (Zod)', async () => {
      const res = await request(app)
        .post('/api/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ success: false, error: 'Dados inválidos.' });
      expect(res.body.details).toBeInstanceOf(Array);
    });

    it('should accept partial loads and return 200', async () => {
      await request(app)
        .post('/api/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scenarioId: 'SCN-1',
          nodes: [
            {
              id: 'TRAFO',
              parentId: '',
              meters: 0,
              cable: '3x95+54.6mm² Al',
              loads: { mono: 0 }, // payload antigo/incompleto
            },
          ],
          params: {
            trafoKva: 75,
            profile: 'Massivos',
            classType: 'Automatic',
            manualClass: 'B',
            normativeTable: 'PRODIST',
          },
          cables: {
            '3x95+54.6mm² Al': { r: 0.32, x: 0.08, coef: 0.0891, ampacity: 250 },
          },
          ips: { 'Sem IP': 0 },
        })
        .expect(200);
    });
  });

  describe('POST /api/optimize', () => {
    it('deve retornar 401 sem token', async () => {
      await request(app).post('/api/optimize').send({}).expect(401);
    });

    it('deve retornar 400 para payload inválido (Zod)', async () => {
      const res = await request(app)
        .post('/api/optimize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
      expect(res.body).toMatchObject({ success: false });
    });

    it('deve ajustar o cabo quando há violação de ampacidade (caso mínimo)', async () => {
      const payload = {
        scenarioId: 'SCN-1',
        params: {
          trafoKva: 75,
          profile: 'Massivos',
          classType: 'Automatic',
          manualClass: 'B',
          normativeTable: 'PRODIST',
          includeGdInQt: false,
        },
        cables: {
          CABO_A: { r: 0.9, x: 0.1, coef: 0.9, ampacity: 10 },
          CABO_B: { r: 0.5, x: 0.08, coef: 0.9, ampacity: 200 },
        },
        ips: { 'Sem IP': 0 },
        nodes: [
          {
            id: 'TRAFO',
            parentId: '',
            meters: 0,
            cable: 'CABO_B',
            loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 },
          },
          {
            id: 'P-1',
            parentId: 'TRAFO',
            meters: 30,
            cable: 'CABO_A',
            loads: { mono: 250, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 },
          },
        ],
      };

      const res = await request(app)
        .post('/api/optimize')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const p1 = res.body.find((n: any) => n.id === 'P-1');
      expect(p1?.cable).toBe('CABO_B');
    });
  });

  describe('POST /api/montecarlo', () => {
    it('deve retornar 401 sem token', async () => {
      await request(app).post('/api/montecarlo').send({}).expect(401);
    });

    it('deve retornar 400 para payload inválido (Zod)', async () => {
      const res = await request(app)
        .post('/api/montecarlo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
      expect(res.body).toMatchObject({ success: false });
    });

    it('deve ser determinístico quando seed é fornecido', async () => {
      const payload = {
        scenarioId: 'SCN-1',
        params: {
          trafoKva: 75,
          profile: 'Massivos',
          classType: 'Automatic',
          manualClass: 'B',
          normativeTable: 'PRODIST',
          includeGdInQt: false,
        },
        cables: {
          CABO_A: { r: 0.9, x: 0.1, coef: 0.9, ampacity: 200 },
        },
        ips: { 'Sem IP': 0 },
        nodes: [
          {
            id: 'TRAFO',
            parentId: '',
            meters: 0,
            cable: 'CABO_A',
            loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 },
          },
          {
            id: 'P-1',
            parentId: 'TRAFO',
            meters: 30,
            cable: 'CABO_A',
            loads: { mono: 5, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 },
          },
        ],
        iterations: 50,
        seed: 'seed-test',
      };

      const r1 = await request(app)
        .post('/api/montecarlo')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect(200);

      const r2 = await request(app)
        .post('/api/montecarlo')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload)
        .expect(200);

      expect(r1.body).toEqual(r2.body);
      expect(r1.body).toHaveProperty('stabilityIndex');
      expect(r1.body).toHaveProperty('failureRisk');
      expect(Array.isArray(r1.body.distribution)).toBe(true);
      expect(r1.body.distribution.length).toBe(20);
    });
  });

  describe('GIS endpoints', () => {
    it('GET /api/gis/nodes deve retornar 401 sem token', async () => {
      const res = await request(app).get('/api/gis/nodes').expect(401);
      expect(res.body).toMatchObject({ success: false });
    });

    it('GET /api/gis/nodes deve retornar FeatureCollection com token mock', async () => {
      const res = await request(app)
        .get('/api/gis/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ type: 'FeatureCollection' });
      expect(Array.isArray(res.body.features)).toBe(true);
      expect(res.body.features[0]).toMatchObject({
        type: 'Feature',
        id: 'node-1',
        geometry: { type: 'Point' },
        properties: { name: 'Nó 1', type: 'TRAFO' },
      });
    });

    it('POST /api/gis/nodes deve retornar 400 para payload inválido (Zod)', async () => {
      const res = await request(app)
        .post('/api/gis/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ lat: 'x', lng: 1 })
        .expect(400);
      expect(res.body).toMatchObject({ success: false, error: 'Dados inválidos.' });
      expect(res.body.details).toBeInstanceOf(Array);
    });

    it('POST /api/gis/nodes deve retornar 201 com token mock', async () => {
      const res = await request(app)
        .post('/api/gis/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lat: -23.0,
          lng: -43.0,
          type: 'TRAFO',
          name: 'Nó A',
          properties: { area: 'teste' },
        })
        .expect(201);
      expect(res.body).toMatchObject({ success: true });
    });
  });
});
