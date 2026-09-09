import { useState, useEffect } from "react";
import {
  ACENTOS, ESTADO_COLOR, BORDER, BG_INPUT, TEXT_SUB, GREEN, RED,
  hoy, usd, uid,
  Badge, Btn, Card, Inp, Sel, Modal, Etiqueta, estiloInput,
} from "../ui.jsx";

const ac = ACENTOS.cotizaciones;

// Membrete del presupuesto. Se toma tal cual del que la empresa ya emite en
// papel, y es editable desde Admin porque los teléfonos y la dirección cambian.
export const EMPRESA_POR_DEFECTO = {
  id: "datos",
  nombre: "Supplies Empresarial 3500, C.A.",
  rif: "J-29756909-0",
  eslogan: "Tecnología para su seguridad",
  direccion: "Res. Catia, Piso 2, Oficina 6, Calle 9, Atlántida, Catia La Mar, Edo. Vargas — Venezuela 1162",
  telefonos: "+58 212 889 4988 · +58 414 276 1396",
  email: "suppliesempresarial3500@gmail.com",
  web: "www.suppliesempresarial3500.com",
};

// El formulario sigue la estructura del presupuesto en papel de VICFAN, para
// que lo que se rellena en pantalla y lo que ve el cliente coincidan.
const CONDICIONES_PAGO = [
  "De contado",
  "50% inicial y 50% contra entrega",
  "60% inicial y 40% contra entrega",
  "Crédito 15 días",
  "Crédito 30 días",
];

const GARANTIAS = [
  "1 año o 200 Hrs (servicio técnico post venta garantizado)",
  "2 años o 400 Hrs (servicio técnico post venta garantizado)",
  "6 meses o 100 Hrs",
  "Sin garantía",
];

const NOTAS_FRECUENTES = [
  "El trabajo a realizar es un proyecto llave en mano.",
  "No incluye obra civil.",
  "Precios sujetos a disponibilidad de inventario.",
];

// Servicios que aparecen habitualmente en los presupuestos de la empresa.
export const SERVICIOS_CATALOGO = [
  { nombre: "Suministro e instalación de acometida de gas bajo norma COVENIN", detalle: "Incluye regulación, arreglo mecánico de tubería y prueba", precio: 0 },
  { nombre: "Suministro e instalación de acometida eléctrica", detalle: "Incluye cable de control, potencia y carga", precio: 0 },
  { nombre: "Instalación y puesta en marcha", detalle: "Incluye transporte y descarga", precio: 0 },
  { nombre: "Instalación eléctrica", detalle: "", precio: 150 },
  { nombre: "Cerco eléctrico", detalle: "", precio: 0 },
  { nombre: "Circuito cerrado (CCTV)", detalle: "", precio: 0 },
  { nombre: "Sistema de alarma", detalle: "", precio: 0 },
  { nombre: "Sistema de seguridad residencial", detalle: "", precio: 0 },
  { nombre: "Mantenimiento preventivo", detalle: "", precio: 80 },
];

/**
 * Numeración por fecha: la del 9 de septiembre de 2026 es la 20260909. Si ese
 * mismo día entra otra, se le añade _1, luego _2, y así.
 * @param excluirId id de la cotización que se está editando, para que no
 *                  choque consigo misma al cambiarle la fecha.
 */
