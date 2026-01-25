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
    // Em produção, evitar log de queries (pode vazar dados e aumenta custo/ruído).
    // Em dev/test, manter visibilidade para diagnóstico.
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['query', 'info', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
