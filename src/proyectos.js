import { hoy, uid, sumarMeses, fechaDeInstante } from "./ui.jsx";
import { tareaVacia, estaAbierta } from "./modules/Tareas.jsx";

// Proyectos y mantenimientos programados.
//
// Un proyecto agrupa las visitas de un mismo trabajo (la instalación, alguna
// reparación posterior, sus mantenimientos). Puede nacer de una cotización
// aprobada, de una inspección que se concretó o crearse directamente.
//
// Al cerrarse un proyecto se programa solo su primer mantenimiento a los N
// meses, y al finalizar cada mantenimiento se programa el siguiente. Si un
// mantenimiento se cancela, la cadena se detiene: normalmente significa que
// el cliente ya no lo quiere, y reprogramarlo solo sería insistir.

export const MESES_MANTENIMIENTO = [
  { value: 6,  label: "Cada 6 meses" },
  { value: 3,  label: "Cada 3 meses" },
  { value: 12, label: "Cada 12 meses" },
  { value: 0,  label: "Sin mantenimiento" },
];

// Garantía de fábrica de la planta: corre desde el día en que se pone en
// funcionamiento, no desde que se vende ni desde que se cierra el proyecto.
export const MESES_GARANTIA = 24;

/** Días que faltan hasta una fecha (negativo si ya pasó). */
export const diasHasta = iso => Math.round((new Date(iso + "T12:00:00") - new Date(hoy() + "T12:00:00")) / 86400000);

/**
 * Garantía de un proyecto. Su id se deriva del proyecto para que no pueda
 * haber dos garantías del mismo trabajo aunque se pulse el botón dos veces.
 */
export const garantiaDeProyecto = (proyecto, { fecha, serial = "", meses = MESES_GARANTIA }) => ({
  id: `gar-${proyecto.id}`,
  proyectoId: proyecto.id,
  proyectoNombre: proyecto.nombre,
  clienteId: proyecto.clienteId,
  modelo: proyecto.equipo || "",
  serial: serial.trim(),
  fechaInstalacion: fecha,
  mesesGarantia: meses,
  vence: sumarMeses(fecha, meses),
  activadaEn: new Date().toISOString(),
});

export const proyectoVacio = (datos = {}) => ({
  id: uid(),
  nombre: "",
  clienteId: "",
  direccion: "",
  equipo: "",
  descripcion: "",
  origen: "Directo",
  estado: "Abierto",
  fechaInicio: hoy(),
  fechaCierre: null,
  mantenimientoMeses: 6,
  // Si alguien reabre un proyecto a mano, deja de cerrarse solo: si no, se
  // volvería a cerrar al instante porque sus tareas siguen terminadas.
  autoCierre: true,
  historial: [],
  creadoEn: new Date().toISOString(),
  ...datos,
});

/**
 * Tarea que pertenece a un proyecto. Lleva copiado el nombre del proyecto
 * porque los técnicos no pueden leer la colección de proyectos (tienen datos
 * económicos) y aun así tienen que saber a qué trabajo va cada visita.
 */
export const tareaDeProyecto = (proyecto, datos = {}) => ({
  ...tareaVacia(proyecto.clienteId),
  proyectoId: proyecto.id,
  proyectoNombre: proyecto.nombre,
  direccion: proyecto.direccion || "",
  modelo: proyecto.equipo || "",
  ...datos,
});

const conHistorial = (x, accion, quien = "Oficina") => ({
  ...x,
  historial: [...(x.historial || []), { accion, quien, cuando: new Date().toISOString() }],
});

/** Día en que se finalizó una tarea, o su fecha programada si no consta. */
const diaDeCierre = t => (t.cierre?.cerradaEn ? fechaDeInstante(t.cierre.cerradaEn) : t.fecha);

/**
 * Calcula lo que hay que hacer automáticamente, sin tocar nada. Es una función
 * pura a propósito: se puede ejecutar tantas veces como se quiera y, una vez
 * aplicado su resultado, la siguiente vez devuelve listas vacías. Los ids de
 * los mantenimientos son fijos (`mant-<proyecto>-<n>`) para que dos
 * ejecuciones seguidas no puedan crear el mismo mantenimiento dos veces.
 *
 * @returns {{ proyectos: object[], tareasNuevas: object[] }}
 *   proyectos    → proyectos modificados (cerrados automáticamente)
 *   tareasNuevas → mantenimientos a crear
 */
export function planAutomatico(proyectos, tareas) {
  const proyectosCambiados = [];
  const tareasNuevas = [];
  const idsExistentes = new Set(tareas.map(t => t.id));

  for (const original of proyectos) {
    let p = original;
    const suyas = tareas.filter(t => t.proyectoId === p.id);
    const trabajo = suyas.filter(t => t.tipo !== "Mantenimiento");

    // ── Cierre automático: todo su trabajo terminado y algo hecho de verdad ──
    if (p.estado !== "Cerrado" && p.autoCierre !== false && trabajo.length > 0
        && trabajo.every(t => !estaAbierta(t)) && trabajo.some(t => t.estado === "Completada")) {
      const fecha = trabajo.filter(t => t.estado === "Completada").map(diaDeCierre).sort().pop();
      p = conHistorial({ ...p, estado: "Cerrado", fechaCierre: fecha }, "Cerrado automáticamente al finalizar su último trabajo");
      proyectosCambiados.push(p);
    }

    // ── Siguiente mantenimiento ──
    const meses = Number(p.mantenimientoMeses) || 0;
    if (p.estado !== "Cerrado" || meses <= 0 || !p.fechaCierre) continue;

    const mants = suyas.filter(t => t.tipo === "Mantenimiento")
      .sort((a, b) => (a.mantenimientoN || 0) - (b.mantenimientoN || 0));
    const ultimo = mants[mants.length - 1];

    let n, base;
    if (!ultimo) { n = 1; base = p.fechaCierre; }
    else if (ultimo.estado === "Completada") { n = (ultimo.mantenimientoN || mants.length) + 1; base = diaDeCierre(ultimo); }
    else continue;   // hay uno pendiente, o se canceló y la cadena se detiene

    const id = `mant-${p.id}-${n}`;
    if (idsExistentes.has(id)) continue;

    tareasNuevas.push(tareaDeProyecto(p, {
      id,
      tipo: "Mantenimiento",
      fecha: sumarMeses(base, meses),
      duracionDias: 1,
      mantenimientoN: n,
      descripcion: `Mantenimiento preventivo nº ${n} del proyecto.`,
      historial: [{
        accion: n === 1
          ? `Programado automáticamente ${meses} meses después del cierre del proyecto`
          : `Programado automáticamente ${meses} meses después del mantenimiento anterior`,
        quien: "Sistema",
        cuando: new Date().toISOString(),
      }],
    }));
  }

  return { proyectos: proyectosCambiados, tareasNuevas };
}
