import { useState, useEffect } from "react";

// Detección de versión nueva publicada.
//
// El navegador puede quedarse con una copia vieja de la app durante horas, y
// entonces el usuario ve una pantalla que ya no existe y reporta fallos que
// están corregidos. En un móvil de un técnico eso es peor todavía: no va a
// saber vaciar la caché en mitad de la calle.
//
// Esto compara el nombre del archivo JavaScript que está cargado con el que
// anuncia el servidor. Vite le pone un hash distinto a cada compilación, así
// que si no coinciden es que hay versión nueva esperando.

/** @param intervaloMs cada cuánto preguntar al servidor. */
export function useNuevaVersion(intervaloMs = 90000) {
  const [hayNueva, setHayNueva] = useState(false);

  useEffect(() => {
    const cargado = document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute("src");
    // En desarrollo el script es /src/main.jsx: no hay nada que comparar.
    if (!cargado) return;

    let vivo = true;
    const comprobar = async () => {
      try {
        const html = await (await fetch(`/?v=${Date.now()}`, { cache: "no-store" })).text();
        const publicado = html.match(/\/assets\/[^"']+\.js/)?.[0];
        if (vivo && publicado && publicado !== cargado) setHayNueva(true);
      } catch {
        // Sin conexión no se puede saber; se reintenta en el siguiente ciclo.
      }
    };

    comprobar();
    const id = setInterval(comprobar, intervaloMs);
    // Volver a la app tras dejarla en segundo plano es el momento típico en
    // que conviene comprobar: el técnico la reabre por la mañana.
    const alVolver = () => { if (document.visibilityState === "visible") comprobar(); };
    document.addEventListener("visibilitychange", alVolver);

    return () => { vivo = false; clearInterval(id); document.removeEventListener("visibilitychange", alVolver); };
  }, [intervaloMs]);

  return hayNueva;
}
