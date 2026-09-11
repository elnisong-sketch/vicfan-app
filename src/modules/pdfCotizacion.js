import { jsPDF } from "jspdf";
import { usd } from "../ui.jsx";

// Generación del presupuesto en PDF.
//
// Antes esto se hacía con la impresión del navegador, y funcionaba en el
// escritorio pero NO en el móvil: dentro de una PWA instalada, Chrome no
// ofrece diálogo de impresión y `window.print()` se queda mudo. Justo el sitio
// donde más falta hace, porque el presupuesto se manda por WhatsApp desde el
// teléfono.
//
// Ahora el PDF se construye aquí y sale un archivo de verdad, que se puede
// compartir o descargar en cualquier dispositivo.

const MARGEN = 14;         // milímetros
const ANCHO = 210;         // A4
const ALTO = 297;
const UTIL = ANCHO - MARGEN * 2;

const NEGRO = [0, 0, 0];
const GRIS = [110, 110, 110];

/** Divide un texto para que quepa en un ancho dado. */
const partir = (doc, texto, ancho) => doc.splitTextToSize(String(texto || ""), ancho);

/**
 * @param cotizacion presupuesto a imprimir
 * @param cliente    ficha del cliente (nombre, documento, dirección)
 * @param empresa    membrete
 * @param inventario para sacar la foto del equipo cotizado
 * @param notas      lista de notas ya resuelta
 * @returns {jsPDF}
 */
