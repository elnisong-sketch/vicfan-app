import { useState, useEffect } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot } from "firebase/firestore";
import { app, db, firebaseConfig } from "./firebase";

// Autenticación y permisos.
//
// El PIN se comprobaba dentro del navegador: servía para saber quién cerró una
// tarea entre gente de confianza, pero cualquiera podía saltárselo editando la
// página. Con Firebase Auth la identidad la verifica el servidor.
//
// Quién puede hacer qué NO está en el código, sino en la colección
// `vicfan_acceso`, un documento por persona con su rol. Así la oficina da de
// alta un Técnico 3 desde la app, sin que nadie tenga que tocar el programa ni
// las reglas. Tener una cuenta de Firebase no basta: sin documento de acceso,
// el servidor no devuelve ni un dato.

export const auth = getAuth(app);
export const COLECCION_ACCESO = "vicfan_acceso";

// La sesión sobrevive a cerrar el navegador y a reiniciar el móvil. Un técnico
// entra una vez y se olvida; si tuviera que escribir la contraseña cada mañana
// acabaría apuntándola en un papel dentro de la furgoneta.
setPersistence(auth, browserLocalPersistence).catch(() => {});

const normalizar = c => (c || "").trim().toLowerCase();
/** El correo hace de identificador del documento de acceso. */
export const refAcceso = correo => doc(db, COLECCION_ACCESO, normalizar(correo));

/** Traduce los códigos de Firebase a algo que se entienda en pantalla. */
export function mensajeDeError(codigo) {
  switch (codigo) {
    case "auth/invalid-email":          return "Ese correo no tiene un formato válido.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":     return "Correo o contraseña incorrectos.";
    case "auth/user-disabled":          return "Esta cuenta está desactivada. Habla con la oficina.";
    case "auth/too-many-requests":      return "Demasiados intentos fallidos. Espera unos minutos.";
    case "auth/network-request-failed": return "Sin conexión. Comprueba tus datos móviles.";
    case "auth/email-already-in-use":   return "Ya existe una cuenta con ese correo.";
    case "auth/weak-password":          return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/operation-not-allowed":  return "Falta activar el acceso por correo en Firebase.";
    default:                            return "No se pudo completar la operación. Inténtalo de nuevo.";
  }
}

export const entrar = (correo, clave) => signInWithEmailAndPassword(auth, normalizar(correo), clave);
export const salir = () => signOut(auth);

/**
 * Da de alta a alguien: crea su cuenta y su permiso.
 *
 * Se usa una instancia aparte de Firebase a propósito. Con la principal, crear
 * una cuenta deja la sesión abierta como esa persona nueva, y la oficina se
 * encontraría de golpe dentro de la app como si fuera el técnico recién
 * creado. Con una instancia secundaria que se tira al terminar, la sesión de
 * quien está dando el alta no se toca.
 */
export async function crearUsuario({ correo, clave, nombre, rol }) {
  const secundaria = initializeApp(firebaseConfig, `alta-${Date.now()}`);
  try {
    const authSec = getAuth(secundaria);
    await createUserWithEmailAndPassword(authSec, normalizar(correo), clave);
    await signOut(authSec).catch(() => {});
  } finally {
    await deleteApp(secundaria).catch(() => {});
  }

  await setDoc(refAcceso(correo), {
    correo: normalizar(correo),
    nombre: nombre?.trim() || normalizar(correo).split("@")[0],
    rol: rol === "admin" ? "admin" : "tecnico",
    creadoEn: new Date().toISOString(),
  });
}

/**
 * Retira el acceso. La cuenta de Firebase sigue existiendo —borrarla requiere
 * permisos de servidor— pero sin documento de acceso no puede leer nada, que
 * es lo que importa.
 */
export const quitarAcceso = correo => deleteDoc(refAcceso(correo));

export const cambiarRol = (correo, rol, nombre) => setDoc(refAcceso(correo), {
  correo: normalizar(correo),
  nombre,
  rol,
  creadoEn: new Date().toISOString(),
}, { merge: true });

/** Lista de personas con acceso, en vivo. Solo la oficina puede escribirla. */
export function useAccesos(activa) {
  const [accesos, setAccesos] = useState([]);
  useEffect(() => {
    if (!activa) return;
    return onSnapshot(collection(db, COLECCION_ACCESO),
      snap => setAccesos(snap.docs.map(d => d.data())),
      () => {});
  }, [activa]);
  return accesos;
}

const CLAVE_ROL = "vf_rol_cache";

/**
 * Sesión actual, con su rol.
 * @returns {{cargando, sesion, sinAcceso}}
 *   sinAcceso = se autenticó pero nadie le ha dado permiso todavía.
 */
export function useSesion() {
  const [estado, setEstado] = useState({ cargando: true, sesion: null, sinAcceso: false });

  useEffect(() => onAuthStateChanged(auth, async usuario => {
    if (!usuario) {
      try { localStorage.removeItem(CLAVE_ROL); } catch {}
      return setEstado({ cargando: false, sesion: null, sinAcceso: false });
    }

    const correo = normalizar(usuario.email);
    let perfil = null;
    try {
      const snap = await getDoc(refAcceso(correo));
      if (snap.exists()) perfil = snap.data();
    } catch {
      // Sin conexión no se puede confirmar el permiso. Se usa el último
      // conocido para que el técnico pueda seguir trabajando sin señal; las
      // reglas del servidor siguen mandando en cuanto haya red.
      try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_ROL) || "null");
        if (guardado?.correo === correo) perfil = guardado;
      } catch {}
    }

    if (!perfil) return setEstado({ cargando: false, sesion: null, sinAcceso: true });

    try { localStorage.setItem(CLAVE_ROL, JSON.stringify({ ...perfil, correo })); } catch {}

    setEstado({
      cargando: false,
      sinAcceso: false,
      sesion: {
        uid: usuario.uid,
        correo,
        nombre: perfil.nombre || correo.split("@")[0],
        rol: perfil.rol === "admin" ? "admin" : "tecnico",
        // El resto de la app identifica al técnico por este campo.
        tecnicoId: perfil.rol === "admin" ? null : usuario.uid,
      },
    });
  }), []);

  return estado;
}