export const numeroPara = (cotizaciones, fecha, excluirId) => {
  const base = (fecha || hoy()).replaceAll("-", "");
  const usados = new Set(cotizaciones.filter(q => q.id !== excluirId).map(q => q.numero));
  if (!usados.has(base)) return base;
  let n = 1;
  while (usados.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
};

/** Número a mostrar. Las cotizaciones anteriores a la numeración no lo tienen
 *  guardado, así que se deduce de su fecha en vez de enseñar un hueco. */
export const numeroVisible = q => q.numero || (q.fecha || "").replaceAll("-", "") || "—";

/** Notas del presupuesto. Antes era una sola cadena; ahora son varias, y las
 *  cotizaciones antiguas siguen leyéndose sin perder la que tuvieran. */
export const notasDe = q => (Array.isArray(q.notas) ? q.notas : q.nota ? [q.nota] : []);

export const cotizacionVacia = cotizaciones => ({
  id: uid(),
  numero: numeroPara(cotizaciones, hoy()),
  clienteId: "",
  fecha: hoy(),
  estado: "Pendiente",
  condicionesPago: CONDICIONES_PAGO[0],
  garantia: GARANTIAS[0],
  notas: [NOTAS_FRECUENTES[0]],
  items: [],
  total: 0,
});

/** Notas del presupuesto: tantas como haga falta, de la lista o escritas. */
function Notas({ notas, onCambio }) {
  const [texto, setTexto] = useState("");

  const agregar = t => { const v = t.trim(); if (v && !notas.includes(v)) onCambio([...notas, v]); };

  return (
    <div style={{ marginBottom: 14 }}>
      <Etiqueta>Notas {notas.length > 0 && `(${notas.length})`}</Etiqueta>

      {notas.map((n, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: BG_INPUT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", marginBottom: 6 }}>
          <span style={{ flex: 1, fontSize: 13 }}>{n}</span>
          <button onClick={() => onCambio(notas.filter((_, j) => j !== i))}
            style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 15, padding: 0, lineHeight: 1 }}>✕</button>
        </div>
      ))}

      <select value="" onChange={e => { agregar(e.target.value); e.target.value = ""; }} style={{ ...estiloInput, marginBottom: 8 }}>
        <option value="">➕ Añadir nota frecuente…</option>
        {NOTAS_FRECUENTES.filter(n => !notas.includes(n)).map(n => <option key={n} value={n}>{n}</option>)}
      </select>

      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2} placeholder="…o escribe una nota nueva"
        style={{ ...estiloInput, resize: "vertical", marginBottom: 8 }} />
      <Btn onClick={() => { agregar(texto); setTexto(""); }} color={ac} outline small disabled={!texto.trim()}>+ Añadir nota</Btn>
    </div>
  );
}

