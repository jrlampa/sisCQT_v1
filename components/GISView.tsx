
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, NetworkNode, EngineResult } from '../types';
import { GisService } from '../services/gisService';
import { useToast } from '../context/ToastContext';

interface GISViewProps {
  project: Project;
  result: EngineResult;
  onUpdateNodes: (nodes: NetworkNode[]) => void;
}

type MapLayer = 'dark' | 'satellite' | 'osm';

const GISView: React.FC<GISViewProps> = ({ project, result, onUpdateNodes }) => {
  const { showToast } = useToast();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('osm'); // Padrão alterado para OSM
  const [isAddingNode, setIsAddingNode] = useState(false);
  
  // Estados de Navegação
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const mapRef = useRef<SVGSVGElement>(null);

  const activeScenario = project.scenarios.find(s => s.id === project.activeScenarioId)!;
  const nodes = activeScenario.nodes;

  // Lógica de Mapa
  const mapCenter = { lat: project.metadata.lat, lng: project.metadata.lng };
  const baseScale = 15000; 

  const getMapPos = (lat: number, lng: number) => {
    return {
      x: 500 + (lng - mapCenter.lng) * baseScale,
      y: 400 - (lat - mapCenter.lat) * baseScale
    };
  };

  const fromMapPos = (x: number, y: number) => {
    const lng = (x - 500) / baseScale + mapCenter.lng;
    const lat = (400 - y) / baseScale + mapCenter.lat;
    return { lat, lng };
  };

  const handleNodeMove = (id: string, newLat: number, newLng: number) => {
    const updatedNodes = nodes.map(n => {
      if (n.id === id) {
        const utm = GisService.toUtm(newLat, newLng);
        return { ...n, lat: newLat, lng: newLng, utm };
      }
      return n;
    });

    updatedNodes.forEach(n => {
      if (n.id === id || n.parentId === id) {
        const parent = updatedNodes.find(p => p.id === n.parentId);
        if (parent && parent.lat && n.lat) {
          n.meters = Math.round(GisService.calculateDistance(parent.lat, parent.lng, n.lat, n.lng));
        }
      }
    });

    onUpdateNodes(updatedNodes);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (!isAddingNode || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (1000 / rect.width);
    const svgY = (e.clientY - rect.top) * (800 / rect.height);

    // Ajusta coordenadas baseado no pan/zoom
    const adjustedX = (svgX - 500 - offset.x) / zoom + 500;
    const adjustedY = (svgY - 400 - offset.y) / zoom + 400;

    const coords = fromMapPos(adjustedX, adjustedY);
    
    const nextId = (Math.max(...nodes.map(n => parseInt(n.id) || 0)) + 1).toString();
    const parentId = selectedNodeId || (nodes.length > 0 ? nodes[nodes.length - 1].id : 'TRAFO');

    const newNode: NetworkNode = {
      id: nextId,
      parentId: parentId,
      meters: 30,
      cable: nodes[0]?.cable || Object.keys(project.cables)[0],
      loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 },
      lat: coords.lat,
      lng: coords.lng,
      utm: GisService.toUtm(coords.lat, coords.lng)
    };

    const parentNode = nodes.find(n => n.id === parentId);
    if (parentNode && parentNode.lat) {
      newNode.meters = Math.round(GisService.calculateDistance(parentNode.lat, parentNode.lng, newNode.lat, newNode.lng));
    }

    onUpdateNodes([...nodes, newNode]);
    setSelectedNodeId(nextId);
    setIsAddingNode(false);
    showToast(`Poste ${nextId} plotado com sucesso!`, 'success');
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.15;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 20));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as any).tagName === 'svg' || (e.target as any).id === 'map-bg' || (e.target as any).id === 'grid-pattern') {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Definição das cores das camadas para simulação visual
  const layerStyles = {
    dark: { bg: 'bg-[#121212]', grid: '#222222', stroke: '#3b82f6' },
    satellite: { bg: 'bg-[#0b1b2b]', grid: '#1a2a3a', stroke: '#60a5fa' },
    osm: { bg: 'bg-[#f8f9fa]', grid: '#e2e8f0', stroke: '#2563eb' }
  };

  const currentStyle = layerStyles[activeLayer];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-[calc(100vh-180px)]">
      <header className="flex justify-between items-center bg-white/40 p-6 rounded-[32px] border border-white/60 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">🌍</div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase leading-none">Estação de Plotagem GIS</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Navegação suave e precisão cartográfica</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white/60 p-1 rounded-2xl border border-white/80 shadow-sm mr-2">
            <button onClick={() => setZoom(z => Math.min(z * 1.2, 20))} className="w-10 h-10 flex items-center justify-center text-blue-600 font-black hover:bg-white rounded-xl transition-all">+</button>
            <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.1))} className="w-10 h-10 flex items-center justify-center text-blue-600 font-black hover:bg-white rounded-xl transition-all">−</button>
          </div>
          <button 
            onClick={() => {
              setIsAddingNode(!isAddingNode);
              if (!isAddingNode) showToast("Clique no mapa para posicionar o novo poste", "info");
            }}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all ${isAddingNode ? 'bg-orange-500 text-white animate-pulse' : 'bg-[#004a80] text-white hover:scale-105'}`}
          >
            {isAddingNode ? 'Cancelando Plotagem...' : '+ Plotar Novo Poste'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div 
          className={`flex-1 ${currentStyle.bg} rounded-[40px] relative overflow-hidden shadow-2xl border-4 border-white/20 ${isAddingNode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleMapClick}
        >
          {/* Seletor de Camadas Aprimorado */}
          <div className="absolute top-6 right-6 z-10 flex gap-1 p-1.5 bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
            {(['dark', 'satellite', 'osm'] as MapLayer[]).map(layer => (
              <button 
                key={layer} 
                onClick={() => setActiveLayer(layer)} 
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeLayer === layer ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                {layer === 'osm' ? 'MAPA' : layer === 'satellite' ? 'SATÉLITE' : 'DARK'}
              </button>
            ))}
          </div>

          {/* Indicador de Escala */}
          <div className="absolute bottom-6 right-6 z-10 glass-dark px-4 py-2 rounded-xl border border-white/40 shadow-lg flex flex-col items-end">
             <div className="flex items-center gap-2">
                <div className="h-1.5 bg-gray-600 rounded-full" style={{ width: `${50 * zoom}px`, borderLeft: '2px solid black', borderRight: '2px solid black' }}></div>
                <span className="text-[9px] font-black text-gray-800 uppercase">{~~(50/zoom)}m</span>
             </div>
             <span className="text-[7px] font-bold text-gray-400 mt-1 uppercase">Zoom: {zoom.toFixed(2)}x</span>
          </div>
          
          <svg ref={mapRef} className="w-full h-full" viewBox="0 0 1000 800" style={{ touchAction: 'none' }}>
            <defs>
              <pattern id="grid" width={100 * zoom} height={100 * zoom} patternUnits="userSpaceOnUse" x={offset.x} y={offset.y}>
                <path d={`M ${100 * zoom} 0 L 0 0 0 ${100 * zoom}`} fill="none" stroke={currentStyle.grid} strokeWidth="1" />
              </pattern>
              <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <rect id="grid-pattern" width="100%" height="100%" fill="url(#grid)" />
            
            <g style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, 
              transformOrigin: '500px 400px', // Centro fixo para zoom suave
              transition: isPanning ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' 
            }}>
              
              {/* Linhas de Rede */}
              {nodes.map(node => {
                if (!node.parentId || !node.lat) return null;
                const parent = nodes.find(p => p.id === node.parentId);
                if (!parent || !parent.lat) return null;
                const start = getMapPos(parent.lat, parent.lng);
                const end = getMapPos(node.lat, node.lng);
                const isWarning = (result.nodes.find(rn => rn.id === node.id)?.accumulatedCqt || 0) > 6;

                return (
                  <g key={`l-${node.id}`}>
                    <line 
                        x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                        stroke={isWarning ? '#ef4444' : currentStyle.stroke} 
                        strokeWidth={3/zoom} 
                        strokeLinecap="round"
                        opacity="0.8" 
                    />
                    {zoom > 0.8 && (
                      <text 
                        x={(start.x+end.x)/2} 
                        y={(start.y+end.y)/2-8/zoom} 
                        textAnchor="middle" 
                        style={{fontSize: `${9/zoom}px`, fontWeight: 900}} 
                        className={`${activeLayer === 'osm' ? 'fill-gray-400' : 'fill-white/40'} pointer-events-none select-none`}
                      >
                        {node.meters}m
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Postes / Nós */}
              {nodes.map(node => {
                if (!node.lat) return null;
                const pos = getMapPos(node.lat, node.lng);
                const isActive = selectedNodeId === node.id;
                const isTrafo = node.id === 'TRAFO';

                return (
                  <g 
                    key={`p-${node.id}`} 
                    className="cursor-pointer group" 
                    onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (isAddingNode) return;
                      const startX = e.clientX, startY = e.clientY, sLat = node.lat!, sLng = node.lng!;
                      const onMove = (m: MouseEvent) => {
                        const sf = baseScale * zoom;
                        handleNodeMove(node.id, sLat + (-(m.clientY - startY) / sf), sLng + ((m.clientX - startX) / sf));
                      };
                      const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                    }}
                  >
                    {isTrafo ? (
                      <rect 
                        x={pos.x-14/zoom} y={pos.y-14/zoom} 
                        width={28/zoom} height={28/zoom} 
                        rx={6/zoom} 
                        className="fill-blue-700 stroke-white transition-all duration-300 group-hover:fill-blue-800" 
                        strokeWidth={2/zoom} 
                        filter="url(#node-glow)"
                      />
                    ) : (
                      <>
                        <circle 
                            cx={pos.x} cy={pos.y} 
                            r={(isActive ? 10 : 7)/zoom} 
                            className={`${isActive ? 'fill-blue-400' : 'fill-white'} stroke-blue-600 transition-all duration-300 group-hover:stroke-blue-400`} 
                            strokeWidth={2.5/zoom} 
                            filter={isActive ? "url(#node-glow)" : ""}
                        />
                        {isActive && <circle cx={pos.x} cy={pos.y} r={18/zoom} className="fill-blue-400/20 animate-pulse pointer-events-none" />}
                      </>
                    )}
                    {zoom > 0.6 && (
                      <text 
                        x={pos.x} y={pos.y + (isTrafo ? 32/zoom : 28/zoom)} 
                        textAnchor="middle" 
                        style={{fontSize:`${11/zoom}px`, fontWeight: 900}} 
                        className={`${activeLayer === 'osm' ? 'fill-gray-700' : 'fill-white'} uppercase tracking-tighter transition-all duration-300`}
                      >
                        {node.id}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* HUD Detalhes Aprimorado */}
          <div className="absolute bottom-10 left-10 glass-dark p-6 rounded-[32px] border border-white/40 shadow-2xl min-w-[300px] animate-in slide-in-from-left-4 duration-500">
            {selectedNode ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">{selectedNode.id.charAt(0)}</div>
                   <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-tighter">Ponto {selectedNode.id}</span>
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{selectedNode.id === 'TRAFO' ? 'Estação de Origem' : 'Ponto de Distribuição'}</span>
                   </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white/40 p-2 rounded-lg"><span className="text-[9px] font-black text-gray-400 uppercase">Coordenada X (UTM)</span><span className="text-[11px] font-black text-gray-700">{selectedNode.utm?.x}m</span></div>
                    <div className="flex justify-between items-center bg-white/40 p-2 rounded-lg"><span className="text-[9px] font-black text-gray-400 uppercase">Coordenada Y (UTM)</span><span className="text-[11px] font-black text-gray-700">{selectedNode.utm?.y}m</span></div>
                    <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-lg border border-blue-100"><span className="text-[9px] font-black text-blue-600 uppercase">Montante</span><span className="text-[11px] font-black text-blue-800">{selectedNode.parentId || 'CABINE CENTRAL'}</span></div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4 opacity-50">
                 <div className="text-3xl animate-bounce">📍</div>
                 <p className="text-[10px] font-black text-gray-500 uppercase text-center leading-relaxed">Clique em um poste para ver as coordenadas UTM e dados de montante.</p>
              </div>
            )}
          </div>
        </div>

        {/* Barra Lateral GIS Refinada */}
        <aside className="w-80 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500">
          <div className="glass-dark p-7 rounded-[32px] border border-white/60 shadow-sm">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">🛠️</div>
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-tighter">Configuração de Trecho</h3>
             </div>
             <div className="flex flex-col gap-5">
                <div className="bg-white/60 p-4 rounded-2xl border border-blue-50 flex flex-col gap-2 transition-all hover:border-blue-200">
                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Nó de Conexão (Pai)</label>
                   <select 
                    className="bg-transparent text-sm font-black text-blue-600 outline-none cursor-pointer focus:ring-0"
                    value={selectedNodeId || 'TRAFO'}
                    onChange={e => setSelectedNodeId(e.target.value)}
                   >
                     {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
                   </select>
                </div>
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                   <p className="text-[9px] text-orange-700 font-black uppercase mb-1">Dica de Plotagem</p>
                   <p className="text-[8px] text-orange-600 font-bold uppercase leading-relaxed">
                     Selecione o poste pai antes de clicar no mapa para que o Theseus calcule automaticamente o vão (meters) geodésico.
                   </p>
                </div>
             </div>
          </div>
          
          <div className="glass-dark p-7 rounded-[32px] border border-white/60 flex-1 flex flex-col shadow-sm">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">📊</div>
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-tighter">Métricas de Campo</h3>
             </div>
             <div className="space-y-4">
                <div className="flex flex-col gap-1.5 group">
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Total de Postes</span>
                   <div className="bg-white/40 p-4 rounded-2xl border border-white/60 flex items-center justify-between group-hover:border-blue-200 transition-all">
                      <span className="text-2xl font-black text-gray-800">{nodes.length}</span>
                      <span className="text-[8px] font-black text-blue-500 uppercase">Ativos</span>
                   </div>
                </div>
                <div className="flex flex-col gap-1.5 group">
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Extensão Projetada</span>
                   <div className="bg-white/40 p-4 rounded-2xl border border-white/60 flex items-center justify-between group-hover:border-blue-200 transition-all">
                      <span className="text-2xl font-black text-gray-800">{nodes.reduce((acc, n) => acc + n.meters, 0)}</span>
                      <span className="text-[8px] font-black text-blue-500 uppercase">Metros</span>
                   </div>
                </div>
             </div>
             <div className="mt-auto pt-6 border-t border-white/20">
                <p className="text-[7px] font-black text-gray-400 uppercase text-center italic">Coordenadas projetadas em WGS84 e convertidas para UTM Zone {GisService.toUtm(project.metadata.lat, project.metadata.lng).zone}.</p>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default GISView;
