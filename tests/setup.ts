
// tests/setup.ts
import { vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import '@testing-library/jest-dom/vitest';

// Ambiente de teste previsível (evita dependências de Entra/worker em CI/local)
process.env.NODE_ENV = 'test';
process.env.ENABLE_MOCK_AUTH = 'true';
process.env.ENABLE_ENGINE_WORKER = 'false';

function prismaMockFactory() {
  return {
    prisma: mockDeep<PrismaClient>({
      $transaction: vi.fn().mockImplementation(async (ops: any[]) => Promise.all(ops)),
      project: {
        create: vi.fn().mockImplementation((args) => {
          const { name, metadata, userId } = args.data;
          if (!name || !metadata || !userId) {
            const error = new Error('Missing required fields for Project creation.');
            error.name = 'PrismaClientValidationError'; // compat com errorHandler
            return Promise.reject(error);
          }
          return Promise.resolve({ ...args.data, id: `mock-prj-${Date.now()}` });
        }),
        findFirst: vi.fn().mockImplementation((args) => {
          const id = args?.where?.id;
          const userId = args?.where?.userId;
          if (id === 'prj-1' && userId === 'test-user-id') {
            return Promise.resolve({ id });
          }
          return Promise.resolve(null);
        }),
        delete: vi.fn().mockImplementation((args) => {
          if (args.where.id !== 'prj-1') {
            const error = new Error('Record not found');
            error.name = 'PrismaClientKnownRequestError';
            (error as any).code = 'P2025';
            return Promise.reject(error);
          }
          return Promise.resolve({ id: args.where.id });
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'prj-1',
            name: 'Test Project',
            userId: 'test-user-id',
            metadata: {},
            scenarios: [],
            activeScenarioId: 's1',
            updatedAt: new Date(),
            cables: {},
            ipTypes: {},
            reportConfig: {},
          },
        ]),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 } as any),
      },
      user: {
        upsert: vi.fn().mockResolvedValue({
          id: 'test-user-id',
          email: 'teste@im3brasil.com.br',
          name: 'Desenvolvedor Local',
          plan: 'Pro',
          createdAt: new Date(),
          updatedAt: new Date(),
          projects: [],
        }),
        delete: vi.fn().mockResolvedValue({ id: 'test-user-id' } as any),
      },
      subscription: {
        findMany: vi.fn().mockResolvedValue([] as any),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 } as any),
      },
    }),
  };
}

// Mock do Prisma para ambos os specifiers usados no código (`../utils/db.ts`) e nos testes (`../utils/db`)
vi.mock('../utils/db', prismaMockFactory);
// Muitos arquivos do backend importam com extensão `.js` (padrão ESM).
// No Vitest/Vite isso resolve para o `.ts`, mas o specifier precisa ser coberto para o mock pegar.
vi.mock('../utils/db.js', prismaMockFactory);
vi.mock('../utils/db.ts', prismaMockFactory);

// Define environment variables for MSAL configuration in tests
// This runs before any other code in the test environment
process.env.MSAL_JWKS_URI = 'https://login.microsoftonline.com/common/discovery/v2.0/keys';
process.env.MSAL_AUDIENCE = 'test-audience';
process.env.MSAL_ISSUER = 'https://login.microsoftonline.com/common/v2.0';


