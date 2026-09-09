// Almacén local de fotos de tareas.
//
// Las imágenes NO van en localStorage: un teléfono dispara fotos de 3–5 MB y
// localStorage tiene ~5 MB en total para toda la app. Si se llena, deja de
// guardarse absolutamente todo (clientes, ventas, tareas). Por eso las fotos
// viven en IndexedDB, que tiene cuota propia de cientos de MB.
//
// Cada foto se guarda con `subida: false`. Cuando se conecte el almacenamiento
// en la nube (Firebase Storage o Cloudinary), el proceso de subida lee las
// pendientes, las envía y marca `subida: true` con su URL remota. Esa es la
// cola de reintentos para trabajar sin señal.

const DB_NOMBRE = "vicfan_fotos";
const ALMACEN = "fotos";
const VERSION = 1;

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

/**
 * Reduce la foto antes de guardarla. Un técnico en la calle con datos móviles
 * no va a subir 4 MB: se le cuelga y termina cerrando tareas sin evidencia.
 * A 1280 px y calidad 0.7 una foto queda en 100–200 KB y el número de serie
 * de una placa se sigue leyendo sin problema.
 */
export async function comprimirImagen(file, maxLado = 1280, calidad = 0.7) {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close?.();

  return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", calidad));
}

export async function guardarFoto({ id, tareaId, tipo, file }) {
  const blob = await comprimirImagen(file);
  const registro = { id, tareaId, tipo, blob, bytes: blob.size, creadaEn: new Date().toISOString(), subida: false, url: null };
  await conAlmacen("readwrite", store => { store.put(registro); return {}; });
  return registro;
}

export async function fotosDeTarea(tareaId) {
  return conAlmacen("readonly", store => {
    const salida = { valor: [] };
    store.index("tareaId").openCursor(IDBKeyRange.only(tareaId)).onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) { salida.valor.push(cursor.value); cursor.continue(); }
    };
    return salida;
  });
}

export async function borrarFoto(id) {
  return conAlmacen("readwrite", store => { store.delete(id); return {}; });
}

export async function borrarFotosDeTarea(tareaId) {
  return conAlmacen("readwrite", store => {
    store.index("tareaId").openCursor(IDBKeyRange.only(tareaId)).onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
    return {};
  });
}

/** Cuántas fotos siguen sin subir a la nube y cuánto pesan. */
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
