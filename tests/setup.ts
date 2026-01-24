
// tests/setup.ts
import { vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PrismaClientValidationError, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import '@testing-library/jest-dom/vitest';

// Mock the prisma client globally
vi.mock('../utils/db', () => ({
  prisma: mockDeep<PrismaClient>({
    project: {
      create: vi.fn().mockImplementation((args) => {
        const { name, metadata, userId } = args.data;
        if (!name || !metadata || !userId) {
          const error = new Error('Missing required fields for Project creation.');
          error.name = 'PrismaClientValidationError'; // Manually set name
          return Promise.reject(error);
        }
        return Promise.resolve({ ...args.data, id: `mock-prj-${Date.now()}` });
      }),
      delete: vi.fn().mockImplementation((args) => {
        if (args.where.id !== 'prj-1') {
          const error = new Error('Record not found');
          error.name = 'PrismaClientKnownRequestError';
          (error as any).code = 'P2025'; // Manually set code
          return Promise.reject(error);
        }
        return Promise.resolve({ id: args.where.id }); // Return the deleted item
      }),
      findMany: vi.fn().mockResolvedValue([
        { id: 'prj-1', name: 'Test Project', userId: 'test-user-id', metadata: {}, scenarios: [], activeScenarioId: 's1', updatedAt: new Date(), cables: {}, ipTypes: {}, reportConfig: {} }
      ]),
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
    }
  }),
}));

// Define environment variables for MSAL configuration in tests
// This runs before any other code in the test environment
process.env.MSAL_JWKS_URI = 'https://login.microsoftonline.com/common/discovery/v2.0/keys';
process.env.MSAL_AUDIENCE = 'test-audience';
process.env.MSAL_ISSUER = 'https://login.microsoftonline.com/common/v2.0';


