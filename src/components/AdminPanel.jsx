import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Plus, DollarSign, BarChart3, Users, Package, 
  ImageIcon, Server, X, Monitor, UploadCloud, ShieldCheck, 
  Lock, Clock, FileText, Trash2, Unlock, Star, Globe, AlertCircle, HardDrive, Landmark, Smartphone
} from 'lucide-react';
import { 
  collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, 
  query, where, getDocs, writeBatch, getDoc, setDoc 
} from 'firebase/firestore';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, secureAdminAction, formatToPeruDate, formatToPeruTime } from '../utils';
import { appId, EMAILJS_CONFIG, MANUAL_PAYMENT_CONFIG } from '../config';

const AdminPanel = ({ products, banners, showToast, editingProduct, setEditingProduct, user }) => {
  const { tab: adminTab = 'productos' } = useParams();
  const navigate = useNavigate();
  const setAdminTab = (newTab) => navigate(`/admin/${newTab}`);
  
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    price: '', 
    imageUrl: '', 
    installInstructions: '',
    hasOffer: false,
    offerPrice: '',
    offerExpiresAt: '',
    isVisible: true,
    rating: 5,
    ratingCount: 0
   });
  const [bannerFormData, setBannerFormData] = useState({ title: '', subtitle: '', imageUrl: '', link: '', active: true, bgColor: '#3b82f6', position: 'top' });
  const [editingBanner, setEditingBanner] = useState(null);
  const [isBannerFormOpen, setIsBannerFormOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedBannerImage, setSelectedBannerImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingBanner, setIsSubmittingBanner] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
  const [allOrders, setAllOrders] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [visitorLogs, setVisitorLogs] = useState([]);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [gatekeeperConfig, setGatekeeperConfig] = useState({ frequencyMinutes: 30, enabled: true });

  const stats = {
    totalRevenue: allOrders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (Number(o.pricePaid) || 0), 0),
    pendingOrders: allOrders.filter(o => o.status === 'pending').length,
    totalClients: allClients.length,
    totalProducts: products.length
  };
  const [currentCodeData, setCurrentCodeData] = useState(null);
  const [newFrequency, setNewFrequency] = useState(30);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  
  const editorRef = useRef(null);
  const infoEditorRef = useRef(null);
  const quillInstance = useRef(null);
  const infoQuillInstance = useRef(null);

  useEffect(() => {
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'config');
    const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'currentCode');
    
    const unsubConfig = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGatekeeperConfig({
          frequencyMinutes: data.frequencyMinutes || 30,
          enabled: data.enabled !== undefined ? data.enabled : true
        });
        setNewFrequency(data.frequencyMinutes || 30);
      } else {
        setDoc(configRef, { frequencyMinutes: 30, enabled: true });
      }
    });

    const unsubCode = onSnapshot(codeRef, (snap) => {
      if (snap.exists()) setCurrentCodeData(snap.data());
    });

    return () => { 
      if(unsubConfig) unsubConfig(); 
      if(unsubCode) unsubCode(); 
    };
  }, []);

  const handleUpdateFrequency = async () => {
    setIsUpdatingConfig(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'config'), { frequencyMinutes: parseInt(newFrequency) });
      showToast("Frecuencia actualizada con éxito.");
    } catch (error) {
      showToast("Error al actualizar la frecuencia.", "error");
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const handleToggleGatekeeper = async () => {
    setIsUpdatingConfig(true);
    try {
      const newValue = !gatekeeperConfig.enabled;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'config'), { enabled: newValue });
      showToast(newValue ? "Acceso restringido activado." : "Acceso restringido desactivado.");
    } catch (error) {
      showToast("Error al cambiar el estado del acceso.", "error");
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const handleForceRegenerateCode = async () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + gatekeeperConfig.frequencyMinutes * 60 * 1000).toISOString();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gatekeeper', 'currentCode'), { code: newCode, expiresAt });
    showToast("Código regenerado con éxito.");
  };

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        title: editingProduct.title,
        description: editingProduct.description,
        price: editingProduct.price,
        imageUrl: editingProduct.imageUrl || '',
        installInstructions: editingProduct.installInstructions || '',
        hasOffer: editingProduct.hasOffer || false,
        offerPrice: editingProduct.offerPrice || '',
        offerExpiresAt: editingProduct.offerExpiresAt || '',
        isVisible: editingProduct.isVisible !== undefined ? editingProduct.isVisible : true,
        rating: editingProduct.rating !== undefined ? editingProduct.rating : 5,
        ratingCount: editingProduct.ratingCount !== undefined ? editingProduct.ratingCount : 0
      });
      setIsFormOpen(true);
    } else {
      setFormData({ 
        title: '', 
        description: '', 
        price: '', 
        imageUrl: '', 
        installInstructions: '',
        hasOffer: false,
        offerPrice: '',
        offerExpiresAt: '',
        isVisible: true,
        rating: 5,
        ratingCount: 0
      });
      setIsFormOpen(false);
    }
  }, [editingProduct]);

  useEffect(() => {
    let q1, q2;
    if (isFormOpen) {
      const timer = setTimeout(() => {
        const fullToolbar = [
          [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'script': 'super' }, { 'script': 'sub' }],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }, 'blockquote', 'code-block'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
          [{ 'direction': 'rtl' }, { 'align': [] }],
          ['link', 'image', 'video'],
          ['clean']
        ];

        if (editorRef.current && !quillInstance.current) {
          q1 = new Quill(editorRef.current, {
            theme: 'snow',
            placeholder: 'Escribe una descripción impactante y detallada...',
            modules: { toolbar: fullToolbar }
          });
          quillInstance.current = q1;
          if (editingProduct) {
            q1.root.innerHTML = editingProduct.description || '';
          }
        }
        
        if (infoEditorRef.current && !infoQuillInstance.current) {
          q2 = new Quill(infoEditorRef.current, {
            theme: 'snow',
            placeholder: 'Instrucciones paso a paso para el cliente...',
            modules: { toolbar: fullToolbar }
          });
          infoQuillInstance.current = q2;
          if (editingProduct) {
            q2.root.innerHTML = editingProduct.installInstructions || '';
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      quillInstance.current = null;
      infoQuillInstance.current = null;
    }
  }, [isFormOpen]);

  useEffect(() => {
    if (isFormOpen && editingProduct) {
      if (quillInstance.current) {
        quillInstance.current.root.innerHTML = editingProduct.description || '';
      }
      if (infoQuillInstance.current) {
        infoQuillInstance.current.root.innerHTML = editingProduct.installInstructions || '';
      }
    }
  }, [editingProduct]);

  useEffect(() => {
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const loadedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedOrders.sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt));
      setAllOrders(loadedOrders);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
      const loadedClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedClients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllClients(loadedClients);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const reviewsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reviews');
    const unsubscribe = onSnapshot(reviewsRef, (snapshot) => {
      const loadedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllReviews(loadedReviews);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const blockedRef = collection(db, 'artifacts', appId, 'public', 'data', 'blocked');
    const unsubscribe = onSnapshot(blockedRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBlockedIPs(list);
    });
    return () => unsubscribe();
  }, []);

  const handleBlockIP = async (log) => {
    await secureAdminAction(user, async () => {
      const deviceId = log.deviceId;
      if (!deviceId) return showToast("Este visitante no tiene un ID de dispositivo válido para bloquear.", "error");

      const blockDoc = blockedIPs.find(b => b.deviceId === deviceId);
      const isBlocked = !!blockDoc;

      if (isBlocked) {
        if (!confirm(`El dispositivo "${deviceId}" ya está bloqueado. ¿Deseas desbloquearlo?`)) return;
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blocked', blockDoc.id));
          showToast("Dispositivo desbloqueado correctamente.");
        } catch (error) { 
          console.error("Error al desbloquear:", error);
          showToast("Error al desbloquear dispositivo.", "error"); 
        }
      } else {
        if (!confirm(`¿Estás seguro de bloquear este dispositivo (${deviceId})? El usuario no podrá acceder desde este navegador.`)) return;
        try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'blocked'), {
            deviceId: deviceId,
            ip: log.ip || 'Unknown',
            blockedAt: new Date().toISOString(),
            reason: 'Blocked by admin from visitor logs',
            targetUser: log.userEmail || 'Anonymous'
          });
          showToast("Dispositivo bloqueado correctamente.");
        } catch (error) { 
          console.error("Error al bloquear:", error);
          showToast("Error al bloquear dispositivo.", "error"); 
        }
      }
    });
  };

  useEffect(() => {
    if (adminTab !== 'visitas') return;
    const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'visitorLogs');
    const unsubscribe = onSnapshot(logsRef, (snapshot) => {
      const loadedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setVisitorLogs(loadedLogs);
    });
    return () => unsubscribe();
  }, [adminTab]);

  const handleApproveOrder = async (order) => {
    await secureAdminAction(user, async () => {
      if (!confirm(`¿Aprobar pago de ${order.userEmail} por ${order.productTitle}?`)) return;
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'completed', approvedAt: new Date().toISOString() });
        const userPurchasesRef = collection(db, 'artifacts', appId, 'users', order.userId, 'purchases');
        const q = query(userPurchasesRef, where("productId", "==", order.productId), where("status", "==", "pending"));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => batch.update(doc.ref, { status: 'completed', approvedAt: new Date().toISOString() }));
        await batch.commit();

        if (EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.templateId && EMAILJS_CONFIG.publicKey) {
          try {
            const clientData = allClients.find(c => c.uid === order.userId);
            const templateParams = {
              to_name: clientData?.fullName || order.userEmail,
              to_email: order.userEmail,
              product_title: order.productTitle,
              message: `Tu pago por ${order.productTitle} ha sido aprobado. Ya puedes acceder a tu software en el menú "Mis Programas".`
            };

            await emailjs.send(
              EMAILJS_CONFIG.serviceId,
              EMAILJS_CONFIG.templateId,
              templateParams,
              EMAILJS_CONFIG.publicKey
            );
            showToast("Pago aprobado y notificación enviada.");
          } catch (emailErr) {
            console.error("Error al enviar email:", emailErr);
            showToast("Pago aprobado, pero hubo un error al enviar el email.");
          }
        } else {
          showToast("Pago aprobado. El cliente ya tiene acceso.");
        }
      } catch (error) {
        showToast("No se pudo aprobar el pago. Intenta de nuevo.", "error");
      }
    });
  };

  const handleDeleteOrder = async (order) => {
    await secureAdminAction(user, async () => {
      if (!confirm(`¿Estás seguro de eliminar el pedido de "${order.productTitle}" para ${order.userEmail}? Esta acción lo borrará permanentemente de los registros del admin y del usuario.`)) return;
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id));
        const userPurchasesRef = collection(db, 'artifacts', appId, 'users', order.userId, 'purchases');
        const q = query(userPurchasesRef, where("productId", "==", order.productId));
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        showToast("Pedido eliminado correctamente.");
      } catch (error) {
        console.error("Error al eliminar pedido:", error);
        showToast("No se pudo eliminar el pedido.", "error");
      }
    });
  };

  const handleClearVisitorLogs = async () => {
    await secureAdminAction(user, async () => {
      if (!confirm("¿Estás seguro de que deseas limpiar todo el registro de visitas? Esta acción no se puede deshacer.")) return;
      try {
        const batchSize = 500;
        const totalLogs = visitorLogs.length;
        
        for (let i = 0; i < totalLogs; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = visitorLogs.slice(i, i + batchSize);
          chunk.forEach((log) => {
            const logRef = doc(db, 'artifacts', appId, 'public', 'data', 'visitorLogs', log.id);
            batch.delete(logRef);
          });
          await batch.commit();
        }
        
        showToast("Registro de visitas limpiado correctamente.");
      } catch (error) {
        console.error("Error al limpiar visitas:", error);
        showToast("No se pudo limpiar el registro de visitas.", "error");
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await secureAdminAction(user, async () => {
      if (!editingProduct && !selectedFile) return showToast("Por favor, selecciona un instalador.", "error");
      setIsSubmitting(true);
      setUploadProgress(0);
      try {
        let finalFileUrl = editingProduct?.fileUrl;
        let finalStoragePath = editingProduct?.storagePath;
        let finalImageUrl = formData.imageUrl;
        let finalImageStoragePath = editingProduct?.imageStoragePath;
        
        const finalDescription = quillInstance.current ? quillInstance.current.root.innerHTML : formData.description;
        const finalInstallInfo = infoQuillInstance.current ? infoQuillInstance.current.root.innerHTML : formData.installInstructions;

        if (selectedFile) {
          const fileRef = ref(storage, `installers/${Date.now()}_${selectedFile.name}`);
          const uploadTask = uploadBytesResumable(fileRef, selectedFile);
          await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 50), reject, async () => {
              finalFileUrl = await getDownloadURL(uploadTask.snapshot.ref);
              finalStoragePath = fileRef.fullPath;
              resolve();
            });
          });
        }

        if (selectedImage) {
          const imgRef = ref(storage, `images/${Date.now()}_${selectedImage.name}`);
          const imgUploadTask = uploadBytesResumable(imgRef, selectedImage);
          await new Promise((resolve, reject) => {
            imgUploadTask.on('state_changed', (snapshot) => setUploadProgress(50 + (snapshot.bytesTransferred / snapshot.totalBytes) * 50), reject, async () => {
              finalImageUrl = await getDownloadURL(imgUploadTask.snapshot.ref);
              finalImageStoragePath = imgRef.fullPath;
              resolve();
            });
          });
        }

        const productData = {
          title: formData.title,
          description: finalDescription,
          price: Number(formData.price) || 0,
          hasOffer: formData.hasOffer,
          offerPrice: formData.hasOffer ? (Number(formData.offerPrice) || 0) : null,
          offerExpiresAt: formData.hasOffer ? formData.offerExpiresAt : null,
          installInstructions: finalInstallInfo,
          imageUrl: finalImageUrl,
          imageStoragePath: finalImageStoragePath || null,
          fileUrl: finalFileUrl,
          storagePath: finalStoragePath,
          isVisible: formData.isVisible,
          rating: Number(formData.rating) || 5,
          ratingCount: Number(formData.ratingCount) || 0,
          updatedAt: new Date().toISOString()
        };

        if (editingProduct) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingProduct.id), productData);
          showToast("¡Listo! El programa ha sido actualizado.");
        } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...productData, createdAt: new Date().toISOString() });
          showToast("¡Genial! El programa ya está disponible en la tienda.");
        }
        setFormData({ 
          title: '', 
          description: '', 
          price: '', 
          imageUrl: '', 
          installInstructions: '',
          hasOffer: false,
          offerPrice: '',
          isVisible: true
        });
        setSelectedFile(null);
        setSelectedImage(null);
        setEditingProduct(null);
        setIsFormOpen(false);
        if (editorRef.current) editorRef.current.innerHTML = '';
        if (infoEditorRef.current) infoEditorRef.current.innerHTML = '';
      } catch (error) {
        console.error(error);
        showToast("Hubo un problema al guardar los cambios. Inténtalo de nuevo.", "error");
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleDeleteProduct = async (product) => {
    await secureAdminAction(user, async () => {
      if (!confirm(`¿Estás seguro de eliminar "${product.title}"? Esta acción no se puede deshacer.`)) return;
      try {
        if (product.storagePath) await deleteObject(ref(storage, product.storagePath)).catch(e=>console.warn(e));
        if (product.imageStoragePath) await deleteObject(ref(storage, product.imageStoragePath)).catch(e=>console.warn(e));
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id));
        showToast("Producto eliminado del catálogo.");
      } catch (error) { showToast("No se pudo eliminar el producto.", "error"); }
    });
  };

  const handleToggleVisibility = async (product) => {
    await secureAdminAction(user, async () => {
      try {
        const newVisibility = product.isVisible === false;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id), { isVisible: newVisibility });
        showToast(newVisibility ? "Software ahora es visible." : "Software ahora está oculto.");
      } catch (error) {
        console.error("Error al cambiar visibilidad:", error);
        showToast("Error al cambiar la visibilidad.", "error");
      }
    });
  };

  const handleDeleteClient = async (client) => {
    await secureAdminAction(user, async () => {
      if (!confirm(`¿Estás seguro de eliminar al cliente "${client.fullName}"? Esta acción borrará permanentemente su registro administrativo, sus compras y su acceso al sistema.`)) return;
      try {
        const clientUid = client.uid;
        if (clientUid) {
          const batch = writeBatch(db);
          const userPurchasesRef = collection(db, 'artifacts', appId, 'users', clientUid, 'purchases');
          const purchasesSnapshot = await getDocs(userPurchasesRef);
          purchasesSnapshot.forEach(doc => batch.delete(doc.ref));
          
          const userWishlistRef = collection(db, 'artifacts', appId, 'users', clientUid, 'wishlist');
          const wishlistSnapshot = await getDocs(userWishlistRef);
          wishlistSnapshot.forEach(doc => batch.delete(doc.ref));
          
          const userProfileRef = doc(db, 'artifacts', appId, 'users', clientUid, 'profile', 'data');
          batch.delete(userProfileRef);
          await batch.commit();
        }
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', client.id));
        showToast("Cliente y todos sus datos eliminados con éxito.");
      } catch (error) { 
        console.error("Error al eliminar cliente:", error);
        showToast("Error al intentar eliminar al cliente por completo.", "error"); 
      }
    });
  };

  const handleToggleClientStatus = async (client) => {
    await secureAdminAction(user, async () => {
      const newStatus = client.status === 'disabled' ? 'active' : 'disabled';
      const actionText = newStatus === 'active' ? 'habilitar' : 'inhabilitar';
      if (!confirm(`¿Estás seguro de ${actionText} a "${client.fullName}"?`)) return;
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', client.id), { status: newStatus });
        showToast(`El cliente ahora está ${newStatus === 'active' ? 'activo' : 'inhabilitado'}.`);
      } catch (error) { showToast("No se pudo cambiar el estado del cliente.", "error"); }
    });
  };

  const handleToggleReviewVisibility = async (review) => {
    await secureAdminAction(user, async () => {
      try {
        const newVisibility = review.isVisible === false;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reviews', review.id), { isVisible: newVisibility });
        showToast(newVisibility ? "Reseña ahora es visible." : "Reseña ahora está oculta.");
      } catch (error) {
        console.error("Error al cambiar visibilidad de reseña:", error);
        showToast("Error al cambiar la visibilidad.", "error");
      }
    });
  };

  const handleDeleteReview = async (review) => {
    await secureAdminAction(user, async () => {
      if (!confirm(`¿Estás seguro de eliminar la reseña de "${review.userName}"? Esta acción no se puede deshacer.`)) return;
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reviews', review.id));
        showToast("Reseña eliminada.");
      } catch (error) { 
        console.error("Error al eliminar reseña:", error);
        showToast("No se pudo eliminar la reseña.", "error"); 
      }
    });
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    await secureAdminAction(user, async () => {
      if (!editingBanner && !selectedBannerImage) return showToast("Por favor, selecciona una imagen para el banner.", "error");
      setIsSubmittingBanner(true);
      setBannerUploadProgress(0);
      try {
        let finalImageUrl = bannerFormData.imageUrl;
        let finalImageStoragePath = editingBanner?.imageStoragePath;

        if (selectedBannerImage) {
          const imgRef = ref(storage, `banners/${Date.now()}_${selectedBannerImage.name}`);
          const imgUploadTask = uploadBytesResumable(imgRef, selectedBannerImage);
          await new Promise((resolve, reject) => {
            imgUploadTask.on('state_changed', (snapshot) => setBannerUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100), reject, async () => {
              finalImageUrl = await getDownloadURL(imgUploadTask.snapshot.ref);
              finalImageStoragePath = imgRef.fullPath;
              resolve();
            });
          });
        }

        const bannerData = {
          ...bannerFormData,
          imageUrl: finalImageUrl,
          imageStoragePath: finalImageStoragePath || null,
          updatedAt: new Date().toISOString()
        };

        if (editingBanner) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'banners', editingBanner.id), bannerData);
          showToast("¡Banner actualizado!");
        } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'banners'), { ...bannerData, createdAt: new Date().toISOString() });
          showToast("¡Banner creado con éxito!");
        }
        setBannerFormData({ title: '', subtitle: '', imageUrl: '', link: '', active: true, bgColor: '#3b82f6', position: 'top' });
        setSelectedBannerImage(null);
        setEditingBanner(null);
        setIsBannerFormOpen(false);
      } catch (error) {
        console.error(error);
        showToast("Error al guardar el banner.", "error");
      } finally {
        setIsSubmittingBanner(false);
      }
    });
  };

  const handleDeleteBanner = async (banner) => {
    await secureAdminAction(user, async () => {
      if (!confirm(`¿Estás seguro de eliminar este banner?`)) return;
      try {
        if (banner.imageStoragePath) await deleteObject(ref(storage, banner.imageStoragePath)).catch(e=>console.warn(e));
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'banners', banner.id));
        showToast("Banner eliminado.");
      } catch (error) { showToast("No se pudo eliminar the banner.", "error"); }
    });
  };

  useEffect(() => {
    if (editingBanner) {
      setBannerFormData({
        title: editingBanner.title || '',
        subtitle: editingBanner.subtitle || '',
        imageUrl: editingBanner.imageUrl || '',
        link: editingBanner.link || '',
        active: editingBanner.active !== undefined ? editingBanner.active : true,
        bgColor: editingBanner.bgColor || '#3b82f6',
        position: editingBanner.position || 'top'
      });
      setIsBannerFormOpen(true);
    }
  }, [editingBanner]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
            <span className="text-[10px] font-black uppercase text-slate-400">Ventas Totales</span>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">${stats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg"><BarChart3 size={20} /></div>
            <span className="text-[10px] font-black uppercase text-slate-400">Pedidos Pendientes</span>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Users size={20} /></div>
            <span className="text-[10px] font-black uppercase text-slate-400">Total Clientes</span>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalClients}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 rounded-lg"><Package size={20} /></div>
            <span className="text-[10px] font-black uppercase text-slate-400">Productos</span>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalProducts}</p>
        </div>
      </div>

      <div className="flex gap-2 sm:gap-4 p-1 bg-slate-200 dark:bg-slate-800 w-full sm:w-fit rounded-xl overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button onClick={() => { setAdminTab('productos'); setIsFormOpen(false); setEditingProduct(null); setIsBannerFormOpen(false); }} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${adminTab === 'productos' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Productos</button>
        <button onClick={() => { setAdminTab('banners'); setIsFormOpen(false); setEditingProduct(null); setIsBannerFormOpen(false); }} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${adminTab === 'banners' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Banners</button>
        <button onClick={() => { setAdminTab('pedidos'); setIsFormOpen(false); setEditingProduct(null); setIsBannerFormOpen(false); }} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-sm sm:text-base ${adminTab === 'pedidos' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Pedidos {allOrders.filter(o => o.status === 'pending').length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{allOrders.filter(o => o.status === 'pending').length}</span>}
        </button>
        <button onClick={() => { setAdminTab('resenas'); setIsFormOpen(false); setEditingProduct(null); setIsBannerFormOpen(false); }} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${adminTab === 'resenas' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Reseñas</button>
        <button onClick={() => { setAdminTab('clientes'); setIsFormOpen(false); setEditingProduct(null); setIsBannerFormOpen(false); }} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${adminTab === 'clientes' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Clientes</button>
        <button onClick={() => { setAdminTab('visitas'); setIsFormOpen(false); setEditingProduct(null); setIsBannerFormOpen(false); }} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${adminTab === 'visitas' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Visitas</button>
        <button onClick={() => { setAdminTab('configuracion'); setIsFormOpen(false); setEditingProduct(null); setIsBannerFormOpen(false); }} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-sm sm:text-base ${adminTab === 'configuracion' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Seguridad</button>
      </div>

      {adminTab === 'banners' && (
        <div className="space-y-8">
          {isBannerFormOpen ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg">
                    {editingBanner ? <Settings size={24} /> : <Plus size={24} />}
                  </div>
                  {editingBanner ? 'Editar Banner' : 'Nuevo Banner'}
                </h2>
                <button onClick={() => {setIsBannerFormOpen(false); setEditingBanner(null);}} className="bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white p-2 rounded-full transition-all hover:rotate-90"><X size={28} /></button>
              </div>
              <form onSubmit={handleBannerSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Título del Banner</label>
                    <input required value={bannerFormData.title} onChange={e=>setBannerFormData({...bannerFormData, title: e.target.value})} type="text" placeholder="Ej: Oferta Especial 2024" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold shadow-inner"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Subtítulo / Descripción Corta</label>
                    <input value={bannerFormData.subtitle} onChange={e=>setBannerFormData({...bannerFormData, subtitle: e.target.value})} type="text" placeholder="Ej: Hasta 50% de descuento en software seleccionado" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold shadow-inner"/>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Color de Fondo</label>
                    <div className="flex gap-4 items-center">
                      <input type="color" value={bannerFormData.bgColor} onChange={e=>setBannerFormData({...bannerFormData, bgColor: e.target.value})} className="h-[76px] w-20 bg-transparent border-none outline-none cursor-pointer"/>
                      <input type="text" value={bannerFormData.bgColor} onChange={e=>setBannerFormData({...bannerFormData, bgColor: e.target.value})} className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-mono font-bold shadow-inner"/>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Imagen del Banner</label>
                    <div className="bg-slate-50 dark:bg-slate-900 h-[76px] px-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all cursor-pointer flex items-center">
                      <label className="flex items-center gap-4 cursor-pointer w-full">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 shrink-0"><ImageIcon size={24} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-sm text-slate-700 dark:text-slate-200">{selectedBannerImage ? selectedBannerImage.name : 'Seleccionar'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase truncate">JPG, PNG, WEBP</p>
                        </div>
                        <input type="file" accept="image/*" onChange={e=>setSelectedBannerImage(e.target.files[0])} className="hidden"/>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Link de Destino (Opcional)</label>
                    <input value={bannerFormData.link} onChange={e=>setBannerFormData({...bannerFormData, link: e.target.value})} type="text" placeholder="Ej: https://..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold shadow-inner"/>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Posición del Banner</label>
                    <select value={bannerFormData.position} onChange={e=>setBannerFormData({...bannerFormData, position: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold shadow-inner appearance-none cursor-pointer">
                      <option value="top">Superior (Carrusel)</option>
                      <option value="left">Flotante Izquierda</option>
                      <option value="right">Flotante Derecha</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={bannerFormData.active} onChange={e=>setBannerFormData({...bannerFormData, active: e.target.checked})} className="sr-only peer"/>
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-black uppercase tracking-widest text-slate-500">Banner Activo (Visible en la web)</span>
                  </label>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-8">
                  <div className="w-full sm:w-auto flex items-center gap-4">
                    {isSubmittingBanner && (
                      <div className="flex-1 sm:w-48 space-y-1">
                        <div className="flex justify-between text-[10px] font-black uppercase text-blue-600"><span>Subiendo...</span><span>{Math.round(bannerUploadProgress)}%</span></div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-700">
                          <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${bannerUploadProgress}%` }}></div>
                        </div>
                      </div>
                    )}
                    <button disabled={isSubmittingBanner} type="submit" className="w-full sm:w-auto bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-4 px-12 rounded-2xl flex justify-center items-center gap-3 hover:opacity-90 transition-all shadow-xl disabled:opacity-50 text-lg uppercase tracking-widest">
                      {isSubmittingBanner ? 'CARGANDO...' : (editingBanner ? 'ACTUALIZAR BANNER' : 'CREAR BANNER')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-2xl text-slate-500"><ImageIcon size={32} /></div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">Gestión de Banners</h2>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{banners.length} Banners configurados</p>
                  </div>
                </div>
                <button onClick={() => setIsBannerFormOpen(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95">
                  <Plus size={24} /> NUEVO BANNER
                </button>
              </div>

              {banners.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <ImageIcon size={64} className="mx-auto text-slate-300 mb-6 opacity-20" />
                  <p className="text-xl font-bold text-slate-400">No hay banners creados aún.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {banners.map(banner => (
                    <div key={banner.id} className="group bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col md:flex-row gap-6 items-center">
                      <div className="w-full md:w-64 h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                        <img src={banner.imageUrl} draggable="false" className="w-full h-full object-cover pointer-events-none" />
                      </div>
                      <div className="flex-1 space-y-2 text-center md:text-left">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">{banner.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{banner.subtitle}</p>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${banner.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {banner.active ? 'Activo' : 'Inactivo'}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Posición: {banner.position === 'top' ? 'Superior' : banner.position === 'left' ? 'Izquierda' : 'Derecha'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingBanner(banner)} className="p-3 bg-white dark:bg-slate-800 text-blue-600 border border-blue-100 dark:border-blue-900/50 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Settings size={20} /></button>
                        <button onClick={() => handleDeleteBanner(banner)} className="p-3 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><X size={20} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {adminTab === 'productos' && (
        <div className="space-y-8">
          {isFormOpen ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg">
                    {editingProduct ? <Settings size={24} /> : <Plus size={24} />}
                  </div>
                  {editingProduct ? 'Editar Programa' : 'Nuevo Programa'}
                </h2>
                <button onClick={() => {setIsFormOpen(false); setEditingProduct(null);}} className="bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white p-2 rounded-full transition-all hover:rotate-90"><X size={28} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400">Nombre del Software</label>
                  <input required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} type="text" placeholder="Ej: Adobe Photoshop 2024" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all text-lg font-bold shadow-inner"/>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400">Descripción Detallada</label>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-lg focus-within:border-blue-500 transition-all">
                    <div ref={editorRef} className="w-full min-h-[300px]"></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                  <div className="space-y-4">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Precio Normal (USD)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">$</span>
                      <input required value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} type="number" step="0.01" className="w-full h-[76px] pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all text-xl font-black shadow-sm"/>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black uppercase tracking-widest text-blue-600">Precio Oferta</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.hasOffer} onChange={e=>setFormData({...formData, hasOffer: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600"/>
                        <span className="text-xs font-black uppercase text-slate-500">Activar</span>
                      </label>
                    </div>
                    <div className={`relative transition-all duration-300 ${formData.hasOffer ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-blue-400">$</span>
                      <input required={formData.hasOffer} value={formData.offerPrice} onChange={e=>setFormData({...formData, offerPrice: e.target.value})} type="number" step="0.01" className="w-full h-[76px] pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-2xl outline-none transition-all text-xl font-black text-blue-600"/>
                    </div>
                  </div>
                </div>

                {formData.hasOffer && (
                  <div className="space-y-4 p-6 bg-red-50/50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="text-sm font-black uppercase tracking-widest text-red-600">La oferta vence el:</label>
                    <input 
                      required={formData.hasOffer} 
                      type="datetime-local" 
                      value={formData.offerExpiresAt} 
                      onChange={e=>setFormData({...formData, offerExpiresAt: e.target.value})} 
                      className="w-full h-[76px] px-6 py-4 bg-white dark:bg-slate-900 border-2 border-red-500 rounded-2xl outline-none transition-all text-xl font-black text-red-600 shadow-sm"
                    />
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} /> El sistema desactivará la oferta automáticamente al llegar a esta fecha.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Calificación (1-5)</label>
                    <input value={formData.rating} onChange={e=>setFormData({...formData, rating: e.target.value})} type="number" min="1" max="5" step="0.1" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold shadow-inner"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Cantidad de Reseñas</label>
                    <input value={formData.ratingCount} onChange={e=>setFormData({...formData, ratingCount: e.target.value})} type="number" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold shadow-inner"/>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Archivo Instalador</label>
                    <div className="bg-slate-50 dark:bg-slate-900 h-[76px] px-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all cursor-pointer flex items-center">
                      <label className="flex items-center gap-4 cursor-pointer w-full">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 shrink-0"><HardDrive size={24} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-sm text-slate-700 dark:text-slate-200">{selectedFile ? selectedFile.name : 'Seleccionar'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase truncate">ZIP, RAR, EXE, ISO</p>
                        </div>
                        <input type="file" onChange={e=>setSelectedFile(e.target.files[0])} required={!editingProduct} className="hidden"/>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">Imagen Portada</label>
                    <div className="bg-slate-50 dark:bg-slate-900 h-[76px] px-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all cursor-pointer flex items-center">
                      <label className="flex items-center gap-4 cursor-pointer w-full">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 shrink-0"><ImageIcon size={24} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-sm text-slate-700 dark:text-slate-200">{selectedImage ? selectedImage.name : 'Seleccionar'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase truncate">JPG, PNG, WEBP</p>
                        </div>
                        <input type="file" accept="image/*" onChange={e=>setSelectedImage(e.target.files[0])} className="hidden"/>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400 font-black">Información del Programa (Privada)</label>
                  <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-xl focus-within:border-blue-500 transition-all">
                    <div ref={infoEditorRef} className="w-full min-h-[300px]"></div>
                  </div>
                </div>
                <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-8">
                  <div className="w-full sm:w-auto flex items-center gap-4">
                    {isSubmitting && (
                      <div className="flex-1 sm:w-48 space-y-1">
                        <div className="flex justify-between text-[10px] font-black uppercase text-blue-600"><span>Subiendo...</span><span>{Math.round(uploadProgress)}%</span></div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-700">
                          <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      </div>
                    )}
                    <button disabled={isSubmitting} type="submit" className="w-full sm:w-auto bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-4 px-12 rounded-2xl flex justify-center items-center gap-3 hover:opacity-90 transition-all shadow-xl disabled:opacity-50 text-lg uppercase tracking-widest">
                      {isSubmitting ? 'CARGANDO...' : (editingProduct ? 'ACTUALIZAR' : 'PUBLICAR')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-2xl text-slate-500"><Server size={32} /></div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">Catálogo de Software</h2>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{products.length} Programas publicados</p>
                  </div>
                </div>
                <button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95">
                  <Plus size={24} /> NUEVO PROGRAMA
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(p => (
                  <div key={p.id} className="group bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 transition-all hover:shadow-2xl">
                    <div onClick={() => setEditingProduct(p)} className="relative aspect-square bg-white dark:bg-slate-800 rounded-2xl overflow-hidden mb-6 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer z-10">
                      {p.imageUrl ? <img src={p.imageUrl} draggable="false" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none"/> : <Package size={48} className="text-slate-200 absolute inset-0 m-auto pointer-events-none" />}
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-black text-lg text-slate-800 dark:text-white line-clamp-1">{p.title}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleVisibility(p)} className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm">
                          {p.isVisible === false ? <Unlock size={20} /> : <Lock size={20} />}
                        </button>
                        <button onClick={() => setEditingProduct(p)} className="flex-1 bg-white dark:bg-slate-800 text-blue-600 border-2 border-blue-50 dark:border-blue-900/50 font-black py-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-xs uppercase tracking-widest">Editar</button>
                        <button onClick={() => handleDeleteProduct(p)} className="bg-red-50 dark:bg-red-900/10 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><X size={20} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {adminTab === 'pedidos' && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-2"><FileText size={24} /> Pedidos Recibidos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Fecha</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Cliente / Producto</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Método / Precio</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Estado</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {allOrders.map(order => (
                  <tr key={order.id}>
                    <td className="py-4 pr-4"><p className="font-bold text-slate-500 text-[10px] uppercase">{formatToPeruDate(order.purchasedAt)}</p></td>
                    <td className="py-4 pr-4">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{order.userEmail}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{order.productTitle}</p>
                    </td>
                    <td className="py-4 pr-4"><p className="text-[10px] font-black uppercase text-slate-500">{order.method}</p><p className="font-black text-blue-600 text-sm">${order.pricePaid}</p></td>
                    <td className="py-4 pr-4"><span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{order.status === 'completed' ? 'Aprobado' : 'Pendiente'}</span></td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {order.status === 'pending' && (
                          <button onClick={() => handleApproveOrder(order)} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl">Aprobar</button>
                        )}
                        <button onClick={() => handleDeleteOrder(order)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'resenas' && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-2"><Star size={24} /> Reseñas de Clientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Fecha</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Cliente / Producto</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Calificación</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Comentario</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Estado</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {allReviews.map(review => (
                  <tr key={review.id}>
                    <td className="py-4 pr-4"><p className="font-bold text-slate-500 text-[10px] uppercase">{formatToPeruDate(review.createdAt)}</p></td>
                    <td className="py-4 pr-4">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{review.userName}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{review.productTitle}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star size={14} fill="currentColor" />
                        <span className="font-black text-sm">{review.rating}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-[300px] line-clamp-2">{review.comment}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${review.isVisible !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {review.isVisible !== false ? 'Visible' : 'Oculto'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleReviewVisibility(review)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all">
                          {review.isVisible !== false ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button onClick={() => handleDeleteReview(review)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'clientes' && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-2"><Users size={24} /> Directorio de Clientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Registro</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Nombre Completo</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Email / UID</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Estado</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {allClients.map(client => (
                  <tr key={client.id}>
                    <td className="py-4 pr-4"><p className="font-bold text-slate-500 text-[10px] uppercase">{formatToPeruDate(client.createdAt)}</p></td>
                    <td className="py-4 pr-4">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{client.fullName}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400">{client.email || 'Sin email'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{client.uid}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${client.status !== 'disabled' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {client.status !== 'disabled' ? 'Activo' : 'Inhabilitado'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleClientStatus(client)} className={`p-2 rounded-lg transition-all ${client.status !== 'disabled' ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}>
                          {client.status !== 'disabled' ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button onClick={() => handleDeleteClient(client)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'visitas' && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2"><Globe size={24} /> Visitas</h2>
            <button onClick={handleClearVisitorLogs} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest"><Trash2 size={18} className="inline mr-2" /> Limpiar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuario</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Dispositivo</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">IP</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ubicación</th>
                  <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {visitorLogs.map(log => {
                  const isBlocked = blockedIPs.some(b => b.deviceId === log.deviceId);
                  return (
                    <tr key={log.id} className="border-b border-slate-50 dark:border-slate-800">
                      <td className="py-4 px-4 text-xs font-bold text-slate-500">{formatToPeruDate(log.timestamp)}</td>
                      <td className="py-4 px-4 text-xs text-slate-700 dark:text-slate-300">{log.userEmail}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Smartphone size={14} className="text-slate-400" />
                          <span className="font-bold truncate max-w-[120px]" title={log.device}>{log.deviceType || log.device || 'Desconocido'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-blue-600">{log.ip}</td>
                      <td className="py-4 px-4 text-xs text-slate-500">{log.city}, {log.country}</td>
                      <td className="py-4 px-4 text-right">
                        <button onClick={() => handleBlockIP(log)} className={`p-2 rounded-xl ${isBlocked ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white'}`}>
                          {isBlocked ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'configuracion' && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-2"><Lock size={24} /> Seguridad</h2>
          <div className="space-y-8">
            <div className={`p-6 rounded-2xl border flex items-center justify-between ${gatekeeperConfig.enabled ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <div>
                <p className="text-sm font-black uppercase">Estado del Sistema</p>
                <p className={`text-xs font-bold ${gatekeeperConfig.enabled ? 'text-emerald-600' : 'text-slate-500'}`}>{gatekeeperConfig.enabled ? 'Restringido' : 'Libre'}</p>
              </div>
              <button onClick={handleToggleGatekeeper} className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white ${gatekeeperConfig.enabled ? 'bg-red-500' : 'bg-emerald-500'}`}>
                {gatekeeperConfig.enabled ? 'Desactivar' : 'Activar'}
              </button>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-center">
              <p className="text-xs font-black uppercase text-slate-400 mb-2">Código Actual</p>
              <p className="text-5xl font-black text-blue-600 tracking-[0.2em] mb-4">{currentCodeData?.code || '------'}</p>
              <button onClick={handleForceRegenerateCode} className="text-xs font-black text-blue-600 uppercase tracking-widest">Regenerar ahora</button>
            </div>
            <div className="space-y-4">
              <label className="text-sm font-black uppercase text-slate-400">Frecuencia (minutos)</label>
              <div className="flex gap-4">
                <input type="number" value={newFrequency} onChange={e => setNewFrequency(e.target.value)} className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold shadow-inner"/>
                <button onClick={handleUpdateFrequency} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-sm">Actualizar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
