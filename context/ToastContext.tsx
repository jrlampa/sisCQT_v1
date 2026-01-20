
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const getColors = () => {
    switch (toast.type) {
      case 'error': return 'bg-red-500 border-red-200 text-white shadow-red-200';
      case 'warning': return 'bg-orange-500 border-orange-200 text-white shadow-orange-200';
      case 'info': return 'bg-blue-400 border-blue-100 text-white shadow-blue-100';
      default: return 'bg-blue-600 border-white/60 text-white shadow-blue-200';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '✓';
    }
  };

  return (
    <div className={`pointer-events-auto glass-dark border p-5 rounded-[24px] shadow-2xl flex items-center gap-4 min-w-[320px] max-w-md animate-in slide-in-from-right-10 fade-in duration-500`}>
      <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-black text-lg shadow-lg ${getColors()}`}>
        {getIcon()}
      </div>
      <div className="flex flex-col">
        <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-widest opacity-60">
          {toast.type === 'error' ? 'Sistema / Erro' : toast.type === 'warning' ? 'Sistema / Atenção' : 'Sistema / Notificação'}
        </h4>
        <p className="text-xs text-gray-700 font-bold leading-tight mt-0.5">{toast.message}</p>
      </div>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
