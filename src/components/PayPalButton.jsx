import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CreditCard } from 'lucide-react';
import { PAYPAL_CLIENT_ID } from '../config';

const PayPalButton = ({ product, onSuccess, onCancel, onError, paymentCompleted }) => {
  const containerRef = useRef(null);
  const buttonInstanceRef = useRef(null);
  const buttonRendered = useRef(false);
  const processedOrders = useRef(new Set());
  const onSuccessRef = useRef(onSuccess);
  const onCancelRef = useRef(onCancel);
  const onErrorRef = useRef(onError);
  const [isRestrictedEnv, setIsRestrictedEnv] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isButtonLoaded, setIsButtonLoaded] = useState(false);

  const isOfferActive = (p) => {
    if (!p.hasOffer) return false;
    if (!p.offerExpiresAt) return true;
    return new Date(p.offerExpiresAt) > new Date();
  };

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onCancelRef.current = onCancel;
    onErrorRef.current = onError;
  }, [onSuccess, onCancel, onError]);

  useEffect(() => {
    let isMounted = true;
    buttonRendered.current = false;
    setLoadError(null);
    setIsButtonLoaded(false);
    
    if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID.includes("REEMPLAZA")) {
      setError("PayPal Client ID no configurado.");
      return;
    }

    const isFileProtocol = window.location.protocol === 'file:' || window.location.protocol === 'blob:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isFileProtocol && !isLocalhost) {
      setIsRestrictedEnv(true);
      return;
    } else {
      setIsRestrictedEnv(false);
    }

    const renderButton = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (window.paypal && !buttonRendered.current && containerRef.current && isMounted) {
          buttonRendered.current = true;
          containerRef.current.innerHTML = ''; 

          const isDarkMode = document.documentElement.classList.contains('dark') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
          
          const buttons = window.paypal.Buttons({
            style: { 
              layout: 'vertical', 
              color: isDarkMode ? 'black' : 'blue', 
              shape: 'pill', 
              label: 'pay' 
            },
            createOrder: (data, actions) => {
              try {
                return actions.order.create({
                  intent: "CAPTURE",
                  purchase_units: [{
                    description: product.title,
                    amount: { 
                      currency_code: "USD", 
                      value: (isOfferActive(product) ? parseFloat(product.offerPrice) : parseFloat(product.price)).toFixed(2) 
                    }
                  }]
                });
              } catch (e) {
                console.error("Error in createOrder:", e);
                throw e;
              }
            },
            onApprove: async (data, actions) => {
              if (processedOrders.current.has(data.orderID)) return;
              processedOrders.current.add(data.orderID);
              
              try {
                const order = await actions.order.capture();
                if (onSuccessRef.current) onSuccessRef.current(order);
              } catch (err) {
                console.error("PayPal Capture Error:", err);
                processedOrders.current.delete(data.orderID);
                if (onErrorRef.current) onErrorRef.current(err);
              }
            },
            onCancel: (data) => {
              console.log("PayPal Payment Cancelled:", data);
              if (onCancelRef.current) onCancelRef.current(data);
            },
            onError: (err) => {
              console.error("PayPal SDK Callback Error:", err);
              if (onErrorRef.current) onErrorRef.current(err);
            }
          });

          if (isMounted) {
            buttonInstanceRef.current = buttons;
            await buttons.render(containerRef.current);
            if (isMounted) setIsButtonLoaded(true);
          }
        }
      } catch (error) {
        console.error("Error rendering PayPal buttons:", error);
        if (isMounted) {
          setLoadError("Error al inicializar el botón de pago.");
          buttonRendered.current = false;
        }
      }
    };

    const scriptId = 'paypal-sdk-script';
    let script = document.getElementById(scriptId);
    
    if (script && !window.paypal) {
      script.remove();
      script = null;
    }

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`; 
      script.async = true;
      script.crossOrigin = "anonymous";
      script.setAttribute('data-sdk-integration-source', 'button-factory');
      script.onload = () => {
        if (isMounted) renderButton();
      };
      script.onerror = (e) => {
        if (isMounted) {
          const msg = "Fallo de conexión o bloqueo por extensión (AdBlock).";
          setLoadError(msg);
        }
      };
      document.head.appendChild(script);
    } else {
      if (window.paypal) {
        renderButton();
      } else {
        script.addEventListener('load', () => {
          if (isMounted) renderButton();
        });
      }
    }

    return () => {
      isMounted = false;
      try {
        if (!paymentCompleted && buttonInstanceRef.current && buttonInstanceRef.current.close) {
          buttonInstanceRef.current.close().catch(() => {});
        }
      } catch (e) {
        console.warn("Error silenciado en limpieza de PayPalButton:", e);
      }
    };
  }, [product.id, product.price]);

  if (error) return <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm flex items-center gap-2"><AlertCircle size={18} /> {String(error)}</div>;

  if (loadError) {
    return (
      <div className="mt-4 p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 text-center">
        <p className="text-sm text-red-700 dark:text-red-300 mb-2 font-bold"><AlertCircle size={16} className="inline mr-1 mb-0.5" />PayPal no pudo cargarse</p>
        <p className="text-xs text-red-600/80 dark:text-red-400/80 mb-4 leading-relaxed">
          {String(loadError)}
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-full transition-all font-bold text-sm">
            Reintentar Carga
          </button>
          <button onClick={() => { setLoadError(null); setIsRestrictedEnv(true); }} className="w-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 px-6 rounded-full transition-all text-xs font-medium">
            Omitir y usar Simulación
          </button>
        </div>
      </div>
    );
  }

  if (isRestrictedEnv) {
    return (
      <div className="mt-4 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 text-center">
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4"><AlertCircle size={16} className="inline mr-1 mb-0.5" />Entorno local detectado. Simulación activa.</p>
        <button 
          disabled={isSimulating}
          onClick={() => {
            setIsSimulating(true);
            const simulatedId = 'SIM_' + Math.random().toString(36).substr(2, 9).toUpperCase() + '_' + Date.now();
            if (onSuccessRef.current) onSuccessRef.current({ id: simulatedId });
          }} 
          className="w-full bg-[#0070ba] hover:bg-[#003087] text-white font-black py-3 px-4 rounded-full transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CreditCard size={20} /> {isSimulating ? 'Procesando Simulación...' : `Simular Pago de $${product.price}`}
        </button>
      </div>
    );
  }

  const isDarkMode = document.documentElement.classList.contains('dark') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return (
      <div className="mt-4 min-h-[150px] relative z-0 flex flex-col items-center justify-center" style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}>
        <div ref={containerRef} className="w-full"></div>
        
        {!isButtonLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-2xl z-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-300"></div>
            <p className="text-xs">Cargando PayPal...</p>
          </div>
        )}
      </div>
    );
};

export default PayPalButton;
