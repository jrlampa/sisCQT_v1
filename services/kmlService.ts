
import JSZip from 'jszip';
import { NetworkNode, ProjectMetadata } from '../types';
import { GisService } from './gisService';
import { ApiService } from './apiService';

export class KmlService {
  /**
   * Processa um arquivo (KML ou KMZ) e retorna a lista de nós e metadados iniciais.
   */
  static async parseFile(file: File): Promise<{ nodes: NetworkNode[]; metadata: Partial<ProjectMetadata> }> {
    let kmlText = '';

    if (file.name.toLowerCase().endsWith('.kmz')) {
      const zip = await JSZip.loadAsync(file);
      const kmlFile = (Object.values(zip.files) as any[]).find(f => f.name.toLowerCase().endsWith('.kml'));
      if (!kmlFile) throw new Error("Arquivo KML não encontrado dentro do KMZ.");
      kmlText = await (kmlFile as any).async('string');
    } else {
      kmlText = await file.text();
    }

    // Seleciona um cabo padrão a partir das constantes do backend.
    const constants = await ApiService.getConstants();
    const defaultCable = Object.keys(constants.cables || {})[4] || Object.keys(constants.cables || {})[0] || '3x95+54.6mm² Al';

    return this.parseKml(kmlText, defaultCable);
  }

  private static parseKml(kmlText: string, defaultCable: string): { nodes: NetworkNode[]; metadata: Partial<ProjectMetadata> } {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    
    const nodes: NetworkNode[] = [];
    const points: { id: string; lat: number; lng: number; name: string }[] = [];

    // 1. Extrair todos os pontos (Postes/Trafos)
    for (let i = 0; i < placemarks.length; i++) {
      const p = placemarks[i];
      const name = p.getElementsByTagName('name')[0]?.textContent || `Ponto-${i}`;
      const pointTag = p.getElementsByTagName('Point')[0];
      
      if (pointTag) {
        const coordsStr = pointTag.getElementsByTagName('coordinates')[0]?.textContent || '';
        const [lng, lat] = coordsStr.trim().split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          // ID baseado em timestamp para evitar colisões
          const tsId = `P-${Date.now()}-${i}`;
          points.push({ id: tsId, lat, lng, name });
        }
      }
    }

    if (points.length === 0) throw new Error("Nenhum ponto de coordenada encontrado no arquivo.");

    const trafoIdx = points.findIndex(p => p.name.toUpperCase().includes('TRAFO') || p.name.toUpperCase().includes('SUB'));
    const trafoSource = trafoIdx !== -1 ? points.splice(trafoIdx, 1)[0] : points.shift()!;

    const trafoNode: NetworkNode = {
      id: 'TRAFO',
      parentId: '',
      meters: 0,
      cable: defaultCable,
      loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 },
      lat: trafoSource.lat,
      lng: trafoSource.lng,
      utm: GisService.toUtm(trafoSource.lat, trafoSource.lng)
    };
    nodes.push(trafoNode);

    let lastParentId = 'TRAFO';
    let lastLat = trafoSource.lat;
    let lastLng = trafoSource.lng;

    points.forEach((p, idx) => {
      const nodeId = p.name.replace(/\s+/g, '_').toUpperCase() || `PONTO_${idx + 1}`;
      const dist = Math.round(GisService.calculateDistance(lastLat, lastLng, p.lat, p.lng));
      
      nodes.push({
        id: nodeId,
        parentId: lastParentId,
        meters: dist > 0 ? dist : 30,
        cable: defaultCable,
        loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 },
        lat: p.lat,
        lng: p.lng,
        utm: GisService.toUtm(p.lat, p.lng)
      });

      lastParentId = nodeId;
      lastLat = p.lat;
      lastLng = p.lng;
    });

    return {
      nodes,
      metadata: {
        lat: trafoSource.lat,
        lng: trafoSource.lng,
        client: 'Importado via KML/KMZ'
      }
    };
  }
}