/** Desplegable con opciones frecuentes que además admite escribir a mano. */
function SelLibre({ label, value, onChange, opciones, placeholder }) {
  const esDeLista = opciones.includes(value);
  const [libre, setLibre] = useState(!esDeLista && value !== "");

  return (
    <div style={{ marginBottom: 14 }}>
      <Etiqueta>{label}</Etiqueta>
      <select
        value={libre ? "__otro__" : value}
        onChange={e => {
          if (e.target.value === "__otro__") { setLibre(true); onChange(""); }
          else { setLibre(false); onChange(e.target.value); }
        }}
        style={{ ...estiloInput, marginBottom: libre ? 8 : 0 }}>
        {opciones.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__otro__">✏️ Escribir otro…</option>
      </select>
      {libre && (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={estiloInput} autoFocus />
      )}
    </div>
  );
}

// ── ALTA DE CLIENTE SIN SALIR DE LA COTIZACIÓN ────────────────────────────────
function NuevoCliente({ onCrear, onCancelar }) {
  const [f, setF] = useState({ nombre: "", documento: "", telefono: "", direccion: "", tipo: "Residencial" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <div style={{ background: BG_INPUT, border: `1.5px solid ${ac}44`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14, color: ac }}>➕ Nuevo cliente</p>
      <Inp label="Nombre o razón social" value={f.nombre} onChange={v => set("nombre", v)} placeholder="Sr. Miguel Roncagliolo" />
      <Inp label="C.I. / RIF" value={f.documento} onChange={v => set("documento", v)} placeholder="V-14.930.796" />
      <Inp label="Teléfono" value={f.telefono} onChange={v => set("telefono", v)} placeholder="0412-555-1234" />
      <Inp label="Dirección" value={f.direccion} onChange={v => set("direccion", v)} placeholder="Lechería, Av. R7…" />
      <Sel label="Tipo" value={f.tipo} onChange={v => set("tipo", v)} options={["Residencial", "Comercial", "Industrial"].map(t => ({ value: t, label: t }))} />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => f.nombre.trim() && onCrear({ id: uid(), email: "", notas: "", ...f })} color={ac} small full disabled={!f.nombre.trim()}>Crear y usar</Btn>
        <Btn onClick={onCancelar} color={TEXT_SUB} outline small full>Cancelar</Btn>
      </div>
    </div>
  );
}

// ── LÍNEAS DEL PRESUPUESTO ────────────────────────────────────────────────────
function LineasItems({ items, onCambio, inventario, repuestos }) {
  const [aAgregar, setAAgregar] = useState("");

  const agregar = valor => {
    if (!valor) return;
    const [origen, indice] = valor.split(":");
    let base = { nombre: "", detalle: "", precio: 0 };

    if (origen === "planta")    { const m = inventario[indice]; base = { nombre: m.nombre, detalle: m.potencia ? `${m.potencia} · ${m.combustible}` : "", precio: m.precio }; }
    if (origen === "repuesto")  { const r = repuestos[indice];  base = { nombre: r.nombre, detalle: "", precio: r.precio }; }
    if (origen === "servicio")  { const s = SERVICIOS_CATALOGO[indice]; base = { nombre: s.nombre, detalle: s.detalle, precio: s.precio }; }
    if (origen === "libre")     { base = { nombre: "", detalle: "", precio: 0 }; }

    onCambio([...items, { id: uid(), cantidad: 1, subtotal: base.precio, ...base }]);
    setAAgregar("");
  };

  // Cambiar cantidad o precio recalcula el total de esa línea, como en el papel.
  const editar = (id, campo, valor) => onCambio(items.map(i => {
    if (i.id !== id) return i;
    const act = { ...i, [campo]: campo === "cantidad" || campo === "precio" ? Number(valor) || 0 : valor };
    act.subtotal = act.cantidad * act.precio;
    return act;
  }));

  const total = items.reduce((s, i) => s + (i.subtotal || 0), 0);

  return (
    <div style={{ marginBottom: 14 }}>
      <Etiqueta>Descripción · cantidad · precio unitario</Etiqueta>

      <select value={aAgregar} onChange={e => agregar(e.target.value)} style={{ ...estiloInput, marginBottom: 12 }}>
        <option value="">➕ Agregar línea…</option>
        <optgroup label="⚡ Plantas y equipos">
          {inventario.map((m, i) => <option key={m.id} value={`planta:${i}`}>{m.nombre} — {usd(m.precio)}</option>)}
        </optgroup>
        <optgroup label="🔩 Repuestos">
          {repuestos.map((r, i) => <option key={r.id} value={`repuesto:${i}`}>{r.nombre} — {usd(r.precio)}</option>)}
        </optgroup>
        <optgroup label="🔧 Servicios">
          {SERVICIOS_CATALOGO.map((s, i) => <option key={s.nombre} value={`servicio:${i}`}>{s.nombre}</option>)}
        </optgroup>
        <optgroup label="✏️ Manual">
          <option value="libre">Escribir una línea a mano</option>
        </optgroup>
      </select>

      {items.map(it => (
        <div key={it.id} style={{ background: BG_INPUT, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <input value={it.nombre} onChange={e => editar(it.id, "nombre", e.target.value)} placeholder="Descripción"
            style={{ ...estiloInput, fontWeight: 600, marginBottom: 6 }} />
          <input value={it.detalle || ""} onChange={e => editar(it.id, "detalle", e.target.value)} placeholder="Detalle (opcional)"
            style={{ ...estiloInput, fontSize: 13, marginBottom: 8 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr auto", gap: 8, alignItems: "end" }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase" }}>Cant.</span>
              <input type="number" min="0" value={it.cantidad} onChange={e => editar(it.id, "cantidad", e.target.value)} style={estiloInput} />
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase" }}>Precio unit.</span>
              <input type="number" min="0" value={it.precio} onChange={e => editar(it.id, "precio", e.target.value)} style={estiloInput} />
            </div>
            <button onClick={() => onCambio(items.filter(x => x.id !== it.id))}
              style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 18, padding: "0 4px 10px" }}>✕</button>
          </div>

          <p style={{ margin: "8px 0 0", textAlign: "right", fontWeight: 800, color: ac }}>{usd(it.subtotal)}</p>
        </div>
      ))}

      {items.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 2px", fontWeight: 800, fontSize: 16 }}>
          <span>SUB-TOTAL</span><span style={{ color: ac }}>{usd(total)}</span>
        </div>
      )}
    </div>
  );
}

