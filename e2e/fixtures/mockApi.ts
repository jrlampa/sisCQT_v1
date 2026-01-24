import type { Page, Route, Request as PWRequest } from '@playwright/test';

type User = { id: string; name: string; email: string; plan: 'Free' | 'Pro' | 'Enterprise'; authProvider?: 'ENTRA' | 'GOOGLE' };

type Feature = {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { name: string; type: 'TRAFO' | 'POSTE' } & Record<string, any>;
};

function json(route: Route, status: number, body: any) {
  return route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

function readJsonBody(request: PWRequest): any {
  const data = request.postData();
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function hasAuth(request: PWRequest): boolean {
  const h = request.headers();
  return typeof h.authorization === 'string' && h.authorization.startsWith('Bearer ') && h.authorization.length > 10;
}

export async function installMockApi(page: Page) {
  const user: User = {
    id: 'test-user-id',
    name: 'Desenvolvedor Local',
    email: 'teste@im3brasil.com.br',
    plan: 'Pro',
    authProvider: 'ENTRA',
  };

  const constants = {
    cables: {
      '3x95+54.6mm² Al': { r: 0.32, x: 0.12, coef: 0.9, ampacity: 230 },
      '3x35+35mm² Al': { r: 0.87, x: 0.13, coef: 0.9, ampacity: 140 },
    },
    ipTypes: {
      'Sem IP': 0,
      'LED 50W': 0.05,
    },
    dmdiTables: {
      'Tabela Padrão': [
        { customers: 1, factor: 1.0 },
        { customers: 10, factor: 0.6 },
      ],
    },
    profiles: {
      Massivos: { cqtMax: 6.0, loadMax: 120 },
      'Urbano Padrão': { cqtMax: 5.0, loadMax: 100 },
    },
  };

  const baseProject = {
    id: 'prj-1',
    name: 'Projeto Demo',
    metadata: { sob: '2024.0001', electricPoint: 'BT-RJ-01', lat: -22.9, lng: -43.1, city: 'Rio de Janeiro' },
    scenarios: [
      {
        id: 's1',
        name: 'CENÁRIO 1',
        updatedAt: '2026-01-01T00:00:00.000Z',
        params: { trafoKva: 300, profile: 'Massivos', classType: 'Automatic', manualClass: 'A', normativeTable: 'Tabela Padrão' },
        nodes: [
          { id: 'TRAFO', parentId: '', meters: 0, cable: '3x95+54.6mm² Al', loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 } },
          { id: 'P-1', parentId: 'TRAFO', meters: 30, cable: '3x35+35mm² Al', loads: { mono: 1, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 } },
        ],
      },
    ],
    activeScenarioId: 's1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    cables: constants.cables,
    ipTypes: constants.ipTypes,
    reportConfig: {
      showJustification: true,
      showKpis: true,
      showTopology: true,
      showMaterials: true,
      showSignatures: true,
      showUnifilar: true,
      showComparison: true,
    },
  };

  const projectsById = new Map<string, any>([[baseProject.id, structuredClone(baseProject)]]);

  let gisFeatures: Feature[] = [
    {
      type: 'Feature',
      id: 'node-1',
      geometry: { type: 'Point', coordinates: [-43.1729, -22.9068] },
      properties: { name: 'Nó 1', type: 'TRAFO' },
    },
  ];

  // API mocks
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname; // ex: /api/auth/me
    const method = request.method().toUpperCase();

    // Auth
    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      return json(route, 200, user);
    }
    if (pathname === '/api/auth/sync' && method === 'POST') {
      const body = readJsonBody(request);
      if (!body?.token) return json(route, 400, { success: false, error: 'Token é obrigatório' });
      return json(route, 200, { user });
    }

    // Billing (requires auth)
    if (pathname === '/api/billing/status' && method === 'GET') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      return json(route, 200, { plan: user.plan, authProvider: user.authProvider, subscription: { status: 'active' } });
    }
    if (pathname === '/api/billing/checkout' && method === 'POST') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      return json(route, 200, { url: 'https://example.com/stripe-checkout' });
    }
    if (pathname === '/api/billing/portal' && method === 'POST') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      return json(route, 200, { url: 'https://example.com/stripe-portal' });
    }

    // Public constants
    if (pathname === '/api/constants' && method === 'GET') {
      return json(route, 200, constants);
    }

    // Projects (requires auth)
    if (pathname === '/api/projects' && method === 'GET') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      return json(route, 200, Array.from(projectsById.values()));
    }
    if (pathname === '/api/projects' && method === 'POST') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      const body = readJsonBody(request);
      if (!body?.id) return json(route, 400, { success: false, error: 'Dados inválidos.' });
      projectsById.set(body.id, body);
      return json(route, 201, body);
    }
    const projectIdMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (projectIdMatch && (method === 'PUT' || method === 'DELETE')) {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      const id = projectIdMatch[1];
      const existing = projectsById.get(id);
      if (!existing) return json(route, 404, { success: false, error: 'Projeto não encontrado.' });
      if (method === 'DELETE') {
        projectsById.delete(id);
        return route.fulfill({ status: 204 });
      }
      const patch = readJsonBody(request) || {};
      const updated = { ...existing, ...patch, updatedAt: '2026-01-02T00:00:00.000Z' };
      projectsById.set(id, updated);
      return json(route, 200, updated);
    }

    // Engine calculate/optimize (requires auth)
    if (pathname === '/api/calculate' && method === 'POST') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      const body = readJsonBody(request) || {};
      const nodes = Array.isArray(body.nodes) ? body.nodes : [];

      // Cálculo simples e determinístico para testes de UI:
      // corrente = mono + bi + tri + ipQty*0.2 + pointKva*0.1 + solarQty*0.05
      const resultNodes = nodes.map((n: any) => {
        const loads = n.loads || {};
        const current =
          Number(loads.mono || 0) +
          Number(loads.bi || 0) +
          Number(loads.tri || 0) +
          Number(loads.ipQty || 0) * 0.2 +
          Number(loads.pointKva || 0) * 0.1 +
          Number(loads.solarQty || 0) * 0.05;

        return {
          ...n,
          calculatedLoad: current,
          accumulatedCqt: Math.min(12, current * 1.1),
          netCurrentDay: 0,
          solarVoltageRise: 0,
        };
      });

      const totalLoad = resultNodes.reduce((acc: number, n: any) => acc + Number(n.calculatedLoad || 0), 0);

      return json(route, 200, {
        scenarioId: body.scenarioId || 's1',
        nodes: resultNodes,
        kpis: {
          totalLoad,
          diversifiedLoad: totalLoad * 0.7,
          pointLoad: 0,
          ipLoad: 0,
          trafoOccupation: 0.4,
          maxCqt: Math.max(...resultNodes.map((n: any) => Number(n.accumulatedCqt || 0)), 0),
          totalCustomers: 10,
          globalDmdiFactor: 0.6,
        },
        sustainability: {
          annualEnergyLossKwh: 0,
          annualFinancialLossBrl: 0,
          annualCo2Kg: 0,
          potentialSavingsBrl10y: 0,
          potentialCo2Prevented10y: 0,
          treesEquivalent: 0,
        },
        gdImpact: {
          totalInstalledKva: 0,
          maxVoltageRise: 0,
          hasReverseFlow: false,
          reverseFlowAmps: 0,
          selfConsumptionRate: 0,
        },
        warnings: [],
      });
    }
    if (pathname === '/api/optimize' && method === 'POST') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      const body = readJsonBody(request) || {};
      return json(route, 200, Array.isArray(body.nodes) ? body.nodes : []);
    }
    if (pathname === '/api/montecarlo' && method === 'POST') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      // determinístico para testes de UI
      return json(route, 200, {
        stabilityIndex: 0.93,
        failureRisk: 0.03,
        avgMaxCqt: 3.92,
        p95Cqt: 5.12,
        distribution: Array.from({ length: 20 }, (_, i) => ({ x: i + 1, y: i === 10 ? 50 : 5 })),
      });
    }

    // Gemini (requires auth)
    if (pathname === '/api/gemini/ask' && method === 'POST') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      const body = readJsonBody(request) || {};
      const prompt = String(body.prompt || '');
      return json(route, 200, { result: `Resposta simulada do Theseus para: "${prompt.slice(0, 60)}"` });
    }

    // GIS (requires auth)
    if (pathname === '/api/gis/nodes' && method === 'GET') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      return json(route, 200, { type: 'FeatureCollection', features: gisFeatures });
    }
    if (pathname === '/api/gis/nodes' && method === 'POST') {
      if (!hasAuth(request)) return json(route, 401, { success: false, error: 'Token não fornecido' });
      const body = readJsonBody(request) || {};
      if (typeof body.lat !== 'number' || typeof body.lng !== 'number' || !body.name || !body.type) {
        return json(route, 400, { success: false, error: 'Dados inválidos.' });
      }
      const feature: Feature = {
        type: 'Feature',
        id: `node-${Date.now()}`,
        geometry: { type: 'Point', coordinates: [body.lng, body.lat] },
        properties: { name: body.name, type: body.type },
      };
      gisFeatures = [...gisFeatures, feature];
      return json(route, 201, { success: true });
    }

    // Health endpoints (podem existir no backend real; aqui garantimos estabilidade)
    if (pathname === '/api/healthz' && method === 'GET') {
      return json(route, 200, { success: true });
    }
    if (pathname === '/api/readyz' && method === 'GET') {
      return json(route, 200, { success: true });
    }

    // Default: não mascarar endpoints desconhecidos
    return json(route, 404, { success: false, error: `Mock API: rota não mapeada (${method} ${pathname})` });
  });

  // Evita flakes por assets externos (tiles, ícones, imagens)
  // - tiles OSM
  await page.route(/https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/, async (route) => {
    // PNG 1x1 transparente
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6p9hQAAAAASUVORK5CYII=';
    return route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(png, 'base64'),
    });
  });
  // ícones externos (ms logo, flaticon)
  await page.route(/https:\/\/(docs\.microsoft\.com|cdn-icons-png\.flaticon\.com)\/.*/, async (route) => {
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6p9hQAAAAASUVORK5CYII=';
    return route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(png, 'base64'),
    });
  });
}

