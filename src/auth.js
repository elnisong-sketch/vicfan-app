import { useState, useEffect } from "react";
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebase";

// Autenticación real, en lugar de los PIN.
//
// El PIN se comprobaba dentro del navegador: servía para saber quién cerró una
// tarea entre gente de confianza, pero cualquiera podía saltárselo editando la
// página. Con Firebase Auth la identidad la verifica el servidor, y eso es lo
// que permite que las reglas de Firestore decidan qué puede leer cada uno.

export const auth = getAuth(app);

// La sesión sobrevive a cerrar el navegador y a reiniciar el móvil. Un técnico
// entra una vez y se olvida; si tuviera que escribir la contraseña cada mañana
// acabaría apuntándola en un papel dentro de la furgoneta.
setPersistence(auth, browserLocalPersistence).catch(() => {});

/**
 * Correos con acceso de oficina. Cualquier otra cuenta válida es un técnico.
 *
 * IMPORTANTE: esta lista tiene que coincidir con la de `firestore.rules`. Esta
 * de aquí solo decide qué pantallas se muestran; la de las reglas es la que
 * realmente protege los datos. Si alguien manipulase esta, seguiría sin poder
 * leer una cotización, porque el servidor se lo niega.
 */
export const CORREOS_OFICINA = [
  "elnisong@gmail.com",
];

/**
 * Correos de los técnicos. También tiene que coincidir con `firestore.rules`.
 * Una cuenta que no esté en ninguna de las dos listas se queda sin datos: el
 * servidor se los niega aunque consiga autenticarse.
 */
export const CORREOS_TECNICOS = [
  "tecnico1@vicfan.app",
  "tecnico2@vicfan.app",
];

const normalizar = c => (c || "").trim().toLowerCase();
export const esCorreoDeOficina = correo => CORREOS_OFICINA.map(normalizar).includes(normalizar(correo));
export const tieneAcceso = correo => esCorreoDeOficina(correo) || CORREOS_TECNICOS.map(normalizar).includes(normalizar(correo));

/** Traduce los códigos de Firebase a algo que se entienda en pantalla. */
export function mensajeDeError(codigo) {
  switch (codigo) {
    case "auth/invalid-email":        return "Ese correo no tiene un formato válido.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":   return "Correo o contraseña incorrectos.";
    case "auth/user-disabled":        return "Esta cuenta está desactivada. Habla con la oficina.";
    case "auth/too-many-requests":    return "Demasiados intentos fallidos. Espera unos minutos.";
    case "auth/network-request-failed": return "Sin conexión. Comprueba tus datos móviles.";
    default:                          return "No se pudo entrar. Inténtalo de nuevo.";
  }
}

export const entrar = (correo, clave) => signInWithEmailAndPassword(auth, normalizar(correo), clave);
export const salir = () => signOut(auth);

/**
 * Sesión actual.
 * @returns {{cargando:boolean, sesion:null|{uid,correo,nombre,rol}}}
 */
export function useSesion() {
  const [estado, setEstado] = useState({ cargando: true, sesion: null });

  useEffect(() => onAuthStateChanged(auth, usuario => {
    if (!usuario) return setEstado({ cargando: false, sesion: null });

    const oficina = esCorreoDeOficina(usuario.email);
    setEstado({
      cargando: false,
      sesion: {
        uid: usuario.uid,
        correo: usuario.email,
        // El nombre que se firma en cierres, fotos y comentarios. Si nadie lo
        // puso en Firebase, se usa la parte del correo antes de la arroba.
        nombre: usuario.displayName || (oficina ? "Oficina" : (usuario.email || "").split("@")[0]),
        rol: oficina ? "admin" : "tecnico",
        // Se conserva para que el resto de la app siga funcionando igual: antes
        // el técnico se identificaba por este campo.
        tecnicoId: oficina ? null : usuario.uid,
      },
    });
  }), []);

  return estado;
}
