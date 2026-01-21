
import React, { useState, useMemo } from 'react';
import { NetworkNode, EngineResult, Project } from '../types';

interface UnifilarDiagramProps {
  nodes: NetworkNode[];
  result: EngineResult;
  cables: Project['cables'];
  interactive?: boolean;
  onUpdateNode?: (nodeId: string, field: string, value: any) => void;
  onRemoveNode?: (nodeId: string) => void;
  ipTypes?: Record<string, number>;
}

const UnifilarDiagram: React.FC<UnifilarDiagramProps> = ({ 
  nodes, 
  result, 
  cables, 
  interactive = false, 
  onUpdateNode, 
  onRemoveNode,
  ipTypes = {}
}) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const nodeMap = useMemo(() => new Map<string, NetworkNode>((result?.nodes || []).map(n => [n.id, n])), [result]);
  
  const levels: Map<string, number> = useMemo(() => {
    const lMap = new Map<string, number>();
    const getLevelRec = (id: string): number => {
      if (lMap.has(id)) return lMap.get(id)!;
      const node = nodes.find(n => n.id === id);
      if (!node || !node.parentId) {
        lMap.set(id, 0);
        return 0;
      }
      const l = getLevelRec(node.parentId) + 1;
      lMap.set(id, l);
      return l;
    };
    nodes.forEach(n => getLevelRec(n.id));
    return lMap;
  }, [nodes]);

  const levelNodes = useMemo(() => {
    const map = new Map<number, string[]>();
    levels.forEach((lvl, id) => {
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl)!.push(id);
    });
    return map;
  }, [levels]);

  const maxLevel = useMemo(() => Math.max(...Array.from(levels.values()), 0), [levels]);
  const baseWidth = 1000;
  const baseHeight = 700;
  const levelY = baseHeight / (maxLevel + 2 || 1);

  const getPos = (id: string) => {
    const lvl = levels.get(id) || 0;
    const idsInLvl = levelNodes.get(lvl) || [];
    const idx = idsInLvl.indexOf(id);
    const count = idsInLvl.length || 1;
    const x = (baseWidth / (count + 1)) * (idx + 1);
    const y = levelY * lvl + 100;
    return { x, y };
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!interactive) return;
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

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const resSelected = selectedNode ? nodeMap.get(selectedNode.id) : null;

  return (
    <div 
      className={`glass-dark rounded-[40px] p-8 border border-white/50 shadow-inner overflow-hidden relative select-none h-full ${interactive ? 'cursor-grab active:cursor-grabbing' : 'print:p-0 print:border-none'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      role="application"
      aria-label="Diagrama Unifilar Interativo"
    >
      <div className="flex justify-between items-center mb-6 print:hidden relative z-20">
        <div className="flex flex-col">
          <h3 className="font-black text-gray-800 text-xs uppercase tracking-tighter flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
            {interactive ? 'MODO TOPOLOGIA INTERATIVA' : 'DIAGRAMA UNIFILAR'}
          </h3>
          <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-widest">
            {interactive ? 'Clique para editar, arraste para navegar' : 'Visualização estática para relatório'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/60 p-1 rounded-xl border border-white/80 shadow-sm">
            <button aria-label="Aumentar Zoom" onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="w-8 h-8 flex items-center justify-center text-blue-600 font-black hover:bg-white rounded-lg transition-all">+</button>
            <button aria-label="Diminuir Zoom" onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} className="w-8 h-8 flex items-center justify-center text-blue-600 font-black hover:bg-white rounded-lg transition-all">−</button>
          </div>
          <button onClick={() => {setZoom(1); setOffset({x:0, y:0}); setSelectedNodeId(null);}} className="px-4 py-2 bg-white text-[9px] font-black text-gray-500 rounded-xl border border-gray-100 shadow-sm">RESET</button>
        </div>
      </div>

      <svg 
        viewBox={`0 0 ${baseWidth} ${baseHeight}`} 
        className="w-full h-full drop-shadow-2xl" 
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: 'none' }}
        role="img"
        aria-label="Grafo de Rede Elétrica"
      >
        <g style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, 
          transformOrigin: 'center',
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
          pointerEvents: 'all'
        }}>
          {nodes.map(node => {
            if (!node.parentId) return null;
            const start = getPos(node.parentId);
            const end = getPos(node.id);
            const res = nodeMap.get(node.id);
            const cableInfo = cables[node.cable] || { ampacity: 0 };
            
            const isOverloaded = (res?.calculatedLoad || 0) > (cableInfo.ampacity || 999);
            const isHighRise = (res?.solarVoltageRise || 0) > 5;
            const hasReverse = (res?.netCurrentDay || 0) < 0;

            return (
              <g key={`link-${node.id}`}>
                <line 
                  x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                  stroke={isOverloaded ? '#ef4444' : isHighRise ? '#f97316' : '#3b82f6'} 
                  strokeWidth={selectedNodeId === node.id ? "6" : "3"}
                  opacity={hoveredNodeId === node.id || selectedNodeId === node.id ? "1" : "0.5"}
                  strokeDasharray={hasReverse ? "4,4" : ""}
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {nodes.map(node => {
            const { x, y } = getPos(node.id);
            const isTrafo = node.id === 'TRAFO';
            const res = nodeMap.get(node.id);
            const isSelected = selectedNodeId === node.id;
            const isWarning = (res?.accumulatedCqt || 0) > 6 || (res?.calculatedLoad || 0) > (cables[node.cable]?.ampacity || 999);

            return (
              <g 
                key={`node-${node.id}`} 
                className="group/node cursor-pointer"
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={(e) => { e.stopPropagation(); setSelectedNodeId(isSelected ? null : node.id); }}
              >
                {isTrafo ? (
                  <rect 
                    x={x-25} y={y-25} width="50" height="50" rx="12" 
                    className={`${isSelected ? 'fill-blue-800' : 'fill-[#004a80]'} stroke-blue-400 stroke-[4px] transition-all`} 
                  />
                ) : (
                  <circle 
                    cx={x} cy={y} r={isSelected ? 16 : 12} 
                    className={`${isWarning ? 'fill-red-500' : 'fill-white'} stroke-blue-600 stroke-[4px] transition-all group-hover/node:stroke-blue-400`} 
                  />
                )}
                
                <text 
                  x={x} y={y + 45} textAnchor="middle" 
                  className={`text-[11px] font-black uppercase tracking-tighter transition-all ${isSelected ? 'fill-blue-600 scale-110' : 'fill-gray-600'}`}
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {interactive && selectedNode && (
        <div className="absolute right-10 top-24 w-80 glass-dark rounded-[32px] p-7 border border-white/60 shadow-2xl animate-in slide-in-from-right-10 duration-500 z-50">
          <header className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-black">{selectedNode.id.charAt(0)}</div>
               <div className="flex flex-col">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-tighter">Ponto {selectedNode.id}</span>
                  <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">{(resSelected?.calculatedLoad || 0).toFixed(1)}A | {(resSelected?.accumulatedCqt || 0).toFixed(2)}%</span>
               </div>
            </div>
            <button aria-label="Fechar Painel" onClick={() => setSelectedNodeId(null)} className="text-gray-400 hover:text-red-500 font-black">✕</button>
          </header>

          <div className="flex flex-col gap-4">
             {!selectedNode.id.includes('TRAFO') && (
               <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Condutor</label>
                  <select 
                    className="w-full bg-white/60 border border-blue-100 rounded-xl px-4 py-2 text-xs font-black outline-none"
                    value={selectedNode.cable}
                    onChange={(e) => onUpdateNode?.(selectedNode.id, 'cable', e.target.value)}
                  >
                    {Object.keys(cables).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
             )}

             <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                   <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Metros</label>
                   <input 
                    type="number"
                    className="w-full bg-white/60 border border-blue-100 rounded-xl px-4 py-2 text-xs font-black outline-none"
                    value={selectedNode.meters}
                    onChange={(e) => onUpdateNode?.(selectedNode.id, 'meters', Number(e.target.value))}
                   />
                </div>
                <div className="flex flex-col gap-1.5">
                   <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Montante</label>
                   <select 
                    className="w-full bg-white/60 border border-blue-100 rounded-xl px-4 py-2 text-xs font-black outline-none"
                    value={selectedNode.parentId}
                    onChange={(e) => onUpdateNode?.(selectedNode.id, 'parentId', e.target.value)}
                   >
                     {nodes.filter(n => n.id !== selectedNode.id).map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
                   </select>
                </div>
             </div>

             <div className="h-px bg-gray-100 my-2"></div>

             <div className="grid grid-cols-3 gap-2">
                {['mono', 'bi', 'tri'].map(phase => (
                  <div key={phase} className="flex flex-col items-center gap-1">
                     <input 
                      className="w-full bg-white/60 border border-blue-50 rounded-lg text-center py-2 text-[10px] font-black text-blue-700 outline-none"
                      value={(selectedNode.loads as any)[phase] || 0}
                      onChange={(e) => onUpdateNode?.(selectedNode.id, phase, Number(e.target.value))}
                     />
                     <span className="text-[8px] font-black text-gray-400 uppercase">{phase}</span>
                  </div>
                ))}
             </div>

             <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => onRemoveNode?.(selectedNode.id)}
                  className="flex-1 bg-red-50 text-red-500 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                >
                  Excluir Ponto
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifilarDiagram;
