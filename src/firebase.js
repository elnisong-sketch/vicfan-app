import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Proyecto propio de VICFAN, separado del de Don Pepe a propósito: cuota,
// reglas de seguridad y plan de facturación son por proyecto, así que un
// problema en una app no puede arrastrar a la otra.
//
// Esta configuración no es un secreto: viaja dentro del JavaScript que se
// descarga al abrir la web. Lo que protege los datos son las Reglas de
// Firestore, no esta clave.
const firebaseConfig = {
  apiKey: "AIzaSyAzV_N60yez_lbv13uTqdch9dqwD2Ar_Vo",
  authDomain: "vicfan-d9467.firebaseapp.com",
  projectId: "vicfan-d9467",
  storageBucket: "vicfan-d9467.firebasestorage.app",
  messagingSenderId: "550959750572",
  appId: "1:550959750572:web:c69e07ff1127e1ac552e09"
};

const app = initializeApp(firebaseConfig);

// Caché persistente: con datos móviles inestables (el caso de los técnicos en
// Venezuela) Firestore sigue leyendo y escribiendo sin conexión, y encola los
// cambios para enviarlos cuando la señal vuelve. Sin esto, cada bache de red
// sería un error en pantalla.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
