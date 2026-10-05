import { jsPDF } from "jspdf";
import { usd } from "../ui.jsx";

// Generación de los documentos en PDF (presupuesto y nota de entrega).
//
// El PDF se construye aquí y sale un archivo de verdad, que se puede compartir
// (WhatsApp) o descargar en cualquier dispositivo. Dentro de una PWA instalada
// en Android, window.print() no funciona, así que esta es la vía fiable.
//
// Diseño «estilo 1»: esquina con triángulos (negro + amarillo GENERAC), logo a
// la izquierda y título a la derecha, caja crema con el número, tabla con
// cabecera negra y filas en cebra, total resaltado y barra negra al pie.

const MARGEN = 14;         // milímetros
const ANCHO = 210;         // A4
const ALTO = 297;
const UTIL = ANCHO - MARGEN * 2;

const AMBER = [247, 184, 1];     // amarillo GENERAC
const CREMA = [253, 242, 208];   // cajas y total
const CEBRA = [247, 245, 239];   // fila alterna
const NEGRO = [26, 26, 26];
const TINTA = [40, 40, 40];
const GRIS = [120, 120, 120];
const BLANCO = [255, 255, 255];

// Columnas de la tabla.
const COL = { desc: MARGEN + 2, cantC: 143, precioR: 172, importeR: ANCHO - MARGEN - 2 };
const ANCHO_DESC = 120;

/** Divide un texto para que quepa en un ancho dado. */
const partir = (doc, texto, ancho) => doc.splitTextToSize(String(texto || ""), ancho);

/** Separa en líneas por saltos explícitos (/, ;, salto o doble espacio), sin
 *  romper por comas: así una dirección con comas queda compacta. */
const enLineas = txt => String(txt || "").split(/\s*[\/;]\s*|\s{2,}|\n/).map(s => s.trim()).filter(Boolean);

/** Barra negra del pie, en todas las páginas. */
function pie(doc, empresa) {
  const h = 11;
  doc.setFillColor(...NEGRO).rect(0, ALTO - h, ANCHO, h, "F");
  const texto = [empresa?.nombre, empresa?.eslogan].filter(Boolean).join("  ·  ").toUpperCase();
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...AMBER);
  doc.text(texto, ANCHO / 2, ALTO - h + 7, { align: "center" });
}

/**
 * Dibuja el documento completo con el diseño estilo 1.
 * @param opts.titulo   "PRESUPUESTO" | "NOTA DE ENTREGA"
 * @param opts.numero   número correlativo
 * @param opts.fecha    fecha de emisión
 * @param opts.cliente  ficha del cliente
 * @param opts.pago     { label, valor } forma/condiciones de pago
 * @param opts.items    partidas [{ nombre, detalle, cantidad, precio, subtotal }]
 * @param opts.total    total en US$
 * @param opts.notas    líneas de nota (incluida garantía) resaltadas al final
 * @param opts.firma    muestra la línea "Recibí conforme" (nota de entrega)
 */
