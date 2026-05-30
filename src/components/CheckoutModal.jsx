import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, Landmark, ChevronRight, CheckCircle, AlertCircle, Lock, Package } from 'lucide-react';
import { doc, getDoc, setDoc, collection, writeBatch } from 'firebase/firestore';
import { db, isOfferActive } from '../utils';
import { appId, MANUAL_PAYMENT_CONFIG } from '../config';
import PayPalButton from './PayPalButton';

const CheckoutModal = ({ checkoutProduct, setCheckoutProduct, user, showToast, setActiveTab, purchases }) => {
  if (!checkoutProduct) return null;
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const alreadyPurchased = purchases.some(p => p.productId === checkoutProduct.id && p.status === 'completed');

  useEffect(() => {
    if (alreadyPurchased && !isProcessing && !paymentCompleted) {
      showToast("Ya tienes este producto en tu biblioteca.");
      setCheckoutProduct(null);
    }
  }, [alreadyPurchased, isProcessing, paymentCompleted]);

  const hasActiveOffer = isOfferActive(checkoutProduct);
  const price = Number(hasActiveOffer ? checkoutProduct.offerPrice : checkoutProduct.price) || 0;
  const paypalFee = (price * 0.054) + 0.30;
  const sellerReceives = price - paypalFee;

  const handlePaymentSuccess = async (orderData) => {
    const productAtSuccess = checkoutProduct;
    if (isProcessing || !productAtSuccess) return;
    
    setIsProcessing(true);
    try {
      const orderId = orderData.id;
      if (!orderId) throw new Error("ID de orden no recibido de PayPal.");
      
      const purchaseDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'purchases', orderId);
      const purchaseSnap = await getDoc(purchaseDocRef);
      
      if (purchaseSnap.exists()) {
        showToast("Esta compra ya fue registrada.");
        setCheckoutProduct(null);
        setActiveTab('library');
        return;
      }

      const purchaseData = {
        productId: productAtSuccess.id,
        productTitle: productAtSuccess.title,
        purchasedAt: new Date().toISOString(),
        pricePaid: price,
        paypalOrderId: orderId,
        status: 'completed',
        method: 'paypal',
        fee: paypalFee.toFixed(2),
        netAmount: sellerReceives.toFixed(2),
        userEmail: user.email,
        userId: user.uid
      };

      await setDoc(purchaseDocRef, purchaseData);
      const adminOrderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
      await setDoc(adminOrderRef, purchaseData);

      setPaymentCompleted(true);
      showToast(`¡Excelente! Has adquirido ${productAtSuccess.title}.`);
      
      setTimeout(() => {
          requestAnimationFrame(() => {
            setActiveTab('library');
            setTimeout(() => {
              setCheckoutProduct(null);
            }, 100);
          });
        }, 3000);
    } catch (error) {
      console.error(error);
      showToast("Pago procesado en PayPal, pero hubo un error al activarlo en tu cuenta.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualPaymentSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingManual(true);
    try {
      const orderId = doc(collection(db, 'artifacts', appId, 'public', 'data', 'orders')).id;
      
      const purchaseData = {
        productId: checkoutProduct.id,
        productTitle: checkoutProduct.title,
        purchasedAt: new Date().toISOString(),
        pricePaid: price || 0,
        status: 'pending',
        method: paymentMethod,
        userEmail: user.email,
        userId: user.uid
      };

      const batch = writeBatch(db);
      const userPurchaseRef = doc(db, 'artifacts', appId, 'users', user.uid, 'purchases', orderId);
      const adminOrderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
      
      batch.set(userPurchaseRef, purchaseData);
      batch.set(adminOrderRef, purchaseData);
      
      await batch.commit();

      showToast("¡Solicitud registrada! Un administrador revisará tu pago.");
      setCheckoutProduct(null);
      setPaymentMethod(null);
    } catch (error) {
      showToast("Error al registrar la solicitud. Intenta de nuevo.", "error");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start sm:items-center justify-center p-4 z-40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg relative my-auto overflow-hidden border border-white/10">
        <button disabled={isProcessing} onClick={() => {setCheckoutProduct(null); setPaymentMethod(null);}} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-20 bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition-all disabled:opacity-50"><X size={20} /></button>
        <div className="p-8">
          {!paymentMethod ? (
            <>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Elige tu método de pago</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">Selecciona la forma más cómoda para ti.</p>
              <div className="grid grid-cols-1 gap-3 mb-8">
                <button onClick={() => setPaymentMethod('paypal')} className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-800 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-500/30"><CreditCard size={24} /></div>
                    <div className="text-left"><h4 className="font-bold text-blue-900 dark:text-blue-100">PayPal / Tarjeta</h4><p className="text-xs text-blue-700/60 dark:text-blue-300/60 italic">Activación inmediata</p></div>
                  </div>
                  <ChevronRight className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setPaymentMethod('yape')} className="flex flex-col items-center justify-center p-5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-2xl border border-purple-100 dark:border-purple-800 transition-all group">
                    <div className="bg-purple-600 text-white p-3 rounded-xl mb-3 shadow-lg shadow-purple-500/30"><Smartphone size={24} /></div>
                    <h4 className="font-bold text-purple-900 dark:text-purple-100">Yape</h4>
                  </button>
                  <button onClick={() => setPaymentMethod('plin')} className="flex flex-col items-center justify-center p-5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/30 rounded-2xl border border-cyan-100 dark:border-cyan-800 transition-all group">
                    <div className="bg-cyan-600 text-white p-3 rounded-xl mb-3 shadow-lg shadow-cyan-500/30"><Smartphone size={24} /></div>
                    <h4 className="font-bold text-cyan-900 dark:text-cyan-100">Plin</h4>
                  </button>
                </div>
                <button onClick={() => setPaymentMethod('bank')} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-700 text-white p-3 rounded-xl shadow-lg"><Landmark size={24} /></div>
                    <div className="text-left"><h4 className="font-bold text-slate-800 dark:text-white">Transferencia Bancaria</h4><p className="text-xs text-slate-500">BCP, Interbank, etc.</p></div>
                  </div>
                  <ChevronRight className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => setPaymentMethod('simple')} className="flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 rounded-2xl border border-emerald-100 dark:border-emerald-800 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg shadow-emerald-500/30"><CheckCircle size={24} /></div>
                    <div className="text-left"><h4 className="font-bold text-emerald-900 dark:text-emerald-100">Registrar Solicitud</h4><p className="text-xs text-emerald-700/60 dark:text-emerald-300/60 italic">Pasos indicados por el vendedor</p></div>
                  </div>
                  <ChevronRight className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </>
          ) : (
            <>
              <button disabled={isProcessing} onClick={() => setPaymentMethod(null)} className="text-blue-600 text-xs font-bold mb-4 flex items-center gap-1 hover:underline disabled:opacity-50">← Volver a métodos de pago</button>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4 mb-6 border border-slate-100 dark:border-slate-800">
                <div className="w-14 h-14 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600">
                  {checkoutProduct.imageUrl ? <img src={checkoutProduct.imageUrl} alt={checkoutProduct.title} className="w-full h-full object-cover"/> : <Package size={24} className="text-slate-400" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{checkoutProduct.title}</h3>
                  <p className="text-blue-600 dark:text-blue-400 font-black text-lg">${price.toFixed(2)} USD</p>
                </div>
              </div>
              {paymentMethod === 'paypal' ? (
                <div className="space-y-6">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-amber-500 text-white p-2 rounded-xl"><AlertCircle size={20} /></div>
                      <h4 className="font-black text-amber-900 dark:text-amber-100 uppercase text-xs tracking-widest">Información Importante</h4>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed mb-4">
                      Al pagar con PayPal, el acceso es <strong>inmediato</strong>.
                    </p>
                    <div className="space-y-3 bg-white/50 dark:bg-black/20 p-4 rounded-2xl">
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal Software</span><span className="font-bold text-slate-700 dark:text-slate-300">${price.toFixed(2)}</span></div>
                      <div className="flex justify-between text-xs text-slate-400 italic"><span>Comisión PayPal (5.4% + $0.30)</span><span>${paypalFee.toFixed(2)}</span></div>
                      <div className="pt-3 border-t-2 border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center"><span className="font-black text-slate-800 dark:text-white">Total a pagar</span><span className="text-2xl font-black text-blue-600">${price.toFixed(2)} USD</span></div>
                    </div>
                  </div>
                  <div className="overflow-visible min-h-[150px] relative">
                    <PayPalButton 
                      product={checkoutProduct} 
                      onSuccess={handlePaymentSuccess} 
                      paymentCompleted={paymentCompleted}
                      onCancel={() => {}}
                      onError={(err) => {
                        showToast("Hubo un error con PayPal. Por favor, intenta de nuevo.", "error");
                      }} 
                    />
                    
                    {(isProcessing || paymentCompleted) && (
                      <div className="absolute inset-0 bg-white dark:bg-slate-900 z-10 flex flex-col items-center justify-center rounded-2xl">
                        {paymentCompleted ? (
                          <div className="text-center">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-full mb-4 inline-block">
                              <CheckCircle size={48} className="text-emerald-500" />
                            </div>
                            <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mb-1">¡Pago Exitoso!</h4>
                            <p className="text-sm text-slate-500">Redirigiendo a tu biblioteca...</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Procesando...</h4>
                            <p className="text-xs text-slate-500">No cierres esta ventana</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleManualPaymentSubmit} className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border-2 border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary-600 text-white p-3 rounded-2xl shadow-xl">
                        {paymentMethod === 'simple' ? <CheckCircle size={24} /> : <Landmark size={24} />}
                      </div>
                      <h4 className="font-black text-primary-900 dark:text-primary-100 uppercase text-xs tracking-[0.2em]">
                        {paymentMethod === 'simple' ? 'Registro Directo' : 'Instrucciones'}
                      </h4>
                    </div>
                    
                    {paymentMethod === 'simple' ? (
                      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-primary-100 dark:border-primary-800 text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          Sigue las instrucciones que el <span className="text-primary-600 font-black">vendedor</span> te indicó.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-primary-100 dark:border-primary-800 text-center space-y-1">
                          <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Total a pagar</p>
                          <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">S/ {(price * 3.80).toFixed(2)}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-primary-100 dark:border-primary-800 space-y-4">
                          <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Datos de Pago ({MANUAL_PAYMENT_CONFIG[paymentMethod].name})</p>
                          {paymentMethod === 'bank' ? (
                            <div className="space-y-4">
                              {MANUAL_PAYMENT_CONFIG[paymentMethod].accounts.map((acc, idx) => (
                                <div key={idx} className="pb-4 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0">
                                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Cuenta BCP #{idx + 1}</p>
                                  <p className="text-2xl font-black text-slate-900 dark:text-white tracking-widest italic">{acc}</p>
                                </div>
                              ))}
                              <p className="text-[11px] text-primary-600 dark:text-primary-400 font-black uppercase tracking-widest">{MANUAL_PAYMENT_CONFIG[paymentMethod].owner}</p>
                            </div>
                          ) : (
                            <div className="text-center space-y-2">
                              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-[0.2em] italic">{MANUAL_PAYMENT_CONFIG[paymentMethod].phone}</p>
                              <p className="text-[11px] text-primary-600 dark:text-primary-400 font-black uppercase tracking-widest">{MANUAL_PAYMENT_CONFIG[paymentMethod].owner}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex gap-4 items-start">
                        <div className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black shadow-lg">1</div>
                        <p className="text-xs text-primary-900 dark:text-primary-200 font-medium">{paymentMethod === 'simple' ? 'Sigue los pasos indicados.' : 'Realiza el depósito.'}</p>
                      </div>
                      <div className="flex gap-4 items-start">
                        <div className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black shadow-lg">2</div>
                        <p className="text-xs text-primary-900 dark:text-primary-200 font-medium">Haz clic en <span className="font-black italic">"Registrar Solicitud"</span>.</p>
                      </div>
                    </div>
                  </div>
                  <button disabled={isSubmittingManual} type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-6 rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] text-sm disabled:opacity-50">
                    {isSubmittingManual ? 'Procesando...' : 'Registrar Solicitud'}
                  </button>
                </form>
              )}
            </>
          )}
          <p className="text-[10px] text-center text-slate-400 mt-8 flex items-center justify-center gap-1"><Lock size={12} /> Compra protegida</p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
