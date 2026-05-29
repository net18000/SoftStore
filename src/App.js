import React, { useState, useEffect } from 'react';
import { 
  LogOut, ShoppingCart, User, Settings, Package, LayoutGrid, HardDrive, ShieldCheck, Sun, Moon, ArrowRight, Star
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, onSnapshot, query, where, addDoc, doc, setDoc, getDoc 
} from 'firebase/firestore';
import { auth, db } from './config/firebase.js';
import { appId, ADMIN_EMAILS } from './config/constants.js';
import { checkIsAdmin, formatToPeruDate } from './utils/helpers.js';
import { Toast, FloatingBanner, ErrorBoundary } from './components/Common.js';
import { GatekeeperView, AuthView, BlockedView } from './components/Auth.js';
import { StoreView } from './components/Store.js';
import { LibraryView } from './components/Library.js';
import { AdminPanel } from './components/Admin.js';
import { CheckoutModal } from './components/Checkout.js';

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('store');
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isBlocked, setIsBlocked] = useState(false);
  const [gatekeeperValidated, setGatekeeperValidated] = useState(() => sessionStorage.getItem('gatekeeperValidated') === 'true');
  const [gatekeeperEnabled, setGatekeeperEnabled] = useState(true);
  const [authViewType, setAuthViewType] = useState(null);

  const isAdmin = checkIsAdmin(user);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    const checkBlocked = async () => {
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('deviceId', deviceId);
      }
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'blocked'), where("deviceId", "==", deviceId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) setIsBlocked(true);
      });
      return unsubscribe;
    };
    checkBlocked();
  }, []);

  useEffect(() => {
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'config');
    const unsubscribe = onSnapshot(configRef, (snap) => {
      if (snap.exists()) setGatekeeperEnabled(snap.data().enabled !== false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const purchasesRef = collection(db, 'artifacts', appId, 'users', u.uid, 'purchases');
        onSnapshot(purchasesRef, (snapshot) => {
          setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        
        if (sessionStorage.getItem('isRegistering') !== 'true') {
          addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'visitorLogs'), {
            userId: u.uid,
            userEmail: u.email,
            timestamp: new Date().toISOString(),
            ip: 'fetching...',
            deviceId: localStorage.getItem('deviceId') || 'unknown',
            userAgent: navigator.userAgent
          }).then(docRef => {
            fetch('https://api.ipify.org?format=json')
              .then(res => res.json())
              .then(data => setDoc(docRef, { ip: data.ip }, { merge: true }))
              .catch(() => {});
          });
        }
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const unsubProducts = onSnapshot(productsRef, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const bannersRef = collection(db, 'artifacts', appId, 'public', 'data', 'banners');
    const unsubBanners = onSnapshot(bannersRef, (snapshot) => {
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const reviewsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reviews');
    const unsubReviews = onSnapshot(reviewsRef, (snapshot) => {
      setAllReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubProducts(); unsubBanners(); unsubReviews(); };
  }, []);

  const handleLogout = async () => {
    if (confirm("¿Estás seguro de cerrar sesión?")) {
      await signOut(auth);
      showToast("Sesión cerrada correctamente.");
    }
  };

  const handleGatekeeperValidate = (isAdminView, code) => {
    if (isAdminView) {
      setAuthViewType('admin');
    } else {
      setGatekeeperValidated(true);
      sessionStorage.setItem('gatekeeperValidated', 'true');
      showToast("Acceso concedido.");
    }
  };

  if (isBlocked) return <BlockedView />;
  
  if (gatekeeperEnabled && !gatekeeperValidated && !authViewType) {
    return <GatekeeperView onValidate={handleGatekeeperValidate} showToast={showToast} />;
  }

  if (!user || authViewType) {
    return <AuthView 
      allowedType={authViewType || 'client'} 
      onBack={() => setAuthViewType(null)} 
      setUser={setUser} 
      gatekeeperEnabled={gatekeeperEnabled}
      showToast={showToast}
    />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 font-sans selection:bg-primary-500 selection:text-white">
        <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 transition-all duration-500">
          <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
            <div className="flex items-center gap-12">
              <div 
                onClick={() => setActiveTab('store')} 
                className="flex items-center gap-4 cursor-pointer group"
              >
                <div className="bg-primary-600 text-white p-3 rounded-2xl shadow-2xl shadow-primary-500/30 group-hover:rotate-12 transition-transform duration-500">
                  <Package size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tighter dark:text-white bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent italic">SoftStore</h1>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sistema Oficial</p>
                  </div>
                </div>
              </div>
              
              <div className="hidden lg:flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                <button 
                  onClick={() => setActiveTab('store')} 
                  className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'store' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-xl shadow-slate-200 dark:shadow-none translate-y-[-1px]' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  <LayoutGrid size={18} /> Catálogo
                </button>
                <button 
                  onClick={() => setActiveTab('library')} 
                  className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all relative ${activeTab === 'library' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-xl shadow-slate-200 dark:shadow-none translate-y-[-1px]' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  <HardDrive size={18} /> Mi Biblioteca
                  {purchases.filter(p => p.status === 'completed').length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-600 text-white text-[9px] flex items-center justify-center rounded-full animate-bounce">
                      {purchases.filter(p => p.status === 'completed').length}
                    </span>
                  )}
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => setActiveTab('admin')} 
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'admin' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl translate-y-[-1px]' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <Settings size={18} /> Panel Admin
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="p-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:scale-110 active:scale-95 transition-all border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>
              
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[150px]">{user.displayName || user.email.split('@')[0]}</p>
                  <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest">{isAdmin ? 'Administrador' : 'Cliente Premium'}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-3.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100 dark:border-red-900/20 group"
                >
                  <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 relative">
          <FloatingBanner banner={banners.find(b => b.active && b.position === 'left')} side="left" />
          <FloatingBanner banner={banners.find(b => b.active && b.position === 'right')} side="right" />
          
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {activeTab === 'store' && (
              <StoreView 
                products={products} 
                banners={banners}
                isAdmin={isAdmin} 
                purchases={purchases}
                setCheckoutProduct={setCheckoutProduct} 
                setActiveTab={setActiveTab}
                setEditingProduct={setEditingProduct}
                isLoading={isLoading}
                previewProduct={previewProduct}
                setPreviewProduct={setPreviewProduct}
                allReviews={allReviews}
              />
            )}
            {activeTab === 'library' && (
              <LibraryView 
                products={products} 
                purchases={purchases} 
                setActiveTab={setActiveTab} 
                showToast={showToast}
                allReviews={allReviews}
                user={user}
              />
            )}
            {activeTab === 'admin' && isAdmin && (
              <AdminPanel 
                products={products} 
                banners={banners}
                showToast={showToast} 
                editingProduct={editingProduct}
                setEditingProduct={setEditingProduct}
                setPreviewProduct={setPreviewProduct}
                setActiveTab={setActiveTab}
                user={user}
              />
            )}
          </div>
        </main>

        <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-16 px-6 transition-all duration-500">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary-600 text-white p-2.5 rounded-xl shadow-lg shadow-primary-500/20"><Package size={24} /></div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter italic">SoftStore</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">La plataforma líder en distribución de software profesional para radio y producción multimedia. Calidad garantizada.</p>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Navegación</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li><button onClick={() => setActiveTab('store')} className="hover:text-primary-600 transition-colors">Catálogo Completo</button></li>
                <li><button onClick={() => setActiveTab('library')} className="hover:text-primary-600 transition-colors">Mi Biblioteca</button></li>
                <li><button className="hover:text-primary-600 transition-colors">Términos de Servicio</button></li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Soporte Técnico</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li className="flex items-center gap-3"><ShieldCheck size={18} className="text-emerald-500" /> Garantía de Activación</li>
                <li className="flex items-center gap-3"><Star size={18} className="text-amber-500" /> Soporte Premium 24/7</li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Seguridad</h4>
              <div className="flex gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner"><ShieldCheck size={24} className="text-primary-600" /></div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner"><ShoppingCart size={24} className="text-emerald-600" /></div>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">© 2024 SoftStore • Todos los derechos reservados</p>
            <div className="flex items-center gap-8">
              <a href="#" className="text-slate-400 hover:text-primary-600 transition-colors"><Smartphone size={20} /></a>
              <a href="#" className="text-slate-400 hover:text-primary-600 transition-colors"><Globe size={20} /></a>
            </div>
          </div>
        </footer>

        {checkoutProduct && (
          <CheckoutModal 
            product={checkoutProduct} 
            user={user} 
            onClose={() => setCheckoutProduct(null)} 
            showToast={showToast}
            setActiveTab={setActiveTab}
          />
        )}
        <Toast toast={toast} />
      </div>
    </ErrorBoundary>
  );
};

export default App;
