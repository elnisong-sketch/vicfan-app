import { useState, useEffect, useRef } from "react";
import { collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { cargarLS } from "./ui.jsx";

// Capa de datos: UN DOCUMENTO POR REGISTRO.
//
// Antes cada colección entera viajaba serializada dentro de un único documento
// (`{ valor: "[...]" }`). Con un solo usuario funcionaba, pero con varios se
// perdía trabajo: si el técnico cerraba una tarea mientras la oficina daba de
// alta un cliente, el segundo en escribir mandaba su copia completa del
// listado y borraba el cambio del primero, sin error ni aviso.
//
// Ahora cada cliente, tarea o venta es su propio documento en Firestore. Dos
// personas que tocan cosas distintas ya no se pisan: solo se sobrescriben si
// editan exactamente el mismo registro, que es el comportamiento esperable.

const guardarLocal = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch {} };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const porId = lista => new Map(lista.map(x => [x.id, x]));

// Firestore rechaza `undefined`. El viaje por JSON los elimina y de paso
// garantiza que solo se envían datos planos serializables.
const limpiar = obj => JSON.parse(JSON.stringify(obj));

/**
 * Mantiene una lista sincronizada entre memoria, localStorage y Firestore.
 * Devuelve `[items, setItems]`, igual que useState, para que los módulos no
 * tengan que saber nada de la nube.
 *
 * @param nombre  nombre de la colección, sin prefijo ("tareas", "clientes"…)
 * @param semilla datos iniciales si no hay nada guardado (valor o función)
 * @param activa  si es false, no se conecta a la nube. Se usa para que un
 *                técnico no intente siquiera leer las cotizaciones: las reglas
 *                se lo negarían y solo conseguiría errores en pantalla.
 */
export function useColeccion(nombre, semilla, activa = true) {
  const claveLS = `vf_${nombre}`;
  const ruta = `vicfan_${nombre}`;

  // El arranque es siempre local: la app tiene que abrir y funcionar sin red.
  const [items, setItems] = useState(() => cargarLS(claveLS, typeof semilla === "function" ? semilla() : semilla));

  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Último estado que sabemos que está en Firestore. Sirve para calcular qué
  // cambió de verdad y mandar solo eso. `null` = todavía no hemos hablado con
  // la nube, así que no se sube nada (no vaya a pisar algo más nuevo).
  const enNube = useRef(null);

  useEffect(() => { guardarLocal(claveLS, items); }, [claveLS, items]);

  // ── Bajar: escuchar la colección ────────────────────────────────────────────
  useEffect(() => {
    if (!activa) return;
    const unsub = onSnapshot(collection(db, ruta), snap => {
      const remotos = snap.docs.map(d => d.data());

      // Primera conexión con la nube vacía: este equipo la siembra con lo que
      // tenga. Marcar enNube como vacío hace que el efecto de subida detecte
      // todos los registros como nuevos y los envíe.
      if (enNube.current === null && remotos.length === 0 && itemsRef.current.length > 0) {
        enNube.current = [];
        setItems(actual => [...actual]);
        return;
      }

      enNube.current = remotos;
      setItems(actual => igual(actual, remotos) ? actual : remotos);
    }, () => {});
    return () => unsub();
  }, [ruta, activa]);

  // ── Subir: mandar solo lo que cambió ────────────────────────────────────────
  useEffect(() => {
    if (!activa || enNube.current === null) return;

    const antes = porId(enNube.current);
    const ahora = porId(items);
    const cambios = [];

    for (const [id, item] of ahora) {
      if (!antes.has(id) || !igual(antes.get(id), item)) cambios.push({ op: "set", id, item });
    }
    for (const id of antes.keys()) {
      if (!ahora.has(id)) cambios.push({ op: "del", id });
    }
    if (cambios.length === 0) return;

    enNube.current = items;

    // Firestore admite 500 operaciones por lote; se trocea por si acaso.
    for (let i = 0; i < cambios.length; i += 450) {
      const lote = writeBatch(db);
      for (const c of cambios.slice(i, i + 450)) {
        const ref = doc(db, ruta, String(c.id));
        if (c.op === "set") lote.set(ref, limpiar(c.item));
        else lote.delete(ref);
      }
      lote.commit().catch(() => {});
    }
  }, [ruta, items, activa]);

  return [items, setItems];
}