export function construirPDF({ cotizacion, cliente, empresa, inventario = [], notas = [] }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGEN;

  // ── Membrete ────────────────────────────────────────────────────────────────
  let xTexto = MARGEN;
  if (empresa?.logo) {
    try {
      // El logo es ancho y bajo; se encaja en una caja fija manteniendo altura.
      doc.addImage(empresa.logo, "PNG", MARGEN, y, 38, 12, undefined, "FAST");
      xTexto = MARGEN + 43;
    } catch { /* si el logo falla, el presupuesto sale igual sin él */ }
  }

  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...NEGRO);
  doc.text(empresa?.nombre || "", xTexto, y + 5);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GRIS);
  doc.text(empresa?.rif || "", xTexto, y + 9.5);
  if (empresa?.eslogan) doc.text(empresa.eslogan, xTexto, y + 13);

  y += 18;
  doc.setDrawColor(...NEGRO).setLineWidth(0.5).line(MARGEN, y, ANCHO - MARGEN, y);
  y += 8;

  // ── Título ──────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...NEGRO);
  doc.text(`PRESUPUESTO Nº ${cotizacion.numero || ""}`, ANCHO / 2, y, { align: "center" });
  y += 9;

  // ── Datos del cliente ───────────────────────────────────────────────────────
  const filas = [
    ["FECHA DE EMISIÓN:", cotizacion.fecha || ""],
    ["NOMBRE O RAZÓN SOCIAL:", `${cliente?.nombre || "—"}${cliente?.documento ? `   ${cliente.documento}` : ""}`],
    ["DIRECCIÓN:", cliente?.direccion || "—"],
    ["CONDICIONES DE PAGO:", cotizacion.condicionesPago || "—"],
  ];
  doc.setFontSize(9);
  for (const [etiqueta, valor] of filas) {
    doc.setFont("helvetica", "bold").text(etiqueta, MARGEN, y);
    doc.setFont("helvetica", "normal");
    const lineas = partir(doc, valor, UTIL - 48);
    doc.text(lineas, MARGEN + 48, y);
    y += 4.5 * lineas.length;
  }
  y += 4;

  // ── Tabla de partidas ───────────────────────────────────────────────────────
  const COL = { desc: MARGEN, cant: MARGEN + 108, unit: MARGEN + 130, total: ANCHO - MARGEN };
  const anchoDesc = 104;

  const cabecera = () => {
    doc.setFillColor(238, 238, 238).rect(MARGEN, y, UTIL, 7, "F");
    doc.setDrawColor(...NEGRO).setLineWidth(0.2).rect(MARGEN, y, UTIL, 7);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...NEGRO);
    doc.text("DESCRIPCIÓN", COL.desc + 2, y + 4.6);
    doc.text("CANT.", COL.cant + 2, y + 4.6);
    doc.text("PRECIO UNIT.", COL.unit + 2, y + 4.6);
    doc.text("TOTAL US.", COL.total - 2, y + 4.6, { align: "right" });
    y += 7;
  };
  cabecera();

  const fotoDe = item => {
    const porId = item.modeloId && inventario.find(m => m.id === item.modeloId);
    if (porId?.imagen) return porId.imagen;
    const norm = t => (t || "").trim().toLowerCase();
    return inventario.find(m => norm(m.nombre) === norm(item.nombre))?.imagen || null;
  };

  doc.setFontSize(8.5);
  for (const it of cotizacion.items || []) {
    const foto = fotoDe(it);
    const sangria = foto ? 20 : 0;
    const lineasNombre = partir(doc, it.nombre, anchoDesc - sangria - 4);
    const lineasDet = it.detalle ? partir(doc, it.detalle, anchoDesc - sangria - 4) : [];
    const alto = Math.max(foto ? 20 : 0, 4.2 * (lineasNombre.length + lineasDet.length) + 4);

    // Salto de página si la fila no cabe entera.
    if (y + alto > ALTO - 40) {
      doc.addPage();
      y = MARGEN;
      cabecera();
      doc.setFontSize(8.5);
    }

    doc.setDrawColor(...NEGRO).setLineWidth(0.2).rect(MARGEN, y, UTIL, alto);
    doc.line(COL.cant, y, COL.cant, y + alto);
    doc.line(COL.unit, y, COL.unit, y + alto);

    if (foto) {
      try { doc.addImage(foto, "JPEG", COL.desc + 2, y + 2, 16, 16, undefined, "FAST"); } catch { /* sin foto */ }
    }

    let yTexto = y + 5;
    doc.setFont("helvetica", "bold").setTextColor(...NEGRO);
    doc.text(lineasNombre, COL.desc + 2 + sangria, yTexto);
    yTexto += 4.2 * lineasNombre.length;
    if (lineasDet.length) {
      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...GRIS);
      doc.text(lineasDet, COL.desc + 2 + sangria, yTexto);
      doc.setFontSize(8.5);
    }

    doc.setFont("helvetica", "normal").setTextColor(...NEGRO);
    doc.text(String(it.cantidad ?? 1), COL.cant + 8, y + 5, { align: "center" });
    doc.text(usd(it.precio), COL.unit + 26, y + 5, { align: "right" });
    doc.text(usd(it.subtotal), COL.total - 2, y + 5, { align: "right" });

    y += alto;
  }

  // ── Totales ─────────────────────────────────────────────────────────────────
  for (const [etiqueta, negrita] of [["SUB-TOTAL:", false], ["TOTAL US:", true]]) {
    doc.setDrawColor(...NEGRO).rect(MARGEN, y, UTIL, 7);
    doc.line(COL.unit, y, COL.unit, y + 7);
    doc.setFont("helvetica", "bold").setFontSize(negrita ? 10 : 8.5);
    doc.text(etiqueta, COL.unit - 2, y + 4.8, { align: "right" });
    doc.text(usd(cotizacion.total), COL.total - 2, y + 4.8, { align: "right" });
    y += 7;
  }
  y += 7;

  // ── Condiciones ─────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...NEGRO);
  doc.text("PRECIO EN DÓLAR AMERICANO (US$)", MARGEN, y);
  y += 5;

  if (cotizacion.garantia) {
    doc.setFont("helvetica", "bold").text("GARANTÍA:", MARGEN, y);
    doc.setFont("helvetica", "normal");
    const l = partir(doc, cotizacion.garantia, UTIL - 20);
    doc.text(l, MARGEN + 20, y);
    y += 4.5 * l.length;
  }

  if (notas.length) {
    doc.setFont("helvetica", "bold").text("NOTAS:", MARGEN, y);
    doc.setFont("helvetica", "normal");
    for (const n of notas) {
      const l = partir(doc, `• ${n}`, UTIL - 20);
      doc.text(l, MARGEN + 20, y);
      y += 4.5 * l.length;
    }
  }

  // ── Pie, al fondo de la última página ───────────────────────────────────────
  const pie = ALTO - 22;
  doc.setDrawColor(...NEGRO).setLineWidth(0.3).line(MARGEN, pie, ANCHO - MARGEN, pie);
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...GRIS);
  const lineasPie = [
    empresa?.direccion,
    [empresa?.telefonos, empresa?.email].filter(Boolean).join("  ·  "),
    empresa?.web,
  ].filter(Boolean);
  lineasPie.forEach((t, i) => doc.text(partir(doc, t, UTIL), ANCHO / 2, pie + 4 + i * 3.4, { align: "center" }));

  return doc;
}

export const nombreArchivo = cotizacion => `Presupuesto-${cotizacion.numero || "vicfan"}.pdf`;

/**
 * Entrega el PDF por el mejor camino que admita el dispositivo: compartirlo
 * (para mandarlo por WhatsApp desde el móvil) o descargarlo.
 * @returns {'compartido'|'descargado'}
 */
export async function entregarPDF(doc, nombre) {
  const blob = doc.output("blob");
  const archivo = new File([blob], nombre, { type: "application/pdf" });

  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre });
      return "compartido";
    } catch (err) {
      // Cancelar el menú de compartir no es un fallo: no se descarga detrás.
      if (err?.name === "AbortError") return "compartido";
    }
  }

  doc.save(nombre);
  return "descargado";
}
