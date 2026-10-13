import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getBlob, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";

// Fotos de las tareas.
//
// La foto se sube a Cloud Storage (`fotos/{id}`), NO a Firestore. En Firestore
// cada documento tope en 1 MB (una foto de Android se pasa) e infla la base
// (plan gratuito: 1 GB). Storage está hecho para archivos: sin ese límite y la
// subida es fiable. Las fotos ANTIGUAS, que sí quedaron en Firestore como
// base64, se siguen leyendo (compatibilidad) hasta que se reemplacen.
//
// El dispositivo guarda además una copia en IndexedDB, que hace dos papeles:
//   · cola de subida — el técnico fotografía sin señal y se envía al volver
//   · caché — lo ya descargado no se vuelve a pedir
//
// Por eso NO se cargan todas las fotos al arrancar: se piden una a una cuando
// se abre la tarea que las contiene. Bajarlas todas al móvil de un técnico
// sería gastarle los datos sin motivo.

const DB_NOMBRE = "vicfan_fotos";
const ALMACEN = "fotos";
const VERSION = 1;
const COLECCION = "vicfan_fotos";   // solo para leer fotos antiguas (base64)
const rutaFoto = id => storageRef(storage, `fotos/${id}`);

// Traduce el fallo de subida a algo que el técnico entienda, para que el aviso
// no sea solo "no se subió" sino el motivo real.
function motivoDeFallo(e) {
  const c = (e?.code || e?.message || "").toString().toLowerCase();
  if (c.includes("unauthorized") || c.includes("permission")) return "Sin permiso para subir (revisar reglas de Storage).";
  if (c.includes("unauthenticated")) return "Sesión caducada. Vuelve a entrar.";
  if (c.includes("quota")) return "Almacenamiento lleno.";
  if (c.includes("retry") || c.includes("network") || c.includes("canceled")) return "Sin conexión estable. Reintenta con señal.";
  if (c.includes("object-not-found") || c.includes("bucket-not-found") || c.includes("project-not-found") || c.includes("unknown")) return "Storage no disponible (¿sin habilitar?).";
  return "No se pudo subir la foto.";
}

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ALMACEN)) {
        const store = db.createObjectStore(ALMACEN, { keyPath: "id" });
        store.createIndex("tareaId", "tareaId", { unique: false });
        store.createIndex("subida", "subida", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function conAlmacen(modo, fn) {
  return abrirDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(ALMACEN, modo);
    const resultado = fn(tx.objectStore(ALMACEN));
    tx.oncomplete = () => { db.close(); resolve(resultado.valor); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

const leerLocal = id => conAlmacen("readonly", store => {
  const salida = { valor: null };
  store.get(id).onsuccess = e => { salida.valor = e.target.result || null; };
  return salida;
});

const guardarLocal = registro => conAlmacen("readwrite", store => { store.put(registro); return {}; });

// ── COMPRESIÓN ────────────────────────────────────────────────────────────────

/**
 * Reduce la foto antes de guardarla. Un técnico en la calle con datos móviles
 * no va a subir 4 MB: se le cuelga y termina cerrando tareas sin evidencia.
 * A 1280 px y calidad 0.7 una foto queda en 100-200 KB y el número de serie
 * de una placa se sigue leyendo sin problema.
 */
// Decodifica la imagen. Primero con createImageBitmap (rapido); si el formato
// lo rechaza --pasa con algun HEIC del iPhone o ciertos WebP-- cae a un <img>,
// que el navegador si sabe pintar. Asi no se pierde la foto por el formato.
async function decodificar(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      return await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => rej(new Error("No se pudo leer la imagen"));
        img.src = url;
      });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
  }
}

const aBlob = (canvas, tipo, calidad) => new Promise(resolve => canvas.toBlob(resolve, tipo, calidad));

export async function comprimirImagen(file, maxLado = 1280, calidad = 0.7, tipo = "image/jpeg") {
  const src = await decodificar(file);
  const anchoReal = src.width || src.naturalWidth;
  const altoReal = src.height || src.naturalHeight;

  // Se intenta a 1280 px; si la memoria no da para el toBlob (devuelve null),
  // se reintenta cada vez mas pequeno antes de rendirse.
  for (const lado of [maxLado, 1024, 800, 640]) {
    const escala = Math.min(1, lado / Math.max(anchoReal, altoReal));
    const ancho = Math.max(1, Math.round(anchoReal * escala));
    const alto = Math.max(1, Math.round(altoReal * escala));
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (tipo === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, ancho, alto); }
    ctx.drawImage(src, 0, 0, ancho, alto);
    const blob = await aBlob(canvas, tipo, calidad);
    if (blob) { src.close?.(); return blob; }
  }
  src.close?.();
  return null;
}

const blobADataUrl = blob => new Promise((res, rej) => {
  const l = new FileReader();
  l.onload = () => res(l.result);
  l.onerror = () => rej(l.error);
  l.readAsDataURL(blob);
});

