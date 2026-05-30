import React, { useState } from 'react';
import { 
  Package, Download, Star, ExternalLink, 
  MessageSquare, ChevronRight, HardDrive, Info, 
  Search, ShieldCheck, Clock, CheckCircle, X
} from 'lucide-react';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils';
import { appId } from '../config';

const LibraryView = ({ products, purchases, setActiveTab, showToast, allReviews, user }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const purchasedProducts = products.filter(product => 
    purchases.some(purchase => purchase.productId === product.id && purchase.status === 'completed')
  );

  const filteredLibrary = purchasedProducts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingPurchases = purchases.filter(p => p.status === 'pending');
  const pendingProducts = products.filter(product => 
    pendingPurchases.some(p => p.productId === product.id)
  );

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct || isSubmittingReview) return;
    
    setIsSubmittingReview(true);
    try {
      const reviewsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reviews');
      const q = query(reviewsRef, where("productId", "==", selectedProduct.id), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const reviewData = {
        productId: selectedProduct.id,
        productTitle: selectedProduct.title,
        userId: user.uid,
        userName: user.displayName || user.email.split('@')[0],
        rating: reviewRating,
        comment: reviewComment,
        createdAt: new Date().toISOString(),
        isVisible: true
      };

      if (!querySnapshot.empty) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reviews', querySnapshot.docs[0].id), reviewData);
        showToast("¡Tu reseña ha sido actualizada!");
      } else {
        await addDoc(reviewsRef, reviewData);
        showToast("¡Gracias por tu reseña!");
      }
      
      setReviewComment('');
      setSelectedProduct(null);
    } catch (error) {
      console.error(error);
      showToast("Error al enviar la reseña. Inténtalo de nuevo.", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (selectedProduct) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        <button onClick={() => setSelectedProduct(null)} className="mb-8 flex items-center gap-3 text-slate-400 hover:text-primary-600 font-black text-xs uppercase tracking-[0.2em] group transition-all">
          <ChevronRight size={20} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver a mis programas
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-10 md:p-16 space-y-12">
            <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
              <div className="w-48 h-48 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] p-6 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner shrink-0">
                {selectedProduct.imageUrl ? (
                  <img src={selectedProduct.imageUrl} className="w-full h-full object-contain" />
                ) : (
                  <Package size={64} className="text-slate-200" />
                )}
              </div>
              <div className="text-center md:text-left space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
                  <CheckCircle size={14} /> Producto Verificado
                </div>
                <h2 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter italic leading-tight">{selectedProduct.title}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <a href={selectedProduct.fileUrl} target="_blank" rel="noopener noreferrer" className="bg-primary-600 hover:bg-primary-700 text-white font-black px-10 py-5 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-primary-500/30 uppercase tracking-widest text-sm">
                    <Download size={20} /> Descargar Instalador
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 italic">
                  <Info size={24} className="text-primary-600" /> Guía de Instalación
                </h3>
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                  <div className="rich-text-content text-slate-600 dark:text-slate-400 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedProduct.installInstructions }}></div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3 italic">
                  <MessageSquare size={24} className="text-primary-600" /> Tu Experiencia
                </h3>
                <form onSubmit={handleReviewSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-2 border-primary-50 dark:border-primary-900/20 space-y-6 shadow-sm">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Calificación</p>
                    <div className="flex gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl w-fit">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} type="button" onClick={() => setReviewRating(star)} className="transition-transform hover:scale-125">
                          <Star size={24} className={`${star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tu comentario</p>
                    <textarea 
                      required
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="¿Cómo fue tu experiencia con el programa?"
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-medium text-sm min-h-[120px] resize-none dark:text-white"
                    />
                  </div>
                  <button disabled={isSubmittingReview} type="submit" className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-4 rounded-xl shadow-xl transition-all uppercase tracking-widest text-[10px]">
                    {isSubmittingReview ? 'Enviando...' : 'Publicar Reseña'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">Mis Programas</h2>
          <div className="flex items-center justify-center md:justify-start gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
            <div className="bg-primary-600 text-white p-1 rounded-md"><HardDrive size={14} /></div>
            Gestiona tus herramientas profesionales
          </div>
        </div>
        
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar en mi biblioteca..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary-600 transition-all shadow-sm font-bold text-sm placeholder:text-slate-300 dark:text-white"
          />
        </div>
      </div>

      {pendingProducts.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-3">
            <Clock size={16} /> Compras en revisión
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pendingProducts.map(p => (
              <div key={p.id} className="bg-amber-50/50 dark:bg-amber-900/10 border-2 border-dashed border-amber-200 dark:border-amber-800/50 rounded-3xl p-6 flex items-center gap-4 opacity-70">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-amber-100 dark:border-amber-900/30 shrink-0">
                  <Package size={24} className="text-amber-200" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-800 dark:text-slate-200 text-xs truncate italic">{p.title}</p>
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Esperando aprobación</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {purchasedProducts.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800 animate-in fade-in duration-700">
          <div className="bg-slate-50 dark:bg-slate-800 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-slate-200 shadow-inner">
            <Package size={48} />
          </div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-3 italic">Tu biblioteca está vacía</h3>
          <p className="text-slate-400 font-medium max-w-xs mx-auto">Aún no has adquirido ningún software. ¡Explora nuestra tienda y comienza hoy!</p>
          <button onClick={() => setActiveTab('store')} className="mt-10 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black px-12 py-5 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-xs">Ir a la Tienda</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredLibrary.map(product => (
            <div key={product.id} className="group bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all flex flex-col h-full">
              <div className="relative aspect-square mb-6 rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group-hover:scale-[1.02] transition-transform duration-500">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={48} /></div>
                )}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-6">
                  <button onClick={() => setSelectedProduct(product)} className="w-full bg-white text-slate-900 font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-xl uppercase tracking-widest text-[10px]">
                    <ExternalLink size={16} /> Gestionar
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <h3 className="font-black text-lg text-slate-800 dark:text-white mb-6 line-clamp-2 italic leading-tight">{product.title}</h3>
                <div className="mt-auto space-y-3">
                  <a href={product.fileUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-primary-600 dark:hover:bg-primary-600 text-slate-400 hover:text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest group/dl">
                    <Download size={16} className="group-hover/dl:translate-y-0.5 transition-transform" /> Descargar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryView;
