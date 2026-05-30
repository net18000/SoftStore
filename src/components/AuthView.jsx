import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, AlertCircle, CheckCircle, Mail, 
  ArrowRight, ShieldCheck, User, LogOut 
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  deleteUser 
} from 'firebase/auth';
import { 
  doc, getDoc, setDoc, updateDoc, deleteDoc, 
  collection, query, where, getDocs, addDoc 
} from 'firebase/firestore';
import { auth, db, getFriendlyErrorMessage } from '../utils';
import { appId, ADMIN_EMAILS, EMAILJS_CONFIG } from '../config';

const AuthView = ({ allowedType, onBack, setUser, gatekeeperEnabled, showToast }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [userEnteredCode, setUserEnteredCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const isLoginRef = useRef(true);

  useEffect(() => {
    isLoginRef.current = isLogin;
  }, [isLogin]);

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendVerificationCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }
    
    setIsSendingCode(true);
    setError('');
    
    try {
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      
      const codeData = {
        email: email.toLowerCase(),
        code: code,
        expiresAt: expiresAt,
        verified: false,
        createdAt: new Date().toISOString()
      };
      
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'verifications', email.toLowerCase()), codeData);
      } catch (fsErr) {
        console.warn("Firestore write restricted, using local verification fallback:", fsErr.code);
      }
      
      const templateParams = {
        to_email: email,
        verification_code: code
      };
      
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateIdVerification,
        templateParams,
        EMAILJS_CONFIG.publicKey
      );
      
      setError('');
      setVerificationCode(code);
      if (showToast) showToast('Código enviado. Expira en 10 min.');
    } catch (err) {
      console.error('Error al enviar código:', err);
      let errorMsg = 'No se pudo enviar el código. ';
      if (err && err.text) {
        errorMsg += `EmailJS error: ${err.text}`;
      } else if (err && err.message) {
        errorMsg += err.message;
      } else {
        errorMsg += 'Verifica tu conexión e intenta de nuevo.';
      }
      setError(errorMsg);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!userEnteredCode || userEnteredCode.length !== 6) {
      setError('Por favor, ingresa el código de 6 dígitos.');
      return;
    }
    
    if (verificationCode && userEnteredCode === verificationCode) {
      setIsEmailVerified(true);
      setError('');
      if (showToast) showToast('Correo verificado.');
      return;
    }

    try {
      const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'verifications', email.toLowerCase());
      const codeSnap = await getDoc(codeRef);
      
      if (codeSnap.exists()) {
        const codeData = codeSnap.data();
        if (new Date(codeData.expiresAt) < new Date()) {
          setError('El código ha expirado. Solicita uno nuevo.');
          return;
        }
        if (codeData.code === userEnteredCode) {
          await updateDoc(codeRef, { verified: true });
          setIsEmailVerified(true);
          setError('');
          return;
        }
      }
      setError('El código ingresado no es correcto.');
    } catch (err) {
      console.error('Error al verificar código:', err);
      setError('Código incorrecto o error de verificación.');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    sessionStorage.setItem('isRegistering', 'true');
    
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const isAdmin = ADMIN_EMAILS.includes(user.email);

      if (gatekeeperEnabled === false) {
      } else {
        if (allowedType === 'admin' && !isAdmin) {
          sessionStorage.removeItem('isRegistering');
          await signOut(auth);
          setError('Este acceso es solo para administradores.');
          return;
        }
        if (allowedType === 'client' && isAdmin) {
          sessionStorage.removeItem('isRegistering');
          await signOut(auth);
          setError('Este acceso es solo para clientes.');
          return;
        }
      }

      if (allowedType === 'client' || (gatekeeperEnabled === false && !isAdmin)) {
        const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
        
        try {
          const q = query(clientsRef, where("uid", "==", user.uid));
          const querySnapshot = await getDocs(q, { source: 'server' });
          
          if (querySnapshot.empty) {
            let emailSnapshot = { empty: true };
            try {
              const emailQuery = query(clientsRef, where("email", "==", user.email));
              emailSnapshot = await getDocs(emailQuery, { source: 'server' });
            } catch (e) {
              console.warn("No se pudo buscar por email debido a restricciones de seguridad:", e.code);
            }
            
            if (emailSnapshot.empty) {
              if (isLogin) {
                await deleteUser(user);
                sessionStorage.removeItem('isRegistering');
                setError('⚠️ No tienes una cuenta registrada con Google. Ve a "Regístrate aquí" primero.');
                setLoading(false);
                return;
              } else {
                sessionStorage.setItem('isRegistering', 'true');
                const names = user.displayName ? user.displayName.split(' ') : ['Google', 'User'];
                setFirstName(names[0]);
                setLastName(names.slice(1).join(' ') || '');
                setTempUser(user);
                setIsCompletingProfile(true);
                setLoading(false);
                return;
              }
            } else {
              const existingDoc = emailSnapshot.docs[0];
              await updateDoc(existingDoc.ref, {
                uid: user.uid,
                method: 'google',
                status: 'active'
              });
              sessionStorage.removeItem('isRegistering');
              if (setUser) setUser(user);
            }
          } else {
            const existingClient = querySnapshot.docs[0].data();
            if (existingClient.status === 'disabled') {
              sessionStorage.removeItem('isRegistering');
              await signOut(auth);
              setError('Tu cuenta ha sido inhabilitada por el administrador. Contacta con soporte.');
              return;
            }
            sessionStorage.removeItem('isRegistering');
            if (setUser) setUser(user);
          }
        } catch (dbError) {
          console.error("Error al verificar perfil en Firestore:", dbError);
          if (dbError.code === 'permission-denied') {
            if (isLogin) {
              await deleteUser(user);
              sessionStorage.removeItem('isRegistering');
              setError('⚠️ No tienes una cuenta registrada con Google. Ve a "Regístrate aquí" primero.');
              setLoading(false);
              return;
            }
            sessionStorage.setItem('isRegistering', 'true');
            const names = user.displayName ? user.displayName.split(' ') : ['Google', 'User'];
            setFirstName(names[0]);
            setLastName(names.slice(1).join(' ') || '');
            setTempUser(user);
            setIsCompletingProfile(true);
            setLoading(false);
            return;
          }
          throw dbError;
        }
      }
    } catch (err) {
      sessionStorage.removeItem('isRegistering');
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFinishGoogleRegistration = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
      try {
        await addDoc(clientsRef, {
          uid: tempUser.uid,
          email: tempUser.email,
          firstName: firstName,
          lastName: lastName,
          fullName: `${firstName} ${lastName}`,
          status: 'active',
          createdAt: new Date().toISOString(),
          method: 'google'
        });
      } catch (dbErr) {
        console.error("Error al crear perfil en Firestore tras Google login:", dbErr);
        await deleteUser(tempUser);
        throw new Error("No se pudo completar tu registro en el sistema. Intenta de nuevo.");
      }
      
      const userEmail = tempUser.email;
      sessionStorage.removeItem('isRegistering');
      setIsCompletingProfile(false);
      setTempUser(null);
      setUser(auth.currentUser);
      setIsLogin(true);
      setEmail(userEmail);
      setPassword('');
      setFirstName('');
      setLastName('');
      setError('');
      setLoading(false);
      if (showToast) showToast('¡Registro exitoso! Ya puedes acceder a la tienda.');
    } catch (err) {
      console.error(err);
      setError('Error al finalizar el registro. Intenta de nuevo.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const isAdmin = ADMIN_EMAILS.includes(user.email);

        if (gatekeeperEnabled === false) {
        } else {
          if (allowedType === 'admin' && !isAdmin) {
            await signOut(auth);
            setError('Este acceso es solo para administradores.');
            return;
          }
          if (allowedType === 'client' && isAdmin) {
            await signOut(auth);
            setError('Este acceso es solo para clientes.');
            return;
          }
        }
      } else {
        if (allowedType === 'admin') {
          setError('No se permite el registro de nuevos administradores.');
          return;
        }
        
        if (!isEmailVerified) {
          setError('Por favor, verifica tu correo electrónico antes de registrarte.');
          return;
        }
        
        try {
          const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'verifications', email.toLowerCase());
          const codeSnap = await getDoc(codeRef);
          
          if (codeSnap.exists()) {
            if (!codeSnap.data().verified) {
              setError('Tu correo no ha sido verificado. Solicita un nuevo código.');
              setIsEmailVerified(false);
              setLoading(false);
              return;
            }
            if (new Date(codeSnap.data().expiresAt) < new Date()) {
              setError('El código ha expirado. Solicita uno nuevo.');
              setIsEmailVerified(false);
              setLoading(false);
              return;
            }
          } else if (!isEmailVerified) {
            setError('Verifica tu correo primero.');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Error al verificar código en Firestore (usando validación local):', err.code);
          if (!isEmailVerified) {
            setError('Error al procesar tu registro. Intenta de nuevo.');
            setLoading(false);
            return;
          }
        }
        
        sessionStorage.setItem('isRegistering', 'true');
        
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
          try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), {
              uid: user.uid,
              email: user.email,
              firstName: firstName,
              lastName: lastName,
              fullName: `${firstName} ${lastName}`,
              status: 'active',
              createdAt: new Date().toISOString()
            });
          } catch (dbErr) {
            console.error("Error al crear perfil en Firestore tras registro:", dbErr);
            await deleteUser(user);
            throw new Error("No se pudo completar el registro en la base de datos. Intenta de nuevo.");
          }
          
          try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'verifications', email.toLowerCase()));
          } catch (e) {
            console.warn('No se pudo eliminar el código de verificación:', e);
          }
          
          sessionStorage.removeItem('isRegistering');
          setIsEmailVerified(false);
          setVerificationCode('');
          setUserEnteredCode('');
          if (setUser) setUser(user);
        } catch (err) {
          sessionStorage.removeItem('isRegistering');
          throw err;
        }
      }
    } catch (err) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary-600/5 blur-[150px] rounded-full"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[150px] rounded-full"></div>

      <div className="max-w-md w-full relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${gatekeeperEnabled === false ? 'bg-slate-900 text-white border-slate-800' : (allowedType === 'admin' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-primary-100 text-primary-600 border-primary-200')}`}>
            {gatekeeperEnabled === false ? <><ShieldCheck size={14} /> Sistema SoftStore</> : (allowedType === 'admin' ? <><ShieldCheck size={14} /> Acceso Administrativo</> : <><User size={14} /> Área de Clientes</>)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-10 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative group">
          <div className="flex flex-col items-center mb-10">
            <div className={`${gatekeeperEnabled === false ? 'bg-slate-900 shadow-slate-500/20' : (allowedType === 'admin' ? 'bg-amber-600 shadow-amber-500/20' : 'bg-primary-600 shadow-primary-500/20')} text-white p-5 rounded-[2rem] shadow-2xl mb-6 group-hover:scale-110 transition-transform duration-500`}>
              <Package size={44} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">
              {isCompletingProfile ? 'Finalizar Perfil' : (isLogin ? 'Bienvenido' : 'Crea tu Cuenta')}
            </h2>
            <p className="text-slate-400 font-medium text-sm mt-1">{isLogin ? 'Ingresa tus credenciales para continuar' : 'Únete a nuestra comunidad de élite'}</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-5 rounded-[1.5rem] mb-8 text-xs flex items-start gap-4 border border-red-100 dark:border-red-800 animate-in fade-in slide-in-from-top-4">
              <AlertCircle size={20} className="shrink-0 mt-0.5" /> 
              <span className="font-bold leading-relaxed">{error}</span>
            </div>
          )}
          
          {isCompletingProfile ? (
            <form onSubmit={handleFinishGoogleRegistration} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre</label>
                  <input type="text" required value={firstName} onChange={e=>setFirstName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary-500 transition-all font-bold dark:text-white"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Apellido</label>
                  <input type="text" required value={lastName} onChange={e=>setLastName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary-500 transition-all font-bold dark:text-white"/>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-primary-500/30 transition-all uppercase tracking-widest text-xs">
                {loading ? 'Procesando...' : 'Completar Registro'}
              </button>
              <button 
                type="button" 
                onClick={async () => { 
                  const userToDelete = tempUser || auth.currentUser;
                  if (userToDelete) try { await deleteUser(userToDelete); } catch (e) {}
                  setIsCompletingProfile(false); signOut(auth); sessionStorage.removeItem('isRegistering');
                }} 
                className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600"
              >
                Cancelar y Volver
              </button>
            </form>
          ) : (
            <div className="space-y-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre</label>
                        <input type="text" required value={firstName} onChange={e=>setFirstName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary-500 transition-all font-bold dark:text-white"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Apellido</label>
                        <input type="text" required value={lastName} onChange={e=>setLastName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary-500 transition-all font-bold dark:text-white"/>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                      <input type="email" required value={email} onChange={e=>{setEmail(e.target.value); setIsEmailVerified(false);}} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary-500 transition-all font-bold dark:text-white" disabled={verificationCode && !isEmailVerified}/>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contraseña</label>
                      <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary-500 transition-all font-bold dark:text-white"/>
                    </div>
                    
                    {!isEmailVerified && (
                      <div className="pt-2">
                        {verificationCode ? (
                          <div className="space-y-4 animate-in zoom-in duration-300">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 ml-1">Código de 6 Dígitos</label>
                              <input type="text" required value={userEnteredCode} onChange={e=>setUserEnteredCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full px-6 py-4 bg-primary-50 dark:bg-primary-900/10 border-2 border-primary-200 dark:border-primary-800 rounded-2xl outline-none text-center text-2xl font-black tracking-[0.5em] text-primary-700 dark:text-primary-300"/>
                            </div>
                            <button type="button" onClick={handleVerifyCode} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-3 shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-widest text-xs">
                              <CheckCircle size={18} /> Validar Código
                            </button>
                            <button type="button" onClick={handleSendVerificationCode} disabled={isSendingCode} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-primary-600 transition-colors">
                              {isSendingCode ? 'Enviando...' : 'Reenviar Código de Seguridad'}
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={handleSendVerificationCode} disabled={isSendingCode || !email} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black py-4 rounded-2xl flex justify-center items-center gap-3 transition-all uppercase tracking-widest text-[10px]">
                            {isSendingCode ? 'Enviando...' : <><Mail size={18} /> Verificar Email para Registro</>}
                          </button>
                        )}
                      </div>
                    )}
                    
                    {isEmailVerified && (
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 animate-in slide-in-from-left-4">
                        <CheckCircle size={20} />
                        <span className="text-xs font-black uppercase tracking-tight">Email verificado con éxito</span>
                      </div>
                    )}
                  </>
                )}
                {isLogin && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary-500 transition-all font-bold dark:text-white"/>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contraseña</label>
                      <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary-500 transition-all font-bold dark:text-white"/>
                    </div>
                  </>
                )}
                <button type="submit" disabled={loading || (!isLogin && !isEmailVerified)} className={`w-full ${gatekeeperEnabled === false ? 'bg-slate-900' : (allowedType === 'admin' ? 'bg-amber-600 shadow-amber-500/20' : 'bg-primary-600 shadow-primary-500/20')} text-white font-black py-5 rounded-2xl shadow-2xl flex justify-center items-center hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm disabled:opacity-30 mt-4`}>
                  {loading ? 'Procesando...' : (isLogin ? 'Entrar Ahora' : 'Crear mi Cuenta')}
                </button>
              </form>

              <div className="flex items-center gap-4 py-2">
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Acceso Rápido</span>
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
              </div>

              <button 
                onClick={handleGoogleLogin} 
                disabled={loading}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-black py-4 rounded-2xl flex justify-center items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm group"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                </svg>
                Google
              </button>

              <div className="pt-6 text-center">
                {(allowedType === 'client' || gatekeeperEnabled === false) && (
                  <button onClick={()=>{setIsLogin(!isLogin); setError('');}} className="text-primary-600 text-xs font-black uppercase tracking-widest hover:text-primary-700 underline underline-offset-8 decoration-primary-200 decoration-2 transition-all">
                    {isLogin ? '¿No tienes cuenta? Crea una aquí' : '¿Ya tienes cuenta? Inicia Sesión'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {gatekeeperEnabled !== false && (
          <button onClick={onBack} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-slate-600 transition-all flex items-center justify-center gap-2">
            <ArrowRight size={14} className="rotate-180" /> Volver al Inicio
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthView;
