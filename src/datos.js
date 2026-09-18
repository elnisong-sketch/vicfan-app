import { useState, useEffect, useRef } from "react";
import { collection, doc, onSnapshot, writeBatch, query, where } from "firebase/firestore";
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
 * @param filtro  condición [campo, valor] para pedir solo parte de la
 *                colección. Hace falta cuando las reglas limitan lo que se
 *                puede leer: las reglas de Firestore NO filtran, autorizan. Si
 *                se pide la colección entera y alguno de sus documentos no
 *                estuviera permitido, se deniega la consulta completa aunque
 *                el resto sí lo estuviera. Hay que pedir ya solo lo permitido.
 */
export function useColeccion(nombre, semilla, activa = true, filtro = null) {
  const claveLS = `vf_${nombre}`;
  const ruta = `vicfan_${nombre}`;

  // El arranque es siempre local: la app tiene que abrir y funcionar sin red.
  const [items, setItems] = useState(() => cargarLS(claveLS, typeof semilla === "function" ? semilla() : semilla));

  // Último estado que sabemos que está en Firestore. Sirve para calcular qué
  // cambió de verdad y mandar solo eso. `null` = todavía no hemos hablado con
  // la nube, así que no se sube nada (no vaya a pisar algo más nuevo).
  const enNube = useRef(null);

  useEffect(() => { guardarLocal(claveLS, items); }, [claveLS, items]);

  // ── Bajar: escuchar la colección ────────────────────────────────────────────
  const claveFiltro = filtro ? `${filtro[0]}=${filtro[1]}` : "";

  useEffect(() => {
    if (!activa) return;
    const col = collection(db, ruta);
    const consulta = filtro ? query(col, where(filtro[0], "==", filtro[1])) : col;
    const unsub = onSnapshot(consulta, snap => {
      const remotos = snap.docs.map(d => d.data());

      // La nube manda siempre, también cuando está vacía. Antes, si un equipo
      // la encontraba vacía la "sembraba" con lo que tuviera guardado, y eso
      // hacía imposible dejar la base a cero: el primer móvil que abriera la
      // app volvía a subir los datos viejos.
      enNube.current = remotos;
      setItems(actual => igual(actual, remotos) ? actual : remotos);
    }, () => {});
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta, activa, claveFiltro]);

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
