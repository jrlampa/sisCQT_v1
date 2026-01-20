
import { UtmCoords } from '../types';

export class GisService {
  /**
   * Calcula a distância em metros entre dois pontos geográficos (Haversine).
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; 
  }

  /**
   * Converte coordenadas Lat/Lng para UTM (Simplificado para demonstração na zona 23S - Brasil).
   * Em produção real, utilizaria projeção completa Transversa de Mercator.
   */
  static toUtm(lat: number, lng: number): UtmCoords {
    // Constantes aproximadas para projeção na região do Brasil (Zona 23S)
    const k0 = 0.9996;
    const R = 6378137;
    const FE = 500000;
    const FN = 10000000;

    const lon0 = -45; // Meridiano central da Zona 23
    const Δλ = ((lng - lon0) * Math.PI) / 180;
    const φ = (lat * Math.PI) / 180;

    // Cálculo simplificado de coordenadas leste/norte
    const x = FE + k0 * R * Δλ * Math.cos(φ);
    const y = FN + k0 * R * φ; 

    return {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      zone: "23S"
    };
  }

  /**
   * Gera uma nova coordenada baseada em offset (metros) para inicialização de novos postes.
   */
  static offsetCoords(lat: number, lng: number, metersX: number, metersY: number) {
    const latOffset = metersY / 111320;
    const lngOffset = metersX / (111320 * Math.cos(lat * Math.PI / 180));
    return {
      lat: lat + latOffset,
      lng: lng + lngOffset
    };
  }
}
