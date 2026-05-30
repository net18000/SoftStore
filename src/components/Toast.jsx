import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const Toast = ({ toast }) => {
  if (!toast.show) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white font-medium z-50 transition-all ${isError ? 'bg-red-500' : 'bg-emerald-500'}`}>
      {isError ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
      {toast.message}
    </div>
  );
};

export default Toast;
