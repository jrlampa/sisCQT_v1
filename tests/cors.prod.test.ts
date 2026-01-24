import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

let prodApp: any;

// Teste focado no comportamento do CORS quando NODE_ENV=production.
// Importante: carregamos um novo app após ajustar envs e resetar módulos.
describe('CORS (NODE_ENV=production)', () => {
  const prevEnv = { ...process.env };

  beforeAll(async () => {
    vi.resetModules();

    // Evita que `server.ts` faça `listen()` durante o import neste spec.
    process.env.VITEST = 'true';
    process.env.NODE_ENV = 'production';
    process.env.RATE_LIMIT_DISABLED = 'true';

    // allowlist de CORS em produção
    process.env.ALLOWED_ORIGINS = 'https://allowed.example';

    // Obrigatórias para `assertProdAuthConfig()` no boot
    process.env.MSAL_JWKS_URI = 'https://login.microsoftonline.com/common/discovery/v2.0/keys';
    process.env.MSAL_AUDIENCE = 'test-audience';
    process.env.MSAL_ISSUER = 'https://login.microsoftonline.com/common/v2.0';

    const mod = await import('../server');
    prodApp = mod.default;
  });

  afterAll(() => {
    process.env = prevEnv;
  });

  it('não deve setar Access-Control-Allow-Origin para Origin não autorizado', async () => {
    const res = await request(prodApp)
      .get('/api/healthz')
      .set('Origin', 'https://nao-permitida.example')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('deve setar Access-Control-Allow-Origin quando Origin está na allowlist', async () => {
    const res = await request(prodApp)
      .get('/api/healthz')
      .set('Origin', 'https://allowed.example')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe('https://allowed.example');
    expect(String(res.headers.vary || '')).toContain('Origin');
  });

  it('OPTIONS (preflight) deve retornar 204 e headers quando Origin autorizado', async () => {
    const res = await request(prodApp)
      .options('/api/healthz')
      .set('Origin', 'https://allowed.example')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe('https://allowed.example');
    expect(String(res.headers.vary || '')).toContain('Origin');
    expect(String(res.headers['access-control-allow-methods'] || '')).toContain('GET');
  });
});

