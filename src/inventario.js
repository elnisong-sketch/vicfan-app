// Movimientos de inventario.
//
// Lo que sale por una venta —una cotización aprobada o un proyecto— o por un
// mantenimiento se descuenta del stock. Aquí solo hay funciones puras que
// devuelven listas nuevas; quien las llama decide cuándo guardarlas. El stock
// puede quedar en negativo a propósito: es mejor avisar y dejar seguir que
// bloquear a la oficina en mitad de un trabajo. Un negativo es un recordatorio
// de que hay que reponer, no un error que pare la app.

/** Material (planta o repuesto) que sale de las líneas de una cotización. */
export function materialDeItems(items = []) {
  return items
    .filter(i => i.modeloId || i.repuestoId)
    .map(i => ({
      clase: i.modeloId ? "planta" : "repuesto",
      id: i.modeloId || i.repuestoId,
      nombre: i.nombre,
      cantidad: Number(i.cantidad) || 1,
    }));
}

/** El equipo de un proyecto directo, si coincide con una planta del inventario. */
export function equipoComoMaterial(equipo, inventario = []) {
  const planta = equipo && inventario.find(m => m.nombre === equipo);
  return planta ? [{ clase: "planta", id: planta.id, nombre: planta.nombre, cantidad: 1 }] : [];
}

/** Junta líneas repetidas del mismo artículo en una sola. */
export function agrupar(material = []) {
  const mapa = new Map();
  for (const m of material) {
    if (!m.id || !m.cantidad) continue;
    const k = m.clase + ":" + m.id;
    const y = mapa.get(k);
    mapa.set(k, y ? { ...y, cantidad: y.cantidad + m.cantidad } : { ...m });
  }
  return [...mapa.values()];
}

/**
 * Aplica un movimiento de stock sobre copias nuevas de las listas.
 * signo -1 descuenta (sale material); +1 lo devuelve (se canceló el trabajo).
 * Devuelve las listas nuevas y qué artículos quedaron por debajo de cero.
 */
export function moverStock(inventario, repuestos, material, signo = -1) {
  const inv = inventario.map(x => ({ ...x }));
  const rep = repuestos.map(x => ({ ...x }));
  const faltantes = [];
  for (const m of agrupar(material)) {
    const lista = m.clase === "planta" ? inv : rep;
    const it = lista.find(x => x.id === m.id);
    if (!it) continue;
    const nuevo = (Number(it.stock) || 0) + signo * m.cantidad;
    it.stock = nuevo;
    if (signo < 0 && nuevo < 0) faltantes.push({ nombre: it.nombre, falta: -nuevo });
  }
  return { inventario: inv, repuestos: rep, faltantes };
}

/** Aviso para cuando algo quedó bajo cero. Vacío si todo cuadró. */
export function avisoFaltantes(faltantes = []) {
  if (!faltantes.length) return "";
  return "Ojo: no había stock suficiente de:\n" +
    faltantes.map(f => `• ${f.nombre} (faltan ${f.falta})`).join("\n") +
    "\n\nEl trabajo se guardó igual y el inventario quedó en negativo. Ajústalo cuando repongas.";
}

/** Resumen legible del material de un consumo, para enseñarlo en pantalla. */
export function resumenMaterial(material = []) {
  return agrupar(material).map(m => `${m.cantidad} × ${m.nombre}`).join(", ");
}
