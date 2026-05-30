import React from 'react';
import { Package, Star, ArrowRight, Zap, CheckCircle, ShoppingCart } from 'lucide-react';
import CountdownTimer from './CountdownTimer';

const ProductCard = ({ product, isPurchased, onBuy, onPreview }) => {
  const isOfferActive = (p) => {
    if (!p.hasOffer) return false;
    if (!p.offerExpiresAt) return true;
    return new Date(p.offerExpiresAt) > new Date();
  };
  const hasOffer = isOfferActive(product);
  const price = hasOffer ? product.offerPrice : product.price;

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary-500/10 border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden">
      <div className="product-card-glow pointer-events-none"></div>
      
      <div className="relative aspect-square mb-6 rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.title} 
            draggable="false"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-200 pointer-events-none"><Package size={64} /></div>
        )}
        
        {hasOffer && (
          <div className="absolute top-4 left-4 z-10 animate-in slide-in-from-left-4 duration-500 pointer-events-none">
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

        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 leading-tight line-clamp-2 italic leading-tight">{product.title}</h3>
        
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

export default ProductCard;
