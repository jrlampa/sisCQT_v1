
import React from 'react';
import { User } from '../types';

interface BillingProps {
  user: User;
  onUpdatePlan: (plan: User['plan']) => void;
}

const Billing: React.FC<BillingProps> = ({ user, onUpdatePlan }) => {
  const plans = [
    { 
      id: 'Free', 
      name: 'Standard', 
      price: 'R$ 0', 
      features: ['Até 3 Projetos', 'Cálculos BT Base', '1 Cenário por Projeto', 'Sem IA Theseus'],
      color: 'bg-gray-100',
      textColor: 'text-gray-500'
    },
    { 
      id: 'Pro', 
      name: 'Scale-up Pro', 
      price: 'R$ 199', 
      features: ['Projetos Ilimitados', 'Otimização Automática', '5 Cenários por Projeto', 'Theseus AI (Gemini 3)'],
      color: 'bg-blue-600',
      textColor: 'text-white',
      badge: 'MAIS POPULAR'
    },
    { 
      id: 'Enterprise', 
      name: 'Custom Enterprise', 
      price: 'Sob Consulta', 
      features: ['White Label', 'API de Integração', 'Visão de Campo AI', 'Suporte 24/7'],
      color: 'bg-[#002b4d]',
      textColor: 'text-white'
    }
  ];

  const handleUpgrade = (planId: any) => {
    if (confirm(`Confirmar upgrade para o plano ${planId}?`)) {
      onUpdatePlan(planId);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-700">
      <header className="text-center">
        <h2 className="text-4xl font-black text-gray-800 tracking-tight mb-4">Escolha sua Potência</h2>
        <p className="text-gray-500 font-medium">Planos flexíveis para engenheiros individuais e grandes distribuidoras</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((p) => (
          <div 
            key={p.id}
            className={`glass-dark relative rounded-[40px] p-10 border-2 transition-all flex flex-col ${user.plan === p.id ? 'border-blue-500 shadow-2xl scale-105' : 'border-white/60 hover:border-blue-200'}`}
          >
            {p.badge && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest shadow-lg">
                {p.badge}
              </span>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-800 mb-1">{p.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900">{p.price}</span>
                {p.id !== 'Enterprise' && <span className="text-gray-400 text-sm font-bold">/mês</span>}
              </div>
            </div>

            <ul className="flex flex-col gap-4 mb-10 flex-1">
              {p.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleUpgrade(p.id)}
              disabled={user.plan === p.id}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                user.plan === p.id 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : `${p.color} ${p.textColor} shadow-xl hover:scale-105`
              }`}
            >
              {user.plan === p.id ? 'Plano Atual' : 'Assinar Agora'}
            </button>
          </div>
        ))}
      </div>

      <div className="glass-dark rounded-[32px] p-8 border border-white/60 flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-6">
            <div className="text-4xl bg-blue-50 w-16 h-16 flex items-center justify-center rounded-2xl">💳</div>
            <div>
               <h4 className="text-lg font-black text-gray-800">Método de Pagamento</h4>
               <p className="text-sm text-gray-500 font-medium italic">Cartão final **** 4242 • Próximo faturamento: 12/11/2024</p>
            </div>
         </div>
         <button className="text-blue-600 font-black text-xs uppercase tracking-widest hover:bg-blue-50 px-6 py-3 rounded-xl transition-all">Gerenciar Cartões</button>
      </div>
    </div>
  );
};

export default Billing;
