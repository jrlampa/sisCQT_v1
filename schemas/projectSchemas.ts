import { z } from 'zod';

export const LoadDataSchema = z.object({
  mono: z.coerce.number().min(0).default(0),
  bi: z.coerce.number().min(0).default(0),
  tri: z.coerce.number().min(0).default(0),
  pointQty: z.coerce.number().min(0).default(0),
  pointKva: z.coerce.number().min(0).default(0),
  ipType: z.string().default('Sem IP'),
  ipQty: z.coerce.number().min(0).default(0),
  solarKva: z.coerce.number().min(0).default(0),
  solarQty: z.coerce.number().min(0).default(0),
});

export const NetworkNodeSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().default(''),
  meters: z.coerce.number().min(0).default(0),
  cable: z.string().default(''),
  loads: LoadDataSchema.default({} as any),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const ProjectParamsSchema = z.object({
  trafoKva: z.coerce.number().min(0),
  profile: z.string().min(1),
  classType: z.enum(['Automatic', 'Manual']),
  manualClass: z.enum(['A', 'B', 'C', 'D']),
  normativeTable: z.string().min(1),
  includeGdInQt: z.boolean().optional(),
  energyPriceBrlKwh: z.coerce.number().min(0).max(50).optional(),
});

export const ScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.array(NetworkNodeSchema),
  params: ProjectParamsSchema,
  updatedAt: z.string().optional(),
});

export const ProjectMetadataSchema = z.object({
  sob: z.string(),
  electricPoint: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  client: z.string().optional(),
  address: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
});

export const ReportConfigSchema = z.object({
  showJustification: z.boolean(),
  showKpis: z.boolean(),
  showTopology: z.boolean(),
  showMaterials: z.boolean(),
  showSignatures: z.boolean(),
  showUnifilar: z.boolean(),
  showComparison: z.boolean(),
});

export const CreateProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  metadata: ProjectMetadataSchema,
  scenarios: z.array(ScenarioSchema).min(1),
  activeScenarioId: z.string().min(1),
  cables: z.record(
    z.string(),
    z.object({
      r: z.number(),
      x: z.number(),
      coef: z.number(),
      ampacity: z.number(),
    })
  ),
  ipTypes: z.record(z.string(), z.number()),
  reportConfig: ReportConfigSchema,
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  metadata: ProjectMetadataSchema.partial().optional(),
  scenarios: z.array(ScenarioSchema).min(1).optional(),
  activeScenarioId: z.string().min(1).optional(),
  cables: z
    .record(
      z.string(),
      z.object({
        r: z.number(),
        x: z.number(),
        coef: z.number(),
        ampacity: z.number(),
      })
    )
    .optional(),
  ipTypes: z.record(z.string(), z.number()).optional(),
  reportConfig: ReportConfigSchema.partial().optional(),
});

