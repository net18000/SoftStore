import React, { useState, useEffect } from 'react';
import { 
  Search, Monitor, Zap, ArrowRight, Star, ShieldCheck, HelpCircle, FileText, ShoppingCart, Clock, CreditCard, Smartphone, Globe, Package 
} from 'lucide-react';
import { formatToPeruDate } from '../utils/helpers.js';

export const CountdownTimer = ({ expiryDate }) => {
  const [timeLeft, setTimeLeft] = useState({
    totalHours: 0,
    days: 0,
    minutes: 0,
    seconds: 0,
    expired: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(expiryDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { totalHours: 0, days: 0, minutes: 0, seconds: 0, expired: true };
      }

      return {
        totalHours: Math.floor(difference / (1000 * 60 * 60)),
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        expired: false
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const updatedTime = calculateTimeLeft();
      setTimeLeft(updatedTime);
      if (updatedTime.expired) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryDate]);

  if (timeLeft.expired) return null;

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg w-fit">
        <Clock size={12} /> 
        La oferta termina {timeLeft.days > 0 ? `en ${timeLeft.days} ${timeLeft.days === 1 ? 'día' : 'días'}` : 'pronto'}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-xl text-center min-w-[55px] shadow-lg border border-white/10">
          <div className="text-lg font-black leading-none tracking-tighter">{String(timeLeft.totalHours).padStart(2, '0')}</div>
          <div className="text-[7px] uppercase font-black text-slate-400 mt-1">Horas</div>
        </div>
        <div className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-xl text-center min-w-[55px] shadow-lg border border-white/10">
          <div className="text-lg font-black leading-none tracking-tighter">{String(timeLeft.minutes).padStart(2, '0')}</div>
          <div className="text-[7px] uppercase font-black text-slate-400 mt-1">Minutos</div>
        </div>
        <div className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-xl text-center min-w-[55px] shadow-lg border border-white/10 border-primary-500/30">
          <div className="text-lg font-black leading-none tracking-tighter text-primary-400">{String(timeLeft.seconds).padStart(2, '0')}</div>
          <div className="text-[7px] uppercase font-black text-primary-500/70 mt-1">Segundos</div>
        </div>
      </div>
    </div>
  );
};

