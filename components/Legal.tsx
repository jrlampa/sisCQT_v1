import React from 'react';
import { Link } from 'react-router-dom';

type LegalKind = 'privacy' | 'terms';

const companyName = import.meta.env.VITE_LEGAL_COMPANY_NAME || 'IM3 Projetos e Serviços LTDA';
const privacyContact = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL || 'privacidade@im3brasil.com.br';
const lastUpdated = import.meta.env.VITE_LEGAL_LAST_UPDATED || '2026-01-25';
const tosVersion = import.meta.env.VITE_LEGAL_TOS_VERSION || lastUpdated;

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
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Controlador e contato</h2>
              <p>
                O controlador dos dados pessoais tratados no âmbito do siSCQT é o <strong>{companyName}</strong>. Para
                solicitações sobre privacidade (titular/DSR), contate <strong>{privacyContact}</strong>.
              </p>
            </section>

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
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Bases legais (LGPD)</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Execução de contrato</strong>: viabilizar acesso, uso do editor e gerenciamento da conta.
                </li>
                <li>
                  <strong>Cumprimento de obrigações</strong> e <strong>faturamento</strong>: gestão de assinatura e emissão/controle
                  de cobranças quando aplicável.
                </li>
                <li>
                  <strong>Legítimo interesse</strong>: segurança, prevenção a fraudes/abusos, logs de operação e melhoria do serviço,
                  observados direitos e expectativas do titular.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Compartilhamento</h2>
              <p>
                O app pode compartilhar dados estritamente necessários com provedores/operadores como Microsoft (Entra ID),
                Google (login), Stripe (assinaturas), e Supabase (banco de dados). Cada provedor possui suas próprias
                políticas e medidas de segurança.
              </p>
              <p className="mt-3">
                <strong>Stripe como operador</strong>: quando o plano Pro está habilitado, pagamentos e cobrança são processados pela
                Stripe. O siSCQT <strong>não armazena dados de cartão</strong>; apenas identificadores/status de assinatura
                (por exemplo, <em>customerId</em>, <em>subscriptionId</em>).
              </p>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Transferência internacional</h2>
              <p>
                Alguns provedores podem armazenar/processar dados fora do Brasil (por exemplo, infraestrutura de nuvem e
                serviços de autenticação/pagamento). Adotamos medidas técnicas e contratuais compatíveis com esse cenário,
                na medida aplicável.
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
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Natureza da ferramenta (apoio)</h2>
              <p>
                O siSCQT é uma <strong>ferramenta de apoio</strong> ao trabalho técnico. Os resultados (cálculos, relatórios,
                diagramas e recomendações) são produzidos a partir de entradas do usuário e regras/heurísticas do sistema e
                devem ser <strong>revisados e validados</strong> por profissional habilitado antes de qualquer uso em projeto,
                obra ou operação.
              </p>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Responsabilidade técnica e ART</h2>
              <p>
                A responsabilidade técnica pelos projetos, memoriais, dimensionamentos e decisões de engenharia permanece
                integralmente com o <strong>engenheiro responsável</strong> e/ou organização contratante. Quando aplicável,
                é obrigação do responsável emitir/registrar a <strong>ART/RRT</strong> correspondente, bem como observar normas
                técnicas e requisitos legais.
              </p>
            </section>

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
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Planos e modelo híbrido</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Enterprise</strong>: geralmente contratado por organização, com condições específicas em contrato
                  (por exemplo, <em>MSA</em>/SOW). Em caso de conflito, prevalecem as condições contratuais.
                </li>
                <li>
                  <strong>Pro (avulso)</strong>: assinatura individual/processada via Stripe. A contratação e o uso estão sujeitos
                  a estes Termos e à Política de Privacidade.
                </li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                Versão dos Termos: <strong>{tosVersion}</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Pagamentos (quando aplicável)</h2>
              <p>
                Quando habilitado, o plano Pro é cobrado via Stripe. O siSCQT não armazena dados de cartão; apenas dados de
                referência da assinatura e status para habilitar/desabilitar recursos.
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
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Limitação de responsabilidade</h2>
              <p>
                Na extensão máxima permitida pela legislação aplicável, o <strong>{companyName}</strong> não será responsável
                por perdas indiretas, lucros cessantes, danos consequentes, ou por resultados decorrentes de uso indevido,
                dados de entrada incorretos, ausência de validação técnica, ou não observância de normas e requisitos legais.
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

