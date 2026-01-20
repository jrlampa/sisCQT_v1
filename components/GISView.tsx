
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
  const [activeLayer, setActiveLayer] = useState<MapLayer>('dark');
  const [isAddingNode, setIsAddingNode] = useState(false);
  
  // Estados de Navegação
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  // FIX: Initialize lastMousePos with 0,0 since 'e' is not available during component initialization
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

    // Calcular distância real para o pai
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
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.2), 10));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as any).tagName === 'svg' || (e.target as any).id === 'map-bg') {
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-[calc(100vh-180px)]">
      <header className="flex justify-between items-center bg-white/40 p-6 rounded-[32px] border border-white/60 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">🌍</div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase leading-none">Estação de Plotagem GIS</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Clique para inserir novos postes na topografia</p>
          </div>
        </div>
        <div className="flex gap-3">
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
          className={`flex-1 ${activeLayer === 'satellite' ? 'bg-[#0b1b2b]' : activeLayer === 'osm' ? 'bg-[#f8f9fa]' : 'bg-[#121212]'} rounded-[40px] relative overflow-hidden shadow-2xl border-4 border-white/20 ${isAddingNode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleMapClick}
        >
          {/* Seletor de Camadas */}
          <div className="absolute top-6 right-6 z-10 flex gap-1 p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            {(['dark', 'satellite', 'osm'] as MapLayer[]).map(layer => (
              <button key={layer} onClick={() => setActiveLayer(layer)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeLayer === layer ? 'bg-white text-blue-600 shadow-lg' : 'text-white/60 hover:text-white'}`}>{layer}</button>
            ))}
          </div>
          
          <svg ref={mapRef} className="w-full h-full" viewBox="0 0 1000 800">
            <rect id="map-bg" width="1000" height="800" fill="transparent" />
            <g style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: 'center' }}>
              
              {/* Linhas */}
              {nodes.map(node => {
                if (!node.parentId || !node.lat) return null;
                const parent = nodes.find(p => p.id === node.parentId);
                if (!parent || !parent.lat) return null;
                const start = getMapPos(parent.lat, parent.lng);
                const end = getMapPos(node.lat, node.lng);
                const isWarning = (result.nodes.find(rn => rn.id === node.id)?.accumulatedCqt || 0) > 6;

                return (
                  <g key={`l-${node.id}`}>
                    <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={isWarning ? '#ef4444' : '#3b82f6'} strokeWidth={3/zoom} opacity="0.8" />
                    {zoom > 0.6 && <text x={(start.x+end.x)/2} y={(start.y+end.y)/2-5/zoom} textAnchor="middle" style={{fontSize: `${9/zoom}px`}} className="fill-white/50 font-black">{node.meters}m</text>}
                  </g>
                );
              })}

              {/* Nós */}
              {nodes.map(node => {
                if (!node.lat) return null;
                const pos = getMapPos(node.lat, node.lng);
                const isActive = selectedNodeId === node.id;
                const isTrafo = node.id === 'TRAFO';

                return (
                  <g key={`p-${node.id}`} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
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
                    {isTrafo ? <rect x={pos.x-12/zoom} y={pos.y-12/zoom} width={24/zoom} height={24/zoom} rx={6/zoom} className="fill-blue-600 stroke-white" strokeWidth={2/zoom} /> : 
                    <circle cx={pos.x} cy={pos.y} r={(isActive ? 8 : 6)/zoom} className={`${isActive ? 'fill-blue-400' : 'fill-white'} stroke-blue-600`} strokeWidth={2/zoom} />}
                    {zoom > 0.7 && <text x={pos.x} y={pos.y+25/zoom} textAnchor="middle" style={{fontSize:`${10/zoom}px`}} className="fill-white font-black uppercase">{node.id}</text>}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* HUD GIS */}
          <div className="absolute bottom-10 left-10 glass-dark p-6 rounded-[24px] border border-white/40 shadow-2xl min-w-[280px]">
            {selectedNode ? (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between border-b border-black/5 pb-2"><span className="text-[9px] font-black text-blue-600 uppercase">Ponto:</span><span className="text-xs font-black text-gray-800">{selectedNode.id}</span></div>
                <div className="flex justify-between border-b border-black/5 pb-2"><span className="text-[9px] font-black text-gray-400 uppercase">UTM E:</span><span className="text-xs font-black text-gray-800">{selectedNode.utm?.x}m</span></div>
                <div className="flex justify-between border-b border-black/5 pb-2"><span className="text-[9px] font-black text-gray-400 uppercase">UTM N:</span><span className="text-xs font-black text-gray-800">{selectedNode.utm?.y}m</span></div>
                <div className="flex justify-between"><span className="text-[9px] font-black text-gray-400 uppercase">Montante:</span><span className="text-xs font-black text-blue-600">{selectedNode.parentId || 'ORIGEM'}</span></div>
              </div>
            ) : <p className="text-[9px] font-black text-gray-400 uppercase text-center py-4">Selecione um ponto ou plote um novo poste para ver detalhes.</p>}
          </div>
        </div>

        {/* Sidebar GIS */}
        <aside className="w-80 flex flex-col gap-4">
          <div className="glass-dark p-6 rounded-[32px] border border-white/60">
             <h3 className="text-xs font-black text-gray-800 uppercase mb-4 tracking-tighter">Propriedades da Plotagem</h3>
             <div className="flex flex-col gap-4">
                <div className="bg-white/40 p-4 rounded-2xl flex flex-col gap-1">
                   <span className="text-[9px] font-black text-gray-400 uppercase">ID de Montante (Pai)</span>
                   <select 
                    className="bg-transparent text-sm font-black text-blue-600 outline-none cursor-pointer"
                    value={selectedNodeId || 'TRAFO'}
                    onChange={e => setSelectedNodeId(e.target.value)}
                   >
                     {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
                   </select>
                </div>
                <p className="text-[8px] text-gray-400 font-bold uppercase leading-relaxed p-2">
                  *Ao plotar no mapa, o sistema calcula a distância real geodésica entre o ponto clicado e o nó de montante selecionado acima.
                </p>
             </div>
          </div>
          <div className="glass-dark p-6 rounded-[32px] border border-white/60 flex-1">
             <h3 className="text-xs font-black text-gray-800 uppercase mb-4 tracking-tighter">Status da Topografia</h3>
             <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl">
                   <span className="text-[10px] font-black text-blue-600">Total Postes:</span>
                   <span className="text-lg font-black text-gray-800">{nodes.length}</span>
                </div>
                <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl">
                   <span className="text-[10px] font-black text-blue-600">Extensão Rede:</span>
                   <span className="text-lg font-black text-gray-800">{nodes.reduce((acc, n) => acc + n.meters, 0)}m</span>
                </div>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default GISView;
