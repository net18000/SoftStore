# SoftStore 🚀

SoftStore es una plataforma de comercio electrónico moderna y modularizada para la distribución de software digital.

## ✨ Características

- **Arquitectura Modular**: Componentes separados para una mejor mantenibilidad.
- **Tienda Completa**: Catálogo de productos con sistema de ofertas y cronómetros.
- **Panel de Administración**: Gestión de productos, banners, pedidos, clientes y seguridad.
- **Autenticación Segura**: Integración con Firebase Auth (Google y Email/Contraseña).
- **Pagos Flexibles**: Soporte para PayPal y métodos de pago manuales (Yape, Plin, Transferencias).
- **Biblioteca de Usuario**: Acceso inmediato a descargas y guías de instalación tras la compra.
- **Seguridad Avanzada**: Sistema de Gatekeeper con códigos dinámicos y bloqueo de dispositivos por IP.
- **Modo Oscuro**: Interfaz adaptativa con Tailwind CSS.

## 🛠️ Tecnologías

- **React**: Biblioteca principal para la interfaz de usuario.
- **Tailwind CSS**: Framework de diseño para estilos modernos y responsivos.
- **Firebase**: Backend-as-a-Service para base de datos (Firestore), autenticación y almacenamiento (Storage).
- **Lucide React**: Set de iconos modernos.
- **Quill.js**: Editor de texto enriquecido para descripciones de productos.

## 📁 Estructura del Proyecto

- `index.html`: Punto de entrada y cargador de recursos.
- `src/App.js`: Orquestador principal de la aplicación.
- `src/components/`: Componentes específicos de cada vista (Store, Admin, Library, Auth, etc.).
- `src/config/`: Configuraciones de Firebase, API keys y constantes.
- `src/utils/`: Funciones auxiliares y lógica compartida.
- `src/index.css`: Estilos globales personalizados.

## 🚀 Instalación y Uso

Este proyecto utiliza **Babel Standalone** para ejecutarse directamente en el navegador sin necesidad de un paso de compilación complejo para desarrollo rápido.

1. Clona este repositorio.
2. Abre `index.html` en tu navegador (o usa un Live Server).
3. Configura tus propias credenciales en `src/config/firebase.js` y `src/config/constants.js`.

---
Desarrollado con ❤️ para SoftStore.
