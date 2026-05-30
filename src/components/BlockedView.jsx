import React from 'react';
import { Lock } from 'lucide-react';
import { formatToPeruDate } from '../utils';

const BlockedView = () => {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 z-[9999] overflow-hidden">
      {/* Fondo animado */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600 rounded-full blur-[150px] animate-pulse"></div>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-[3rem] p-12 text-center shadow-2xl relative z-10 border border-slate-100 dark:border-slate-700 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Lock size={48} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-4 uppercase tracking-tighter">Acceso Denegado</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
          Tu dirección IP ha sido bloqueada permanentemente por un administrador del sistema debido a una infracción de nuestras políticas de seguridad.
        </p>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Si crees que es un error</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Contacta con soporte técnico a través de nuestros canales oficiales.</p>
        </div>

        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{formatToPeruDate(new Date())} • SOFTSTORE SECURITY SYSTEM</p>
      </div>
    </div>
  );
};

export default BlockedView;
