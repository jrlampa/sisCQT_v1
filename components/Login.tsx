
import React, { useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { ApiService } from '../services/apiService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const LogoSisCQT = () => (
  <div className="flex items-baseline font-black tracking-tighter text-[#004a80] select-none text-4xl">
    <span className="lowercase">si</span><span className="uppercase">S</span>
    <span className="uppercase ml-1">C</span><span className="uppercase ml-0.5">Q</span><span className="uppercase ml-0.5">T</span>
  </div>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { instance } = useMsal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MODO DEV: Simula o login sem chamar a Microsoft
  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const user = await ApiService.syncUser('dev-token-im3');
      onLogin(user);
    } catch (err) {
      setError("O modo de teste não está ativo no backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loginResponse = await instance.loginPopup(loginRequest);
      const user = await ApiService.syncUser(loginResponse.accessToken);
      onLogin(user);
    } catch (err: any) {
      console.error(err);
      setError("Falha na autenticação Microsoft ou domínio não autorizado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff] p-6 relative overflow-hidden">
      <div className="glass-dark w-full max-w-md rounded-[40px] p-12 shadow-2xl border border-white/60 relative z-10 text-center">
        <div className="mb-8 p-6 border-2 border-blue-500/30 rounded-2xl inline-block">
          <LogoSisCQT />
        </div>
        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Engenharia Digital</h2>
        <p className="text-gray-500 text-sm mb-10">Acesse com sua conta corporativa IM3 Brasil</p>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 text-[10px] font-black p-4 rounded-2xl border border-red-100">
            {error.toUpperCase()}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button 
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-[#004a80] text-white py-5 rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <img src="https://docs.microsoft.com/en-us/azure/active-directory/develop/media/howto-add-branding-in-azure-ad-apps/ms-symbollockup_mssymbol_19.png" className="w-5 h-5" alt="MS" />
                ENTRAR COM MICROSOFT 365
              </>
            )}
          </button>

          {/* Atalho de Desenvolvimento - Remover em Produção Real */}
          <button 
            onClick={handleDevLogin}
            className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] hover:text-blue-600 transition-colors py-2"
          >
            [ Acesso Rápido Desenvolvedor ]
          </button>
        </div>
        
        <p className="mt-8 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
          Acesso restrito ao domínio @im3brasil.com.br
        </p>
      </div>
    </div>
  );
};

export default Login;
