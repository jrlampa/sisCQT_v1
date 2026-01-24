
import React, { useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { GoogleLogin } from '@react-oauth/google';
import { loginRequest } from "../authConfig.ts";
import { ApiService } from '../services/apiService.ts';
import { User } from '../types.ts';
import { useToast } from '../context/ToastContext.tsx';
import siscqtLogo from '../siscqt_logo.png';
import im3Logo from '../logoim3.png';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { instance } = useMsal();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const user = await ApiService.syncUser('dev-token-im3');
      onLogin(user);
      showToast("Acesso concedido (Modo Dev)", "info");
    } catch (err) {
      setError("Falha ao ativar o modo de desenvolvimento.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Execute the login popup flow
      const loginResponse = await instance.loginPopup(loginRequest);
      
      // Send the access token to the backend for verification and profile synchronization
      const user = await ApiService.syncUser(loginResponse.accessToken);
      
      onLogin(user);
      showToast(`Bem-vindo, ${user.name}!`, "success");
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.name === "BrowserAuthError") {
        setError("O popup de login foi bloqueado pelo navegador ou fechado.");
      } else {
        setError(err.message || "Falha na autenticação corporativa IM3.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff] p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-50"></div>

      <div className="glass-dark w-full max-w-md rounded-[40px] p-12 shadow-2xl border border-white/60 relative z-10 text-center animate-in zoom-in-95 duration-500">
        <div className="mb-8 p-6 border-2 border-blue-500/30 rounded-2xl inline-block bg-white/40">
          <div className="flex flex-col items-center gap-4">
            <img
              src={siscqtLogo}
              alt="siSCQT"
              className="h-12 w-auto object-contain"
            />
            <div className="flex items-center justify-center gap-3 opacity-80">
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">IM3 Brasil</span>
              <img
                src={im3Logo}
                alt="Logo IM3 Brasil"
                className="h-7 w-auto object-contain"
              />
            </div>
          </div>
        </div>
        
        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Engenharia Digital</h2>
        <p className="text-gray-500 text-sm mb-10">
          IM3: entre com Microsoft 365. Usuários avulsos: entre com Google.
        </p>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 text-[10px] font-black p-4 rounded-2xl border border-red-100 uppercase tracking-tight leading-tight animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button 
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-[#004a80] text-white py-5 rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <img src="https://docs.microsoft.com/en-us/azure/active-directory/develop/media/howto-add-branding-in-azure-ad-apps/ms-symbollockup_mssymbol_19.png" className="w-5 h-5 group-hover:rotate-12 transition-transform" alt="MS" />
                ENTRAR COM MICROSOFT 365
              </>
            )}
          </button>

          <div className="relative flex items-center py-6">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">OU ACESSO RÁPIDO</span>
              <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="flex flex-col gap-3 items-center">
            {googleClientId ? (
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  try {
                    const token = credentialResponse.credential;
                    if (!token) throw new Error('Token do Google ausente.');
                    setIsLoading(true);
                    const user = await ApiService.syncUser(token);
                    onLogin(user);
                    showToast(`Bem-vindo, ${user.name}!`, "success");
                  } catch (e: any) {
                    setError(e?.message || 'Falha ao autenticar com Google.');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                onError={() => setError('Falha ao autenticar com Google.')}
                useOneTap={false}
              />
            ) : (
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                Google login indisponível (defina VITE_GOOGLE_CLIENT_ID)
              </div>
            )}
          </div>

          <button 
            onClick={handleDevLogin}
            disabled={isLoading}
            className="w-full bg-white text-blue-600 border-2 border-blue-100 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            MODO DESENVOLVEDOR (MOCK)
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
