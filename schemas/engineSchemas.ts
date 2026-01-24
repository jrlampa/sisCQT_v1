import { z } from 'zod';
import { NetworkNodeSchema, ProjectParamsSchema } from './projectSchemas.js';

const EnginePayloadSchema = z.object({
  scenarioId: z.string().min(1),
  nodes: z.array(NetworkNodeSchema),
  params: ProjectParamsSchema,
  cables: z.record(
    z.string(),
    z.object({
      r: z.number(),
      x: z.number(),
      coef: z.number(),
      ampacity: z.number(),
    })
  ),
  ips: z.record(z.string(), z.number()),
});

export const CalculateSchema = EnginePayloadSchema;

// Otimização usa o mesmo payload do cálculo (nós + params + catálogos).
export const OptimizeSchema = EnginePayloadSchema;

// Monte Carlo sob demanda: permite controlar iterações e seed para determinismo em testes.
export const MonteCarloSchema = EnginePayloadSchema.extend({
  iterations: z.coerce.number().int().min(10).max(20000).default(1000),
  seed: z.union([z.string().min(1), z.number().int()]).optional(),
});

