import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

// Fotos de las tareas.
//
// Cada foto es SU PROPIO documento en Firestore (`vicfan_fotos/{id}`), no un
// campo dentro de la tarea. Una tarea con ocho fotos superaría el límite de
// 1 MB por documento; separadas, cada una ronda los 150-200 KB y sobra sitio.
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
const COLECCION = "vicfan_fotos";

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
  const datos = await blobADataUrl(registro.blob);
  await setDoc(doc(db, COLECCION, registro.id), {
    id: registro.id,
    tareaId: registro.tareaId,
    tipo: registro.tipo,
    autor: registro.autor || "—",
    datos,
    creadaEn: registro.creadaEn,
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
  for (const registro of cola) {
    try { await subirFoto(registro); subidas++; } catch { /* sigue en cola */ }
  }
  const restantes = await pendientesDeSubir();
  return { subidas, pendientes: restantes.length };
}

// ── LEER ──────────────────────────────────────────────────────────────────────

/**
 * Devuelve el blob de una foto. Si este dispositivo no la tiene (la tomó otro),
 * la baja de Firestore y la deja cacheada.
 */
export async function asegurarFoto(id) {
  const local = await leerLocal(id).catch(() => null);
  if (local?.blob) return local.blob;

  const snap = await getDoc(doc(db, COLECCION, id));
  if (!snap.exists()) return null;

  const d = snap.data();
  const blob = await dataUrlABlob(d.datos);
  await guardarLocal({ id, tareaId: d.tareaId, tipo: d.tipo, autor: d.autor || "—", blob, bytes: blob.size, creadaEn: d.creadaEn, subida: true })
    .catch(() => {});
  return blob;
}

/** Cuántas fotos de esta lista siguen sin subir en este dispositivo. */
export async function contarPendientes(ids = []) {
  if (!ids.length) return 0;
  const cola = await pendientesDeSubir().catch(() => []);
  const enCola = new Set(cola.map(f => f.id));
  return ids.filter(id => enCola.has(id)).length;
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
  await deleteDoc(doc(db, COLECCION, id)).catch(() => {});
}
