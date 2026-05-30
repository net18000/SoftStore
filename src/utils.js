import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig, ADMIN_EMAILS } from './config';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const PERU_TIME_OPTS = { timeZone: 'America/Lima' };

export const formatToPeruDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('es-PE', PERU_TIME_OPTS);
};

export const formatToPeruTime = (date, options = {}) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('es-PE', { ...PERU_TIME_OPTS, ...options });
};

export const getFriendlyErrorMessage = (error) => {
  const code = error?.code || '';
  console.error("Firebase Auth Error:", error);
  switch (code) {
    case 'auth/user-not-found': return '⚠️ El cliente no existe. Regístrate si eres nuevo.';
    case 'auth/wrong-password': return '⚠️ Contraseña incorrecta. Inténtalo de nuevo.';
    case 'auth/invalid-credential': return '⚠️ El correo o la contraseña no son correctos. Por favor, revísalos e intenta de nuevo.';
    case 'auth/email-already-in-use': return '⚠️ Este correo ya está registrado.';
    case 'auth/weak-password': return '⚠️ La contraseña es muy débil (mínimo 6 caracteres).';
    case 'auth/invalid-email': return '⚠️ El correo electrónico no es válido.';
    case 'auth/too-many-requests': return '⚠️ Demasiados intentos. Por favor, espera un momento.';
    case 'auth/network-request-failed': return '⚠️ Error de conexión. Revisa tu internet.';
    case 'auth/operation-not-allowed': return '⚠️ El inicio de sesión no está habilitado en Firebase Console.';
    case 'auth/popup-blocked': return '⚠️ Ventana emergente bloqueada. Habilita los popups para este sitio.';
    case 'auth/popup-closed-by-user': return '⚠️ Se cerró la ventana antes de completar el proceso.';
    case 'auth/cancelled-by-user': return '⚠️ Inicio de sesión cancelado.';
    case 'auth/account-exists-with-different-credential': return '⚠️ Ya existe una cuenta con este correo pero con un método diferente.';
    case 'auth/unauthorized-domain': return '⚠️ Dominio no autorizado en la consola de Firebase.';
    case 'auth/internal-error': return '⚠️ Error interno de Firebase. Intenta de nuevo más tarde.';
    default: return `⚠️ Error (${code || 'inesperado'}). Por favor, intenta de nuevo o contacta a soporte.`;
  }
};

export const checkIsAdmin = (u) => u && ADMIN_EMAILS.includes(u.email);

export const isOfferActive = (product) => {
  if (!product?.hasOffer) return false;
  if (!product.offerExpiresAt) return true;
  return new Date(product.offerExpiresAt) > new Date();
};

export const secureAction = (user, callback) => {
  if (!user) {
    alert("Debes iniciar sesión para realizar esta acción.");
    return;
  }
  return callback();
};

export const secureAdminAction = async (user, callback) => {
  if (!checkIsAdmin(user)) {
    alert("Acceso denegado. No tienes permisos de administrador.");
    return;
  }
  return await callback();
};
