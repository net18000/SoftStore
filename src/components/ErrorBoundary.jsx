import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
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

export default ErrorBoundary;