function renderEstilo1(doc, { empresa, titulo, numero, fecha, cliente, pago, items, total, notas = [], firma = false }) {
  // ── Esquina decorativa ──────────────────────────────────────────────────────
  doc.setFillColor(...NEGRO).triangle(0, 0, 56, 0, 0, 42, "F");
  doc.setFillColor(...AMBER).triangle(0, 0, 40, 0, 0, 30, "F");

  // ── Logo + título ───────────────────────────────────────────────────────────
  if (empresa?.logo) {
    try { doc.addImage(empresa.logo, "PNG", MARGEN, 20, 74, 17, undefined, "FAST"); } catch { /* sin logo */ }
  }
  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(...NEGRO);
  doc.text(titulo, ANCHO - MARGEN, 31, { align: "right", charSpace: 0.8 });

  // ── Bloques de cabecera ─────────────────────────────────────────────────────
  const y0 = 50;
  const etiqueta = (t, x) => { doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...GRIS); doc.text(t.toUpperCase(), x, y0); };

  // Emisor
  etiqueta("Emitido por", MARGEN);
  let ye = y0 + 5;
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...TINTA);
  doc.text(empresa?.nombre || "", MARGEN, ye); ye += 4.3;
  doc.setFont("helvetica", "normal").setFontSize(7.8).setTextColor(...GRIS);
  const lineasEmisor = [empresa?.rif, ...enLineas(empresa?.telefonos), empresa?.email, ...enLineas(empresa?.direccion)].filter(Boolean);
  for (const l of lineasEmisor) { doc.text(partir(doc, l, 72), MARGEN, ye); ye += 3.7; }

  // Cliente
  const xCli = 86;
  etiqueta("Cliente", xCli);
  let yc = y0 + 5;
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...TINTA);
  doc.text(partir(doc, cliente?.nombre || "—", 58), xCli, yc); yc += 4.3;
  doc.setFont("helvetica", "normal").setFontSize(7.8).setTextColor(...GRIS);
  for (const l of [cliente?.documento, ...enLineas(cliente?.direccion)].filter(Boolean)) { doc.text(partir(doc, l, 58), xCli, yc); yc += 3.7; }

  // Caja del número
  const bx = 150, bw = ANCHO - MARGEN - bx;
  doc.setFillColor(...CREMA).rect(bx, y0 - 4, bw, 21, "F");
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...NEGRO);
  doc.text(`Nº ${numero || ""}`, ANCHO - MARGEN - 4, y0 + 2, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(7.8).setTextColor(...TINTA);
  doc.text("Precios en US$", ANCHO - MARGEN - 4, y0 + 7, { align: "right" });
  if (fecha) doc.text(`Emitido ${fecha}`, ANCHO - MARGEN - 4, y0 + 11.5, { align: "right" });

  // Pago
  let yHead = Math.max(ye, yc) + 2;
  if (pago?.valor) {
    doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...TINTA);
    doc.text(`${pago.label}: `, MARGEN, yHead);
    const wlab = doc.getTextWidth(`${pago.label}: `);
    doc.setFont("helvetica", "normal");
    doc.text(String(pago.valor), MARGEN + wlab, yHead);
    yHead += 4;
  }

  // ── Tabla ───────────────────────────────────────────────────────────────────
  let y = Math.max(yHead + 4, 86);

  const cabecera = () => {
    doc.setFillColor(...NEGRO).rect(MARGEN, y, UTIL, 8, "F");
    doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...BLANCO);
    doc.text("Descripción", COL.desc, y + 5.3);
    doc.text("Cant.", COL.cantC, y + 5.3, { align: "center" });
    doc.text("Precio", COL.precioR, y + 5.3, { align: "right" });
    doc.text("Importe", COL.importeR, y + 5.3, { align: "right" });
    y += 8;
  };
  cabecera();

  const partidas = items && items.length ? items : [];
  partidas.forEach((it, i) => {
    const lineasNombre = partir(doc, it.nombre, ANCHO_DESC);
    const lineasDet = it.detalle ? partir(doc, it.detalle, ANCHO_DESC) : [];
    const alto = Math.max(8, 4 * (lineasNombre.length + lineasDet.length) + 3.5);

    if (y + alto > ALTO - 48) { pie(doc, empresa); doc.addPage(); y = MARGEN; cabecera(); }

    if (i % 2 === 1) doc.setFillColor(...CEBRA).rect(MARGEN, y, UTIL, alto, "F");

    let yt = y + 5;
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...TINTA);
    doc.text(lineasNombre, COL.desc, yt);
    yt += 4 * lineasNombre.length;
    if (lineasDet.length) {
      doc.setFontSize(7.3).setTextColor(...GRIS);
      doc.text(lineasDet, COL.desc, yt);
      doc.setFontSize(8.5).setTextColor(...TINTA);
    }
    const sub = Number(it.subtotal) || (Number(it.cantidad) || 0) * (Number(it.precio) || 0);
    doc.text(String(it.cantidad ?? 1), COL.cantC, y + 5, { align: "center" });
    doc.text(usd(it.precio), COL.precioR, y + 5, { align: "right" });
    doc.text(usd(sub), COL.importeR, y + 5, { align: "right" });
    y += alto;
  });

  // Línea separadora
  doc.setDrawColor(...NEGRO).setLineWidth(0.3).line(MARGEN, y, ANCHO - MARGEN, y);

  // Subtotal
  y += 1;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...TINTA);
  doc.text("Subtotal", COL.precioR, y + 5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(usd(total), COL.importeR, y + 5, { align: "right" });
  y += 8;

  // Total (resaltado)
  doc.setFillColor(...CREMA).rect(MARGEN, y, UTIL, 9, "F");
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...NEGRO);
  doc.text("Total US$", COL.precioR, y + 6, { align: "right" });
  doc.text(usd(total), COL.importeR, y + 6, { align: "right" });
  y += 16;

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...TINTA);
  doc.text("Precios en dólares americanos (US$)", MARGEN, y);
  y += 7;

  // Notas resaltadas
  for (const n of notas.filter(Boolean)) {
    const lineas = partir(doc, n, UTIL - 6);
    const h = 3.6 * lineas.length + 3;
    if (y + h > ALTO - 26) { pie(doc, empresa); doc.addPage(); y = MARGEN; }
    doc.setFillColor(...CREMA).rect(MARGEN, y, UTIL, h, "F");
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...TINTA);
    doc.text(lineas, MARGEN + 3, y + 4.2);
    y += h + 3;
  }

  // Firma (nota de entrega)
  if (firma) {
    y = Math.max(y + 6, ALTO - 40);
    doc.setDrawColor(...GRIS).setLineWidth(0.3).line(MARGEN, y, MARGEN + 70, y);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...TINTA);
    doc.text("Recibí conforme", MARGEN, y + 4);
  }

  pie(doc, empresa);
  return doc;
}