export const StoreView = ({ products, banners, isAdmin, purchases, setCheckoutProduct, setActiveTab, setEditingProduct, isLoading, previewProduct, setPreviewProduct, allReviews }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const isOfferActive = (product) => {
    if (!product.hasOffer) return false;
    if (!product.offerExpiresAt) return true;
    return new Date(product.offerExpiresAt) > new Date();
  };

  const getDiscountPercentage = (product) => {
    if (!product.price || !product.offerPrice) return 0;
    return Math.round(100 - (product.offerPrice * 100 / product.price));
  };

  const activeBanners = banners.filter(b => b.active && (b.position === 'top' || !b.position));

  useEffect(() => {
    if (activeBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [activeBanners.length]);

  useEffect(() => {
    if (previewProduct) {
      setSelectedProductDetails(previewProduct);
    }
  }, [previewProduct]);

  const handleBack = () => {
    if (previewProduct) {
      setPreviewProduct(null);
      setActiveTab('admin');
    } else {
      setSelectedProductDetails(null);
    }
  };

  if (isLoading) return <div className="text-center py-20 text-slate-500">Cargando tienda...</div>;
  
  const getPurchaseStatus = (productId) => {
    const productPurchases = purchases.filter(p => p.productId === productId);
    if (productPurchases.some(p => p.status === 'completed')) return 'completed';
    if (productPurchases.some(p => p.status === 'pending' || !p.status)) return 'pending';
    return null;
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (isAdmin) return matchesSearch;
    return matchesSearch && p.isVisible !== false;
  });

  if (products.length === 0 && activeBanners.length === 0) return <div className="text-center py-20"><Package size={64} className="mx-auto text-slate-300 mb-4" /><h2 className="text-2xl font-bold mb-2">Tienda Vacía</h2></div>;

  if (selectedProductDetails) {
    const product = selectedProductDetails;
    const purchaseStatus = getPurchaseStatus(product.id);
    const isCompleted = purchaseStatus === 'completed';
    const isPending = purchaseStatus === 'pending';
    const hasActiveOffer = isOfferActive(product);
    const discount = getDiscountPercentage(product);
    
    return (
      <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <button onClick={handleBack} className="flex items-center gap-3 text-slate-500 hover:text-primary-600 font-black transition-all group bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <ArrowRight size={20} className="rotate-180 group-hover:-translate-x-2 transition-transform" />
            {previewProduct ? 'Volver al Panel Admin' : 'Volver al Catálogo'}
          </button>
          {previewProduct && (
            <div className="bg-primary-600/10 text-primary-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 border border-primary-600/20 animate-pulse shadow-sm">
              <Monitor size={16} /> Modo Vista Previa
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-10 md:p-20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                {product.imageUrl ? (
                  <img src={product.imageUrl} className="max-w-full h-auto max-h-[500px] object-contain drop-shadow-[0_35px_60px_rgba(0,0,0,0.3)] group-hover:scale-105 transition-transform duration-1000" alt={product.title}/>
                ) : (
                  <Monitor size={200} className="text-slate-200 dark:text-slate-800" />
                )}
              </div>
              
              <div className="p-10 md:p-16 space-y-10">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="bg-primary-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary-500/20">
                      <ShieldCheck size={14} /> Producto Verificado
                    </span>
                    {hasActiveOffer && (
                      <span className="bg-red-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-red-500/20 animate-pulse">
                        <Zap size={14} fill="currentColor" /> {discount}% Descuento
                      </span>
                    )}
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-none tracking-tighter italic">{product.title}</h2>
                  <div className="flex items-center gap-4 text-slate-400">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} fill={i < Math.floor(product.rating || 5) ? "currentColor" : "none"} />
                      ))}
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest">({(product.rating || 5).toFixed(1)}/5 Calificación de usuarios)</span>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-10">
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary-600 mb-8 flex items-center gap-3"><FileText size={20} /> Descripción Detallada</h4>
                    <div className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed rich-text-content prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: product.description }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 p-3 rounded-2xl w-fit"><Zap size={24} /></div>
                <h5 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Entrega Inmediata</h5>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Recibe tu software al instante después de la validación.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 p-3 rounded-2xl w-fit"><ShieldCheck size={24} /></div>
                <h5 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Licencia Segura</h5>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Archivos 100% libres de virus y malware.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 p-3 rounded-2xl w-fit"><HelpCircle size={24} /></div>
                <h5 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Soporte</h5>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Videos con instrucciones para la instalación.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-10 md:p-16">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 mb-8 flex items-center gap-3"><Star size={20} /> Reseñas de Clientes</h4>
              <div className="space-y-6">
                {(() => {
                  const productReviews = (allReviews || []).filter(r => r.productId === product.id && r.isVisible !== false);
                  if (productReviews.length === 0) return <p className="text-slate-400 italic">Aún no hay reseñas para este software. ¡Sé el primero en calificarlo!</p>;
                  return productReviews.map(review => (
                    <div key={review.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-black text-slate-800 dark:text-white text-sm">{review.userName}</p>
                          <div className="flex text-amber-400 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{formatToPeruDate(review.createdAt)}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm italic leading-relaxed">"{review.comment}"</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 sticky top-28">
              <div className="space-y-8">
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Precio del producto</p>
                  <div className="flex items-baseline gap-3">
                    {hasActiveOffer ? (
                      <>
                        <span className="text-5xl font-black text-primary-600 dark:text-primary-400 tracking-tighter italic">${product.offerPrice}</span>
                        <span className="text-xl font-bold text-slate-300 line-through tracking-tighter">${product.price}</span>
                      </>
                    ) : (
                      <span className="text-5xl font-black text-primary-600 dark:text-primary-400 tracking-tighter italic">${product.price}</span>
                    )}
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">USD</span>
                  </div>
                  {hasActiveOffer && product.offerExpiresAt && (
                    <CountdownTimer expiryDate={product.offerExpiresAt} />
                  )}
                </div>

                <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                  {isAdmin ? (
                    <button onClick={() => { setEditingProduct(product); setPreviewProduct(null); setActiveTab('admin'); }} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-6 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                      <Settings size={22} /> EDITAR SOFTWARE
                    </button>
                  ) : isCompleted ? (
                    <button onClick={() => setActiveTab('library')} className="w-full bg-emerald-500 text-white font-black py-6 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20">
                      <CheckCircle size={22} /> DESCARGAR - CALIFICAR
                    </button>
                  ) : isPending ? (
                    <button onClick={() => setActiveTab('library')} className="w-full bg-amber-500 text-white font-black py-6 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-500/20">
                      <Clock size={22} /> PAGO EN REVISIÓN
                    </button>
                  ) : (
                    <button onClick={() => setCheckoutProduct(product)} className="w-full bg-primary-600 text-white font-black py-6 rounded-2xl flex justify-center items-center gap-4 hover:bg-primary-700 transition-all shadow-2xl shadow-primary-500/40 hover:scale-[1.02] active:scale-95 text-lg uppercase tracking-[0.1em]">
                      <ShoppingCart size={22} /> COMPRAR AHORA
                    </button>
                  )}
                  <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] pt-4">Pago 100% seguro y encriptado</p>
                  <div className="flex justify-center gap-4 pt-2 opacity-30 grayscale">
                    <CreditCard size={20} />
                    <Smartphone size={20} />
                    <Globe size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {activeBanners.length > 0 && (
        <div className="relative w-full h-[350px] md:h-[500px] overflow-hidden rounded-[3rem] shadow-2xl group border border-white/20 dark:border-white/5">
          {activeBanners.map((banner, index) => (
            <div 
              key={banner.id}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out flex items-center ${index === currentBannerIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
              style={{ background: `linear-gradient(135deg, ${banner.bgColor}, ${banner.bgColor}dd)` }}
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent"></div>
              
              <div className="relative z-10 w-full h-full flex flex-col md:flex-row items-center justify-between px-10 md:px-24 py-12 gap-12">
                <div className="flex-1 space-y-6 md:space-y-8 text-center md:text-left animate-in fade-in slide-in-from-left-12 duration-1000">
                  <div className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-[0.3em] border border-white/30">
                    Destacado de hoy
                  </div>
                  <h2 className="text-4xl md:text-7xl font-black text-white leading-tight drop-shadow-2xl italic tracking-tighter">{banner.title}</h2>
                  <p className="text-xl md:text-3xl font-medium text-white/80 drop-shadow-lg max-w-xl">{banner.subtitle}</p>
                  {banner.link && (
                    <a 
                      href={banner.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-4 bg-white text-slate-900 font-black px-10 py-5 rounded-2xl hover:bg-primary-50 transition-all shadow-2xl hover:scale-110 active:scale-95 text-base uppercase tracking-widest group/btn"
                    >
                      Explorar Ahora <ArrowRight size={22} className="group-hover/btn:translate-x-2 transition-transform" />
                    </a>
                  )}
                </div>
                <div className="flex-1 w-full h-full max-h-[250px] md:max-h-full flex items-center justify-center animate-in fade-in slide-in-from-right-12 duration-1000 relative">
                  <div className="absolute inset-0 bg-white/20 blur-[100px] rounded-full animate-pulse"></div>
                  <img 
                    src={banner.imageUrl} 
                    alt={banner.title}
                    className="relative z-10 max-w-full max-h-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-float"
                  />
                </div>
              </div>
            </div>
          ))}
          
          {activeBanners.length > 1 && (
            <div className="absolute bottom-10 left-10 flex gap-3 z-20">
              {activeBanners.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentBannerIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === currentBannerIndex ? 'w-12 bg-white' : 'w-4 bg-white/30 hover:bg-white/60'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-8">
        <div className="text-center md:text-left">
          <div className="inline-block px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 border border-primary-200 dark:border-primary-800">
            Premium Software Store
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter italic">Software de Radio</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium mt-2">Potencia tu flujo de trabajo con herramientas profesionales</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-primary-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center">
            <Search className="absolute left-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={22} />
            <input 
              type="text" 
              placeholder="Buscar herramienta..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-900 border-none rounded-2xl shadow-xl focus:ring-0 outline-none transition-all text-base font-bold dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredProducts.map(product => {
          const purchaseStatus = getPurchaseStatus(product.id);
          const isCompleted = purchaseStatus === 'completed';
          const isPending = purchaseStatus === 'pending';
          const hasActiveOffer = isOfferActive(product);
          const discount = getDiscountPercentage(product);
          
          return (
            <div 
              key={product.id} 
              onClick={() => setSelectedProductDetails(product)}
              className="group relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl hover:shadow-2xl hover:shadow-primary-500/20 transition-all duration-700 cursor-pointer overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="product-card-glow"></div>
              <div className="h-72 bg-slate-50 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center p-8">
                {product.imageUrl ? (
                  <img src={product.imageUrl} className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-110 drop-shadow-2xl"/>
                ) : (
                  <Monitor size={80} className="text-slate-200 dark:text-slate-800" />
                )}
                {hasActiveOffer && (
                  <div className="absolute top-6 left-6 z-10">
                    <div className="bg-red-600 text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-2xl shadow-red-500/50 flex items-center gap-1.5 uppercase tracking-widest italic">
                      <Zap size={14} fill="currentColor" /> {discount}% OFF
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/90 via-primary-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col justify-end p-10">
                  <span className="bg-white text-primary-900 px-8 py-4 rounded-2xl font-black text-xs shadow-2xl flex items-center justify-center gap-3 translate-y-8 group-hover:translate-y-0 transition-transform duration-700 uppercase tracking-widest">
                    Ver Detalles <ArrowRight size={18} />
                  </span>
                </div>
              </div>
              <div className="p-10 space-y-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors tracking-tight">{product.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < Math.floor(product.rating || 5) ? "currentColor" : "none"} />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">({(product.rating || 5).toFixed(1)})</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {hasActiveOffer ? (
                      <>
                        <span className="text-sm font-bold text-slate-400 line-through tracking-tighter">${product.price}</span>
                        <span className="text-3xl font-black text-primary-600 dark:text-primary-400 tracking-tighter">${product.offerPrice}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-black text-primary-600 dark:text-primary-400 tracking-tighter">${product.price}</span>
                    )}
                  </div>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed font-medium">
                  {product.description.replace(/<[^>]*>?/gm, '')}
                </p>
                <div className="pt-4">
                  {isAdmin ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setActiveTab('admin'); }} 
                      className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                    >
                      <Settings size={20} /> GESTIONAR
                    </button>
                  ) : isCompleted ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveTab('library'); }} 
                      className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <CheckCircle size={20} /> EN TU BIBLIOTECA
                    </button>
                  ) : isPending ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveTab('library'); }} 
                      className="w-full bg-amber-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Clock size={20} /> PAGO PENDIENTE
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCheckoutProduct(product); }}
                      className="w-full bg-primary-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary-500/30 hover:bg-primary-700 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
                    >
                      <ShoppingCart size={20} /> Adquirir Ahora
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
