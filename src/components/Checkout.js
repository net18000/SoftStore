import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle, Clock, ShoppingCart, Smartphone, Landmark, HelpCircle, Package, ArrowRight, ShieldCheck, CreditCard, Globe
} from 'lucide-react';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { appId, PAYPAL_CLIENT_ID, MANUAL_PAYMENT_CONFIG } from '../config/constants.js';

export const PayPalButton = ({ amount, product, user, onSuccess, onError }) => {
  useEffect(() => {
    const container = document.getElementById('paypal-button-container');
    if (!container) return;
    container.innerHTML = '';

    if (window.paypal) {
      window.paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 55 },
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [{
              description: product.title,
              amount: { currency_code: 'USD', value: amount.toString() }
            }]
          });
        },
        onApprove: async (data, actions) => {
          const details = await actions.order.capture();
          onSuccess(details);
        },
        onError: (err) => {
          console.error("PayPal Error:", err);
          onError(err);
        }
      }).render('#paypal-button-container');
    }
  }, [amount, product]);

  return <div id="paypal-button-container" className="w-full min-h-[150px]"></div>;
};

export const CheckoutModal = ({ product, user, onClose, showToast, setActiveTab }) => {
  const [method, setMethod] = useState('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const price = (product.hasOffer && product.offerPrice) ? product.offerPrice : product.price;

  const handleManualPayment = async (type) => {
    setIsProcessing(true);
    try {
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        productId: product.id,
        productTitle: product.title,
        pricePaid: price,
        method: type,
        status: 'pending',
        purchasedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderData);
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'purchases'), {
        productId: product.id,
        productTitle: product.title,
        status: 'pending',
        purchasedAt: new Date().toISOString()
      });

      setStep(2);
      showToast("Solicitud enviada. Por favor, realiza el pago.");
    } catch (error) {
      console.error(error);
      showToast("Error al procesar la solicitud.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPalSuccess = async (details) => {
    setIsProcessing(true);
    try {
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        productId: product.id,
        productTitle: product.title,
        pricePaid: price,
        method: 'paypal',
        status: 'completed',
        paypalDetails: details,
        purchasedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderData);
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'purchases'), {
        productId: product.id,
        productTitle: product.title,
        status: 'completed',
        purchasedAt: new Date().toISOString()
      });

      setStep(3);
      showToast("¡Compra exitosa! Ya puedes descargar tu software.");
    } catch (error) {
      console.error(error);
      showToast("Error al registrar la compra de PayPal.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/10 relative">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all z-10 hover:rotate-90">
          <X size={32} />
        </button>

        <div className="flex flex-col lg:flex-row min-h-[600px]">
          <div className="lg:w-[40%] bg-slate-50 dark:bg-slate-950 p-12 flex flex-col justify-between border-r border-slate-100 dark:border-slate-800">
            <div className="space-y-8">
              <div className="bg-primary-600 text-white p-4 rounded-3xl w-fit shadow-2xl shadow-primary-500/20"><ShoppingCart size={32} /></div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-primary-600 tracking-[0.2em]">Resumen de Compra</p>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none">{product.title}</h2>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Subtotal</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">${price}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Total</span>
                  <span className="text-3xl font-black text-primary-600 tracking-tighter">${price}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div className="flex items-center gap-3 text-emerald-500">
                <ShieldCheck size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Pago 100% Seguro</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Al completar tu compra, recibirás acceso inmediato al software y las guías de instalación en tu biblioteca personal.</p>
            </div>
          </div>

          <div className="lg:w-[60%] p-10 md:p-16 flex flex-col justify-center">
            {step === 1 && (
              <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">Selecciona tu método</h3>
                  <p className="text-slate-500 text-sm font-medium">Contamos con opciones locales e internacionales</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => setMethod('paypal')} className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${method === 'paypal' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-primary-200'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${method === 'paypal' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><CreditCard size={24} /></div>
                      <div className="text-left">
                        <p className="font-black text-slate-900 dark:text-white text-sm uppercase">PayPal / Tarjeta</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Procesamiento Instantáneo</p>
                      </div>
                    </div>
                    {method === 'paypal' && <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white"><CheckCircle size={14} /></div>}
                  </button>
                  <button onClick={() => setMethod('manual')} className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${method === 'manual' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-primary-200'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${method === 'manual' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><Smartphone size={24} /></div>
                      <div className="text-left">
                        <p className="font-black text-slate-900 dark:text-white text-sm uppercase">Yape / Plin / BCP</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Revisión Manual (Perú)</p>
                      </div>
                    </div>
                    {method === 'manual' && <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white"><CheckCircle size={14} /></div>}
                  </button>
                </div>

                <div className="pt-6">
                  {method === 'paypal' ? (
                    <PayPalButton amount={price} product={product} user={user} onSuccess={handlePayPalSuccess} onError={() => showToast("Error con PayPal.", "error")} />
                  ) : (
                    <button 
                      onClick={() => handleManualPayment('manual')}
                      disabled={isProcessing}
                      className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                    >
                      {isProcessing ? 'Procesando...' : 'Continuar con Pago Manual'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in zoom-in duration-500 text-center">
                <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                  <Clock size={48} strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">Instrucciones de Pago</h3>
                  <p className="text-slate-500 text-sm font-medium">Envía el comprobante para habilitar tu descarga</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4 text-left">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary-100 text-primary-600 p-2 rounded-xl"><Smartphone size={20} /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yape o Plin</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white">{MANUAL_PAYMENT_CONFIG.yape.phone}</p>
                        <p className="text-[10px] font-bold text-slate-500">{MANUAL_PAYMENT_CONFIG.yape.owner}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><Landmark size={20} /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transferencia BCP</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white">{MANUAL_PAYMENT_CONFIG.bank.accounts[0]}</p>
                        <p className="text-[10px] font-bold text-slate-500">{MANUAL_PAYMENT_CONFIG.bank.owner}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary-50 dark:bg-primary-900/10 p-6 rounded-3xl border border-primary-100 dark:border-primary-800 space-y-2">
                  <p className="text-xs font-bold text-primary-700 dark:text-primary-300">Una vez realizado el pago, envía la captura por WhatsApp:</p>
                  <a href={`https://wa.me/51915253664?text=Hola,%20adjunto%20mi%20pago%20por%20${product.title}`} target="_blank" className="inline-flex items-center gap-2 text-emerald-600 font-black uppercase text-xs hover:scale-105 transition-transform">
                    <Smartphone size={16} /> Enviar Comprobante
                  </a>
                </div>

                <button onClick={() => { setActiveTab('library'); onClose(); }} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
                  Entendido, Ir a mi Biblioteca
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in zoom-in duration-500 text-center">
                <div className="w-32 h-32 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
                  <CheckCircle size={64} strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">¡Pago Confirmado!</h3>
                  <p className="text-slate-500 text-lg font-medium">Tu software ya está disponible para descarga.</p>
                </div>
                <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                   <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Hemos enviado un recibo detallado a tu correo electrónico. Puedes acceder a tus archivos en cualquier momento desde tu biblioteca personal.</p>
                </div>
                <button onClick={() => { setActiveTab('library'); onClose(); }} className="w-full bg-primary-600 text-white font-black py-6 rounded-2xl shadow-2xl shadow-primary-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-widest text-sm">
                  <Package size={22} /> Ir a mi Biblioteca <ArrowRight size={22} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
