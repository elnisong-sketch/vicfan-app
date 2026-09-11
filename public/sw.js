// Trabajador de servicio: lo que permite abrir la app sin conexión.
//
// La estrategia importa, y mucho. Ya tuvimos el problema de navegadores
// quedándose con versiones viejas durante horas, así que aquí NO se cachea todo
// por igual:
//
//   · La página (index.html) va SIEMPRE a la red primero. Si hay señal, se usa
//     lo último publicado; la copia guardada solo entra cuando no hay red. Así
//     una versión nueva llega en cuanto el técnico tiene cobertura.
//
//   · Los archivos de /assets/ se sirven de la copia guardada sin preguntar.
//     Es seguro porque Vite les pone un identificador único en el nombre en
//     cada compilación: si el archivo cambia, cambia su nombre, y entonces se
//     baja como uno nuevo. Nunca se sirve un contenido caducado bajo el mismo
//     nombre.

const CACHE = "vicfan-v1";
const ESENCIALES = ["/", "/manifest.webmanifest", "/iconos/icono-192.png"];

self.addEventListener("install", evento => {
  // Tomar el control sin esperar a que se cierren las pestañas abiertas.
  self.skipWaiting();
  evento.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ESENCIALES)).catch(() => {})
  );
});

self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys()
      .then(nombres => Promise.all(nombres.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", evento => {
  const peticion = evento.request;

  // Solo se gestionan las lecturas de esta misma web. Todo lo que va a
  // Firebase pasa de largo: tiene su propio mecanismo offline y meterse en
  // medio solo estorbaría.
  if (peticion.method !== "GET") return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  const esPagina = peticion.mode === "navigate";

  if (esPagina) {
    evento.respondWith(
      fetch(peticion)
        .then(respuesta => {
          const copia = respuesta.clone();
          caches.open(CACHE).then(c => c.put("/", copia)).catch(() => {});
          return respuesta;
        })
        .catch(() => caches.match("/").then(r => r || Response.error()))
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion).then(guardada => guardada || fetch(peticion).then(respuesta => {
      if (respuesta.ok && url.pathname.startsWith("/assets/")) {
        const copia = respuesta.clone();
        caches.open(CACHE).then(c => c.put(peticion, copia)).catch(() => {});
      }
      return respuesta;
    }))
  );
});
