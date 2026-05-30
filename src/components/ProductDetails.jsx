import React from 'react';
import { 
  Monitor, Package, Star, ArrowRight, Clock, 
  ChevronLeft, Zap, CheckCircle, ShieldCheck, Download, ShoppingCart, Settings
} from 'lucide-react';
import { formatToPeruDate } from '../utils';
import CountdownTimer from './CountdownTimer';

const ProductDetails = ({ previewProduct, onBack, isAdmin, hasPurchased, setCheckoutProduct, setActiveTab, setEditingProduct, reviews, avgRating }) => {
  const isOfferActive = (p) => {
    if (!p.hasOffer) return false;
    if (!p.offerExpiresAt) return true;
    return new Date(p.offerExpiresAt) > new Date();
  };
  const hasOffer = isOfferActive(previewProduct);
  const price = hasOffer ? previewProduct.offerPrice : previewProduct.price;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <button onClick={onBack} className="mb-8 flex items-center gap-3 text-slate-400 hover:text-primary-600 font-black text-xs uppercase tracking-[0.2em] group transition-all">
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
              {isAdmin && (
                <button onClick={() => { setEditingProduct(previewProduct); setActiveTab('admin'); }} className="w-full bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-600 hover:text-white text-blue-600 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-[10px] group border-2 border-dashed border-blue-200 dark:border-blue-800">
                  <Settings size={18} className="group-hover:rotate-12 transition-transform" /> Modo Administrador: Editar Programa
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
};

export default ProductDetails;
