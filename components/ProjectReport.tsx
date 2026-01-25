
import React, { useState } from 'react';
import { Project, Scenario, EngineResult } from '../types';
import UnifilarDiagram from './UnifilarDiagram';
import { useToast } from '../context/ToastContext.tsx';
import { useProject } from '../context/ProjectContext';

const LogoReportIM3 = () => (
  <div className="flex items-center font-bold text-[#003399] select-none">
    <span className="text-4xl relative">
      i
      <span className="absolute -top-1 left-1 w-2.5 h-2.5 bg-[#8cc63f] rounded-full"></span>
    </span>
    <span className="text-4xl">m3</span>
    <div className="ml-2 flex flex-col">
      <span className="text-[#8cc63f] font-black text-[10px] tracking-[0.2em] leading-none">BRASIL</span>
      <span className="text-[#003399] font-medium text-[8px] uppercase tracking-tighter">Engenharia Digital</span>
    </div>
  </div>
);

const ProjectReport: React.FC = () => {
  const { project, activeScenario, activeResult: result, allResults } = useProject();

  if (!project || !activeScenario || !result || !allResults) {
    return <div className="p-8 text-center animate-pulse text-[10px] font-black uppercase text-blue-500">Carregando Relatório...</div>;
  }
  const { showToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const { metadata, reportConfig } = project;
  
  const cableQuantities = React.useMemo(() => {
    const qtys: Record<string, number> = {};
    activeScenario.nodes.forEach(n => {
      if (n.id !== 'TRAFO') {
        qtys[n.cable] = (qtys[n.cable] || 0) + n.meters;
      }
    });
    return qtys;
  }, [activeScenario.nodes]);

  const handleGeneratePDF = async () => {
    const element = document.getElementById('report-document');
    if (!element) return;

    setIsGenerating(true);
    showToast("Iniciando geração do PDF...", "info");

    const opt = {
      margin: 10,
      filename: `Memorial_SOB_${metadata.sob || 'Rede'}_${activeScenario.name}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // html2pdf.js via bundle (evita depender de CDN e evita bloqueio por CSP)
      const mod: any = await import('html2pdf.js');
      const html2pdf = mod?.default || mod;
      await html2pdf().set(opt).from(element).save();
      showToast("Memorial gerado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      showToast("Falha ao exportar PDF. Verifique os dados.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center bg-white/40 p-6 rounded-[32px] border border-white/60 print:hidden">
        <div>
           <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">Exportação de Documentos</h4>
           <p className="text-[10px] text-gray-500 font-medium">Gere o memorial descritivo completo em formato PDF padrão A4.</p>
        </div>
        <button 
          onClick={handleGeneratePDF} 
          disabled={isGenerating}
          className={`bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl flex items-center gap-3 transition-all ${isGenerating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700 hover:scale-[1.02]'}`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Processando...</span>
            </>
          ) : (
            <>
              <span>📄</span> Gerar PDF (Download)
            </>
          )}
        </button>
      </div>

      <div id="report-document" className="bg-white shadow-2xl rounded-sm text-gray-800 print:shadow-none overflow-hidden">
        <div className="p-12 min-h-[1120px] flex flex-col">
          <header className="border-b-2 border-blue-600 pb-8 mb-8 flex justify-between items-start">
            <div className="flex items-center gap-6">
              <LogoReportIM3 />
              <div className="h-12 w-px bg-gray-200"></div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-gray-700 uppercase tracking-tight">Memorial Descritivo Técnico</h2>
              <p className="text-xs text-gray-500 font-bold">SOB: {metadata.sob || '---'}</p>
              <p className="text-xs text-gray-400 mt-1">Gerado em: {currentDate}</p>
            </div>
          </header>

          {/* 1. Identificação */}
          <section className="mb-10">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 border-l-4 border-blue-600 pl-3">1. Identificação do Estudo</h3>
            <div className="grid grid-cols-2 gap-y-4 bg-gray-50 p-6 rounded-lg">
               <div className="col-span-2"><p className="text-[10px] text-gray-400 font-bold uppercase">Cliente / Interessado</p><p className="text-sm font-bold text-gray-800">{metadata.client || '---'}</p></div>
               <div><p className="text-[10px] text-gray-400 font-bold uppercase">Endereço da Obra</p><p className="text-xs font-bold text-gray-700">{metadata.address || '---'}</p></div>
               <div><p className="text-[10px] text-gray-400 font-bold uppercase">Localidade</p><p className="text-xs font-bold text-gray-700">{metadata.district} - {metadata.city}</p></div>
            </div>
          </section>

          {reportConfig.showJustification && (
            <section className="mb-10">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 border-l-4 border-blue-600 pl-3">2. Justificativa de Engenharia</h3>
              <p className="text-sm leading-relaxed text-gray-700 italic">
                O presente memorial detalha o dimensionamento da rede BT para a SOB <strong>{metadata.sob}</strong>. 
                As simulações utilizam o motor <strong>Theseus 3.1</strong> e perfil de carga <strong>{activeScenario.params.profile}</strong> no cenário <strong>{activeScenario.name}</strong>. 
                Foi observada uma queda de tensão máxima de <strong>{result.kpis.maxCqt.toFixed(2)}%</strong> e ocupação de transformador de <strong>{result.kpis.trafoOccupation.toFixed(1)}%</strong>.
              </p>
            </section>
          )}

          {reportConfig.showUnifilar && (
            <section className="mb-10">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 border-l-4 border-blue-600 pl-3">3. Diagrama Unifilar do Projeto</h3>
              <div className="p-4 border border-gray-100 rounded-xl bg-white">
                 <UnifilarDiagram nodes={activeScenario.nodes} result={result} cables={project.cables} />
              </div>
            </section>
          )}

          {reportConfig.showKpis && (
            <section className="mb-10">
               <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 border-l-4 border-blue-600 pl-3">4. Resultados Consolidados</h3>
               <div className="grid grid-cols-3 gap-4">
                  <div className="border border-gray-200 p-4 rounded-lg text-center bg-white"><p className="text-[9px] font-bold text-gray-400 uppercase">Demanda Calculada</p><p className="text-lg font-black">{result.kpis.totalLoad.toFixed(2)} kVA</p></div>
                  <div className="border border-gray-200 p-4 rounded-lg text-center bg-white"><p className="text-[9px] font-bold text-gray-400 uppercase">Queda de Tensão Máx.</p><p className="text-lg font-black">{result.kpis.maxCqt.toFixed(2)}%</p></div>
                  <div className="border border-gray-200 p-4 rounded-lg text-center bg-white"><p className="text-[9px] font-bold text-gray-400 uppercase">Carregamento Trafo</p><p className="text-lg font-black">{result.kpis.trafoOccupation.toFixed(1)}%</p></div>
               </div>
            </section>
          )}

          {/* 6. Resumo Comparativo de Cenários (Apenas Resumo) */}
          {reportConfig.showComparison && (
             <section className="mb-10">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 border-l-4 border-blue-600 pl-3">5. Resumo Comparativo de Cenários</h3>
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                   <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-[9px] font-black text-gray-500 uppercase">Cenário</th>
                          <th className="px-4 py-3 text-[9px] font-black text-gray-500 uppercase text-center">Máx. CQT (%)</th>
                          <th className="px-4 py-3 text-[9px] font-black text-gray-500 uppercase text-center">Ocup. Trafo (%)</th>
                          <th className="px-4 py-3 text-[9px] font-black text-gray-500 uppercase text-center">Demanda (kVA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {project.scenarios.map(s => {
                           const res = allResults[s.id];
                           const isActive = s.id === activeScenario.id;
                           if (!res) return null;
                           return (
                             <tr key={s.id} className={isActive ? 'bg-blue-50/50' : ''}>
                               <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                     <span className="text-xs font-bold text-gray-800">{s.name}</span>
                                     {isActive && <span className="text-[7px] font-black text-blue-600 border border-blue-200 px-1 rounded uppercase">Ativo</span>}
                                  </div>
                               </td>
                               <td className={`px-4 py-3 text-xs font-black text-center ${res.kpis.maxCqt > 6 ? 'text-red-500' : 'text-gray-700'}`}>
                                  {res.kpis.maxCqt.toFixed(2)}%
                               </td>
                               <td className={`px-4 py-3 text-xs font-black text-center ${res.kpis.trafoOccupation > 100 ? 'text-red-500' : 'text-gray-700'}`}>
                                  {res.kpis.trafoOccupation.toFixed(1)}%
                               </td>
                               <td className="px-4 py-3 text-xs font-bold text-center text-gray-700">
                                  {res.kpis.totalLoad.toFixed(2)}
                               </td>
                             </tr>
                           );
                        })}
                      </tbody>
                   </table>
                </div>
                <p className="text-[8px] text-gray-400 mt-2 font-medium italic">* Os valores acima refletem a diversidade de carga aplicada individualmente para cada topologia simulada.</p>
             </section>
          )}

          {reportConfig.showMaterials && (
             <section className="mb-10">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 border-l-4 border-blue-600 pl-3">6. Resumo Estimado de Condutores (Cenário Ativo)</h3>
                <div className="flex flex-col gap-2">
                  {Object.entries(cableQuantities).map(([cable, meters]) => (
                    <div key={cable} className="flex justify-between items-center text-xs py-2 border-b border-dotted border-gray-300">
                      <span className="font-medium text-gray-700">{cable}</span>
                      <span className="font-black text-blue-700">{meters} metros</span>
                    </div>
                  ))}
                </div>
             </section>
          )}
          
          <div className="mt-auto">
            {reportConfig.showSignatures && (
              <footer className="pt-12 border-t border-gray-200">
                <div className="flex justify-center mb-10">
                   <div className="flex flex-col items-center text-center">
                      <div className="mb-2 italic font-serif text-2xl text-blue-900 select-none opacity-80" style={{ fontFamily: 'Dancing Script, cursive' }}>
                        Luiz Eduardo Tavares Branco
                      </div>
                      <div className="w-64 h-[1px] bg-gray-400 mb-3"></div>
                      <p className="text-[11px] font-black text-gray-800 uppercase leading-tight tracking-tighter">IM3 PROJETOS E SERVICOS LTDA</p>
                      <p className="text-[10px] font-bold text-gray-700 uppercase leading-tight">LUIZ EDUARDO TAVARES BRANCO</p>
                      <p className="text-[9px] font-bold text-gray-500 uppercase leading-tight">ENGENHEIRO ELETRICISTA</p>
                      <p className="text-[9px] font-black text-blue-600 uppercase leading-tight mt-1">CREA-RJ 201107040-6</p>
                   </div>
                </div>
                <div className="text-center">
                  <p className="text-[8px] text-gray-300 uppercase font-bold tracking-[0.2em]">Documento gerado eletronicamente via sisCQT Enterprise AI</p>
                </div>
              </footer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectReport;
