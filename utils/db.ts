// utils/db.ts
import { PrismaClient } from '@prisma/client';

// Pré-vê o erro na declaração global
declare global {
  var prisma: PrismaClient | undefined;
}

// Evita múltiplas instâncias do PrismaClient em hot-reload no desenvolvimento
export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
