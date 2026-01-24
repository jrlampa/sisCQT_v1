import { describe, it, expect } from 'vitest';
import { ElectricalEngine } from '../services/electricalEngine';
import { NetworkNode, ProjectParams } from '../types';
import { DEFAULT_CABLES, IP_TYPES } from '../constants';

const basicParams: ProjectParams = {
  trafoKva: 75,
  profile: 'Massivos',
  classType: 'Automatic',
  manualClass: 'B',
  normativeTable: 'PRODIST',
};

describe('ElectricalEngine Tests', () => {

  describe('Chaos & Edge Case Testing', () => {
    it('should throw an error if TRAFO node is missing', () => {
      const nodes: NetworkNode[] = [{ id: 'P1', parentId: 'P0', meters: 10, cable: '', loads: {} as any }];
      expect(() => ElectricalEngine.calculate('s1', nodes, basicParams, DEFAULT_CABLES, IP_TYPES)).toThrow("Nó 'TRAFO' não encontrado. Topologia inválida.");
    });

    it('should return a warning for an orphan node', () => {
      const nodes: NetworkNode[] = [
        { id: 'TRAFO', parentId: '', meters: 0, cable: '', loads: {} as any },
        { id: 'P1', parentId: 'NON_EXISTENT_PARENT', meters: 10, cable: '', loads: {} as any }
      ];
      const result = ElectricalEngine.calculate('s1', nodes, basicParams, DEFAULT_CABLES, IP_TYPES);
      expect(result.warnings).toContain('⚠️ Nó órfão detectado: P1 não possui pai válido.');
    });



    it('should handle empty nodes array', () => {
        expect(() => ElectricalEngine.calculate('s1', [], basicParams, DEFAULT_CABLES, IP_TYPES)).toThrow();
    });
  });

  describe('Monte Carlo Simulation', () => {
    it('should run without errors and return the expected structure', () => {
      const nodes: NetworkNode[] = [{ id: 'TRAFO', parentId: '', meters: 0, cable: '3x95+54.6mm² Al', loads: { mono: 10 } as any }];
      const result = ElectricalEngine.runMonteCarlo(nodes, basicParams, DEFAULT_CABLES, IP_TYPES, 100); // Small iteration count for test speed
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('stabilityIndex');
      expect(result).toHaveProperty('failureRisk');
      expect(result.distribution).toBeInstanceOf(Array);
    });
  });

});
