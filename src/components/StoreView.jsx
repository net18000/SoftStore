import React, { useState, useEffect } from 'react';
import { 
  Monitor, Package, Star, ArrowRight, Clock, 
  ChevronLeft, ChevronRight, Search, Zap, 
  CheckCircle, ShieldCheck, Download, AlertCircle, ShoppingCart, Settings
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import ProductDetails from './ProductDetails';

const StoreView = ({ products, banners, isAdmin, purchases, setCheckoutProduct, setEditingProduct, isLoading, allReviews }) => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentBanner, setCurrentBanner] = useState(0);
  const activeBanners = banners.filter(b => b.active && b.position === 'top');

  const previewProduct = products.find(p => p.id === productId);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const filteredProducts = products.filter(p => 
    p.isVisible !== false && 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isPurchased = (id) => purchases.some(p => p.productId === id && p.status === 'completed');

  if (previewProduct) {
    const reviews = allReviews.filter(r => r.productId === previewProduct.id && r.isVisible !== false);
    const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : (previewProduct.rating || 5);
    const hasPurchased = isPurchased(previewProduct.id);

    return (
      <ProductDetails 
        previewProduct={previewProduct}
        onBack={() => navigate('/productos')}
        isAdmin={isAdmin}
        hasPurchased={hasPurchased}
        setCheckoutProduct={setCheckoutProduct}
        setActiveTab={(tab) => navigate(tab === 'admin' ? '/admin/productos' : tab === 'library' ? '/biblioteca' : '/productos')}
        setEditingProduct={setEditingProduct}
        reviews={reviews}
        avgRating={avgRating}
      />
    );
  }

  return (
    <div className="space-y-12">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="relative z-10 space-y-8 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.3em]">
            <ShieldCheck size={16} className="text-blue-400" /> Sistema de Entrega Instantánea
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight italic">
            Potencia tu <span className="text-blue-400">emisora</span> hoy mismo
          </h2>
          <p className="text-xl text-blue-100/80 font-bold leading-relaxed">
            Accede a las mejores herramientas profesionales.
          </p>
          <div className="flex flex-wrap justify-center gap-10 pt-8 border-t border-white/10">
            <div className="text-center">
              <p className="text-4xl font-black text-white italic">100%</p>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Seguro</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-white italic">Auto</p>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Descarga</p>
            </div>
          </div>
        </div>
      </div>

      {activeBanners.length > 0 && (
        <div className="relative h-[300px] sm:h-[450px] rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 group">
          {activeBanners.map((banner, index) => (
            <div 
              key={banner.id} 
              className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${index === currentBanner ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-105 translate-x-full'}`}
              style={{ backgroundColor: banner.bgColor }}
            >
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              <div className="relative h-full flex flex-col md:flex-row items-center justify-center md:justify-between px-10 md:px-24 gap-12">
                <div className="text-center md:text-left space-y-6 max-w-xl animate-in slide-in-from-left-8 duration-700">
                  <div className="inline-block bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 text-white text-[10px] font-black uppercase tracking-[0.3em] mb-2 shadow-lg">Oferta Exclusiva</div>
                  <h2 className="text-5xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter drop-shadow-2xl italic">{banner.title}</h2>
                  <p className="text-lg md:text-2xl text-white/90 font-bold tracking-tight max-w-md leading-relaxed">{banner.subtitle}</p>
                  {banner.link && (
                    <a href={banner.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 bg-white text-slate-900 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-2xl hover:scale-105 active:scale-95 group">
                      Ver Detalles <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                    </a>
                  )}
                </div>
                <div className="hidden md:block w-96 h-96 relative animate-in zoom-in duration-1000">
                  <div className="absolute inset-0 bg-white/10 blur-[100px] rounded-full animate-pulse"></div>
                  <img src={banner.imageUrl} alt={banner.title} draggable="false" className="w-full h-full object-contain relative z-10 drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)] hover:rotate-3 transition-transform duration-500 pointer-events-none" />
                </div>
              </div>
            </div>
          ))}
          
          {activeBanners.length > 1 && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-20">
              {activeBanners.map((_, i) => (
                <button key={i} onClick={() => setCurrentBanner(i)} className={`h-2.5 rounded-full transition-all duration-500 border border-white/20 ${i === currentBanner ? 'w-12 bg-white shadow-lg' : 'w-2.5 bg-white/40 hover:bg-white/60'}`}></button>
              ))}
            </div>
          )}

          <button onClick={() => setCurrentBanner(prev => (prev - 1 + activeBanners.length) % activeBanners.length)} className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all border border-white/20 hidden sm:block"><ChevronLeft size={24} /></button>
          <button onClick={() => setCurrentBanner(prev => (prev + 1) % activeBanners.length)} className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all border border-white/20 hidden sm:block"><ChevronRight size={24} /></button>
        </div>
      )}

      <div className="space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">Explorar Catálogo</h2>
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Programas listos para descarga inmediata
            </div>
          </div>
          
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-8 py-5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl outline-none focus:border-primary-600 transition-all shadow-sm font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 animate-pulse space-y-6">
                <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-3xl"></div>
                <div className="space-y-3">
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2"></div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-full w-24"></div>
                  <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl w-32"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Search size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 italic">No encontramos resultados</h3>
            <p className="text-slate-400 font-medium">Intenta buscar con otros términos o explora todo el catálogo.</p>
            <button onClick={() => setSearchTerm('')} className="mt-8 text-primary-600 font-black text-sm uppercase tracking-widest hover:underline decoration-2 underline-offset-8">Mostrar todo el software</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map(p => (
              <ProductCard 
                key={p.id} 
                product={p} 
                isPurchased={isPurchased(p.id)} 
                onBuy={setCheckoutProduct}
                onPreview={(product) => navigate(`/productos/${product.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreView;
