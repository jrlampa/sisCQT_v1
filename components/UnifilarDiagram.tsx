
import React, { useState } from 'react';
import { NetworkNode, EngineResult, Project } from '../types';
import { PROFILES } from '../constants';

interface UnifilarDiagramProps {
  nodes: NetworkNode[];
  result: EngineResult;
  cables: Project['cables'];
}

const UnifilarDiagram: React.FC<UnifilarDiagramProps> = ({ nodes, result, cables }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  const nodeMap = new Map(result.nodes.map(n => [n.id, n]));
  
  // Organização da árvore (Levels)
  const levels: Map<string, number> = new Map();
  const getLevel = (id: string): number => {
    if (levels.has(id)) return levels.get(id)!;
    const node = nodes.find(n => n.id === id);
    if (!node || !node.parentId) {
      levels.set(id, 0);
      return 0;
    }
    const l = getLevel(node.parentId) + 1;
    levels.set(id, l);
    return l;
  };

  nodes.forEach(n => getLevel(n.id));

  const maxLevel = Math.max(...Array.from(levels.values()), 1);
  const baseWidth = 1000;
  const baseHeight = 600;
  const levelY = baseHeight / (maxLevel + 1);

  const levelNodes: Map<number, string[]> = new Map();
  levels.forEach((lvl, id) => {
    if (!levelNodes.has(lvl)) levelNodes.set(lvl, []);
    levelNodes.get(lvl)!.push(id);
  });

  const getPos = (id: string) => {
    const lvl = levels.get(id) || 0;
    const idsInLvl = levelNodes.get(lvl) || [];
    const idx = idsInLvl.indexOf(id);
    const x = (baseWidth / (idsInLvl.length + 1)) * (idx + 1);
    const y = levelY * lvl + 80;
    return { x, y };
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 3));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div 
      className="glass-dark rounded-[32px] p-8 border border-white/50 shadow-inner overflow-hidden relative print:p-0 print:border-none select-none cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex justify-between items-center mb-6 print:hidden relative z-20">
        <div className="flex flex-col">
          <h3 className="font-bold text-gray-700 text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
            📐 Mapa de Diagnóstico de Rede
          </h3>
          <span className="text-[8px] text-gray-400 font-bold uppercase mt-1">Clique e arraste para navegar. A opacidade indica saúde do trecho.</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/60 p-1 rounded-xl border border-white/80 shadow-sm">
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="w-8 h-8 flex items-center justify-center text-blue-600 font-black hover:bg-white rounded-lg transition-all">+</button>
            <div className="w-px h-4 bg-gray-200 self-center"></div>
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} className="w-8 h-8 flex items-center justify-center text-blue-600 font-black hover:bg-white rounded-lg transition-all">−</button>
          </div>
          <button 
            onClick={resetView}
            className="px-4 py-2 bg-white text-[10px] font-black text-gray-500 rounded-xl border border-gray-100 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
          >
            RESET
          </button>
        </div>
      </div>

      <svg 
        viewBox={`0 0 ${baseWidth} ${baseHeight}`} 
        className="w-full h-auto drop-shadow-2xl" 
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <filter id="glow-v2" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <linearGradient id="link-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <g style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, 
          transformOrigin: 'center',
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
          pointerEvents: 'all'
        }}>
          {/* Linhas de Conexão (Condutores) */}
          {nodes.map(node => {
            if (!node.parentId) return null;
            const start = getPos(node.parentId);
            const end = getPos(node.id);
            const res = nodeMap.get(node.id);
            const cableInfo = cables[node.cable];
            
            // Definição de "Sobre" (Estado crítico)
            const isOverloaded = (res?.calculatedLoad || 0) > (cableInfo?.ampacity || 0);
            const isCriticalCqt = (res?.accumulatedCqt || 0) > 6;
            const isSobre = isOverloaded || isCriticalCqt;
            
            // Visibilidade aumentada: 
            // - 1.0 para críticos ou hover
            // - 0.4 para estado normal (garantindo que não pareçam órfãos)
            const isHighLight = isSobre || hoveredNodeId === node.id || hoveredNodeId === node.parentId || hoveredNodeId === `link-${node.id}`;

            return (
              <g 
                key={`link-${node.id}`} 
                className="group/link"
                onMouseEnter={() => setHoveredNodeId(`link-${node.id}`)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Linha de fundo (para melhor contraste em telas claras) */}
                <line 
                  x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                  stroke="#e2e8f0"
                  strokeWidth="3"
                  style={{ opacity: 0.2 }}
                />
                <line 
                  x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                  stroke={isSobre ? '#ef4444' : 'url(#link-grad)'} 
                  strokeWidth={isHighLight ? "4" : "2.5"}
                  strokeDasharray={isSobre && isCriticalCqt ? "6,4" : ""}
                  style={{ 
                    opacity: isHighLight ? 1 : 0.4, 
                    transition: 'opacity 0.3s ease, stroke-width 0.3s ease' 
                  }}
                  className="group-hover/link:stroke-blue-400 group-hover/link:stroke-[6px]"
                />
              </g>
            );
          })}

          {/* Nós e Tooltips */}
          {nodes.map(node => {
            const { x, y } = getPos(node.id);
            const isTrafo = node.id === 'TRAFO';
            const res = nodeMap.get(node.id);
            const cableInfo = cables[node.cable];
            const isOverloaded = !isTrafo && (res?.calculatedLoad || 0) > (cableInfo?.ampacity || 0);
            const isCriticalCqt = !isTrafo && (res?.accumulatedCqt || 0) > 6;
            const isSobre = isOverloaded || isCriticalCqt;

            return (
              <g 
                key={`node-${node.id}`} 
                className="group/node cursor-pointer"
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {isTrafo ? (
                  <g filter="url(#glow-v2)">
                    <rect 
                      x={x-22} y={y-22} width="44" height="44" rx="10" 
                      className="fill-[#004a80] transition-all duration-300 group-hover/node:fill-blue-700 shadow-xl" 
                    />
                    <text x={x} y={y + 5} textAnchor="middle" className="fill-white text-[10px] font-black uppercase">T</text>
                  </g>
                ) : (
                  <circle 
                    cx={x} cy={y} r="10" 
                    className={`${isSobre ? 'fill-red-500 animate-pulse' : 'fill-white'} stroke-blue-600 stroke-[3px] transition-all duration-300 group-hover/node:scale-[1.6] group-hover/node:stroke-blue-400`} 
                  />
                )}
                
                <text 
                  x={x} y={y + 38} textAnchor="middle" 
                  className="text-[10px] font-black fill-gray-800 uppercase tracking-tighter transition-all group-hover/node:fill-blue-600 group-hover/node:translate-y-1"
                >
                  {isTrafo ? 'CABINE' : node.id}
                </text>

                {/* Tooltip Detalhado */}
                <g className="opacity-0 group-hover/node:opacity-100 pointer-events-none transition-all duration-300 ease-out transform translate-y-4 group-hover/node:translate-y-0">
                  <rect 
                    x={x + 18} y={y - 50} width="160" height="75" rx="16" 
                    className="fill-white/95 stroke-blue-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-sm" 
                  />
                  <text x={x + 30} y={y - 32} className="text-[10px] font-black fill-gray-900 uppercase">Ponto {node.id}</text>
                  <text x={x + 30} y={y - 18} className="text-[9px] font-bold fill-blue-600 uppercase">Carga: {res?.calculatedLoad?.toFixed(1)}A</text>
                  <text x={x + 30} y={y - 6} className="text-[9px] font-bold fill-indigo-500 uppercase">CQT Acum.: {res?.accumulatedCqt?.toFixed(2)}%</text>
                  <text x={x + 30} y={y + 6} className="text-[8px] font-bold fill-gray-400 uppercase">Cabo: {node.cable}</text>
                  <circle cx={x+25} cy={y-21} r="2" className="fill-blue-400" />
                  <circle cx={x+25} cy={y-9} r="2" className="fill-indigo-400" />
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default UnifilarDiagram;
