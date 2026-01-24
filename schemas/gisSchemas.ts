import { z } from 'zod';

export const CreateGisNodeSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.enum(['TRAFO', 'POSTE']),
  name: z.string().min(1).max(200),
  properties: z.record(z.string(), z.any()).optional(),
});

