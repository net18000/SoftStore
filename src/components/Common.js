import React from 'react';
import { AlertCircle, CheckCircle, Package } from 'lucide-react';

export const Toast = ({ toast }) => {
  if (!toast.show) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white font-medium z-50 transition-all ${isError ? 'bg-red-500' : 'bg-emerald-500'}`}>
      {isError ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
      {toast.message}
    </div>
  );
};

export const FloatingBanner = ({ banner, side }) => {
  if (!banner) return null;
  return (
    <div 
      className={`fixed top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-center gap-4 p-4 rounded-3xl shadow-2xl transition-all hover:scale-105 ${side === 'left' ? 'left-6' : 'right-6'} animate-in fade-in slide-in-from-${side}-8 duration-700`}
      style={{ backgroundColor: banner.bgColor, width: '180px' }}
    >
      <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-white/20 shadow-inner bg-black/5">
        <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-contain" />
      </div>
      <div className="text-center space-y-2">
        <h4 className="text-sm font-black text-white leading-tight drop-shadow-sm">{banner.title}</h4>
        <p className="text-[10px] font-bold text-white/80 line-clamp-2">{banner.subtitle}</p>
      </div>
      {banner.link && (
        <a 
          href={banner.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full bg-white text-slate-900 text-[10px] font-black py-2.5 rounded-xl text-center hover:bg-blue-50 transition-all uppercase tracking-widest shadow-lg"
        >
          Ver más
        </a>
      )}
    </div>
  );
};

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary capturó un error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-red-100 dark:border-red-900/20 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-red-500 mb-6">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Algo salió mal</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
              La aplicación encontró un error inesperado. Por favor, intenta recargar la página.
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-left mb-6 overflow-auto max-h-40">
              <code className="text-xs text-red-500 font-mono break-all">
                {this.state.error?.toString()}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              RECARGAR PÁGINA
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
