
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Project, NetworkNode } from '../types';
import UnifilarDiagram from './UnifilarDiagram';
import { useToast } from '../context/ToastContext.tsx';
import { useProject } from '../context/ProjectContext';

const FALLBACK_PROFILES: Record<string, { cqtMax: number; loadMax: number }> = {
  "Urbano Padrão": { cqtMax: 5.0, loadMax: 100 },
  "Rural": { cqtMax: 10.0, loadMax: 100 },
  "Massivos": { cqtMax: 6.0, loadMax: 120 },
};

interface EditorRowProps {
  node: NetworkNode;
  resNode?: NetworkNode;
  isTrafo: boolean;
  isChanged?: boolean;
  availableParentIds: string[];
  cables: Project['cables'];
  ipTypes: Project['ipTypes'];
  profile: string;
  profiles?: Record<string, any> | null;
  onUpdateField: (nodeId: string, field: string, value: any) => void;
  onRemove: (nodeId: string) => void;
  rowIndex: number;
}

const EditorRow: React.FC<EditorRowProps> = React.memo(({ 
  node, resNode, isTrafo, isChanged, availableParentIds, cables, ipTypes, profile, profiles, onUpdateField, onRemove, rowIndex 
}) => {
  const cableData = cables[node.cable];
  const isOverloaded = !isTrafo && (resNode?.calculatedLoad || 0) > (cableData?.ampacity || 0);
  const profileData = (profiles as any)?.[profile] || (FALLBACK_PROFILES as any)[profile] || FALLBACK_PROFILES["Massivos"];
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
            aria-label="ID do ponto"
            title="ID do ponto"
            className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all" 
            value={node.id} 
            onChange={e => onUpdateField(node.id, 'id', e.target.value.toUpperCase())}
            onKeyDown={e => handleKeyDown(e, 0)}
          />
        )}
      </td>

      <td className="px-6 py-4 min-w-[240px]">
        {!isTrafo && (
          <select
            data-row={rowIndex} data-col={1}
            aria-label="ID do pai"
            title={`Pai atual: ${node.parentId || '—'} (obrigatório)`}
            className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-black uppercase text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            value={availableParentIds.includes(node.parentId) ? node.parentId : 'TRAFO'}
            onChange={e => onUpdateField(node.id, 'parentId', e.target.value.toUpperCase())}
            onKeyDown={e => handleKeyDown(e, 1)}
          >
            {availableParentIds.map((pid) => (
              <option key={pid} value={pid}>{pid}</option>
            ))}
          </select>
        )}
      </td>

      <td className="px-4 py-4">
        {!isTrafo && (
          <input 
            data-row={rowIndex} data-col={2}
            aria-label="Vão em metros"
            title="Vão em metros"
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
            aria-label="Condutor"
            title="Condutor"
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
              aria-label={`Residencial ${item.k}`}
              title={`Residencial ${item.k}`}
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
              aria-label="Quantidade de GD Solar"
              title="Quantidade de GD Solar"
              className="w-9 h-9 rounded-lg border border-orange-100 bg-white text-center text-[11px] font-black text-orange-600 outline-none" 
              value={node.loads.solarQty} onChange={e => handleIntChange('solarQty', e.target.value)} 
              onKeyDown={e => handleKeyDown(e, 7)}
            />
            <input 
              data-row={rowIndex} data-col={8}
              aria-label="Potência Solar (kVA)"
              title="Potência Solar (kVA)"
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
              aria-label="Quantidade de cargas pontuais"
              title="Quantidade de cargas pontuais"
              className="w-9 h-9 rounded-lg border border-indigo-100 bg-white text-center text-[11px] font-black text-indigo-600 outline-none" 
              value={node.loads.pointQty} onChange={e => handleIntChange('pointQty', e.target.value)} 
              onKeyDown={e => handleKeyDown(e, 9)}
            />
            <input 
              data-row={rowIndex} data-col={10}
              aria-label="Potência pontual (kVA)"
              title="Potência pontual (kVA)"
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
            aria-label="Tipo de Iluminação Pública"
            title="Tipo de Iluminação Pública"
            className="bg-white border border-gray-100 rounded-lg px-1 py-1 text-[9px] font-black text-gray-600 outline-none" 
            value={node.loads.ipType} 
            onChange={e => onUpdateField(node.id, 'ipType', e.target.value)}
            onKeyDown={e => handleKeyDown(e, 11)}
          >
            {Object.keys(ipTypes).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input 
            data-row={rowIndex} data-col={12}
            aria-label="Quantidade de Iluminação Pública"
            title="Quantidade de Iluminação Pública"
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

const ProjectEditor: React.FC = () => {
  const { showToast } = useToast();
  const { project, activeScenario, updateActiveScenario, optimizeActive, forceRecalculate, activeResult, activeCalcError, isCalculating, backendConstants } = useProject();

  if (!project || !activeScenario) {
    return <div className="p-8 text-center animate-pulse text-[10px] font-black uppercase text-blue-500">Carregando Editor...</div>;
  }
  const currentProjectAndScenario = { ...project, ...activeScenario };
  const calculatedNodes = activeResult?.nodes || [];
  const [view, setView] = useState<'table' | 'diagram'>('table');
  const warnedFixRef = useRef(false);

  const parentOptions = useMemo(() => {
    // Todo nó precisa de um pai, exceto o TRAFO.
    // Para editar o pai, listamos TRAFO + todos os demais IDs existentes.
    const ids = currentProjectAndScenario.nodes
      .map((n) => String(n.id || '').trim().toUpperCase())
      .filter(Boolean);
    const unique = Array.from(new Set(ids));
    // Garante TRAFO como primeira opção
    const rest = unique.filter((id) => id !== 'TRAFO').sort();
    return ['TRAFO', ...rest];
  }, [currentProjectAndScenario.nodes]);

  // Enforce: todo nó precisa de um pai (exceto TRAFO). Também normaliza para uppercase.
  useEffect(() => {
    const nodes = currentProjectAndScenario.nodes;
    const ids = new Set(nodes.map((n) => String(n.id || '').trim().toUpperCase()).filter(Boolean));

    let changed = false;
    const fixed = nodes.map((n) => {
      const id = String(n.id || '').trim().toUpperCase();
      if (id === 'TRAFO') {
        if (n.parentId !== '') changed = true;
        return { ...n, id, parentId: '' };
      }

      const parentId = String(n.parentId || '').trim().toUpperCase();
      if (!parentId || parentId === id || !ids.has(parentId)) {
        changed = true;
        return { ...n, id, parentId: 'TRAFO' };
      }
      // normaliza parentId
      if (parentId !== n.parentId) changed = true;
      if (id !== n.id) changed = true;
      return { ...n, id, parentId };
    });

    if (changed) {
      updateActiveScenario({ nodes: fixed });
      if (!warnedFixRef.current) {
        warnedFixRef.current = true;
        showToast('Alguns nós estavam sem pai válido; foram atribuídos ao TRAFO. Revise os montantes se necessário.', 'warning');
      }
    }
  }, [currentProjectAndScenario.nodes, updateActiveScenario, showToast]);

  const handleUpdateField = useCallback((nodeId: string, field: string, value: any) => {
    const newNodes = currentProjectAndScenario.nodes.map(n => {
      if (n.id === nodeId) {
        if (['mono', 'bi', 'tri', 'pointQty', 'pointKva', 'ipType', 'ipQty', 'solarKva', 'solarQty'].includes(field)) {
          return { ...n, loads: { ...n.loads, [field]: value } };
        }
        return { ...n, [field]: value };
      }
      return n;
    });
    updateActiveScenario({ nodes: newNodes });
  }, [currentProjectAndScenario.nodes, updateActiveScenario]);

  const handleRemove = useCallback((nodeId: string) => {
    updateActiveScenario({ nodes: currentProjectAndScenario.nodes.filter(n => n.id !== nodeId) });
    showToast(`Ponto ${nodeId} removido.`);
  }, [currentProjectAndScenario.nodes, updateActiveScenario, showToast]);

  const handleAddNode = () => {
    const allNodes = currentProjectAndScenario.nodes;
    let maxNumericId = 0;
    allNodes.forEach(n => {
        const numericId = parseInt(n.id.replace(/[^0-9]/g, ''));
        if (!isNaN(numericId) && numericId > maxNumericId) {
            maxNumericId = numericId;
        }
    });
    const nextId = `P-${maxNumericId + 1}`;

    // Pai padrão: último nó com ID válido; fallback: TRAFO.
    const lastWithId = [...allNodes]
      .reverse()
      .map((n) => String(n.id || '').trim().toUpperCase())
      .find((id) => id.length > 0) || 'TRAFO';

    const parentId = lastWithId === nextId ? 'TRAFO' : lastWithId;
    if (nextId !== 'TRAFO' && (!parentId || parentId === '')) {
      showToast("Todo nó precisa de um pai (exceto TRAFO).", "error");
      return;
    }

    const newNode: NetworkNode = {
      id: nextId,
      parentId: parentId || 'TRAFO',
      meters: 30,
      cable: allNodes.length > 0 ? allNodes[0].cable : Object.keys(project.cables)[0],
      loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 }
    };

    updateActiveScenario({ nodes: [...allNodes, newNode] });
    showToast(`Ponto ${nextId} adicionado.`);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      {activeCalcError && (
        <div className="glass p-5 rounded-[28px] border border-orange-200 bg-orange-50/40 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">Cálculo indisponível</span>
            <span className="text-[10px] font-bold text-gray-600">{activeCalcError}</span>
          </div>
          <button
            onClick={forceRecalculate}
            disabled={isCalculating}
            className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            Recalcular
          </button>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 p-6 rounded-[32px] border border-white/60">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase leading-none">Editor de Topologia</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Gestão de ativos e fluxos de carga em tempo real</p>
        </div>
        <div className="flex gap-3">
          <button onClick={optimizeActive} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Dimensionar Cabos</button>
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
              {currentProjectAndScenario.nodes.map((node, i) => (
                <EditorRow 
                  key={node.id}
                  node={node}
                  rowIndex={i}
                  resNode={calculatedNodes.find(rn => rn.id === node.id)}
                  isTrafo={node.id === 'TRAFO'}
                  availableParentIds={parentOptions.filter((pid) => pid !== node.id)}
                  cables={currentProjectAndScenario.cables}
                  ipTypes={currentProjectAndScenario.ipTypes}
                  profile={currentProjectAndScenario.params.profile}
                  profiles={(backendConstants as any)?.profiles || null}
                  onUpdateField={handleUpdateField}
                  onRemove={handleRemove}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[700px]">
          {activeResult ? (
            <UnifilarDiagram 
              interactive
              nodes={currentProjectAndScenario.nodes}
              result={activeResult}
              cables={currentProjectAndScenario.cables}
              onUpdateNode={handleUpdateField}
              onRemoveNode={handleRemove}
              ipTypes={currentProjectAndScenario.ipTypes}
            />
          ) : (
            <div className="h-full flex items-center justify-center glass rounded-[32px] border border-white/60">
              <div className="text-center">
                <div className="text-3xl mb-4">📉</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Diagrama indisponível sem cálculo</p>
                <button
                  onClick={forceRecalculate}
                  className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                >
                  Recalcular
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectEditor;
