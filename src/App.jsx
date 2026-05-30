import React, { useState, useEffect } from 'react';
import { 
  Package, Monitor, HardDrive, Settings, LogOut, Shield 
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  doc, onSnapshot, collection, query, where, 
  getDocs, addDoc, updateDoc 
} from 'firebase/firestore';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import { auth, db, checkIsAdmin } from './utils';
import { appId, ADMIN_EMAILS } from './config';

import Toast from './components/Toast';
import GatekeeperView from './components/GatekeeperView';
import AuthView from './components/AuthView';
import BlockedView from './components/BlockedView';
import StoreView from './components/StoreView';
import LibraryView from './components/LibraryView';
import AdminPanel from './components/AdminPanel';
import CheckoutModal from './components/CheckoutModal';
import FloatingBanner from './components/FloatingBanner';

function App() {
  const [user, setUser] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCodeValidated, setIsCodeValidated] = useState(sessionStorage.getItem('isCodeValidated') === 'true');
  const [gatekeeperConfig, setGatekeeperConfig] = useState({ frequencyMinutes: 30, enabled: null });
  const [validatedCode, setValidatedCode] = useState(sessionStorage.getItem('validatedCode') || '');
  const [allowedType, setAllowedType] = useState(sessionStorage.getItem('allowedType') || 'client');
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const isAdmin = checkIsAdmin(user);
  
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname.startsWith('/admin')) return 'admin';
    if (location.pathname.startsWith('/biblioteca')) return 'library';
    if (location.pathname.startsWith('/productos')) return 'store';
    return 'store';
  };

  const activeTab = getActiveTab();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut(auth);
    navigate('/productos');
  };

  useEffect(() => {
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'config');
    const unsubscribe = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        setGatekeeperConfig(snap.data());
      }
      setIsConfigLoading(false);
    }, (error) => {
      console.error("Error loading config:", error);
      setIsConfigLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const deviceId = localStorage.getItem('deviceId');
    if (!deviceId) return;

    const blockedRef = collection(db, 'artifacts', appId, 'public', 'data', 'blocked');
    const q = query(blockedRef, where("deviceId", "==", deviceId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const activeUser = auth.currentUser || user;
        const isAdminUser = activeUser && ADMIN_EMAILS.includes(activeUser.email);
        if (!isAdminUser) {
          setIsBlocked(true);
        } else {
          setIsBlocked(false);
        }
      } else {
        setIsBlocked(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const trackVisitor = async () => {
      try {
        const activeUser = auth.currentUser || user;
        const activeProfile = userProfile;
        
        const currentEmail = activeProfile?.fullName 
          ? `${activeProfile.fullName} (${activeUser?.email})` 
          : (activeUser?.email || 'Visitante no autenticado');
          
        const lastTrackedEmail = sessionStorage.getItem('lastTrackedEmail');
        const currentVisitId = sessionStorage.getItem('currentVisitId');

        if (lastTrackedEmail === currentEmail && currentVisitId) return;

        if (!localStorage.getItem('deviceId')) {
          localStorage.setItem('deviceId', 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase());
        }
        const deviceId = localStorage.getItem('deviceId');

        let ipData = null;
        const cachedIP = sessionStorage.getItem('cachedVisitorIP');
        if (cachedIP) {
          try { 
            const parsed = JSON.parse(cachedIP);
            if (parsed.city && parsed.city !== 'Desconocida') ipData = parsed; 
          } catch (e) { }
        }

        if (!ipData) {
          const fetchIP = async () => {
            try {
              const res = await fetch('https://ipapi.co/json/');
              if (res.ok) return await res.json();
              const res2 = await fetch('https://ip-api.com/json/');
              if (res2.ok) {
                const data2 = await res2.json();
                return { ip: data2.query, city: data2.city, region: data2.regionName, country_name: data2.country, org: data2.isp };
              }
            } catch (e) { console.error("Error IP fetch:", e); }
            return null;
          };
          ipData = await fetchIP();
          if (ipData) sessionStorage.setItem('cachedVisitorIP', JSON.stringify(ipData));
        }
        
        const visitData = {
          ip: ipData?.ip || ipData?.query || 'IP Protegida/VPN',
          city: ipData?.city || 'Desconocida',
          region: ipData?.region || ipData?.region_name || 'Desconocida',
          country: ipData?.country_name || ipData?.country || 'Desconocido',
          org: ipData?.org || ipData?.isp || 'Proveedor Desconocido',
          device: navigator.userAgent,
          deviceId: deviceId,
          timestamp: new Date().toISOString(),
          path: window.location.pathname,
          referrer: document.referrer || 'Directo',
          userEmail: currentEmail,
          isAdmin: (activeUser && ADMIN_EMAILS.includes(activeUser.email)) || false
        };

        if (currentVisitId) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'visitorLogs', currentVisitId), {
            ...visitData,
            updatedAt: new Date().toISOString()
          });
        } else {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'visitorLogs'), visitData);
          sessionStorage.setItem('currentVisitId', docRef.id);
        }
        sessionStorage.setItem('lastTrackedEmail', currentEmail);
      } catch (error) {
        console.error("Error en trackVisitor:", error);
      }
    };

    if (!isInitializing) {
      trackVisitor();
    }
  }, [isInitializing, user, userProfile]);

  const leftBanner = banners.find(b => b.active && b.position === 'left');
  const rightBanner = banners.find(b => b.active && b.position === 'right');

  const handleValidateCode = (isAdminEntry, code) => {
    setIsCodeValidated(true);
    setValidatedCode(code || '');
    setAllowedType(isAdminEntry ? 'admin' : 'client');
    sessionStorage.setItem('isCodeValidated', 'true');
    sessionStorage.setItem('validatedCode', code || '');
    sessionStorage.setItem('allowedType', isAdminEntry ? 'admin' : 'client');
    
    if (auth.currentUser) {
      signOut(auth);
    }
  };

  const handleBackToStart = () => {
    setIsCodeValidated(false);
    setValidatedCode('');
    setAllowedType('client');
    sessionStorage.removeItem('isCodeValidated');
    sessionStorage.removeItem('validatedCode');
    sessionStorage.removeItem('allowedType');
    sessionStorage.removeItem('isRegistering');
  };

  useEffect(() => {
    if (!isCodeValidated || allowedType === 'admin') return;

    const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'currentCode');
    const unsubscribe = onSnapshot(codeRef, (snap) => {
      if (snap.exists()) {
        const remoteCode = snap.data().code;
        if (validatedCode && remoteCode !== validatedCode) {
          handleBackToStart();
          showToast("El código de acceso ha cambiado o expirado. Por seguridad, ingresa el nuevo código.", "error");
        }
      }
    });

    return () => unsubscribe();
  }, [isCodeValidated, allowedType, validatedCode]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsProfileLoading(true);
      try {
        if (currentUser) {
          const isAdminUser = ADMIN_EMAILS.includes(currentUser.email);
          
          if (!isAdminUser && sessionStorage.getItem('isRegistering') === 'true') {
            setIsInitializing(false);
            setIsProfileLoading(false);
            return;
          }

          if (!isAdminUser) {
            const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
            const q = query(clientsRef, where("uid", "==", currentUser.uid));
            
            try {
              const querySnapshot = await getDocs(q, { source: 'server' });
              if (!querySnapshot.empty) {
                const profile = querySnapshot.docs[0].data();
                setUserProfile(profile);
              } else {
                setUserProfile(null);
              }
            } catch (dbError) {
              console.warn("Firestore access restricted:", dbError.code);
              setUserProfile(null);
            }
          }
        } else {
          setUserProfile(null);
          setIsSigningOut(false);
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Error en auth state:", error);
        if (error.code !== 'permission-denied') {
          setUser(null);
        }
      } finally {
        setIsInitializing(false);
        setIsProfileLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const unsubscribeProducts = onSnapshot(productsRef, (snapshot) => {
      const loadedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedProducts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setProducts(loadedProducts);
      setIsLoading(false);
    });

    const bannersRef = collection(db, 'artifacts', appId, 'public', 'data', 'banners');
    const unsubscribeBanners = onSnapshot(bannersRef, (snapshot) => {
      const loadedBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedBanners.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setBanners(loadedBanners);
    });

    const purchasesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'purchases');
    const unsubscribePurchases = onSnapshot(purchasesRef, (snapshot) => {
      const loadedPurchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPurchases(loadedPurchases);
    });

    const reviewsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reviews');
    const unsubscribeReviews = onSnapshot(reviewsRef, (snapshot) => {
      const loadedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllReviews(loadedReviews);
    });

    const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const q = query(clientsRef, where("uid", "==", user.uid));
    const unsubscribeProfile = onSnapshot(q, async (snapshot) => {
      if (isSigningOut || isAdmin) return;

      if (!snapshot.empty) {
        const profile = snapshot.docs[0].data();
        setUserProfile(profile);

        if (profile.status === 'disabled' && !isAdmin) {
          setIsSigningOut(true);
          await signOut(auth);
          showToast("Tu cuenta ha sido inhabilitada. Contacta al administrador.", "error");
          return;
        }
      } else {
        setIsSigningOut(true);
        await signOut(auth);
        showToast("Tu cuenta ha sido eliminada por el administrador.", "error");
      }
    });

    return () => { 
      unsubscribeProducts(); 
      unsubscribeBanners(); 
      unsubscribePurchases(); 
      unsubscribeReviews(); 
      unsubscribeProfile(); 
    };
  }, [user]);

  useEffect(() => {
    if (user && isAdmin && location.pathname === '/') {
      navigate('/admin/productos');
    }
  }, [user, isAdmin, location.pathname, navigate]);

  if (isBlocked) return <BlockedView />;
  if (isInitializing || isConfigLoading) return null;

   if (!user && !isCodeValidated && gatekeeperConfig.enabled === true) {
     return (
       <>
         <GatekeeperView onValidate={handleValidateCode} showToast={showToast} />
         <Toast toast={toast} />
       </>
     );
   }

   if (!user) return (
     <>
       <AuthView allowedType={allowedType} onBack={handleBackToStart} setUser={setUser} gatekeeperEnabled={gatekeeperConfig.enabled} showToast={showToast} />
       <Toast toast={toast} />
     </>
   );

  if (!isAdmin && userProfile && userProfile.status === 'disabled') {
    return (
      <>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-red-100 dark:border-red-900/20 text-center space-y-6">
            <div className="bg-red-50 dark:bg-red-900/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-red-500">
              <Shield size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Cuenta Inhabilitada</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Lo sentimos, tu acceso a SoftStore ha sido restringido por un administrador. Si crees que esto es un error, contacta con soporte.</p>
            </div>
            <button onClick={() => {
              signOut(auth);
              handleBackToStart();
            }} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-2 hover:opacity-90 transition-all">
              <LogOut size={20} /> VOLVER AL INICIO
            </button>
          </div>
        </div>
        <Toast toast={toast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">
      <nav className="glass sticky top-0 z-50 border-b border-white/20 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="bg-primary-600 text-white p-2.5 rounded-2xl shadow-xl shadow-primary-500/20 rotate-3 group-hover:rotate-0 transition-transform"><Package size={26} /></div>
            <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">SoftStore</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {!isAdmin && (
              <button onClick={() => navigate('/productos')} className={`px-4 py-2.5 rounded-2xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'store' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm'}`}>
                <Monitor size={18} />
                <span className="hidden sm:inline">Tienda</span>
              </button>
            )}
            {!isAdmin && (
              <button onClick={() => navigate('/biblioteca')} className={`px-4 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-all ${activeTab === 'library' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm'}`}>
                <HardDrive size={18} />
                <span className="hidden sm:inline">Mis Programas</span>
                {purchases.length > 0 && <span className="bg-white text-primary-600 text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-black">{purchases.length}</span>}
              </button>
            )}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/productos')} className={`px-4 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-all ${activeTab === 'store' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm'}`}>
                  <Monitor size={18} />
                  <span className="hidden sm:inline">Ver Tienda</span>
                </button>
                <button onClick={() => navigate('/admin/productos')} className={`px-4 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-all ${activeTab === 'admin' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm'}`}>
                  <Settings size={18} />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-4 pl-4 sm:pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden md:flex flex-col items-end">
                {isAdmin && <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary-500 leading-tight mb-0.5">Admin Access</span>}
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate max-w-[150px] leading-tight">{userProfile?.fullName || user?.email?.split('@')[0]}</span>
              </div>
              <button onClick={handleSignOut} className="text-slate-400 hover:text-red-500 p-2.5 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/20"><LogOut size={22} /></button>
            </div>
          </div>
        </div>
        </div>
      </nav>

      {!isAdmin && activeTab === 'store' && (
        <>
          <FloatingBanner banner={leftBanner} side="left" />
          <FloatingBanner banner={rightBanner} side="right" />
        </>
      )}

      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/productos" />} />
          <Route path="/productos" element={<StoreView products={products} banners={banners} isAdmin={isAdmin} purchases={purchases} setCheckoutProduct={setCheckoutProduct} setEditingProduct={setEditingProduct} isLoading={isLoading} allReviews={allReviews} />} />
          <Route path="/productos/:productId" element={<StoreView products={products} banners={banners} isAdmin={isAdmin} purchases={purchases} setCheckoutProduct={setCheckoutProduct} setEditingProduct={setEditingProduct} isLoading={isLoading} allReviews={allReviews} />} />
          
          <Route path="/biblioteca" element={<LibraryView products={products} purchases={purchases} showToast={showToast} allReviews={allReviews} user={user} />} />
          <Route path="/biblioteca/:productId" element={<LibraryView products={products} purchases={purchases} showToast={showToast} allReviews={allReviews} user={user} />} />

          <Route path="/admin" element={isAdmin ? <Navigate to="/admin/productos" /> : <Navigate to="/" />} />
          <Route path="/admin/:tab" element={isAdmin ? <AdminPanel products={products} banners={banners} showToast={showToast} editingProduct={editingProduct} setEditingProduct={setEditingProduct} user={user} /> : <Navigate to="/" />} />
          
          <Route path="*" element={<Navigate to="/productos" />} />
        </Routes>
      </main>
      <CheckoutModal checkoutProduct={checkoutProduct} setCheckoutProduct={setCheckoutProduct} user={user} showToast={showToast} purchases={purchases} setActiveTab={(tab) => navigate(tab === 'library' ? '/biblioteca' : '/productos')} />
      <Toast toast={toast} />
    </div>
  );
}

export default App;