const dataUrlABlob = url => fetch(url).then(r => r.blob());

// ── GUARDAR Y SUBIR ───────────────────────────────────────────────────────────

// Libera espacio borrando de la cache local las fotos que YA estan subidas a
// la nube. No se pierden: se vuelven a bajar de Firestore si hacen falta.
async function liberarEspacioLocal() {
  return conAlmacen("readwrite", store => {
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) { if (cursor.value.subida) store.delete(cursor.value.id); cursor.continue(); }
    };
    return {};
  });
}

/** Guarda la foto en el dispositivo e intenta subirla. Tolera fallos de
 *  formato, de memoria y de espacio, y nunca falla por la red. */
export async function guardarFoto({ id, tareaId, tipo, autor, file }) {
  const blob = await comprimirImagen(file);
  if (!blob) { const err = new Error("No se pudo procesar la imagen"); err.motivo = "formato"; throw err; }
  const registro = { id, tareaId, tipo, autor: autor || "—", blob, bytes: blob.size, creadaEn: new Date().toISOString(), subida: false };

  try {
    await guardarLocal(registro);
  } catch {
    await liberarEspacioLocal().catch(() => {});
    try {
      await guardarLocal(registro);
    } catch {
      try { await subirFoto(registro); return registro; }
      catch { const err = new Error("Sin espacio y sin conexion"); err.motivo = "espacio"; throw err; }
    }
  }
  subirFoto(registro).catch(() => {});   // en segundo plano; si falla, queda en cola
  return registro;
}

async function subirFoto(registro) {
  await uploadBytes(rutaFoto(registro.id), registro.blob, {
    contentType: registro.blob?.type || "image/jpeg",
    customMetadata: {
      tareaId: registro.tareaId || "",
      tipo: registro.tipo || "",
      autor: registro.autor || "—",
      creadaEn: registro.creadaEn || "",
    },
  });
  await guardarLocal({ ...registro, subida: true });
}

/**
 * Sube todo lo que quedó pendiente. Se llama al pulsar Guardar y al recuperar
 * la conexión.
 * @returns {{subidas:number, pendientes:number}}
 */
export async function subirPendientes() {
  const cola = await pendientesDeSubir();
  let subidas = 0;
  let fallo = null;
  for (const registro of cola) {
    try { await subirFoto(registro); subidas++; } catch (e) { fallo = e; /* sigue en cola */ }
  }
  const restantes = await pendientesDeSubir();
  return { subidas, pendientes: restantes.length, error: restantes.length && fallo ? motivoDeFallo(fallo) : null };
}

// ── LEER ──────────────────────────────────────────────────────────────────────

/**
 * Devuelve el blob de una foto. Si este dispositivo no la tiene (la tomó otro),
 * la baja de Firestore y la deja cacheada.
 */
export async function asegurarFoto(id) {
  const local = await leerLocal(id).catch(() => null);
  if (local?.blob) return local.blob;

  // 1) Foto nueva: está en Cloud Storage.
  try {
    const blob = await getBlob(rutaFoto(id));
    await guardarLocal({ id, blob, bytes: blob.size, creadaEn: new Date().toISOString(), subida: true }).catch(() => {});
    return blob;
  } catch { /* no está en Storage; puede ser una foto antigua en Firestore */ }

  // 2) Foto antigua (antes de la migración): base64 dentro de Firestore.
  try {
    const snap = await getDoc(doc(db, COLECCION, id));
    if (snap.exists()) {
      const d = snap.data();
      const blob = await dataUrlABlob(d.datos);
      await guardarLocal({ id, tareaId: d.tareaId, tipo: d.tipo, autor: d.autor || "—", blob, bytes: blob.size, creadaEn: d.creadaEn, subida: true }).catch(() => {});
      return blob;
    }
  } catch { /* sin conexión o sin permiso */ }
  return null;
}

/** Cuántas fotos de esta lista siguen sin subir en este dispositivo. */
export async function contarPendientes(ids = []) {
  if (!ids.length) return 0;
  const cola = await pendientesDeSubir().catch(() => []);
  const enCola = new Set(cola.map(f => f.id));
  return ids.filter(id => enCola.has(id)).length;
}

/** Total de fotos que este dispositivo aun no ha subido (de todas las tareas). */
export async function contarTodasPendientes() {
  const cola = await pendientesDeSubir().catch(() => []);
  return cola.length;
}

export async function pendientesDeSubir() {
  return conAlmacen("readonly", store => {
    const salida = { valor: [] };
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) { if (!cursor.value.subida) salida.valor.push(cursor.value); cursor.continue(); }
    };
    return salida;
  });
}

// ── BORRAR ────────────────────────────────────────────────────────────────────

export async function borrarFoto(id) {
  await conAlmacen("readwrite", store => { store.delete(id); return {}; });
  await deleteObject(rutaFoto(id)).catch(() => {});       // foto nueva (Storage)
  await deleteDoc(doc(db, COLECCION, id)).catch(() => {}); // foto antigua (Firestore)
}
