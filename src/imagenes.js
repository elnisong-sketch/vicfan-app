import { comprimirImagen } from "./fotos.js";

// Imágenes que viajan DENTRO del registro, no en la cola de subida.
//
// Las fotos de las tareas van a IndexedDB porque son muchas y solo importan en
// el móvil que las tomó. El logo y las fotos de catálogo son lo contrario: son
// pocas, cambian casi nunca, y tienen que verse en todos los dispositivos y
// salir impresas en el presupuesto. Por eso se guardan comprimidas como texto
// dentro del propio documento de Firestore.
//
// Un documento de Firestore admite 1 MB. Comprimidas a estos tamaños cada
// imagen ronda los 40-100 KB, así que caben de sobra con margen.

/** Tamaño a partir del cual conviene avisar de que la imagen es grande. */
const AVISO_BYTES = 250 * 1024;

const aDataUrl = blob => new Promise((resolve, reject) => {
  const lector = new FileReader();
  lector.onload = () => resolve(lector.result);
  lector.onerror = () => reject(lector.error);
  lector.readAsDataURL(blob);
});

/**
 * Comprime la imagen y la devuelve como data URL lista para guardar.
 * @param maxLado lado mayor en píxeles tras redimensionar
 * @param calidad 0-1 para el JPEG
 */
export async function prepararImagen(file, maxLado = 600, calidad = 0.75) {
  const blob = await comprimirImagen(file, maxLado, calidad);
  const dataUrl = await aDataUrl(blob);
  return { dataUrl, bytes: blob.size, grande: blob.size > AVISO_BYTES };
}

/** Logo: se guarda algo más pequeño, solo tiene que leerse en la cabecera. */
export const prepararLogo = file => prepararImagen(file, 400, 0.85);
