
import React, { useState, useMemo, useCallback } from 'react';
import { Project, NetworkNode, Scenario, ProjectParams, EngineResult } from '../types';
import { DMDI_TABLES, PROFILES } from '../constants';
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
  rowIndex: number;
}

const EditorRow: React.FC<EditorRowProps> = React.memo(({ 
  node, resNode, isTrafo, isChanged, cables, ipTypes, profile, onUpdateField, onRemove, rowIndex 
}) => {
  const cableData = cables[node.cable];
  const isOverloaded = !isTrafo && (resNode?.calculatedLoad || 0) > (cableData?.ampacity || 0);
  const profileData = (PROFILES as any)[profile] || PROFILES["Massivos"];
  const isCriticalCqt = !isTrafo && (resNode?.accumulatedCqt ?? 0) > profileData.cqtMax;
  
  const hasActiveReverseFlow = !isTrafo && (resNode?.netCurrentDay || 0) < -0.5;
  const isHighVoltageRise = !isTrafo && (resNode?.solarVoltageRise || 0) > 5;

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
    const num = parseInt(val.replace(/[^\d]/g, ''), 10);
    onUpdateField(node.id, field, isNaN(num) ? 0 : num);
  };

  const handleKeyDown = (e: React.KeyboardEvent, col: number) => {
    const move = (r: number, c: number) => {
      const next = document.querySelector(`[data-row="${r}"][data-col="${c}"]`) as HTMLElement;
      if (next) {
        e.preventDefault();
        next.focus();
        if (next instanceof HTMLInputElement) next.select();
      }
    };

    switch (e.key) {
      case 'ArrowUp': move(rowIndex - 1, col); break;
      case 'ArrowDown': case 'Enter': move(rowIndex + 1, col); break;
      case 'ArrowLeft': move(rowIndex, col - 1); break;
      case 'ArrowRight': move(rowIndex, col + 1); break;
      case 'Home': move(rowIndex, 0); break;
      case 'End': move(rowIndex, 12); break;
    }
  };

  return (
    <tr className={`hover:bg-blue-50/30 transition-all group border-b border-gray-100 transition-colors
      ${isTrafo ? 'bg-blue-50/10' : ''} 
      ${isOverloaded || isCriticalCqt ? 'bg-red-50/20' : ''}`}>
      
      <td className="px-6 py-4 min-w-[140px] relative">
        {hasActiveReverseFlow && (
          <span className="absolute left-1 top-1 text-[8px] animate-pulse">🔄</span>
        )}
        {isTrafo ? (
          <div className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black uppercase shadow-md text-center">
            {node.id}
          </div>
        ) : (
          <input 
            data-row={rowIndex} data-col={0}
            className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all" 
            value={node.id} 
            onChange={e => onUpdateField(node.id, 'id', e.target.value.toUpperCase())}
            onKeyDown={e => handleKeyDown(e, 0)}
          />
        )}
      </td>

      <td className="px-6 py-4">
        {!isTrafo && (
          <input 
            data-row={rowIndex} data-col={1}
            className="w-full bg-white/50 border border-gray-100 px-3 py-2 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-400" 
            value={node.parentId} 
            onChange={e => onUpdateField(node.id, 'parentId', e.target.value.toUpperCase())}
            onKeyDown={e => handleKeyDown(e, 1)}
          />
        )}
      </td>

      <td className="px-4 py-4">
        {!isTrafo && (
          <input 
            data-row={rowIndex} data-col={2}
            className="w-full bg-transparent text-center text-xs font-bold border-b-2 border-gray-100 focus:border-blue-500 outline-none" 
            value={localMeters} 
            onChange={e => setLocalMeters(e.target.value)}
            onBlur={handleMetersBlur}
            onKeyDown={e => handleKeyDown(e, 2)}
          />
        )}
      </td>

      <td className="px-6 py-4">
        {!isTrafo && (
          <select 
            data-row={rowIndex} data-col={3}
            className={`w-full bg-white/60 px-3 py-2 rounded-xl text-[10px] font-black border transition-all focus:border-blue-500 outline-none
                ${isChanged ? 'border-blue-500 shadow-lg shadow-blue-50 ring-2 ring-blue-200' : 'border-gray-100'}`} 
            value={node.cable} 
            onChange={e => onUpdateField(node.id, 'cable', e.target.value)}
            onKeyDown={e => handleKeyDown(e, 3)}
          >
            {Object.keys(cables).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </td>

      <td className="px-4 py-4 bg-blue-50/5">
        <div className="flex gap-1 justify-center">
          {[{k: 'mono', c: 4}, {k: 'bi', c: 5}, {k: 'tri', c: 6}].map(item => (
            <input 
              key={item.k} data-row={rowIndex} data-col={item.c}
              className="w-9 h-9 rounded-lg border border-gray-100 bg-white text-center text-[11px] font-black text-blue-600 focus:ring-2 focus:ring-blue-100 outline-none" 
              value={node.loads[item.k as keyof typeof node.loads]} 
              onChange={e => handleIntChange(item.k, e.target.value)} 
              onKeyDown={e => handleKeyDown(e, item.c)}
            />
          ))}
        </div>
      </td>

      <td className="px-4 py-4 bg-orange-50/5">
        <div className="flex gap-1 justify-center">
            <input 
              data-row={rowIndex} data-col={7}
              className="w-9 h-9 rounded-lg border border-orange-100 bg-white text-center text-[11px] font-black text-orange-600 outline-none" 
              value={node.loads.solarQty} onChange={e => handleIntChange('solarQty', e.target.value)} 
              onKeyDown={e => handleKeyDown(e, 7)}
            />
            <input 
              data-row={rowIndex} data-col={8}
              className="w-14 h-9 rounded-lg border border-orange-100 bg-white text-center text-[11px] font-black text-orange-600 outline-none" 
              value={localSolarKva} 
              onChange={e => setLocalSolarKva(e.target.value)}
              onBlur={handleSolarBlur}
              onKeyDown={e => handleKeyDown(e, 8)}
            />
        </div>
      </td>

      <td className="px-4 py-4 bg-indigo-50/5">
        <div className="flex gap-1 justify-center">
            <input 
              data-row={rowIndex} data-col={9}
              className="w-9 h-9 rounded-lg border border-indigo-100 bg-white text-center text-[11px] font-black text-indigo-600 outline-none" 
              value={node.loads.pointQty} onChange={e => handleIntChange('pointQty', e.target.value)} 
              onKeyDown={e => handleKeyDown(e, 9)}
            />
            <input 
              data-row={rowIndex} data-col={10}
              className="w-14 h-9 rounded-lg border border-indigo-100 bg-white text-center text-[11px] font-black text-indigo-600 outline-none" 
              value={localPointKva} 
              onChange={e => setLocalPointKva(e.target.value)}
              onBlur={handlePointKvaBlur}
              onKeyDown={e => handleKeyDown(e, 10)}
            />
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex gap-1 justify-center">
          <select 
            data-row={rowIndex} data-col={11}
            className="bg-white border border-gray-100 rounded-lg px-1 py-1 text-[9px] font-black text-gray-600 outline-none" 
            value={node.loads.ipType} 
            onChange={e => onUpdateField(node.id, 'ipType', e.target.value)}
            onKeyDown={e => handleKeyDown(e, 11)}
          >
            {Object.keys(ipTypes).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input 
            data-row={rowIndex} data-col={12}
            className="w-8 h-8 rounded-lg border border-gray-100 bg-white text-center text-[10px] font-black outline-none" 
            value={node.loads.ipQty} onChange={e => handleIntChange('ipQty', e.target.value)} 
            onKeyDown={e => handleKeyDown(e, 12)}
          />
        </div>
      </td>

      <td className="px-6 py-4 text-center">
        <div className={`inline-flex px-3 py-1 rounded-full font-black text-[10px] shadow-sm 
          ${isOverloaded ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-50 text-blue-700'}`}>
          {(resNode?.calculatedLoad || 0).toFixed(1)}A
        </div>
      </td>

      <td className="px-6 py-4 text-center">
        <div className={`inline-flex flex-col px-3 py-1 rounded-full font-black text-[10px]
          ${isHighVoltageRise ? 'bg-orange-600 text-white' : 
            isCriticalCqt ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-green-50 text-green-700'}`}>
          <span>{(resNode?.accumulatedCqt ?? 0).toFixed(2)}%</span>
        </div>
      </td>

      <td className="px-4 py-4 text-right">
        {!isTrafo && (
          <button onClick={() => onRemove(node.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 text-lg">✕</button>
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
  onRecalculate: () => void;
  calculatedNodes: NetworkNode[];
  result: EngineResult;
}

const ProjectEditor: React.FC<ProjectEditorProps> = ({ 
  project, onUpdate, onUpdateParams, onOptimize, onRecalculate, calculatedNodes, result 
}) => {
  const { showToast } = useToast();
  const [view, setView] = useState<'table' | 'diagram'>('table');

  const handleUpdateField = useCallback((nodeId: string, field: string, value: any) => {
    const newNodes = project.nodes.map(n => {
      if (n.id === nodeId) {
        if (['mono', 'bi', 'tri', 'pointQty', 'pointKva', 'ipType', 'ipQty', 'solarKva', 'solarQty'].includes(field)) {
          return { ...n, loads: { ...n.loads, [field]: value } };
        }
        return { ...n, [field]: value };
      }
      return n;
    });
    onUpdate(newNodes);
  }, [project.nodes, onUpdate]);

  const handleRemove = useCallback((nodeId: string) => {
    onUpdate(project.nodes.filter(n => n.id !== nodeId));
    showToast(`Ponto ${nodeId} removido.`);
  }, [project.nodes, onUpdate, showToast]);

  const handleAddNode = () => {
    const nextId = (Math.max(...project.nodes.map(n => parseInt(n.id) || 0)) + 1).toString();
    const parentId = project.nodes[project.nodes.length - 1].id;
    const newNode: NetworkNode = {
      id: nextId,
      parentId,
      meters: 30,
      cable: project.nodes[0].cable,
      loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 }
    };
    onUpdate([...project.nodes, newNode]);
    showToast(`Ponto ${nextId} adicionado.`);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 p-6 rounded-[32px] border border-white/60">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase leading-none">Editor de Topologia</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Gestão de ativos e fluxos de carga em tempo real</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onOptimize} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Dimensionar Cabos</button>
          <button onClick={handleAddNode} className="px-6 py-3 bg-[#004a80] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">+ Novo Poste</button>
        </div>
      </header>

      <div className="flex gap-2 p-1.5 bg-white/40 w-fit rounded-2xl border border-white/60">
        <button onClick={() => setView('table')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'table' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}>Tabela de Carga</button>
        <button onClick={() => setView('diagram')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'diagram' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}>Diagrama Unifilar</button>
      </div>

      {view === 'table' ? (
        <div className="overflow-x-auto glass border border-white/60 rounded-[32px] shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-white/80">
                <th className="px-6 py-6">ID Ponto</th>
                <th className="px-6 py-6">Pai</th>
                <th className="px-4 py-6 text-center">Vão (m)</th>
                <th className="px-6 py-6">Condutor</th>
                <th className="px-4 py-6 text-center bg-blue-50/20">Residencial</th>
                <th className="px-4 py-6 text-center bg-orange-50/20">GD Solar</th>
                <th className="px-4 py-6 text-center bg-indigo-50/20">Pontuais</th>
                <th className="px-4 py-6 text-center">Ilum. Pública</th>
                <th className="px-6 py-6 text-center">Corrente</th>
                <th className="px-6 py-6 text-center">CQT / ΔV</th>
                <th className="px-4 py-6"></th>
              </tr>
            </thead>
            <tbody>
              {project.nodes.map((node, i) => (
                <EditorRow 
                  key={node.id}
                  node={node}
                  rowIndex={i}
                  resNode={calculatedNodes.find(rn => rn.id === node.id)}
                  isTrafo={node.id === 'TRAFO'}
                  cables={project.cables}
                  ipTypes={project.ipTypes}
                  profile={project.params.profile}
                  onUpdateField={handleUpdateField}
                  onRemove={handleRemove}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[700px]">
          <UnifilarDiagram 
            interactive
            nodes={project.nodes}
            result={result}
            cables={project.cables}
            onUpdateNode={handleUpdateField}
            onRemoveNode={handleRemove}
            ipTypes={project.ipTypes}
          />
        </div>
      )}
    </div>
  );
};

export default ProjectEditor;
