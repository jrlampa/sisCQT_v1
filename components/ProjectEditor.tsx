
import React, { useState, useMemo, useCallback } from 'react';
import { Project, NetworkNode, Scenario, ProjectParams, EngineResult } from '../types';
import { DMDI_TABLES, PROFILES } from '../constants';
import { GisService } from '../services/gisService';
import UnifilarDiagram from './UnifilarDiagram';
import { useToast } from '../context/ToastContext.tsx';

interface EditorRowProps {
  node: NetworkNode;
  resNode?: NetworkNode;
  isTrafo: boolean;
  isChanged?: boolean;
  cables: Project['cables'];
  ipTypes: Project['ipTypes'];
  profile: string;
  onUpdateField: (nodeId: string, field: string, value: any) => void;
  onRemove: (nodeId: string) => void;
}

const EditorRow: React.FC<EditorRowProps> = React.memo(({ node, resNode, isTrafo, isChanged, cables, ipTypes, profile, onUpdateField, onRemove }) => {
  const cableData = cables[node.cable];
  const isOverloaded = !isTrafo && (resNode?.calculatedLoad || 0) > (cableData?.ampacity || 0);
  const profileData = (PROFILES as any)[profile] || PROFILES["Massivos"];
  const isCriticalCqt = !isTrafo && (resNode?.accumulatedCqt ?? 0) > profileData.cqtMax;

  // Análise de Fase Instantânea
  const has3PhaseLoad = node.loads.tri > 0 || node.loads.pointQty > 0 || node.loads.pointKva > 0;
  const isBiphasicCable = node.cable.startsWith('2#');
  const isPhaseMismatch = !isTrafo && has3PhaseLoad && isBiphasicCable;

  const [localMeters, setLocalMeters] = useState(node.meters.toString());
  const [localPointKva, setLocalPointKva] = useState(node.loads.pointKva.toString());
  const [localSolarKva, setLocalSolarKva] = useState((node.loads.solarKva || 0).toString());

  const handleMetersBlur = () => {
    const val = parseFloat(localMeters.replace(',', '.'));
    onUpdateField(node.id, 'meters', isNaN(val) ? 0 : val);
  };

  const handlePointKvaBlur = () => {
    const val = parseFloat(localPointKva.replace(',', '.'));
    onUpdateField(node.id, 'pointKva', isNaN(val) ? 0 : val);
  };

  const handleSolarBlur = () => {
    const val = parseFloat(localSolarKva.replace(',', '.'));
    onUpdateField(node.id, 'solarKva', isNaN(val) ? 0 : val);
  };

  const handleIntChange = (field: string, val: string) => {
    const num = parseInt(val, 10);
    onUpdateField(node.id, field, isNaN(num) ? 0 : num);
  };

  return (
    <tr className={`hover:bg-white/80 transition-all group border-b border-white/10 even:bg-white/10 ${isChanged ? 'bg-blue-50/40' : ''} ${isTrafo ? 'bg-blue-50/20' : ''} ${isPhaseMismatch ? 'bg-red-50/20' : ''}`}>
      {/* ID do Ponto */}
      <td className="px-6 py-6 min-w-[120px]">
        {isTrafo ? (
          <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase shadow-sm border border-blue-200 inline-block w-full text-center">
            {node.id}
          </div>
        ) : (
          <input 
            className={`w-full bg-white border px-3 py-2 rounded-xl text-xs font-black focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm ${isPhaseMismatch ? 'border-red-300 text-red-600' : 'border-gray-100 text-gray-700'}`} 
            value={node.id} 
            onChange={e => onUpdateField(node.id, 'id', e.target.value.toUpperCase())} 
          />
        )}
      </td>

      {/* Montante */}
      <td className="px-6 py-6 text-center">
        {isTrafo ? (
          <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">ORIGEM</span>
        ) : (
          <input 
            className="w-full bg-white/60 px-3 py-2 rounded-xl text-xs font-bold border-2 border-transparent focus:border-blue-200 outline-none uppercase transition-all text-gray-600" 
            value={node.parentId} 
            onChange={e => onUpdateField(node.id, 'parentId', e.target.value.toUpperCase())} 
          />
        )}
      </td>

      {/* Metros */}
      <td className="px-4 py-6 text-center">
        {!isTrafo ? (
          <input 
            type="text" 
            className="w-14 bg-transparent text-center text-xs font-bold border-b-2 border-gray-100 outline-none" 
            value={localMeters} 
            onChange={e => setLocalMeters(e.target.value)}
            onBlur={handleMetersBlur}
          />
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      {/* Condutor */}
      <td className="px-6 py-6">
        {!isTrafo ? (
          <div className="relative">
            {isChanged && !isPhaseMismatch && (
              <div className="absolute -top-6 left-0 animate-bounce">
                <span className="bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-lg shadow-blue-200 uppercase tracking-tighter">✨ Upgrade</span>
              </div>
            )}
            {isPhaseMismatch && (
              <div className="absolute -top-6 left-0 animate-pulse">
                <span className="bg-red-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-200 uppercase tracking-tighter">⚠️ Erro de Fase</span>
              </div>
            )}
            <select 
              className={`w-full bg-white/40 px-3 py-2 rounded-xl text-[10px] font-black border-2 outline-none cursor-pointer transition-all 
                ${isPhaseMismatch ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-red-50 text-red-700 ring-1 ring-red-400' : ''}
                ${isChanged && !isPhaseMismatch ? 'border-blue-500 shadow-lg shadow-blue-100 ring-2 ring-blue-400 ring-opacity-50 animate-pulse' : 'border-transparent'}`} 
              value={node.cable} 
              onChange={e => onUpdateField(node.id, 'cable', e.target.value)}
            >
              {Object.keys(cables).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ) : (
          <div className="text-center">
             <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter italic">N/A (Fonte)</span>
          </div>
        )}
      </td>

      {/* Cargas Diversificadas */}
      <td className="px-6 py-6 bg-blue-50/5">
        <div className="flex gap-1.5 justify-center">
          {[{k: 'mono', l: 'M'}, {k: 'bi', l: 'B'}, {k: 'tri', l: 'T'}].map(item => (
            <div key={item.k} className="flex flex-col items-center gap-0.5">
              <input 
                className={`w-8 h-8 rounded-lg bg-white/90 border text-center text-[10px] font-black shadow-sm outline-none transition-all
                  ${item.k === 'tri' && node.loads.tri > 0 && isBiphasicCable ? 'border-red-400 bg-red-50 text-red-600 shadow-red-100' : 'border-blue-50 text-blue-700'}`} 
                type="text" 
                value={node.loads[item.k as keyof typeof node.loads]} 
                onChange={e => handleIntChange(item.k, e.target.value)} 
              />
              <span className={`text-[7px] font-black ${item.k === 'tri' && node.loads.tri > 0 && isBiphasicCable ? 'text-red-400' : 'text-blue-300'}`}>{item.l}</span>
            </div>
          ))}
        </div>
      </td>

      {/* Geração Solar (kVA) */}
      <td className="px-6 py-6 bg-yellow-50/5">
        <div className="flex gap-1.5 justify-center items-center">
          <div className="flex flex-col items-center gap-0.5">
             <input className="w-8 h-8 rounded-lg bg-white/90 border border-yellow-100 text-center text-[10px] font-black text-orange-600 outline-none" type="text" value={node.loads.solarQty} onChange={e => handleIntChange('solarQty', e.target.value)} />
             <span className="text-[7px] font-black text-orange-400">Q</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <input 
              className="w-14 h-8 rounded-lg bg-white/90 border border-yellow-100 text-center text-[10px] font-black text-orange-600 outline-none" 
              type="text" 
              value={localSolarKva} 
              onChange={e => setLocalSolarKva(e.target.value)}
              onBlur={handleSolarBlur}
            />
            <span className="text-[7px] font-black text-orange-400 uppercase">kVA Solar</span>
          </div>
        </div>
      </td>

      {/* Carga Especial */}
      <td className="px-6 py-6 bg-indigo-50/5">
        <div className="flex gap-1.5 justify-center items-center">
          <div className="flex flex-col items-center gap-0.5">
             <input className={`w-8 h-8 rounded-lg bg-white/90 border text-center text-[10px] font-black outline-none transition-all 
               ${node.loads.pointQty > 0 && isBiphasicCable ? 'border-red-400 bg-red-50 text-red-600' : 'border-indigo-50 text-indigo-700'}`} type="text" value={node.loads.pointQty} onChange={e => handleIntChange('pointQty', e.target.value)} />
             <span className={`text-[7px] font-black ${node.loads.pointQty > 0 && isBiphasicCable ? 'text-red-400' : 'text-indigo-300'}`}>Q</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <input 
              className={`w-16 h-8 rounded-lg bg-white/90 border text-center text-[10px] font-black outline-none px-1 transition-all
                ${node.loads.pointKva > 0 && isBiphasicCable ? 'border-red-400 bg-red-50 text-red-600' : 'border-indigo-50 text-indigo-700'}`} 
              type="text" 
              value={localPointKva} 
              onChange={e => setLocalPointKva(e.target.value)}
              onBlur={handlePointKvaBlur}
            />
            <span className={`text-[7px] font-black ${node.loads.pointKva > 0 && isBiphasicCable ? 'text-red-400' : 'text-indigo-300'}`}>kVA</span>
          </div>
        </div>
      </td>

      {/* Iluminação Pública */}
      <td className="px-6 py-6 bg-orange-50/5">
        <div className="flex gap-1.5 justify-center items-center">
          <select 
            className="bg-white/90 border border-orange-50 rounded-lg px-2 py-2 text-[8px] font-black text-orange-700 outline-none max-w-[80px]" 
            value={node.loads.ipType} 
            onChange={e => onUpdateField(node.id, 'ipType', e.target.value)}
          >
            {Object.keys(ipTypes).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="w-8 h-8 rounded-lg bg-white/90 border border-orange-50 text-center text-[10px] font-black text-orange-700 outline-none" type="text" value={node.loads.ipQty} onChange={e => handleIntChange('ipQty', e.target.value)} />
        </div>
      </td>

      {/* Corrente Calculada */}
      <td className="px-6 py-6 text-center">
        <div className={`inline-flex items-center px-3 py-1.5 rounded-xl font-black text-[11px] ${isOverloaded ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse' : 'text-[#004a80] bg-blue-50'}`}>
          {(resNode?.calculatedLoad || 0).toFixed(1)}A
        </div>
      </td>

      {/* CQT Acumulada */}
      <td className="px-6 py-6 text-center">
        <div className={`inline-flex items-center px-3 py-1.5 rounded-xl font-black text-[11px] ${isCriticalCqt ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : isTrafo ? 'text-blue-400 bg-blue-50/30' : 'text-green-600 bg-green-50'}`}>
          {isTrafo ? 'REF' : `${(resNode?.accumulatedCqt ?? 0).toFixed(2)}%`}
        </div>
      </td>

      {/* Ações */}
      <td className="px-4 py-6 text-right">
        {!isTrafo && (
          <button onClick={() => onRemove(node.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-2">✕</button>
        )}
      </td>
    </tr>
  );
});

interface ProjectEditorProps {
  project: Project & Scenario;
  onUpdate: (nodes: NetworkNode[]) => void;
  onUpdateParams: (params: ProjectParams) => void;
  onOptimize: () => void;
  onRecalculate?: () => void;
  calculatedNodes?: NetworkNode[];
  result?: EngineResult;
}

const ProjectEditor: React.FC<ProjectEditorProps> = ({ 
  project, 
  onUpdate, 
  onUpdateParams, 
  onOptimize,
  onRecalculate,
  calculatedNodes,
  result
}) => {
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTopology, setShowTopology] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastOptimizedNodes, setLastOptimizedNodes] = useState<NetworkNode[] | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNodeCoords, setNewNodeCoords] = useState({ lat: '', lng: '' });

  const changedNodeIds = useMemo(() => {
    if (!lastOptimizedNodes) return new Set<string>();
    const changes = new Set<string>();
    project.nodes.forEach(node => {
      const oldNode = lastOptimizedNodes.find(n => n.id === node.id);
      if (oldNode && oldNode.cable !== node.cable) {
        changes.add(node.id);
      }
    });
    return changes;
  }, [project.nodes, lastOptimizedNodes]);

  const handleOptimizeClick = async () => {
    setIsOptimizing(true);
    setLastOptimizedNodes([...project.nodes]); 
    await new Promise(r => setTimeout(r, 800));
    onOptimize();
    setIsOptimizing(false);
    showToast('Rede auto-dimensionada com sucesso!');
    setTimeout(() => setLastOptimizedNodes(null), 6000);
  };

  const handleRecalculateClick = async () => {
    if (onRecalculate) {
      setIsRecalculating(true);
      await onRecalculate();
      // Pequeno delay extra para o usuário "sentir" o trabalho da engine
      setTimeout(() => setIsRecalculating(false), 500);
    }
  };

  const confirmAddNode = () => {
    const lastNode = project.nodes[project.nodes.length - 1];
    const nextId = (Math.max(...project.nodes.map(n => parseInt(n.id) || 0)) + 1).toString();
    const latNum = parseFloat(newNodeCoords.lat.replace(',', '.'));
    const lngNum = parseFloat(newNodeCoords.lng.replace(',', '.'));

    const newNode: NetworkNode = {
      id: nextId,
      parentId: lastNode?.id || 'TRAFO',
      meters: 30,
      cable: project.nodes[0]?.cable || Object.keys(project.cables)[0],
      loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 }
    };

    if (!isNaN(latNum) && !isNaN(lngNum)) {
      newNode.lat = latNum;
      newNode.lng = lngNum;
      newNode.utm = GisService.toUtm(latNum, lngNum);
      const parent = project.nodes.find(n => n.id === newNode.parentId);
      if (parent && parent.lat) {
        newNode.meters = Math.round(GisService.calculateDistance(parent.lat, parent.lng, newNode.lat, newNode.lng));
      }
    }

    onUpdate([...project.nodes, newNode]);
    showToast(`Ponto ${nextId} adicionado.`);
    setIsAddModalOpen(false);
    setNewNodeCoords({ lat: '', lng: '' });
  };

  const updateNodeField = useCallback((nodeId: string, field: string, value: any) => {
    if (field === 'id' && project.nodes.some(n => n.id === value && n.id !== nodeId)) {
      showToast('O ID informado já pertence a outro trecho.', 'error');
      return;
    }

    const newNodes = project.nodes.map(node => {
      if (field === 'id' && node.parentId === nodeId) return { ...node, parentId: value };
      if (node.id === nodeId) {
        if (node.id === 'TRAFO' && ['id', 'parentId', 'meters'].includes(field)) return node;
        const updatedNode = { ...node };
        if (field in updatedNode.loads) updatedNode.loads = { ...updatedNode.loads, [field as keyof NetworkNode['loads']]: value };
        else (updatedNode as any)[field] = value;
        return updatedNode;
      }
      return node;
    });
    onUpdate(newNodes);
  }, [project.nodes, onUpdate, showToast]);

  const removeNode = useCallback((nodeId: string) => {
    if(confirm(`Confirmar exclusão do ponto ${nodeId}?`)) {
       onUpdate(project.nodes.filter(n => n.id !== nodeId));
       showToast(`Ponto ${nodeId} removido.`);
    }
  }, [project.nodes, onUpdate, showToast]);

  const filteredNodes = useMemo(() => project.nodes.filter(n => 
    n.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.parentId.toLowerCase().includes(searchTerm.toLowerCase())
  ), [project.nodes, searchTerm]);

  const paginatedNodes = useMemo(() => filteredNodes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredNodes, currentPage, itemsPerPage]);

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500 pb-12 relative">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 p-6 rounded-[32px] border border-white/60 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">Gestão de Topologia</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Dimensionamento e controle de ativos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleRecalculateClick} 
            disabled={isRecalculating}
            className={`px-6 py-3 rounded-2xl font-black shadow-lg transition-all text-[10px] uppercase tracking-widest flex items-center gap-2 ${isRecalculating ? 'bg-blue-100 text-blue-400' : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-50'}`}
            title="Sincronizar motor de cálculo manualmente"
          >
            <span className={isRecalculating ? 'animate-spin' : ''}>🔄</span> {isRecalculating ? 'Sincronizando...' : 'Recalcular'}
          </button>
          <button onClick={() => setShowTopology(!showTopology)} className={`px-6 py-3 rounded-2xl font-black shadow-lg transition-all text-[10px] uppercase tracking-widest ${showTopology ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}`}>
            {showTopology ? 'Ocultar Diagrama' : 'Ver Unifilar'}
          </button>
          <button onClick={handleOptimizeClick} disabled={isOptimizing} className={`px-6 py-3 rounded-2xl font-black shadow-lg transition-all text-[10px] uppercase tracking-widest ${isOptimizing ? 'bg-orange-500 text-white animate-pulse' : 'bg-white text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100'}`}>
            {isOptimizing ? 'Otimizando...' : 'Auto-Dimensionar'}
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-[#004a80] text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:scale-[1.03] transition-all text-[10px] uppercase tracking-widest">+ Novo Ponto</button>
        </div>
      </header>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-blue-900/5">
          <div className="glass-dark p-10 rounded-[40px] shadow-2xl border border-white/80 w-full max-w-md animate-in zoom-in-95">
             <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-6">Novo Ponto na Rede</h3>
             <div className="flex flex-col gap-4">
                <p className="text-xs text-gray-500 font-medium">Deseja informar coordenadas geográficas para sincronização com o GIS?</p>
                <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Latitude</label>
                      <input className="bg-white border border-gray-100 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-blue-400" placeholder="-22.90..." value={newNodeCoords.lat} onChange={e => setNewNodeCoords({...newNodeCoords, lat: e.target.value})} />
                   </div>
                   <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Longitude</label>
                      <input className="bg-white border border-gray-100 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-blue-400" placeholder="-43.17..." value={newNodeCoords.lng} onChange={e => setNewNodeCoords({...newNodeCoords, lng: e.target.value})} />
                   </div>
                </div>
                <div className="flex gap-3 mt-4">
                   <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-xl">Cancelar</button>
                   <button onClick={confirmAddNode} className="flex-2 px-8 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg">Confirmar Inclusão</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {showTopology && <div className="animate-in slide-in-from-top-4 duration-500"><UnifilarDiagram nodes={project.nodes} result={result!} cables={project.cables} /></div>}

      {/* Bloco de Gestão do Transformador - Layout Conforme Sketch */}
      <div className="bg-white/60 p-8 rounded-[32px] border border-white/80 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
          <div className="flex flex-col gap-1.5"><label className="text-[9px] font-black text-blue-600 uppercase ml-1">Trafo (kVA)</label>
            <select className="bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-black" value={project.params.trafoKva} onChange={(e) => onUpdateParams({...project.params, trafoKva: Number(e.target.value)})}>
              {[15, 30, 45, 75, 112.5, 150, 225, 300].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5"><label className="text-[9px] font-black text-blue-600 uppercase ml-1">Normativa</label>
            <select className="bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-black" value={project.params.normativeTable} onChange={(e) => onUpdateParams({...project.params, normativeTable: e.target.value})}>
              {Object.keys(DMDI_TABLES).map(norm => <option key={norm} value={norm}>{norm}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5"><label className="text-[9px] font-black text-blue-600 uppercase ml-1">Perfil</label>
            <select className="bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-black" value={project.params.profile} onChange={(e) => onUpdateParams({...project.params, profile: e.target.value})}>
              {Object.keys(PROFILES).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5"><label className="text-[9px] font-black text-blue-600 uppercase ml-1">Classe DMDI</label>
            <select className="bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-black" value={project.params.manualClass} onChange={(e) => onUpdateParams({...project.params, manualClass: e.target.value as any})}>
              <option value="A">Classe A</option><option value="B">Classe B</option><option value="C">Classe C</option><option value="D">Classe D</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 justify-end">
             <button 
                onClick={() => onUpdateParams({...project.params, includeGdInQt: !project.params.includeGdInQt})}
                className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border-2 ${project.params.includeGdInQt ? 'bg-orange-500 border-orange-600 text-white shadow-lg animate-pulse' : 'bg-white border-blue-100 text-blue-400 hover:border-blue-400 hover:text-blue-600'}`}
             >
                {project.params.includeGdInQt ? 'GD no Cálculo: ATIVO' : 'GD no Cálculo: INATIVO'}
             </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-blue-50">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ativos Conectados</span>
            <span className="text-[28px] font-black text-[#004a80] leading-none mt-1">{project.nodes.length} <span className="text-xs uppercase text-blue-300">unid</span></span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">DMDI Diversificada</span>
            <div className="flex flex-col items-center">
                <span className="text-[28px] font-black text-blue-600 leading-none mt-1">{(result?.kpis.diversifiedLoad || 0).toFixed(2)} <span className="text-xs uppercase text-blue-300">kVA</span></span>
                <span className="text-[9px] font-black text-blue-300 uppercase mt-1 tracking-widest">Degrau: {(result?.kpis.globalDmdiFactor || 0).toFixed(2)} kVA/un</span>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ocupação do Trafo</span>
            <span className={`text-[28px] font-black leading-none mt-1 ${(result?.kpis.trafoOccupation || 0) > 100 ? 'text-red-600 animate-pulse' : 'text-[#004a80]'}`}>{(result?.kpis.trafoOccupation || 0).toFixed(2)} %</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white/40 rounded-[32px] border border-white/50 shadow-2xl relative">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="bg-[#f8faff]/50 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-white/20">
            <tr><th className="px-6 py-6">ID PONTO</th><th className="px-6 py-6 text-center">MONTANTE</th><th className="px-4 py-6 text-center">METROS</th><th className="px-6 py-6">CONDUTOR</th><th className="px-6 py-6 text-center bg-blue-50/10">DIVERSIFICADOS</th><th className="px-6 py-6 text-center bg-yellow-50/10">SOLAR</th><th className="px-6 py-6 text-center bg-indigo-50/10">CARGA ESP.</th><th className="px-6 py-6 text-center bg-orange-50/10">IP PUB.</th><th className="px-6 py-6 text-center text-[#004a80]">CARGA (A)</th><th className="px-6 py-6 text-center">CQT %</th><th className="px-4 py-6"></th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {paginatedNodes.map((node) => (
              <EditorRow key={node.id} node={node} resNode={calculatedNodes?.find(n => n.id === node.id)} isTrafo={node.id === 'TRAFO'} isChanged={changedNodeIds.has(node.id)} cables={project.cables} ipTypes={project.ipTypes} profile={project.params.profile} onUpdateField={updateNodeField} onRemove={removeNode} />
            ))}
          </tbody>
        </table>
        {filteredNodes.length > itemsPerPage && (
          <div className="flex justify-center p-6 bg-white/30 gap-2 border-t border-white/20">
            {Array.from({ length: Math.ceil(filteredNodes.length / itemsPerPage) }).map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg font-black text-[10px] transition-all ${currentPage === i + 1 ? 'bg-[#004a80] text-white' : 'bg-white text-gray-400 hover:bg-blue-50'}`}>{i + 1}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectEditor;
