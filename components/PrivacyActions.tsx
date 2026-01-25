import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/apiService.ts';
import { useToast } from '../context/ToastContext.tsx';

export const PrivacyActions: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isBusy, setIsBusy] = useState(false);

  const contactEmail: string = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL || 'privacidade@im3brasil.com.br';
  const companyName: string = import.meta.env.VITE_LEGAL_COMPANY_NAME || 'IM3 Projetos e Serviços LTDA';

  const ui = useMemo(() => {
    return {
      container: compact
        ? 'glass-dark rounded-[24px] p-6 border border-white/60'
        : 'glass-dark rounded-[32px] p-8 border border-white/60',
      title: compact
        ? 'text-sm font-black text-gray-800 uppercase tracking-widest'
        : 'text-sm font-black text-gray-700 uppercase tracking-widest',
    };
  }, [compact]);

  const handleExport = async () => {
    setIsBusy(true);
    try {
      const data = await ApiService.privacyExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `lgpd_export_${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Export LGPD gerado (download iniciado).', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Falha ao exportar dados.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm(
      'Tem certeza que deseja excluir sua conta e todos os seus projetos?\n\nEsta ação é irreversível.'
    );
    if (!ok) return;

    const ok2 = window.confirm('Confirma novamente a exclusão da conta (LGPD)?');
    if (!ok2) return;

    setIsBusy(true);
    try {
      await ApiService.privacyDeleteAccount();
      await ApiService.logout();
      showToast('Conta excluída. Você foi desconectado.', 'success');
      navigate('/login');
    } catch (e: any) {
      showToast(e?.message || 'Falha ao excluir a conta.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className={ui.container}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className={ui.title}>LGPD / Privacidade</h3>
          <p className="text-xs text-gray-500 font-medium mt-2">
            Você pode baixar uma cópia dos seus dados ou solicitar exclusão da conta. Dúvidas:{' '}
            <strong>{contactEmail}</strong> ({companyName}).
          </p>
          <div className="mt-2 flex gap-4">
            <Link to="/privacy" className="text-blue-700 font-black text-[10px] uppercase tracking-widest hover:underline">
              Política de Privacidade
            </Link>
            <Link to="/terms" className="text-blue-700 font-black text-[10px] uppercase tracking-widest hover:underline">
              Termos
            </Link>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={isBusy}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              isBusy
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-blue-700 border border-blue-100 hover:bg-blue-50'
            }`}
          >
            Baixar meus dados
          </button>
          <button
            onClick={handleDelete}
            disabled={isBusy}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              isBusy ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            Excluir conta
          </button>
        </div>
      </div>
    </section>
  );
};

