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
export async function comprimirImagen(file, maxLado = 1280, calidad = 0.7, tipo = "image/jpeg") {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");

  // El JPEG no admite transparencia: sin este relleno, lo transparente sale
  // negro. Se rellena de blanco, que es el color del papel y de la pantalla.
  if (tipo === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
  }
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close?.();

  return new Promise(resolve => canvas.toBlob(resolve, tipo, calidad));
}

const blobADataUrl = blob => new Promise((res, rej) => {
  const l = new FileReader();
  l.onload = () => res(l.result);
  l.onerror = () => rej(l.error);
  l.readAsDataURL(blob);
});

const dataUrlABlob = url => fetch(url).then(r => r.blob());

// ── GUARDAR Y SUBIR ───────────────────────────────────────────────────────────

/** Guarda la foto en el dispositivo e intenta subirla. Nunca falla por la red. */
export async function guardarFoto({ id, tareaId, tipo, autor, file }) {
  const blob = await comprimirImagen(file);
  const registro = { id, tareaId, tipo, autor: autor || "—", blob, bytes: blob.size, creadaEn: new Date().toISOString(), subida: false };
  await guardarLocal(registro);
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