// ── HOJA IMPRIMIBLE ───────────────────────────────────────────────────────────
// Se genera el PDF con la impresión del propio navegador en lugar de una
// librería: el texto sale seleccionable, no añade peso a la app, y en el móvil
// el sistema ofrece "Guardar como PDF" para enviarlo por WhatsApp.
function HojaImpresion({ cotizacion, cliente, empresa, inventario = [] }) {
  if (!cotizacion) return null;
  const e = empresa || EMPRESA_POR_DEFECTO;

  // La foto se busca en el inventario al imprimir en vez de copiarla dentro de
  // cada cotización: así una imagen no se duplica en decenas de presupuestos.
  const fotoDe = nombre => inventario.find(m => m.nombre === nombre)?.imagen || null;

  return (
    <div className="hoja-impresion">
      <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 14 }}>
        {e.logo && <img src={e.logo} alt="" style={{ height: 58, maxWidth: 150, objectFit: "contain" }} />}
        <div style={{ flex: 1, textAlign: e.logo ? "left" : "center" }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{e.nombre}</div>
          <div style={{ fontSize: 11 }}>{e.rif}</div>
          {e.eslogan && <div style={{ fontSize: 11, fontStyle: "italic" }}>{e.eslogan}</div>}
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
        PRESUPUESTO Nº {numeroVisible(cotizacion)}
      </div>

      <table style={{ width: "100%", fontSize: 11.5, marginBottom: 12 }}>
        <tbody>
          <tr><td style={{ width: 150, fontWeight: 700 }}>FECHA DE EMISIÓN:</td><td>{cotizacion.fecha}</td></tr>
          <tr><td style={{ fontWeight: 700 }}>NOMBRE O RAZÓN SOCIAL:</td><td>{cliente?.nombre || "—"}{cliente?.documento ? `  ${cliente.documento}` : ""}</td></tr>
          <tr><td style={{ fontWeight: 700 }}>DIRECCIÓN:</td><td>{cliente?.direccion || "—"}</td></tr>
          <tr><td style={{ fontWeight: 700 }}>CONDICIONES DE PAGO:</td><td>{cotizacion.condicionesPago || "—"}</td></tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "left" }}>DESCRIPCIÓN</th>
            <th style={{ border: "1px solid #000", padding: "5px 6px", width: 60 }}>CANTIDAD</th>
            <th style={{ border: "1px solid #000", padding: "5px 6px", width: 90 }}>PRECIO UNITARIO</th>
            <th style={{ border: "1px solid #000", padding: "5px 6px", width: 90 }}>TOTAL US.</th>
          </tr>
        </thead>
        <tbody>
          {cotizacion.items.map(it => (
            <tr key={it.id}>
              <td style={{ border: "1px solid #000", padding: "5px 6px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {fotoDe(it.nombre) && (
                    <img src={fotoDe(it.nombre)} alt="" style={{ width: 68, height: 68, objectFit: "contain", flexShrink: 0 }} />
                  )}
                  <div>
                    {it.nombre}
                    {it.detalle && <div style={{ fontSize: 10.5 }}>{it.detalle}</div>}
                  </div>
                </div>
              </td>
              <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "center" }}>{it.cantidad}</td>
              <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "right" }}>{usd(it.precio)}</td>
              <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "right" }}>{usd(it.subtotal)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: 700 }}>SUB-TOTAL:</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "right" }}>{usd(cotizacion.total)}</td>
          </tr>
          <tr>
            <td colSpan={3} style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: 800 }}>TOTAL US:</td>
            <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: 800 }}>{usd(cotizacion.total)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: 11.5, marginTop: 12, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700 }}>PRECIO EN DÓLAR AMERICANO (US$)</div>
        {cotizacion.garantia && <div><b>GARANTÍA:</b> {cotizacion.garantia}</div>}
        {notasDe(cotizacion).map((n, i) => (
          <div key={i}>{i === 0 ? <b>NOTA: </b> : <span style={{ paddingLeft: 44 }} />}{n}</div>
        ))}
      </div>

      <div style={{ textAlign: "center", fontSize: 10, marginTop: 26, borderTop: "1px solid #000", paddingTop: 8, lineHeight: 1.6 }}>
        <div>{e.direccion}</div>
        <div>{e.telefonos}{e.email ? ` · ${e.email}` : ""}</div>
        {e.web && <div>{e.web}</div>}
      </div>
    </div>
  );
}

