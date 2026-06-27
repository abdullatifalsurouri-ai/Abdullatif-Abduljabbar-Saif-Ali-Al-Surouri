import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, WifiOff, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
  currentLanguage: 'ar' | 'en';
}

export default function Toast({ toasts, onClose, currentLanguage }: ToastProps) {
  const isRtl = currentLanguage === 'ar';

  return (
    <div 
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 md:bottom-6 ${
        isRtl ? 'md:right-6 md:left-auto md:translate-x-0' : 'md:left-6 md:right-auto md:translate-x-0'
      } z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 md:px-0`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onClose={onClose} 
            isRtl={isRtl} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ 
  toast, 
  onClose, 
  isRtl 
}: { 
  key?: string;
  toast: ToastMessage; 
  onClose: (id: string) => void; 
  isRtl: boolean;
}) {
  const { id, message, type, duration = 4000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const config = {
    success: {
      bg: 'bg-slate-900/95 border-emerald-500/30 text-emerald-400',
      icon: <CheckCircle className="text-emerald-400 shrink-0 stroke-[2.2]" size={18} />,
    },
    error: {
      bg: 'bg-slate-900/95 border-rose-500/30 text-rose-400',
      icon: <AlertCircle className="text-rose-400 shrink-0 stroke-[2.2]" size={18} />,
    },
    warning: {
      bg: 'bg-slate-900/95 border-amber-500/30 text-amber-400',
      icon: <WifiOff className="text-amber-400 shrink-0 stroke-[2.2]" size={18} />,
    },
    info: {
      bg: 'bg-slate-900/95 border-blue-500/30 text-blue-400',
      icon: <Info className="text-blue-400 shrink-0 stroke-[2.2]" size={18} />,
    },
  }[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`flex items-center justify-between gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-2xl ${config.bg} relative overflow-hidden`}
    >
      <div className="flex items-center gap-3 flex-1">
        {config.icon}
        <span className="text-xs font-bold leading-relaxed">{message}</span>
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800/50 cursor-pointer"
      >
        <X size={14} />
      </button>

      {/* Progress timeline bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-[3px] ${
          type === 'success' ? 'bg-emerald-500' :
          type === 'error' ? 'bg-rose-500' :
          type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
        }`}
      />
    </motion.div>
  );
}
