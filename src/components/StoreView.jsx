import React, { useState, useEffect } from 'react';
import { 
  Monitor, Package, Star, ArrowRight, Clock, 
  ChevronLeft, ChevronRight, Search, Zap, 
  CheckCircle, ShieldCheck, Download, AlertCircle, ShoppingCart
} from 'lucide-react';
import { formatToPeruDate } from '../utils';

const CountdownTimer = ({ expiryDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(expiryDate).getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setIsActive(false);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryDate]);

  if (!isActive) return null;

  return (
    <div className="flex gap-2">
      {[
        { label: 'd', val: timeLeft.days },
        { label: 'h', val: timeLeft.hours },
        { label: 'm', val: timeLeft.minutes },
        { label: 's', val: timeLeft.seconds }
      ].map((t, i) => (
        <div key={i} className="flex flex-col items-center bg-red-600 text-white min-w-[32px] p-1 rounded-lg shadow-lg">
          <span className="text-sm font-black leading-none">{t.val}</span>
          <span className="text-[8px] font-bold uppercase">{t.label}</span>
        </div>
      ))}
    </div>
  );
};

const ProductCard = ({ product, isPurchased, onBuy, onPreview, isAdmin, onEdit }) => {
  const isOfferActive = (p) => {
    if (!p.hasOffer) return false;
    if (!p.offerExpiresAt) return true;
    return new Date(p.offerExpiresAt) > new Date();
  };
  const hasOffer = isOfferActive(product);
  const price = hasOffer ? product.offerPrice : product.price;

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary-500/10 border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden">
      <div className="product-card-glow"></div>
      
      <div className="relative aspect-square mb-6 rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.title} 
            draggable="false"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={64} /></div>
        )}
        
        {hasOffer && (
          <div className="absolute top-4 left-4 z-10 animate-in slide-in-from-left-4 duration-500">
            <div className="bg-red-600 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-xl flex items-center gap-2 uppercase tracking-widest border border-white/20">
              <Zap size={14} className="fill-white" /> {Math.round((1 - (product.offerPrice / product.price)) * 100)}% DCTO
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center p-6">
          <button onClick={() => onPreview(product)} className="w-full bg-white text-slate-900 font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary-50 transition-all shadow-xl uppercase tracking-widest text-xs">
            Ver detalles <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={10} className={`${i < (product.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
          ))}
          <span className="text-[10px] font-bold text-slate-400 ml-1">({product.ratingCount || 0})</span>
        </div>

        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 leading-tight line-clamp-2">{product.title}</h3>
        
        <div className="mt-auto flex items-end justify-between">
          <div className="space-y-1">
            {hasOffer && <p className="text-xs text-slate-400 font-bold line-through tracking-wider">${product.price}</p>}
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">
              <span className="text-primary-600">$</span>{price}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            {hasOffer && product.offerExpiresAt && <CountdownTimer expiryDate={product.offerExpiresAt} />}
            
            {isPurchased ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-4 py-2 rounded-xl flex items-center gap-2 uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
                <CheckCircle size={14} /> Adquirido
              </div>
            ) : (
              <button onClick={() => onBuy(product)} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group/btn">
                <ShoppingCart size={16} className="group-hover/btn:rotate-12 transition-transform" /> Comprar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StoreView = ({ products, banners, isAdmin, purchases, setCheckoutProduct, setActiveTab, setEditingProduct, isLoading, previewProduct, setPreviewProduct, allReviews }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentBanner, setCurrentBanner] = useState(0);
  const activeBanners = banners.filter(b => b.active && b.position === 'top');

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
    const isOfferActive = (p) => {
      if (!p.hasOffer) return false;
      if (!p.offerExpiresAt) return true;
      return new Date(p.offerExpiresAt) > new Date();
    };
    const hasOffer = isOfferActive(previewProduct);
    const price = hasOffer ? previewProduct.offerPrice : previewProduct.price;

    return (
      <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        <button onClick={() => setPreviewProduct(null)} className="mb-8 flex items-center gap-3 text-slate-400 hover:text-primary-600 font-black text-xs uppercase tracking-[0.2em] group transition-all">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Volver al catálogo
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8 sticky top-32">
            <div className="relative aspect-square bg-white dark:bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 p-8 flex items-center justify-center">
              {previewProduct.imageUrl ? (
                <img 
                  src={previewProduct.imageUrl} 
                  draggable="false"
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-700 pointer-events-none" 
                />
              ) : (
                <Package size={120} className="text-slate-100" />
              )}
              {hasOffer && (
                <div className="absolute top-8 left-8">
                  <div className="bg-red-600 text-white px-6 py-3 rounded-full font-black text-sm shadow-2xl flex items-center gap-3 uppercase tracking-widest animate-bounce">
                    <Zap size={20} className="fill-white" /> ¡OFERTA ESPECIAL!
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Versión</p>
                <p className="text-sm font-black text-slate-800 dark:text-white italic">Estable</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Soporte</p>
                <p className="text-sm font-black text-slate-800 dark:text-white italic">Videos instructivos</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Licencia</p>
                <p className="text-sm font-black text-slate-800 dark:text-white italic">Vitalicia</p>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className={`${i < Math.floor(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                <span className="text-sm font-black text-amber-500">{avgRating}</span>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">• {reviews.length} reseñas</span>
              </div>
              <h1 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight italic">{previewProduct.title}</h1>
              <div className="h-2 w-24 bg-primary-600 rounded-full"></div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Precio de Acceso</p>
                  <div className="flex items-baseline gap-4">
                    <p className="text-6xl font-black text-primary-600 tracking-tighter italic"><span className="text-3xl">$</span>{price}</p>
                    {hasOffer && <p className="text-2xl text-slate-300 font-bold line-through tracking-wider decoration-red-500/50">${previewProduct.price}</p>}
                  </div>
                </div>
                {hasOffer && previewProduct.offerExpiresAt && (
                  <div className="text-right space-y-2">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">La oferta termina en:</p>
                    <CountdownTimer expiryDate={previewProduct.offerExpiresAt} />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {hasPurchased ? (
                  <button onClick={() => setActiveTab('library')} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 rounded-2xl shadow-2xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-sm group">
                    <Download size={24} className="group-hover:translate-y-1 transition-transform" /> Ir a mis programas
                  </button>
                ) : (
                  <button onClick={() => setCheckoutProduct(previewProduct)} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-6 rounded-2xl shadow-2xl shadow-primary-500/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-sm group">
                    <ShoppingCart size={24} className="group-hover:rotate-12 transition-transform" /> Adquirir Ahora
                  </button>
                )}
                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" /> Transacción 100% Segura y Encriptada
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic flex items-center gap-3">
                <Monitor size={28} className="text-primary-600" /> Descripción del Software
              </h3>
              <div className="rich-text-content text-slate-600 dark:text-slate-400 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: previewProduct.description }}></div>
            </div>

            <div className="pt-12 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter italic">Reseñas de Usuarios</h3>
                <div className="bg-slate-100 dark:bg-slate-800 px-6 py-2 rounded-2xl">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">{reviews.length} Opiniones</span>
                </div>
              </div>
              
              {reviews.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-12 rounded-[3rem] text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <Star size={48} className="mx-auto text-slate-200 mb-4 opacity-20" />
                  <p className="text-slate-400 font-bold">Sé el primero en calificar este programa.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {reviews.map(review => (
                    <div key={review.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 hover:shadow-xl transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-500/20">
                            {review.userName?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 dark:text-white italic">{review.userName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatToPeruDate(review.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} className={`${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">"{review.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
            Accede a las mejores herramientas profesionales con un solo pago.
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
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-contain relative z-10 drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)] hover:rotate-3 transition-transform duration-500" />
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
                onPreview={setPreviewProduct}
                isAdmin={isAdmin}
                onEdit={setEditingProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreView;
