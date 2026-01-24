
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';

export const gisController = {
  // Retorna FeatureCollection GeoJSON para consumo direto pelo Leaflet
  async getNodes(req: Request, res: Response, next: NextFunction) {
    try {
      // Extraímos a geometria como JSON (GeoJSON) nativamente pelo PostGIS
      const nodes: any[] = await prisma.$queryRaw`
        SELECT 
          id, 
          name, 
          type, 
          properties,
          ST_AsGeoJSON(location)::json as geometry
        FROM "NetworkNode"
      `;

      const featureCollection = {
        type: "FeatureCollection",
        features: nodes.map(node => ({
          type: "Feature",
          id: node.id,
          geometry: node.geometry,
          properties: {
            name: node.name,
            type: node.type,
            ...node.properties
          }
        }))
      };

      // Cast Response to any to handle cases where standard Express methods aren't recognized correctly by the compiler
      (res as any).json(featureCollection);
    } catch (error: any) {
      return next(new HttpError(500, 'Erro ao carregar nós GIS.', undefined, error));
    }
  },

  // Criação de nó com conversão de lat/lng para geometria PostGIS
  async createNode(req: Request, res: Response, next: NextFunction) {
    // Cast Request to any to access the body property safely
    const { lat, lng, type, name, properties } = (req as any).body;
    
    try {
      // O Prisma ainda não suporta tipos espaciais nativamente no create(),
      // portanto usamos raw query com ST_SetSRID e ST_MakePoint.
      await prisma.$queryRaw`
        INSERT INTO "NetworkNode" (id, name, type, location, properties, "createdAt")
        VALUES (
          gen_random_uuid(), 
          ${name}, 
          ${type}::"NodeType", 
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 
          ${JSON.stringify(properties || {})}::jsonb,
          NOW()
        )
      `;
      
      (res as any).status(201).json({ success: true });
    } catch (error: any) {
      return next(new HttpError(500, 'Erro ao criar nó GIS.', undefined, error));
    }
  }
};