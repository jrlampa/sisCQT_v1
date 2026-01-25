
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
      
      // Entra ID: use ID token para validar no backend (aud = clientId).
      // O accessToken frequentemente é emitido para Microsoft Graph (aud=0000...), e falha na verificação do backend.
      const token = (loginResponse as any).idToken || loginResponse.accessToken;
      const user = await ApiService.syncUser(token);
      
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
              // Fallback se o CSS não carregar (evita logo gigante)
              style={{ maxWidth: 260, height: 'auto' }}
            />
            <div className="flex items-center justify-center gap-3 opacity-80">
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">IM3 Brasil</span>
              <img
                src={im3Logo}
                alt="Logo IM3 Brasil"
                className="h-7 w-auto object-contain"
                style={{ maxWidth: 140, height: 'auto' }}
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
                {/* Ícone MS inline (evita CSP/img-src externo) */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 group-hover:rotate-12 transition-transform"
                >
                  <path fill="#F25022" d="M2 2h10v10H2z" />
                  <path fill="#7FBA00" d="M12 2h10v10H12z" />
                  <path fill="#00A4EF" d="M2 12h10v10H2z" />
                  <path fill="#FFB900" d="M12 12h10v10H12z" />
                </svg>
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

        <div className="mt-6 text-[10px] text-gray-500 font-medium">
          Ao continuar, você concorda com os nossos{' '}
          <Link to="/terms" className="text-blue-700 font-black hover:underline">Termos</Link>{' '}
          e a{' '}
          <Link to="/privacy" className="text-blue-700 font-black hover:underline">Política de Privacidade (LGPD)</Link>.
        </div>
      </div>
    </div>
  );
};

export default Login;