// ── MÓDULO ────────────────────────────────────────────────────────────────────
export default function ModuloCotizaciones({ cotizaciones, setCotizaciones, clientes, setClientes, inventario, repuestos, empresa, onAprobar, onEditarAprobada }) {
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [form, setForm] = useState(null);
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(null);

  // Hay que esperar a que la hoja esté pintada antes de abrir el diálogo de
  // impresión, o el navegador imprimiría una página en blanco.
  useEffect(() => {
    if (!imprimiendo) return;
    const t = setTimeout(() => { window.print(); setImprimiendo(null); }, 200);
    return () => clearTimeout(t);
  }, [imprimiendo]);

  const cli = id => clientes.find(c => c.id === id);
  const nc = id => cli(id)?.nombre || "—";
  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  const setItems = items => setForm(f => ({ ...f, items, total: items.reduce((s, i) => s + (i.subtotal || 0), 0) }));

  const abrirNueva = () => { setForm(cotizacionVacia(cotizaciones)); setCreandoCliente(false); setModal(true); };
  const abrirEdicion = q => { setForm({ ...q }); setCreandoCliente(false); setModal(true); };

  const crearCliente = nuevo => {
    setClientes(p => [...p, nuevo]);
    setForm(f => ({ ...f, clienteId: nuevo.id }));
    setCreandoCliente(false);
  };

  const guardar = () => {
    if (!form.clienteId || form.items.length === 0) return;
    setCotizaciones(p => p.find(x => x.id === form.id) ? p.map(x => x.id === form.id ? form : x) : [...p, form]);
    // Si ya generó tarea, esta arrastra el nuevo alcance. Normalmente ocurre
    // antes de publicarla a los técnicos, pero si ya estuviera publicada el
    // cambio queda anotado en su historial igualmente.
    if (form.estado === "Aprobada") onEditarAprobada?.(form);
    setModal(false);
  };

  const cliente = form && cli(form.clienteId);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>📋 Cotizaciones</h2>
        <Btn onClick={abrirNueva} color={ac} small>+ Nueva</Btn>
      </div>

      {cotizaciones.map(q => (
        <Card key={q.id}>
          <div onClick={() => setDetalle(q)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{nc(q.clienteId)}</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>
                Nº {numeroVisible(q)} · 📅 {q.fecha} · {q.items.length} ítem(s)
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 16, color: ac }}>{usd(q.total)}</p>
              <Badge text={q.estado} color={ESTADO_COLOR[q.estado] || "#888"} />
            </div>
          </div>
          {q.estado === "Pendiente" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn onClick={() => onAprobar(q)} color={GREEN} small full>✓ Aprobar y crear tarea</Btn>
              <Btn onClick={() => abrirEdicion(q)} color={ac} outline small>✏️</Btn>
              <Btn onClick={() => setCotizaciones(p => p.map(x => x.id === q.id ? { ...x, estado: "Rechazada" } : x))} color={RED} outline small>✗</Btn>
            </div>
          )}
          {/* Una cotización aprobada se sigue pudiendo modificar: el cliente
              puede cambiar de equipo antes de que empiece el trabajo. */}
          {q.estado === "Aprobada" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: 12, color: TEXT_SUB, flex: 1 }}>✓ Aprobada · generó una tarea en 📅 Tareas</p>
              <Btn onClick={() => abrirEdicion(q)} color={ac} outline small>✏️ Modificar</Btn>
            </div>
          )}
          {q.estado === "Rechazada" && (
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setCotizaciones(p => p.map(x => x.id === q.id ? { ...x, estado: "Pendiente" } : x))} color={ac} outline small>↺ Volver a pendiente</Btn>
            </div>
          )}
        </Card>
      ))}

      {/* ── Vista del presupuesto, con la forma del documento en papel ── */}
      {detalle && (
        <Modal onClose={() => setDetalle(null)}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: TEXT_SUB, textTransform: "uppercase" }}>
            Presupuesto Nº {numeroVisible(detalle)}
          </p>
          <h3 style={{ margin: "4px 0 2px", color: ac }}>{nc(detalle.clienteId)}</h3>
          {cli(detalle.clienteId)?.documento && <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>{cli(detalle.clienteId).documento}</p>}
          {cli(detalle.clienteId)?.direccion && <p style={{ margin: "2px 0 0", fontSize: 13, color: TEXT_SUB }}>📍 {cli(detalle.clienteId).direccion}</p>}
          <p style={{ margin: "6px 0 16px", fontSize: 13, color: TEXT_SUB }}>
            Emisión: {detalle.fecha}{detalle.condicionesPago ? ` · ${detalle.condicionesPago}` : ""}
          </p>

          {detalle.items.map((it, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{it.nombre}</span>
                <span style={{ fontWeight: 700, color: ac, whiteSpace: "nowrap" }}>{usd(it.subtotal)}</span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT_SUB }}>
                {it.cantidad} × {usd(it.precio)}{it.detalle ? ` · ${it.detalle}` : ""}
              </p>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontWeight: 800, fontSize: 17 }}>
            <span>TOTAL US</span><span style={{ color: ac }}>{usd(detalle.total)}</span>
          </div>

          {detalle.garantia && <p style={{ margin: "0 0 6px", fontSize: 13 }}><b>Garantía:</b> {detalle.garantia}</p>}
          {notasDe(detalle).map((n, i) => (
            <p key={i} style={{ margin: "0 0 4px", fontSize: 13, color: TEXT_SUB }}>{i === 0 ? <b>Notas: </b> : null}{n}</p>
          ))}
          <div style={{ height: 12 }} />

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => setImprimiendo(detalle)} color={ac} full>🖨️ Generar PDF</Btn>
            <Btn onClick={() => setDetalle(null)} color={TEXT_SUB} outline full>Cerrar</Btn>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 11, color: TEXT_SUB, textAlign: "center" }}>
            En el diálogo de impresión elige “Guardar como PDF”.
          </p>
        </Modal>
      )}

      {imprimiendo && (
        <HojaImpresion cotizacion={imprimiendo} cliente={cli(imprimiendo.clienteId)} empresa={empresa} inventario={inventario} />
      )}

      {/* ── Formulario ── */}
      {modal && form && (
        <Modal onClose={() => setModal(false)}>
          <h3 style={{ margin: "0 0 16px", color: ac }}>Presupuesto</h3>

          {form.estado === "Aprobada" && (
            <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#856404", fontWeight: 600 }}>
              ⚠️ Esta cotización ya generó una tarea. Al guardar, la tarea recogerá el nuevo alcance y quedará anotado en su historial.
            </div>
          )}

          {/* El número sale de la fecha, así que cambiar la fecha lo recalcula. */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10 }}>
            <Inp label="Nº de presupuesto" value={form.numero || ""} onChange={v => set("numero", v)} />
            <Inp label="Fecha de emisión" type="date" value={form.fecha}
              onChange={v => setForm(f => ({ ...f, fecha: v, numero: numeroPara(cotizaciones, v, f.id) }))} />
          </div>

          {/* Crear el cliente aquí mismo evita perder la cotización a medias. */}
          {creandoCliente ? (
            <NuevoCliente onCrear={crearCliente} onCancelar={() => setCreandoCliente(false)} />
          ) : (
            <>
              <Etiqueta>Nombre o razón social</Etiqueta>
              <select value={form.clienteId}
                onChange={e => e.target.value === "__nuevo__" ? setCreandoCliente(true) : set("clienteId", e.target.value)}
                style={{ ...estiloInput, marginBottom: cliente ? 6 : 14 }}>
                <option value="">— Selecciona un cliente —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                <option value="__nuevo__">➕ Crear cliente nuevo…</option>
              </select>
              {cliente && (
                <p style={{ margin: "0 0 14px", fontSize: 12, color: TEXT_SUB, lineHeight: 1.5 }}>
                  {cliente.documento || "sin C.I./RIF"}{cliente.direccion ? ` · ${cliente.direccion}` : ""}
                </p>
              )}
            </>
          )}

          <SelLibre label="Condiciones de pago" value={form.condicionesPago} onChange={v => set("condicionesPago", v)}
            opciones={CONDICIONES_PAGO} placeholder="Escribe las condiciones" />

          <LineasItems items={form.items} onCambio={setItems} inventario={inventario} repuestos={repuestos} />

          <SelLibre label="Garantía" value={form.garantia} onChange={v => set("garantia", v)}
            opciones={GARANTIAS} placeholder="Escribe la garantía" />
          <Notas notas={notasDe(form)} onCambio={v => set("notas", v)} />

          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18, margin: "8px 0 16px", padding: "10px 0", borderTop: `2px solid ${ac}` }}>
            <span>TOTAL US</span><span style={{ color: ac }}>{usd(form.total)}</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={guardar} color={ac} full disabled={!form.clienteId || form.items.length === 0}>Guardar</Btn>
            <Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
