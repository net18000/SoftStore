import React, { useState, useEffect } from 'react';
import { Package, Unlock, ShieldCheck, Clock, Shield } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils';
import { appId } from '../config';
import { formatToPeruTime } from '../utils';

const GatekeeperView = ({ onValidate, showToast }) => {
  const [inputCode, setInputCode] = useState('');
  const [currentCodeData, setCurrentCodeData] = useState(null);
  const [frequency, setFrequency] = useState(30);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const showCodeToAdmin = urlParams.get('admin') === 'true';

  const generateNewCode = async (currentFreq) => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + (currentFreq || frequency) * 60 * 1000).toISOString();
    const codeData = { code: newCode, expiresAt };
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'currentCode'), codeData);
    return codeData;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'config');
        const configSnap = await getDoc(configRef);
        let currentFreq = 30;
        if (configSnap.exists()) {
          currentFreq = configSnap.data().frequencyMinutes;
          setFrequency(currentFreq);
        } else {
          await setDoc(configRef, { frequencyMinutes: 30, enabled: true });
        }

        const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'currentCode');
        const codeSnap = await getDoc(codeRef);
        let data = codeSnap.exists() ? codeSnap.data() : null;
        
        if (!data || new Date(data.expiresAt) < new Date()) {
          data = await generateNewCode(currentFreq);
        }
        setCurrentCodeData(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'config');
    const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'currentCode');
    
    const unsubConfig = onSnapshot(configRef, (snap) => {
      if (snap.exists()) setFrequency(snap.data().frequencyMinutes);
    });
    const unsubCode = onSnapshot(codeRef, (snap) => {
      if (snap.exists()) setCurrentCodeData(snap.data());
    });

    return () => { unsubConfig(); unsubCode(); };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsVerifying(true);
    if (inputCode === currentCodeData?.code) {
      onValidate(false, inputCode);
    } else {
      showToast("Código incorrecto o ha expirado. Por favor verifica.", "error");
    }
    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white dark:bg-slate-900 p-10 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-center space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-primary-600 text-white p-4 rounded-[2rem] shadow-2xl shadow-primary-500/40 rotate-6 hover:rotate-0 transition-transform duration-500 cursor-default">
              <Package size={48} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter dark:text-white bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">SoftStore</h1>
              <div className="h-1 w-12 bg-primary-600 mx-auto rounded-full mt-1"></div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic">Acceso Restringido</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Ingresa el código de seguridad para continuar</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-blue-500 rounded-3xl blur opacity-10 group-focus-within:opacity-30 transition duration-500"></div>
              <input 
                type="text" 
                maxLength="6"
                placeholder="······"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
                className="relative w-full text-center text-4xl sm:text-5xl font-black tracking-[0.4em] py-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-3xl outline-none focus:border-primary-500 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-700 dark:text-white"
              />
            </div>
            <button 
              type="submit" 
              disabled={isVerifying || inputCode.length !== 6}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-30"
            >
              {isVerifying ? 'Verificando...' : <><Unlock size={20} /> Entrar al Sistema</>}
            </button>
          </form>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => onValidate(true, null)}
              className="text-slate-400 hover:text-primary-600 font-black flex items-center justify-center gap-3 mx-auto transition-all text-xs uppercase tracking-widest group"
            >
              <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" /> Acceso Administrativo
            </button>
          </div>

          {showCodeToAdmin && currentCodeData && (
            <div className="p-6 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 rounded-3xl animate-in zoom-in duration-500">
              <p className="text-[10px] font-black uppercase text-primary-600 mb-2 tracking-[0.2em]">Código Maestro (Visible para Admin)</p>
              <p className="text-4xl font-black text-primary-700 dark:text-primary-400 tracking-[0.3em] italic">{currentCodeData.code}</p>
              <div className="flex items-center justify-center gap-2 mt-3 text-primary-500/60 font-bold text-[10px] uppercase">
                <Clock size={12} /> Expira: {formatToPeruTime(currentCodeData.expiresAt)}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 flex flex-col items-center space-y-4">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
            <div className="h-px w-8 bg-slate-200 dark:bg-slate-800"></div>
            <Shield size={14} className="text-primary-500" /> SoftStore Secure Gate
            <div className="h-px w-8 bg-slate-200 dark:bg-slate-800"></div>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GatekeeperView;
