import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {}
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { bg: 'bg-emerald-900 border-emerald-500 text-white', icon: 'check_circle', iconColor: 'text-emerald-400' };
      case 'warning':
        return { bg: 'bg-amber-900 border-amber-500 text-white', icon: 'warning', iconColor: 'text-amber-400' };
      case 'error':
        return { bg: 'bg-red-900 border-red-500 text-white', icon: 'error', iconColor: 'text-red-300' };
      default:
        return { bg: 'bg-military-900 border-action-500 text-white', icon: 'info', iconColor: 'text-action-400' };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none no-print">
        {toasts.map((t) => {
          const st = getStyle(t.type);
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border-l-4 animate-[slideUp_0.2s_ease-out] ${st.bg}`}
            >
              <span className={`material-icons text-xl shrink-0 mt-0.5 ${st.iconColor}`}>{st.icon}</span>
              <p className="text-xs font-bold leading-snug flex-grow">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-white/60 hover:text-white">
                <span className="material-icons text-base">close</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
