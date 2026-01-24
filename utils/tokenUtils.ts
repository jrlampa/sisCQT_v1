import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { OAuth2Client } from 'google-auth-library';

type GetKeyCallback = (err: Error | null, key?: string) => void;

let cachedJwksClient: ReturnType<typeof jwksClient> | null = null;
let cachedGoogleClient: OAuth2Client | null = null;

const DEV_MOCK_TOKEN = 'dev-token-im3';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigError';
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isMockAuthEnabled(): boolean {
  // Em produção, o mock deve ser sempre desabilitado (Entra-only).
  return process.env.ENABLE_MOCK_AUTH === 'true' && !isProduction();
}

function getGoogleClient() {
  if (cachedGoogleClient) return cachedGoogleClient;
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  // ClientId é obrigatório para validar o aud do ID token.
  if (!clientId) {
    throw new AuthConfigError('Variável de ambiente ausente: GOOGLE_CLIENT_ID (necessária para login Google).');
  }
  cachedGoogleClient = new OAuth2Client(clientId);
  return cachedGoogleClient;
}

export async function verifyGoogleIdToken(idToken: string): Promise<jwt.JwtPayload | undefined> {
  if (!idToken) return Promise.reject(new Error('Token vazio ou ausente.'));
  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({ idToken });
  const payload = ticket.getPayload();
  return payload as any;
}

function requireEnv(name: 'MSAL_JWKS_URI' | 'MSAL_AUDIENCE' | 'MSAL_ISSUER'): string {
  const raw = process.env[name];
  const value = raw?.trim();
  if (!value) {
    const guidance = isProduction()
      ? `Em produção, estas variáveis são obrigatórias para autenticação Entra ID.`
      : (isMockAuthEnabled()
          ? `ENABLE_MOCK_AUTH=true está ativo. Para desenvolvimento, use "Bearer ${DEV_MOCK_TOKEN}" ` +
            `ou configure MSAL_JWKS_URI/MSAL_AUDIENCE/MSAL_ISSUER para validar JWT real.`
          : `Configure MSAL_JWKS_URI/MSAL_AUDIENCE/MSAL_ISSUER para autenticação Entra ID.`);
    throw new AuthConfigError(`Variável de ambiente ausente: ${name}. ${guidance}`);
  }
  return value;
}

function validateUrlEnv(name: 'MSAL_JWKS_URI' | 'MSAL_ISSUER', value: string) {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
    throw new AuthConfigError(`Variável de ambiente inválida: ${name} deve ser uma URL válida. Valor: "${value}"`);
  }
}

function getJwksClient() {
  if (cachedJwksClient) return cachedJwksClient;
  const jwksUri = requireEnv('MSAL_JWKS_URI');
  validateUrlEnv('MSAL_JWKS_URI', jwksUri);
  cachedJwksClient = jwksClient({
    jwksUri,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 10 * 60 * 60 * 1000, // 10 horas
  });
  return cachedJwksClient;
}

function getKey(header: any, callback: GetKeyCallback) {
  const client = getJwksClient();
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Erro ao obter chave de assinatura:', err);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export function verifyToken(token: string): Promise<jwt.JwtPayload | undefined> {
  if (isMockAuthEnabled() && token === DEV_MOCK_TOKEN) {
    return Promise.resolve({
      email: 'teste@im3brasil.com.br',
      name: 'Desenvolvedor Local',
      iss: 'mock',
      aud: 'mock',
    } as unknown as jwt.JwtPayload);
  }

  if (!token) {
    return Promise.reject(new Error('Token vazio ou ausente.'));
  }

  // Detecta issuer sem verificar assinatura (apenas roteamento). A validação real ocorre abaixo.
  const decoded = jwt.decode(token, { complete: false }) as any;
  const iss = typeof decoded?.iss === 'string' ? decoded.iss : '';
  if (iss && GOOGLE_ISSUERS.has(iss)) {
    return verifyGoogleIdToken(token);
  }

  const audienceEnv = requireEnv('MSAL_AUDIENCE');
  const issuerEnv = requireEnv('MSAL_ISSUER');
  const audienceParts = audienceEnv.split(',').map((s) => s.trim()).filter(Boolean);
  const issuerParts = issuerEnv.split(',').map((s) => s.trim()).filter(Boolean);

  // Validação básica do issuer para reduzir erros silenciosos de configuração.
  // (Pode ser uma lista separada por vírgula.)
  issuerParts.forEach((iss) => validateUrlEnv('MSAL_ISSUER', iss));

  // jsonwebtoken espera `audience` como string/RegExp ou array *não-vazia* (tuple).
  const audience =
    audienceParts.length <= 1
      ? (audienceParts[0] || audienceEnv)
      : (audienceParts as [string, ...string[]]);

  // jsonwebtoken aceita `issuer` como string ou array; tipagem também requer array não-vazia.
  const issuer =
    issuerParts.length <= 1
      ? (issuerParts[0] || issuerEnv)
      : (issuerParts as [string, ...string[]]);

  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256'], // Algoritmo usado pelo Entra ID
      // O audience e issuer devem corresponder ao que está no seu token
      // Audience é geralmente o Client ID da sua aplicação
      audience,
      // Issuer é a URL do seu tenant
      issuer,
    }, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded as jwt.JwtPayload | undefined);
    });
  });
}

/**
 * Em produção, valida (no boot) as variáveis obrigatórias de autenticação Entra ID.
 * Isso evita "subir" com auth quebrada e descobrir só no primeiro request.
 */
export function assertProdAuthConfig(): void {
  if (!isProduction()) return;

  if (process.env.ENABLE_MOCK_AUTH === 'true') {
    // Mock é ignorado em produção, mas avisamos para evitar falsa sensação de segurança.
    // eslint-disable-next-line no-console
    console.warn('[auth] ENABLE_MOCK_AUTH=true foi configurado, mas é ignorado em produção (Entra-only).');
  }

  const jwksUri = requireEnv('MSAL_JWKS_URI');
  validateUrlEnv('MSAL_JWKS_URI', jwksUri);

  const issuerEnv = requireEnv('MSAL_ISSUER');
  issuerEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((iss) => validateUrlEnv('MSAL_ISSUER', iss));

  // Audience pode ser lista (ex.: múltiplos clientIds); só garantimos não-vazio.
  const audienceEnv = requireEnv('MSAL_AUDIENCE');
  const audiences = audienceEnv.split(',').map((s) => s.trim()).filter(Boolean);
  if (audiences.length === 0) {
    throw new AuthConfigError('Variável de ambiente inválida: MSAL_AUDIENCE não pode ser vazia.');
  }

  // Google login (usuários avulsos) é opcional em produção, mas se habilitado no frontend
  // deve existir GOOGLE_CLIENT_ID para validar o ID token.
  if ((process.env.GOOGLE_CLIENT_ID || '').trim().length === 0) {
    // eslint-disable-next-line no-console
    console.warn('[auth] GOOGLE_CLIENT_ID não configurado: login Google ficará indisponível.');
  }
}
