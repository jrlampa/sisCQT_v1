import { z } from 'zod';
import { NetworkNodeSchema, ProjectParamsSchema } from './projectSchemas.js';

export const CalculateSchema = z.object({
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

