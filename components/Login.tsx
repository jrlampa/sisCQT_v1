
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ApiService } from '../services/apiService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const LogoSisCQT = () => (
  <div className="flex items-baseline font-black tracking-tighter text-[#004a80] select-none text-4xl">
    <span className="lowercase">si</span>
    <span className="uppercase">S</span>
    <span className="uppercase ml-1">C</span>
    <span className="uppercase ml-0.5">Q</span>
    <span className="uppercase ml-0.5">T</span>
  </div>
);

const LogoIM3 = ({ size = "text-xl" }: { size?: string }) => (
  <div className={`flex items-center font-bold text-[#003399] ${size} select-none`}>
    <span className="relative">
      i
      <span className="absolute -top-0.5 left-[1px] w-[5px] h-[5px] bg-[#8cc63f] rounded-full"></span>
    </span>
    <span>m3</span>
    <span className="ml-1 text-[#8cc63f] font-black text-xs">BRASIL</span>
  </div>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await ApiService.login(email.trim(), password.trim());
      onLogin(user);
    } catch (err: any) {
      setError(err.message === 'API Error: Unauthorized' ? 'Credenciais inválidas' : 'Falha na conexão com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const supportEmail = "jonatas.lampa@im3brasil.com.br";
  const requestAccessUrl = `mailto:${supportEmail}?subject=Solicitação de Acesso sisCQT - Novo Usuário&body=Olá Jonatas,%0D%0A%0D%0AGostaria de solicitar acesso à plataforma sisCQT Enterprise AI.%0D%0A%0D%0ANome Completo:%0D%0AUnidade/Projeto:`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff] p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[120px]"></div>

      <div className="glass-dark w-full max-w-md rounded-[40px] p-1 shadow-2xl border border-white/60 relative z-10 animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[40px] p-12 flex flex-col items-center">
          <div className="mb-8 p-6 border-2 border-blue-500/30 rounded-2xl transform hover:scale-105 transition-all">
            <LogoSisCQT />
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Plataforma de Engenharia</p>
          <div className="mt-4 opacity-100">
            <LogoIM3 size="text-sm" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full mt-10">
            {error && (
              <div className="bg-red-50 text-red-600 text-[10px] font-black p-3 rounded-xl border border-red-100 text-center animate-in fade-in">
                {error.toUpperCase()}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
              <input 
                required 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner font-medium"
                placeholder="nome.sobrenome@im3brasil.com.br"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chave de Acesso</label>
              <div className="relative group">
                <input 
                  required 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 pr-12 text-sm outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-lg opacity-40 hover:opacity-100 transition-opacity focus:outline-none"
                >
                  {showPassword ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="mt-4 bg-[#004a80] text-white py-4 rounded-2xl font-black shadow-2xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Entrar no Ecossistema'
              )}
            </button>
          </form>

          <div className="mt-12 flex flex-col items-center gap-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ainda não tem acesso?</p>
            <a 
              href={requestAccessUrl}
              className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline hover:text-blue-800 transition-colors"
            >
              Solicitar Acesso à Engenharia
            </a>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 flex flex-col items-center gap-2">
         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">
           Theseus Security Protocol v6.2
         </p>
         <div className="opacity-40 grayscale scale-75">
           <LogoIM3 size="text-[10px]" />
         </div>
      </footer>
    </div>
  );
};

export default Login;
