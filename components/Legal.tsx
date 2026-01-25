import React from 'react';
import { Link } from 'react-router-dom';

type LegalKind = 'privacy' | 'terms';

const companyName = import.meta.env.VITE_LEGAL_COMPANY_NAME || 'IM3 Projetos e Serviços LTDA';
const privacyContact = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL || 'privacidade@im3brasil.com.br';
const lastUpdated = import.meta.env.VITE_LEGAL_LAST_UPDATED || '2026-01-25';

export const Legal: React.FC<{ kind: LegalKind }> = ({ kind }) => {
  const title = kind === 'privacy' ? 'Política de Privacidade (LGPD)' : 'Termos de Uso';

  return (
    <div className="min-h-screen bg-[#f0f4ff] p-6">
      <div className="max-w-3xl mx-auto glass-dark rounded-[40px] p-10 border border-white/60 shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">{title}</h1>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-2">
              Última atualização: {lastUpdated}
            </p>
          </div>
          <Link
            to="/login"
            className="px-5 py-3 rounded-2xl bg-white/70 border border-white/80 text-blue-700 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all"
          >
            Voltar
          </Link>
        </div>

        {kind === 'privacy' ? (
          <div className="text-gray-700 text-sm leading-relaxed space-y-6">
            <p>
              Esta Política de Privacidade descreve como o <strong>{companyName}</strong> trata dados pessoais no
              aplicativo <strong>siSCQT</strong>, em conformidade com a <strong>LGPD</strong> (Lei nº 13.709/2018).
            </p>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Quais dados tratamos</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Conta</strong>: e-mail e nome (quando fornecido pelo provedor de login).</li>
                <li><strong>Projetos</strong>: metadados, cenários e informações técnicas inseridas no editor.</li>
                <li><strong>Billing</strong> (quando aplicável): IDs e status de assinatura (sem armazenar dados de cartão).</li>
                <li><strong>Logs técnicos</strong>: eventos e erros necessários para operação e suporte.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Finalidades</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Autenticação e controle de acesso.</li>
                <li>Persistência de projetos e cálculos.</li>
                <li>Suporte, diagnóstico e melhoria do serviço.</li>
                <li>Cobrança/assinatura (para usuários avulsos, quando habilitado).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Compartilhamento</h2>
              <p>
                O app pode compartilhar dados estritamente necessários com provedores/operadores como Microsoft (Entra ID),
                Google (login), Stripe (assinaturas), e Supabase (banco de dados). Cada provedor possui suas próprias
                políticas e medidas de segurança.
              </p>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Seus direitos</h2>
              <p>
                Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade (quando aplicável) e exclusão.
                No app, existe uma opção para <strong>exportar</strong> seus dados e para <strong>excluir</strong> sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Contato (DPO/Privacidade)</h2>
              <p>
                Para solicitações relacionadas à privacidade, contate: <strong>{privacyContact}</strong>
              </p>
            </section>
          </div>
        ) : (
          <div className="text-gray-700 text-sm leading-relaxed space-y-6">
            <p>
              Estes Termos de Uso regulam o acesso e uso do aplicativo <strong>siSCQT</strong> operado por{' '}
              <strong>{companyName}</strong>.
            </p>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Uso permitido</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Uso legítimo e conforme as funcionalidades disponibilizadas.</li>
                <li>Proibido tentar explorar vulnerabilidades, automatizar abuso ou acesso não autorizado.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Conta e acesso</h2>
              <p>
                O acesso pode ser realizado por Entra ID (corporativo) e/ou Google (avulsos), conforme configuração do sistema.
              </p>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Disponibilidade</h2>
              <p>
                O serviço é fornecido “como está”, podendo sofrer manutenções e evoluções. Buscamos boas práticas de segurança
                e disponibilidade, mas não garantimos operação ininterrupta.
              </p>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Contato</h2>
              <p>
                Suporte e contato: <strong>{privacyContact}</strong>
              </p>
            </section>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-white/70 flex flex-col sm:flex-row gap-3 sm:justify-between">
          <Link
            to="/terms"
            className="text-blue-700 font-black text-[10px] uppercase tracking-widest hover:underline"
          >
            Ver Termos
          </Link>
          <Link
            to="/privacy"
            className="text-blue-700 font-black text-[10px] uppercase tracking-widest hover:underline"
          >
            Ver Privacidade (LGPD)
          </Link>
        </div>
      </div>
    </div>
  );
};