/**
 * @param cotizacion presupuesto a imprimir
 * @param cliente    ficha del cliente
 * @param empresa    membrete
 * @param inventario (ya no se usa; se mantiene por compatibilidad de llamada)
 * @param notas      lista de notas ya resuelta
 * @returns {jsPDF}
 */
export function construirPDF({ cotizacion, cliente, empresa, inventario = [], notas = [] }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  return renderEstilo1(doc, {
    empresa,
    titulo: "PRESUPUESTO",
    numero: cotizacion.numero || "",
    fecha: cotizacion.fecha || "",
    cliente,
    pago: { label: "Pago", valor: cotizacion.condicionesPago || "" },
    items: cotizacion.items || [],
    total: cotizacion.total,
    notas: [cotizacion.garantia ? `Garantía: ${cotizacion.garantia}` : "", ...notas.map(n => `Nota: ${n}`)],
  });
}

export const nombreArchivo = cotizacion => `Presupuesto-${cotizacion.numero || "vicfan"}.pdf`;

// ── NOTA DE ENTREGA ───────────────────────────────────────────────────────────
// Documento no fiscal que acompaña la mercancía o el servicio. Mismo estilo y el
// MISMO número correlativo de la venta. Si la venta no tiene artículos (p. ej. un
// mantenimiento cerrado con un costo global), se muestra una sola línea con el
// concepto y el total.
export function construirNotaEntrega({ venta, cliente, empresa }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const items = (venta.items && venta.items.length)
    ? venta.items
    : [{ nombre: venta.nota || venta.origen || "Servicio", cantidad: 1, precio: venta.total, subtotal: venta.total }];
  return renderEstilo1(doc, {
    empresa,
    titulo: "NOTA DE ENTREGA",
    numero: venta.numero || "",
    fecha: venta.fecha || "",
    cliente,
    pago: { label: "Forma de pago", valor: venta.formaPago || "" },
    items,
    total: venta.total,
    notas: [],
    firma: true,
  });
}

export const nombreArchivoNota = venta => `Nota-entrega-${venta.numero || "vicfan"}.pdf`;

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
      if (err?.name === "AbortError") return "compartido";
    }
  }

  doc.save(nombre);
  return "descargado";
}
