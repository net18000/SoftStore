import React, { useState } from 'react';
import { 
  Package, CheckCircle, Clock, ArrowRight, Download, FileText, Star, AlertCircle, HardDrive, ImageIcon 
} from 'lucide-react';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { appId } from '../config/constants.js';
import { formatToPeruDate } from '../utils/helpers.js';

export const LibraryView = ({ products, purchases, setActiveTab, showToast, allReviews, user }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const hasReviewed = (productId) => {
    return allReviews.some(r => r.productId === productId && r.userId === user.uid);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      const reviewData = {
        productId: selectedProduct.id,
        userId: user.uid,
        userName: user.displayName || user.email.split('@')[0],
        rating: userRating,
        comment: userComment,
        createdAt: new Date().toISOString(),
        isVisible: true
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reviews'), reviewData);
      
      const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', selectedProduct.id);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const data = productSnap.data();
        const oldCount = data.ratingCount || 0;
        const oldRating = data.rating || 5;
        const newCount = oldCount + 1;
        const newRating = ((oldRating * oldCount) + userRating) / newCount;
        
        await updateDoc(productRef, {
          rating: newRating,
          ratingCount: newCount
        });
      }

      showToast("¡Gracias por tu reseña!");
      setUserComment('');
      setUserRating(5);
    } catch (error) {
      console.error("Error al enviar reseña:", error);
      showToast("Error al enviar la reseña.", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const completedPurchases = purchases.filter(p => p.status === 'completed');
  const pendingPurchases = purchases.filter(p => p.status === 'pending');
  const purchasedProducts = products.filter(p => completedPurchases.some(purchase => purchase.productId === p.id));
  
  if (selectedProduct) {
    return (
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-3 text-slate-500 hover:text-primary-600 font-black mb-8 transition-all group bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <ArrowRight size={20} className="rotate-180 group-hover:-translate-x-2 transition-transform" />
          Volver a mi Biblioteca
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-10 md:p-16 space-y-10">
            <div className="flex flex-col md:flex-row items-center gap-10 border-b border-slate-100 dark:border-slate-800 pb-10">
              <div className="w-40 h-40 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700 shadow-inner group">
                {selectedProduct.imageUrl ? (
                  <img src={selectedProduct.imageUrl} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700" alt={selectedProduct.title}/>
                ) : (
                  <Package size={64} className="text-slate-200" />
                )}
              </div>
              <div className="flex-1 text-center md:text-left space-y-4">
                <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle size={12} className="inline mr-1" /> Licencia Permanente Activa
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic">{selectedProduct.title}</h2>
              </div>
              <button 
                onClick={() => { 
                  if(!selectedProduct.fileUrl) return showToast("El archivo de descarga no está disponible. Contacta a soporte.", "error"); 
                  showToast(`Iniciando descarga segura...`); 
                  window.open(selectedProduct.fileUrl, '_blank', 'noopener,noreferrer'); 
                }} 
                className="bg-primary-600 hover:bg-primary-700 text-white px-10 py-6 rounded-2xl font-black flex items-center gap-4 shadow-2xl shadow-primary-500/30 hover:scale-105 active:scale-95 transition-all text-base uppercase tracking-widest"
              >
                <Download size={24} /> Descargar Ahora
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
              <div className="md:col-span-8 space-y-10">
                <div className="space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary-600 flex items-center gap-3"><FileText size={20} /> Guía de Instalación</h4>
                  <div className="bg-slate-50 dark:bg-slate-950 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                    {selectedProduct.installInstructions ? (
                      <div className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed rich-text-content prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedProduct.installInstructions }}></div>
                    ) : (
                      <p className="text-slate-400 italic text-base">No hay instrucciones específicas para este programa. Ejecuta el instalador y sigue los pasos.</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-4">
                <div className="p-8 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800/50 rounded-[2rem] space-y-4">
                  <div className="bg-amber-500 text-white p-2 rounded-xl w-fit"><AlertCircle size={24} /></div>
                  <h5 className="font-black text-amber-800 dark:text-amber-300 uppercase tracking-tighter text-sm">Aviso de Seguridad</h5>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed font-medium">
                    Si tu antivirus detecta el archivo como amenaza, desactívalo temporalmente. Algunos activadores son detectados como "falsos positivos" por su naturaleza técnica.
                  </p>
                </div>

                {!hasReviewed(selectedProduct.id) ? (
                  <div className="p-8 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800/50 rounded-[2rem] space-y-6">
                    <div className="bg-blue-600 text-white p-2 rounded-xl w-fit"><Star size={24} fill="currentColor" /></div>
                    <div>
                      <h5 className="font-black text-blue-800 dark:text-blue-300 uppercase tracking-tighter text-sm">Califica tu Experiencia</h5>
                      <p className="text-xs text-blue-700/80 dark:text-blue-400/80 font-medium">Tu opinión ayuda a otros clientes.</p>
                    </div>
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star} 
                            type="button"
                            onClick={() => setUserRating(star)}
                            className={`transition-all ${userRating >= star ? 'text-amber-400 scale-110' : 'text-slate-300'}`}
                          >
                            <Star size={24} fill={userRating >= star ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                      <textarea 
                        required
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                        placeholder="Cuéntanos la experiencia de tu compra..."
                        className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none text-sm font-medium dark:text-white shadow-sm"
                        rows="3"
                      />
                      <button 
                        disabled={isSubmittingReview}
                        type="submit" 
                        className="w-full bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest text-xs disabled:opacity-50"
                      >
                        {isSubmittingReview ? 'Enviando...' : 'Publicar Reseña'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800/50 rounded-[2rem] flex items-center gap-4">
                    <div className="bg-emerald-600 text-white p-2 rounded-xl"><CheckCircle size={20} /></div>
                    <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-tight">Ya has calificado este software. ¡Gracias!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (purchases.length === 0) return (
    <div className="max-w-4xl mx-auto text-center py-32 bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-8">
      <div className="bg-slate-50 dark:bg-slate-800 w-32 h-32 rounded-full flex items-center justify-center mx-auto shadow-inner">
        <Package size={64} className="text-slate-200" />
      </div>
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Tu Biblioteca está vacía</h2>
        <p className="text-slate-500 text-lg">Adquiere herramientas profesionales en nuestra tienda.</p>
      </div>
      <button onClick={() => setActiveTab('store')} className="bg-primary-600 hover:bg-primary-700 text-white font-black px-12 py-5 rounded-2xl transition-all shadow-2xl shadow-primary-500/30 hover:scale-110 active:scale-95 uppercase tracking-widest text-sm">Explorar Catálogo</button>
    </div>
  );

  return (
    <div className="space-y-20">
      {pendingPurchases.length > 0 && (
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-600 border border-amber-200 dark:border-amber-800"><Clock size={24} /></div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">Pedidos en Revisión</h2>
              <p className="text-slate-500 text-sm font-medium">Estamos validando tu pago, recibirás un correo pronto.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingPurchases.map(purchase => (
              <div key={purchase.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-lg group">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800 relative overflow-hidden">
                  <div className="absolute inset-0 shimmer-bg opacity-30"></div>
                  <ImageIcon size={24} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-black text-slate-900 dark:text-white truncate text-lg tracking-tight">{purchase.productTitle}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">Validando</span>
                    <span className="text-[10px] text-slate-400 font-bold">{formatToPeruDate(purchase.purchasedAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-primary-600 dark:text-primary-400 tracking-tighter">${purchase.pricePaid}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-10">
        <div className="flex items-center gap-4">
          <div className="bg-primary-600 text-white p-3 rounded-2xl shadow-xl shadow-primary-500/20 border border-primary-400"><HardDrive size={24} /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">Mis Programas Autorizados</h2>
            <p className="text-slate-500 text-sm font-medium">Software listo para descargar y usar de por vida.</p>
          </div>
        </div>
        
        {purchasedProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
               <Package size={32} className="text-slate-200" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No tienes programas autorizados aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {purchasedProducts.map(product => {
              const latestPurchase = completedPurchases
                .filter(p => p.productId === product.id)
                .sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt))[0];

              return (
                <div key={product.id} onClick={() => setSelectedProduct(product)} className="group relative bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex items-center gap-8 shadow-xl hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-1 cursor-pointer transition-all duration-500">
                  <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700 shadow-inner">
                    {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-700"/> : <Package size={40} className="text-slate-200" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate tracking-tight group-hover:text-primary-600 transition-colors italic">{product.title}</h3>
                    <div className="flex items-center gap-3">
                      <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5 border border-emerald-100 dark:border-emerald-900/50">
                        <ShieldCheck size={12} /> Verificado
                      </span>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Desde: {formatToPeruDate(latestPurchase?.purchasedAt)}</span>
                    </div>
                  </div>
                  <div className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 p-5 rounded-[1.5rem] group-hover:bg-primary-600 group-hover:text-white transition-all shadow-sm border border-primary-100 dark:border-primary-800">
                    <ArrowRight size={28} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
