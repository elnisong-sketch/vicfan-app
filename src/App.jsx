import { useState, useEffect } from "react";
import { useColeccion } from "./datos.js";
import {
  NAVY, ORANGE, GREEN, RED, BG_APP, BG_CARD, BORDER, TEXT_MAIN, TEXT_SUB,
  ACENTOS, ESTADO_COLOR, hoy, usd, uid, sumarMeses, fechaCorta,
  Badge, Btn, Card, Inp, Sel, Modal, CampoImagen, estiloInput, Etiqueta, CampoDocumento, partesDocumento, unirDocumento,
} from "./ui.jsx";
import { prepararImagen, prepararLogo } from "./imagenes.js";
import ModuloTareas, { registrar, tareaVacia } from "./modules/Tareas.jsx";
import ModuloOperaciones from "./modules/Operaciones.jsx";
import { proyectoVacio, tareaDeProyecto, planAutomatico, diasHasta, garantiaDeVenta } from "./proyectos.js";
import { materialDeItems, moverStock, avisoFaltantes } from "./inventario.js";
import ModuloCotizaciones, { EMPRESA_POR_DEFECTO, LineasItems, numeroPara } from "./modules/Cotizaciones.jsx";
import { SelectorCliente } from "./modules/Inspeccion.jsx";
import PantallaLogin from "./sesion.jsx";
import { useSesion, salir as cerrarSesion } from "./auth.js";
import Usuarios from "./modules/Usuarios.jsx";
import { useNuevaVersion } from "./version.js";
import { subirPendientes, contarTodasPendientes } from "./fotos.js";
import AvisoInstalar from "./instalar.jsx";

// El nombre ya no va en una pestaña de 52 px abajo, sino en una lista con
// sitio: "Cotizac." puede llamarse por su nombre.
const TABS = [
  { id: "tareas",       icon: "📅", label: "Tareas" },
  { id: "operaciones",  icon: "🏗️", label: "Proyectos" },
  { id: "clientes",     icon: "👥", label: "Clientes" },
  { id: "cotizaciones", icon: "📋", label: "Cotizaciones" },
  { id: "ventas",       icon: "💰", label: "Ventas" },
  { id: "inventario",   icon: "📦", label: "Inventario" },
  { id: "garantias",    icon: "🛡️", label: "Garantías" },
  { id: "admin",        icon: "⚙️", label: "Admin" },
];

// Las secciones tal como salen en el menú, con Inicio delante.
const SECCIONES = [{ id: "inicio", icon: "🏠", label: "Inicio" }, ...TABS];

/**
 * ¿Hay sitio para tener el menú siempre abierto?
 *
 * En el ordenador y en la tablet apaisada sí: el menú se queda fijo a la
 * izquierda y la app gana ancho. En el móvil no —268 px de menú sobre 375 no
 * dejan ver nada—, así que ahí es un cajón que se abre y se cierra.
 */
const ANCHO_MENU = 268;

function usePantallaAncha(minimo = 900) {
  const consulta = `(min-width: ${minimo}px)`;
  const [ancha, setAncha] = useState(() => typeof window !== "undefined" && window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const alCambiar = e => setAncha(e.matches);
    mq.addEventListener("change", alCambiar);
    setAncha(mq.matches);
    return () => mq.removeEventListener("change", alCambiar);
  }, [consulta]);
  return ancha;
}

// ── CLIENTES ──────────────────────────────────────────────────────────────────
// Aviso global de fotos que este movil aun no ha subido a la nube. Se ve en
// la cabecera, para tecnico y oficina, con boton para subirlas al momento.
function AvisoPendientes() {
  const [n, setN] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);
  const revisar = () => contarTodasPendientes().then(setN).catch(() => {});
  const subir = async () => {
    setSubiendo(true);
    const r = await subirPendientes().catch(() => ({ error: "No se pudo subir." }));
    setError(r?.error || null);
    await revisar();
    setSubiendo(false);
  };
  useEffect(() => {
    revisar();
    const t = setInterval(revisar, 5000);
    const alVolver = () => subir();
    window.addEventListener("online", alVolver);
    return () => { clearInterval(t); window.removeEventListener("online", alVolver); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (n === 0 && !subiendo) return null;
  return (
    <div style={{ background: ORANGE, color: "#fff", padding: "9px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>
          {subiendo ? "↑ Subiendo fotos…" : `📤 ${n} foto${n === 1 ? "" : "s"} pendiente${n === 1 ? "" : "s"} de subir`}
        </span>
        <button onClick={subir} disabled={subiendo}
          style={{ background: "#ffffff22", border: "1px solid #ffffff66", borderRadius: 8, color: "#fff", padding: "6px 12px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
          {subiendo ? "…" : "Subir ahora"}
        </button>
      </div>
      {error && !subiendo && <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: "#fff" }}>⚠️ {error}</p>}
    </div>
  );
}

function ModuloClientes({ clientes, setClientes }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const ac = ACENTOS.clientes;
  const guardar = () => { if (!form.nombre?.trim()) return; const limpio = { ...form, documento: unirDocumento(form.tipoDoc, form.documento) }; setClientes(p => p.find(x => x.id === limpio.id) ? p.map(x => x.id === limpio.id ? limpio : x) : [...p, limpio]); setModal(false); };
  const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.telefono.includes(busqueda));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>👥 Clientes</h2>
        <Btn onClick={() => { setForm({ id: uid(), nombre: "", tipoDoc: "V", documento: "", telefono: "", email: "", direccion: "", tipo: "Residencial", notas: "" }); setModal(true); }} color={ac} small>+ Nuevo</Btn>
      </div>
      <Inp placeholder="Buscar..." value={busqueda} onChange={setBusqueda} />
      {filtrados.map(c => (
        <Card key={c.id}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{c.nombre}</p>
              {c.documento && <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>🪪 {c.documento}</p>}
              <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>📞 {c.telefono}{c.email ? ` · ✉️ ${c.email}` : ""}</p>
              {c.direccion && <p style={{ margin: "0 0 4px", fontSize: 13, color: TEXT_SUB }}>📍 {c.direccion}</p>}
              <Badge text={c.tipo} color={ac} />
            </div>
            <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
              <Btn onClick={() => { const d = partesDocumento(c.documento); setForm({ ...c, tipoDoc: d.tipoDoc, documento: d.numeroDoc }); setModal(true); }} color={ac} outline small>✏️</Btn>
              <Btn onClick={() => setClientes(p => p.filter(x => x.id !== c.id))} color={RED} outline small>🗑️</Btn>
            </div>
          </div>
        </Card>
      ))}
      {modal && (
        <Modal onClose={() => setModal(false)}>
          <h3 style={{ margin: "0 0 20px", color: ac }}>Cliente</h3>
          <Inp label="Nombre o razón social" value={form.nombre || ""} onChange={v => setForm(p => ({ ...p, nombre: v }))} />
          <CampoDocumento tipoDoc={form.tipoDoc || "V"} numeroDoc={form.documento || ""} onTipo={v => setForm(p => ({ ...p, tipoDoc: v }))} onNumero={v => setForm(p => ({ ...p, documento: v }))} />
          <Inp label="Teléfono" value={form.telefono || ""} onChange={v => setForm(p => ({ ...p, telefono: v }))} placeholder="0412-555-1234" />
          <Inp label="Email" value={form.email || ""} onChange={v => setForm(p => ({ ...p, email: v }))} type="email" />
          <Inp label="Dirección" value={form.direccion || ""} onChange={v => setForm(p => ({ ...p, direccion: v }))} />
          <Sel label="Tipo" value={form.tipo || "Residencial"} onChange={v => setForm(p => ({ ...p, tipo: v }))} options={["Residencial", "Comercial", "Industrial"].map(t => ({ value: t, label: t }))} />
          <div style={{ display: "flex", gap: 10 }}><Btn onClick={guardar} color={ac} full>Guardar</Btn><Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ── VENTAS ────────────────────────────────────────────────────────────────────
// Garantía de una planta vendida directamente. Corre desde la puesta en marcha.
function GarantiaVentaBloque({ planta, garantia, onActivar, onAnular }) {
  const [abrir, setAbrir] = useState(false);
  const [fecha, setFecha] = useState(hoy());
  const [serial, setSerial] = useState("");
  const verde = ACENTOS.garantias;

  if (garantia) {
    const dias = diasHasta(garantia.vence);
    const color = dias > 30 ? GREEN : dias > 0 ? ORANGE : RED;
    return (
      <p style={{ margin: "8px 0 0", fontSize: 12.5, color, fontWeight: 700 }}>
        🛡️ Garantía hasta {fechaCorta(garantia.vence)} ({dias > 0 ? `${dias} días` : "vencida"})
        <button onClick={onAnular} style={{ marginLeft: 8, background: "none", border: "none", color: TEXT_SUB, textDecoration: "underline", cursor: "pointer", fontSize: 11 }}>anular</button>
      </p>
    );
  }
  if (!abrir) {
    return <div style={{ marginTop: 8 }}><Btn onClick={() => setAbrir(true)} color={verde} outline small>🛡️ Activar garantía</Btn></div>;
  }
  return (
    <div style={{ marginTop: 8, border: `1px dashed ${verde}88`, borderRadius: 10, padding: 10 }}>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: TEXT_SUB, lineHeight: 1.5 }}>Puesta en marcha de {planta.nombre}. Desde ese día corren 24 meses.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input type="date" value={fecha} max={hoy()} onChange={e => setFecha(e.target.value)} style={estiloInput} />
        <input value={serial} onChange={e => setSerial(e.target.value)} placeholder="Serial (opcional)" style={estiloInput} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => { onActivar({ fecha, serial }); setAbrir(false); }} color={verde} small disabled={!fecha}>Activar</Btn>
        <Btn onClick={() => setAbrir(false)} color={TEXT_SUB} outline small>Cancelar</Btn>
      </div>
    </div>
  );
}

function ModuloVentas({ ventas, setVentas, clientes, setClientes, inventario, repuestos, garantias, setGarantias, empresa, onNuevaVenta, onEditarVenta, onEliminarVenta, abrirNuevo, onNuevoListo }) {
  const ac = ACENTOS.ventas;
  const [modal, setModal] = useState(false);
  const [f, setF] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [generandoNota, setGenerandoNota] = useState(null);   // id de la venta cuya nota se está generando

  // Nota de entrega en PDF: usa el mismo número de la venta y el membrete de la
  // empresa. Se comparte (WhatsApp) o se descarga, igual que el presupuesto.
  const generarNota = async v => {
    setGenerandoNota(v.id);
    try {
      const { construirNotaEntrega, nombreArchivoNota, entregarPDF } = await import("./modules/pdfCotizacion.js");
      const doc = construirNotaEntrega({ venta: v, cliente: clientes.find(c => c.id === v.clienteId), empresa });
      await entregarPDF(doc, nombreArchivoNota(v));
    } catch {
      alert("No se pudo generar la nota. Inténtalo de nuevo.");
    } finally {
      setGenerandoNota(null);
    }
  };
  const nc = id => clientes.find(c => c.id === id)?.nombre || "—";

  const activas = ventas.filter(v => v.estado !== "Cancelada");
  const cobrado = activas.filter(v => v.estado === "Cobrada").reduce((s, v) => s + (v.total || 0), 0);
  const porCobrar = activas.filter(v => v.estado === "Pendiente cobro").reduce((s, v) => s + (v.total || 0), 0);
  const totalF = () => (f?.items || []).reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  const colorEstado = e => e === "Cobrada" ? GREEN : e === "Cancelada" ? TEXT_SUB : ORANGE;
  const garantiaDe = id => garantias.find(g => g.ventaId === id);
  const plantaDe = v => (v.items || []).find(i => i.modeloId);   // primera planta de la venta

  const norm = t => (t ?? "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const q = norm(busqueda);
  const visibles = [...ventas]
    .filter(v => !q || norm(nc(v.clienteId)).includes(q) || norm(v.origen).includes(q) || (v.items || []).some(i => norm(i.nombre).includes(q)))
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  const abrir = () => { setF({ clienteId: "", items: [], formaPago: "Efectivo", nota: "" }); setModal(true); };
  // Cuando el «+ Nuevo» pide una venta directa, abre este mismo formulario.
  useEffect(() => { if (abrirNuevo) { abrir(); onNuevoListo?.(); } }, [abrirNuevo]);
  const editar = v => { setF({ id: v.id, clienteId: v.clienteId, items: (v.items || []).map(i => ({ ...i })), formaPago: v.formaPago, nota: v.nota || "" }); setModal(true); };
  const guardar = () => {
    if (!f.clienteId || f.items.length === 0) return;
    if (f.id) onEditarVenta(f.id, { clienteId: f.clienteId, items: f.items, formaPago: f.formaPago, nota: f.nota });
    else onNuevaVenta({ clienteId: f.clienteId, items: f.items, formaPago: f.formaPago, nota: f.nota });
    setModal(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>💰 Ventas</h2>
        <Btn onClick={abrir} color={ac} small>+ Venta directa</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Card style={{ background: `linear-gradient(135deg, ${GREEN}22, ${GREEN}11)`, border: `1px solid ${GREEN}33` }}>
          <p style={{ margin: 0, color: TEXT_SUB, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>Cobrado</p>
          <p style={{ margin: "4px 0 0", color: GREEN, fontSize: 22, fontWeight: 900 }}>{usd(cobrado)}</p>
        </Card>
        <Card style={{ background: `linear-gradient(135deg, ${ORANGE}22, ${ORANGE}11)`, border: `1px solid ${ORANGE}33` }}>
          <p style={{ margin: 0, color: TEXT_SUB, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>Por cobrar</p>
          <p style={{ margin: "4px 0 0", color: ORANGE, fontSize: 22, fontWeight: 900 }}>{usd(porCobrar)}</p>
        </Card>
      </div>

      {ventas.length > 0 && (
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por cliente, artículo u origen…"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 36px 11px 12px", borderRadius: 12, border: `1px solid ${BORDER}`, background: BG_CARD, color: TEXT_MAIN, fontSize: 14, fontFamily: "inherit" }} />
          {busqueda
            ? <button onClick={() => setBusqueda("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: TEXT_SUB, fontSize: 15, cursor: "pointer", padding: 4 }}>✕</button>
            : <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: TEXT_SUB, fontSize: 14, pointerEvents: "none" }}>🔍</span>}
        </div>
      )}

      {ventas.length === 0 && (
        <p style={{ color: TEXT_SUB, textAlign: "center", padding: "24px 0", fontSize: 14 }}>
          Sin ventas todavía. Se crean aquí, o solas al aprobar una cotización o crear una instalación.
        </p>
      )}
      {ventas.length > 0 && visibles.length === 0 && (
        <p style={{ color: TEXT_SUB, textAlign: "center", padding: "24px 0", fontSize: 14 }}>Nada coincide con la búsqueda.</p>
      )}

      {visibles.map(v => (
        <Card key={v.id} style={{ opacity: v.estado === "Cancelada" ? 0.55 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{nc(v.clienteId)}</p>
              <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>📅 {v.fecha} · 💳 {v.formaPago}</p>
              <p style={{ margin: 0, fontSize: 12, color: TEXT_SUB }}>{v.numero ? `Nº ${v.numero} · ` : ""}{v.origen}{v.items?.length ? ` · ${v.items.length} ítem(s)` : ""}</p>
              {v.nota && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: TEXT_SUB, fontStyle: "italic" }}>📝 {v.nota}</p>}
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 16, color: ac }}>{usd(v.total)}</p>
              <Badge text={v.estado} color={colorEstado(v.estado)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {v.estado === "Pendiente cobro" && (
              <Btn onClick={() => setVentas(p => p.map(x => x.id === v.id ? { ...x, estado: "Cobrada" } : x))} color={GREEN} small>✓ Marcar cobrada</Btn>
            )}
            {v.estado !== "Cancelada" && <Btn onClick={() => generarNota(v)} color={ac} outline small disabled={generandoNota === v.id}>{generandoNota === v.id ? "…" : "🧾 Nota"}</Btn>}
            {v.estado !== "Cancelada" && <Btn onClick={() => editar(v)} color={ac} outline small>✏️</Btn>}
            <Btn onClick={() => onEliminarVenta(v)} color={RED} outline small>🗑️</Btn>
          </div>
          {/* Solo las plantas eléctricas tienen garantía; los repuestos no. */}
          {plantaDe(v) && v.estado !== "Cancelada" && (
            <GarantiaVentaBloque planta={plantaDe(v)} garantia={garantiaDe(v.id)}
              onActivar={({ fecha, serial }) => setGarantias(p => { const g = garantiaDeVenta(v, plantaDe(v).nombre, { fecha, serial }); return [...p.filter(x => x.id !== g.id), g]; })}
              onAnular={() => { if (confirm("¿Anular la garantía de esta venta?")) setGarantias(p => p.filter(x => x.ventaId !== v.id)); }} />
          )}
        </Card>
      ))}

      {modal && f && (
        <Modal onClose={() => setModal(false)}>
          <h3 style={{ margin: "0 0 16px", color: ac }}>{f.id ? "✏️ Editar venta" : "💰 Nueva venta directa"}</h3>
          <SelectorCliente clientes={clientes} valor={f.clienteId} onCambio={id => setF(x => ({ ...x, clienteId: id }))} onCrear={c => setClientes(p => [...p, c])} />
          <LineasItems items={f.items} onCambio={items => setF(x => ({ ...x, items }))} inventario={inventario} repuestos={repuestos} />
          <Sel label="Forma de pago" value={f.formaPago} onChange={v => setF(x => ({ ...x, formaPago: v }))}
            options={["Efectivo", "Transferencia", "Pago móvil", "Zelle", "Divisas", "Por definir"].map(o => ({ value: o, label: o }))} />
          <Etiqueta>Nota (opcional)</Etiqueta>
          <textarea value={f.nota || ""} onChange={e => setF(x => ({ ...x, nota: e.target.value }))} rows={2} placeholder="La rellena el dueño…"
            style={{ ...estiloInput, resize: "vertical", marginBottom: 14 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, margin: "4px 2px 14px" }}>
            <span>TOTAL</span><span style={{ color: ac }}>{usd(totalF())}</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={guardar} color={ac} full disabled={!f.clienteId || f.items.length === 0}>{f.id ? "Guardar cambios" : "Registrar venta"}</Btn>
            <Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn>
          </div>
          <p style={{ margin: "12px 2px 0", fontSize: 12, color: TEXT_SUB, lineHeight: 1.5 }}>
            {f.id ? "Al cambiar los artículos, el inventario se ajusta por la diferencia." : "Descuenta el material del inventario. No genera cotización, instalación ni tarea."}
          </p>
        </Modal>
      )}
    </div>
  );
}

// ── KIT DE INSPECCIÓN: reponer (pasar repuestos del inventario al kit) ─────────
function ModalReponerKit({ repuestos, setRepuestos, kit, setKit, setMovimientos, usuario, onCerrar }) {
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState(null);
  const [cant, setCant] = useState("");
  const ac = ACENTOS.inventario;
  const norm = t => (t ?? "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const q = norm(busca);
  const opciones = q ? repuestos.filter(r => norm(`${r.nombre} ${r.codigo || ""}`).includes(q)).slice(0, 12) : [];
  const enKit = id => kit.find(k => k.id === id)?.cantidad || 0;

  const pasar = () => {
    const n = Number(cant) || 0;
    if (!sel || n <= 0) return;
    setRepuestos(p => p.map(r => r.id === sel.id ? { ...r, stock: (Number(r.stock) || 0) - n } : r));
    setKit(p => { const ya = p.find(k => k.id === sel.id); return ya ? p.map(k => k.id === sel.id ? { ...k, cantidad: (Number(k.cantidad) || 0) + n } : k) : [...p, { id: sel.id, nombre: sel.nombre, codigo: sel.codigo || "", cantidad: n }]; });
    const base = { articuloId: sel.id, articuloNombre: sel.nombre, clase: "repuesto", cantidad: n, quien: usuario || "Oficina", fecha: hoy(), creadoEn: new Date().toISOString() };
    setMovimientos(p => [...p,
      { id: uid(), tipo: "salida", origen: "→ Kit de inspección", ubicacion: "inventario", ...base },
      { id: uid(), tipo: "entrada", origen: "Reposición desde inventario", ubicacion: "kit", ...base },
    ]);
    setSel(null); setCant(""); setBusca("");
  };

  return (
    <Modal onClose={onCerrar}>
      <h3 style={{ margin: "0 0 6px", color: ac }}>🧰 Reponer Kit de Inspección</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: TEXT_SUB, lineHeight: 1.5 }}>Elige un repuesto del inventario y la cantidad que pasa al kit. Se descuenta del inventario.</p>

      {sel ? (
        <div style={{ border: `1.5px solid ${ac}55`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700 }}>🔩 {sel.nombre} · stock {Number(sel.stock) || 0}{enKit(sel.id) ? ` · en kit ${enKit(sel.id)}` : ""}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" value={cant} onChange={e => setCant(e.target.value)} placeholder="Cantidad" style={{ ...estiloInput, flex: 1 }} />
            <Btn onClick={pasar} color={ac} small disabled={!(Number(cant) > 0)}>➕ Pasar al kit</Btn>
            <Btn onClick={() => { setSel(null); setCant(""); }} color={TEXT_SUB} outline small>✕</Btn>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar repuesto del inventario…" style={estiloInput} />
          {q && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, marginTop: 4, maxHeight: 220, overflowY: "auto" }}>
              {opciones.length === 0 && <p style={{ margin: 0, padding: 10, fontSize: 13, color: TEXT_SUB }}>Nada coincide.</p>}
              {opciones.map(r => (
                <button key={r.id} type="button" onClick={() => { setSel(r); setBusca(""); }}
                  style={{ display: "flex", justifyContent: "space-between", gap: 8, width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${BORDER}`, padding: "9px 12px", cursor: "pointer", fontSize: 13.5, fontFamily: "inherit" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🔩 {r.nombre}</span>
                  <span style={{ color: TEXT_SUB, whiteSpace: "nowrap" }}>stock {Number(r.stock) || 0}{enKit(r.id) ? ` · kit ${enKit(r.id)}` : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Etiqueta>En el kit ({kit.length})</Etiqueta>
      {kit.length === 0 && <p style={{ margin: "0 0 12px", fontSize: 13, color: TEXT_SUB }}>El kit está vacío.</p>}
      {[...kit].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")).map(k => (
        <div key={k.id} style={{ display: "flex", justifyContent: "space-between", background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", marginBottom: 6, fontSize: 13.5 }}>
          <span>🔩 {k.nombre}</span><b>{k.cantidad}</b>
        </div>
      ))}
      <div style={{ marginTop: 10 }}><Btn onClick={onCerrar} color={ac} full>Listo</Btn></div>
    </Modal>
  );
}

// ── INVENTARIO ────────────────────────────────────────────────────────────────
function ModuloInventario({ inventario, setInventario, repuestos, setRepuestos, movimientos, setMovimientos, kit, setKit, usuario, umbralStock = 1, verBajos, onVerBajosListo }) {
  const [sub, setSub] = useState("modelos");
  const [reponer, setReponer] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [soloBajos, setSoloBajos] = useState(false);   // filtro: solo repuestos con poco stock
  // Desde el aviso de Inicio: abre los repuestos ya filtrados por stock bajo.
  useEffect(() => { if (verBajos) { setSub("repuestos"); setSoloBajos(true); onVerBajosListo?.(); } }, [verBajos]);
  const [entrada, setEntrada] = useState(null);        // { item, clase } al que se le añade stock
  const [entCant, setEntCant] = useState("");
  const [entCosto, setEntCosto] = useState("");
  const [devolver, setDevolver] = useState(null);      // artículo del kit que se devuelve al inventario
  const [devCant, setDevCant] = useState("");
  const [histFiltro, setHistFiltro] = useState("todo");
  const ac = ACENTOS.inventario;
  const todos = [...inventario, ...repuestos];
  const totalUnidades = todos.reduce((s, x) => s + (Number(x.stock) || 0), 0);
  const valorTotal = todos.reduce((s, x) => s + (Number(x.stock) || 0) * (Number(x.precio) || 0), 0);
  const agotados = todos.filter(x => (Number(x.stock) || 0) <= 0).length;
  const esBajo = it => (Number(it.stock) || 0) <= umbralStock;   // repuesto por reponer
  const repuestosBajos = repuestos.filter(esBajo).length;

  // Anotar una compra: sube el stock del artículo y deja el movimiento con su
  // fecha y costo, para llevar el control de lo que se va comprando.
  const registrarEntrada = () => {
    const n = Number(entCant) || 0;
    if (!entrada || n <= 0) return;
    const setL = entrada.clase === "modelos" ? setInventario : setRepuestos;
    setL(p => p.map(x => x.id === entrada.item.id ? { ...x, stock: (Number(x.stock) || 0) + n } : x));
    const cu = Number(entCosto) || 0;
    setMovimientos(p => [...p, { id: uid(), fecha: hoy(), tipo: "entrada", clase: entrada.clase === "modelos" ? "planta" : "repuesto", articuloId: entrada.item.id, articuloNombre: entrada.item.nombre, cantidad: n, costoUnit: cu, costoTotal: cu * n, origen: "Compra", creadoEn: new Date().toISOString() }]);
    setEntrada(null);
  };

  // Devolver al inventario una cantidad del kit (total o parcial). Corrección o
  // fin de temporada: lo que vuelve queda disponible para venta o cotización.
  const confirmarDevolucion = () => {
    const k = devolver;
    const enKit = Number(k.cantidad) || 0;
    const n = Math.min(Math.max(0, Math.floor(Number(devCant) || 0)), enKit);
    if (n <= 0) return;
    setRepuestos(p => p.some(r => r.id === k.id) ? p.map(r => r.id === k.id ? { ...r, stock: (Number(r.stock) || 0) + n } : r) : p);
    // Si se devuelve todo, el artículo sale del kit; si es parcial, queda el resto.
    setKit(p => { const resto = enKit - n; return resto > 0 ? p.map(x => x.id === k.id ? { ...x, cantidad: resto } : x) : p.filter(x => x.id !== k.id); });
    const base = { articuloId: k.id, articuloNombre: k.nombre, clase: "repuesto", cantidad: n, quien: usuario || "Oficina", fecha: hoy(), creadoEn: new Date().toISOString() };
    setMovimientos(p => [...p,
      { id: uid(), tipo: "salida", origen: "Devuelto al inventario", ubicacion: "kit", ...base },
      { id: uid(), tipo: "entrada", origen: "Devuelto del kit de inspección", ubicacion: "inventario", ...base },
    ]);
    setDevolver(null);
  };
  const lista = sub === "modelos" ? inventario : repuestos;
  const setLista = sub === "modelos" ? setInventario : setRepuestos;
  // Búsqueda sin distinguir mayúsculas ni acentos, por nombre o código, y todo
  // en orden alfabético para encontrarlo rápido cuando la lista crece.
  const norm = t => (t ?? "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const q = norm(busqueda);
  const visibles = lista
    .filter(it => !(soloBajos && sub === "repuestos") || esBajo(it))
    .filter(it => !q || norm(it.nombre).includes(q) || norm(it.codigo).includes(q) || norm(it.potencia).includes(q))
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }));
  const guardar = () => {
    if (!form.nombre?.trim()) return;
    // El precio y el stock se escriben libres (se puede borrar y reescribir) y
    // solo al guardar se convierten a número. Antes se convertían en cada tecla
    // y por eso no se podía borrar el último dígito.
    const limpio = { ...form, precio: Number(form.precio) || 0, stock: Number(form.stock) || 0 };
    const viejo = lista.find(x => x.id === limpio.id);
    const esNuevo = !viejo;
    setLista(p => esNuevo ? [...p, limpio] : p.map(x => x.id === limpio.id ? limpio : x));
    if (esNuevo && limpio.stock > 0) {
      setMovimientos(p => [...p, { id: uid(), fecha: hoy(), tipo: "entrada", clase: sub === "modelos" ? "planta" : "repuesto", articuloId: limpio.id, articuloNombre: limpio.nombre, cantidad: limpio.stock, costoUnit: 0, costoTotal: 0, origen: "Carga inicial", creadoEn: new Date().toISOString() }]);
    } else if (viejo && (Number(viejo.stock) || 0) !== limpio.stock) {
      const delta = limpio.stock - (Number(viejo.stock) || 0);
      setMovimientos(p => [...p, { id: uid(), fecha: hoy(), tipo: delta > 0 ? "entrada" : "salida", clase: sub === "modelos" ? "planta" : "repuesto", articuloId: limpio.id, articuloNombre: limpio.nombre, cantidad: Math.abs(delta), costoUnit: 0, costoTotal: 0, origen: "Ajuste manual (edición)", creadoEn: new Date().toISOString() }]);
    }
    setModal(false);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>📦 Inventario</h2>
        {(sub === "modelos" || sub === "repuestos") && <Btn onClick={() => { setForm(sub === "modelos" ? { id: uid(), codigo: "", nombre: "", potencia: "", combustible: "Gasolina", precio: 0, stock: 0 } : { id: uid(), codigo: "", nombre: "", precio: 0, stock: 0 }); setModal(true); }} color={ac} small>+ Nuevo</Btn>}
        {sub === "kit" && <Btn onClick={() => setReponer(true)} color={ac} small>+ Reponer kit</Btn>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[["Unidades", totalUnidades, ac, null], ["Valor", usd(valorTotal), GREEN, null], ["Agotados", agotados, agotados ? RED : GREEN, null],
          [`Stock bajo (≤${umbralStock})`, repuestosBajos, repuestosBajos ? ORANGE : GREEN, () => { setSub("repuestos"); setSoloBajos(true); }]].map(([t, v, col, onClick]) => (
          <Card key={t} onClick={onClick || undefined} style={{ padding: "10px 12px", cursor: onClick ? "pointer" : "default" }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase" }}>{t}</p>
            <p style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 900, color: col }}>{v}</p>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[{ id: "modelos", label: "⚡ Plantas" }, { id: "repuestos", label: "🔩 Repuestos" }, { id: "kit", label: "🧰 Kit de Inspección" }, { id: "historial", label: "📥 Historial" }].map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{ padding: "11px 6px", borderRadius: 12, border: `2px solid ${sub === t.id ? ac : BORDER}`, background: sub === t.id ? ac + "22" : BG_CARD, color: sub === t.id ? ac : TEXT_SUB, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>{t.label}</button>
        ))}
      </div>

      {(sub === "modelos" || sub === "repuestos") && <>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o código…"
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 36px 11px 12px", borderRadius: 12, border: `1px solid ${BORDER}`, background: BG_CARD, color: TEXT_MAIN, fontSize: 14, fontFamily: "inherit" }} />
        {busqueda
          ? <button onClick={() => setBusqueda("")} aria-label="Limpiar" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: TEXT_SUB, fontSize: 15, cursor: "pointer", padding: 4 }}>✕</button>
          : <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: TEXT_SUB, fontSize: 14, pointerEvents: "none" }}>🔍</span>}
      </div>
      {sub === "repuestos" && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 12px", fontSize: 13, color: soloBajos ? ORANGE : TEXT_SUB, fontWeight: soloBajos ? 700 : 400, cursor: "pointer" }}>
          <input type="checkbox" checked={soloBajos} onChange={e => setSoloBajos(e.target.checked)} />
          Solo stock bajo (≤{umbralStock}){repuestosBajos > 0 ? ` · ${repuestosBajos}` : ""}
        </label>
      )}
      {busqueda && <p style={{ margin: "-6px 2px 12px", fontSize: 12, color: TEXT_SUB }}>{visibles.length} resultado{visibles.length === 1 ? "" : "s"}</p>}

      {visibles.length === 0 && (
        <p style={{ color: TEXT_SUB, textAlign: "center", padding: "24px 0", fontSize: 14 }}>
          {busqueda ? "Nada coincide con la búsqueda." : sub === "modelos" ? "Sin plantas todavía." : "Sin repuestos todavía."}
        </p>
      )}
      {visibles.map(item => (
        <Card key={item.id} style={sub === "repuestos" && esBajo(item) ? { borderLeft: `4px solid ${item.stock > 0 ? ORANGE : RED}` } : undefined}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            {item.imagen && <img src={item.imagen} alt="" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8, border: `1px solid ${BORDER}` }} />}
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15 }}>{item.nombre}</p>
              {item.potencia && <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>⚡ {item.potencia} · {item.combustible}</p>}
              <p style={{ margin: "0 0 6px", fontSize: 13, color: TEXT_SUB }}>Cód: {item.codigo}</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: ac, fontWeight: 800, fontSize: 16 }}>{usd(item.precio)}</span>
                {(Number(item.stock) || 0) <= 0
                  ? <Badge text="⛔ AGOTADO" color={RED} />
                  : <Badge text={`Stock: ${item.stock}`} color={sub === "repuestos" && esBajo(item) ? ORANGE : GREEN} />}
                {sub === "repuestos" && item.stock > 0 && esBajo(item) && <Badge text="⚠️ Reponer" color={ORANGE} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn onClick={() => { setEntCant(""); setEntCosto(""); setEntrada({ item, clase: sub }); }} color={GREEN} outline small>📥</Btn>
              <Btn onClick={() => { setForm({ ...item }); setModal(true); }} color={ac} outline small>✏️</Btn>
              <Btn onClick={() => { if ((Number(item.stock) || 0) > 0) setMovimientos(p => [...p, { id: uid(), fecha: hoy(), tipo: "salida", clase: sub === "modelos" ? "planta" : "repuesto", articuloId: item.id, articuloNombre: item.nombre, cantidad: Number(item.stock) || 0, origen: "Artículo eliminado", creadoEn: new Date().toISOString() }]); setLista(p => p.filter(x => x.id !== item.id)); }} color={RED} outline small>🗑️</Btn>
            </div>
          </div>
        </Card>
      ))}
      </>}

      {sub === "historial" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[["todo", "Todo"], ["entrada", "📥 Entradas"], ["salida", "📤 Salidas"]].map(([id, label]) => (
              <button key={id} onClick={() => setHistFiltro(id)} style={{ flex: 1, padding: "9px 6px", borderRadius: 10, border: `2px solid ${histFiltro === id ? ac : BORDER}`, background: histFiltro === id ? ac + "22" : BG_CARD, color: histFiltro === id ? ac : TEXT_SUB, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>{label}</button>
            ))}
          </div>
          {(() => {
            const movs = [...movimientos].filter(m => m.ubicacion !== "kit" && (histFiltro === "todo" || m.tipo === histFiltro)).sort((a, b) => (b.creadoEn || "").localeCompare(a.creadoEn || ""));
            if (!movs.length) return <p style={{ color: TEXT_SUB, textAlign: "center", padding: "24px 0", fontSize: 14 }}>{movimientos.length ? "Nada en este filtro." : "Sin movimientos todavía. Se anotan al crear un artículo, al registrar una entrada (📥) y cuando una venta descuenta material."}</p>;
            return movs.map(m => {
              const entra = m.tipo !== "salida";
              const col = entra ? GREEN : RED;
              return (
                <Card key={m.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14 }}>{m.clase === "planta" ? "⚡" : "🔩"} {m.articuloNombre}</p>
                      <p style={{ margin: 0, fontSize: 12.5, color: TEXT_SUB }}>📅 {m.fecha} · {m.origen}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: col }}>{entra ? "+" : "−"}{m.cantidad}</p>
                      {m.costoTotal > 0 && <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT_SUB }}>{usd(m.costoTotal)}</p>}
                    </div>
                  </div>
                </Card>
              );
            });
          })()}
        </>
      )}

      {sub === "kit" && (
        <>
          {kit.length === 0 && (
            <p style={{ color: TEXT_SUB, textAlign: "center", padding: "24px 0", fontSize: 14 }}>
              El kit está vacío. Con «+ Reponer kit» pasas repuestos del inventario al kit (se descuentan del inventario).
            </p>
          )}
          {[...kit].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")).map(k => (
            <Card key={k.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>🔩 {k.nombre}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge text={`En kit: ${k.cantidad}`} color={(Number(k.cantidad) || 0) > 0 ? GREEN : RED} />
                  <Btn onClick={() => { setDevCant(String(k.cantidad || "")); setDevolver(k); }} color={RED} outline small>↩︎ Devolver</Btn>
                </div>
              </div>
            </Card>
          ))}
          {movimientos.some(m => m.ubicacion === "kit") && (
            <>
              <Etiqueta>Historial del kit</Etiqueta>
              {[...movimientos].filter(m => m.ubicacion === "kit").sort((a, b) => (b.creadoEn || "").localeCompare(a.creadoEn || "")).map(m => {
                const entra = m.tipo !== "salida";
                return (
                  <Card key={m.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14 }}>🔩 {m.articuloNombre}</p>
                        <p style={{ margin: 0, fontSize: 12.5, color: TEXT_SUB }}>📅 {m.fecha} · {m.origen}{m.quien ? ` · ${m.quien}` : ""}</p>
                      </div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: entra ? GREEN : RED }}>{entra ? "+" : "−"}{m.cantidad}</p>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </>
      )}

      {reponer && (
        <ModalReponerKit repuestos={repuestos} setRepuestos={setRepuestos} kit={kit} setKit={setKit} setMovimientos={setMovimientos} usuario={usuario} onCerrar={() => setReponer(false)} />
      )}

      {devolver && (
        <Modal onClose={() => setDevolver(null)}>
          <h3 style={{ margin: "0 0 6px", color: ac }}>↩︎ Devolver del kit</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: TEXT_SUB }}>{devolver.nombre} · en el kit: {devolver.cantidad}</p>
          <Inp label={`¿Cuántas unidades devuelves al inventario? (máx. ${devolver.cantidad})`} type="number" value={devCant} onChange={setDevCant} placeholder="0" />
          <p style={{ margin: "-4px 2px 14px", fontSize: 12, color: TEXT_SUB }}>Vuelven al inventario y quedan disponibles para venta o cotización. Lo que no devuelvas sigue en el kit.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={confirmarDevolucion} color={ac} full disabled={!(Number(devCant) > 0)}>Devolver</Btn>
            <Btn onClick={() => setDevolver(null)} color={TEXT_SUB} outline full>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {entrada && (
        <Modal onClose={() => setEntrada(null)}>
          <h3 style={{ margin: "0 0 6px", color: ac }}>📥 Entrada de stock</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: TEXT_SUB }}>{entrada.item.nombre} · stock actual: {entrada.item.stock ?? 0}</p>
          <Inp label="¿Cuántas unidades entran?" type="number" value={entCant} onChange={setEntCant} placeholder="0" />
          <Inp label="Costo por unidad ($) — opcional" type="number" value={entCosto} onChange={setEntCosto} placeholder="0" />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={registrarEntrada} color={GREEN} full disabled={!(Number(entCant) > 0)}>Registrar entrada</Btn>
            <Btn onClick={() => setEntrada(null)} color={TEXT_SUB} outline full>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal onClose={() => setModal(false)}>
          <h3 style={{ margin: "0 0 20px", color: ac }}>{sub === "modelos" ? "Planta / Modelo" : "Repuesto"}</h3>
          <Inp label="Código" value={form.codigo || ""} onChange={v => setForm(f => ({ ...f, codigo: v }))} />
          <Inp label="Nombre" value={form.nombre || ""} onChange={v => setForm(f => ({ ...f, nombre: v }))} />
          <CampoImagen label={sub === "modelos" ? "Foto del equipo" : "Foto del repuesto"} valor={form.imagen} preparar={prepararImagen}
            onCambio={v => setForm(f => ({ ...f, imagen: v }))}
            ayuda={sub === "modelos" ? "Aparece junto a esta planta en los presupuestos impresos." : "Se muestra junto al repuesto en el inventario."} />
          {sub === "modelos" && <>
            <Inp label="Potencia" value={form.potencia || ""} onChange={v => setForm(f => ({ ...f, potencia: v }))} placeholder="5500W" />
            <Sel label="Combustible" value={form.combustible || "Gasolina"} onChange={v => setForm(f => ({ ...f, combustible: v }))} options={["Gasolina", "Gas/Propano", "Diésel", "Dual"].map(t => ({ value: t, label: t }))} />
          </>}
          <Inp label="Precio ($)" value={form.precio ?? ""} onChange={v => setForm(f => ({ ...f, precio: v }))} type="number" />
          <Inp label="Stock" value={form.stock ?? ""} onChange={v => setForm(f => ({ ...f, stock: v }))} type="number" />
          <div style={{ display: "flex", gap: 10 }}><Btn onClick={guardar} color={ac} full>Guardar</Btn><Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ── GARANTÍAS ─────────────────────────────────────────────────────────────────
function ModuloGarantias({ garantias, clientes }) {
  const ac = ACENTOS.garantias;
  const nc = id => clientes.find(c => c.id === id)?.nombre || "—";
  const venceDe = g => g.vence || sumarMeses(g.fechaInstalacion, g.mesesGarantia);
  const diasRestantes = g => diasHasta(venceDe(g));
  return (
    <div>
      <h2 style={{ color: ac, margin: "0 0 16px", fontSize: 18, fontWeight: 900 }}>🛡️ Garantías</h2>
      {garantias.length === 0 && <p style={{ color: TEXT_SUB, textAlign: "center", marginTop: 40 }}>Sin garantías todavía. Se activan desde cada instalación, el día de la puesta en marcha.</p>}
      {[...garantias].sort((a, b) => venceDe(a).localeCompare(venceDe(b))).map(g => {
        const dias = diasRestantes(g);
        const col = dias > 30 ? GREEN : dias > 0 ? ORANGE : RED;
        return (
          <Card key={g.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{nc(g.clienteId)}</p>
                {g.proyectoNombre && <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>🏗️ {g.proyectoNombre}</p>}
                <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>⚡ {g.modelo || "—"}{g.serial ? ` · 🔢 ${g.serial}` : ""}</p>
                <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>▶️ Puesta en marcha: {fechaCorta(g.fechaInstalacion)} · vence el {fechaCorta(venceDe(g))}</p>
              </div>
              <Badge text={dias > 0 ? `${dias} días` : "Vencida"} color={col} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function ModuloAdmin({ tecnicos, setTecnicos, exportarDatos, restaurarDatos, empresa, setEmpresa, correo }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [editandoEmpresa, setEditandoEmpresa] = useState(false);
  const [borradorEmpresa, setBorradorEmpresa] = useState({});
  const [copia, setCopia] = useState(null);   // backup leído, a la espera de confirmación
  const ac = ACENTOS.admin;

  // Nunca se restaura a ciegas: primero se lee el archivo y se le enseña al
  // usuario qué contiene, porque restaurar reemplaza todo lo que hay.
  const leerCopia = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const datos = JSON.parse(await file.text());
      const listas = ["clientes", "tareas", "cotizaciones", "ventas", "inventario", "repuestos", "garantias", "tecnicos"];
      if (!listas.some(k => Array.isArray(datos[k]))) {
        alert("Ese archivo no parece una copia de seguridad de VICFAN.");
        return;
      }
      setCopia({ datos, resumen: listas.map(k => ({ k, n: (datos[k] || []).length })).filter(x => x.n > 0) });
    } catch {
      alert("No se pudo leer el archivo. ¿Seguro que es el .json que exportaste?");
    }
  };
  const guardar = () => {
    if (!form.nombre?.trim()) return;
    setTecnicos(p => p.find(x => x.id === form.id) ? p.map(x => x.id === form.id ? form : x) : [...p, form]);
    setModal(false);
  };
  return (
    <div>
      <h2 style={{ color: ac, margin: "0 0 16px", fontSize: 18, fontWeight: 900 }}>⚙️ Administración</h2>
      <button onClick={exportarDatos} style={{ width: "100%", background: NAVY, border: "none", borderRadius: 12, color: "#fff", padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>📤 Exportar Backup</button>

      {!copia ? (
        <label style={{ display: "block", width: "100%", background: BG_CARD, border: `1.5px solid ${BORDER}`, borderRadius: 12, color: TEXT_MAIN, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 8, textAlign: "center" }}>
          📥 Restaurar Backup
          <input type="file" accept="application/json,.json" onChange={leerCopia} style={{ display: "none" }} />
        </label>
      ) : (
        <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 12, padding: 14, marginBottom: 8 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#856404" }}>⚠️ Esta copia reemplazará todos los datos actuales:</p>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "#856404" }}>
            {copia.resumen.map(x => `${x.n} ${x.k}`).join(" · ")}
          </p>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#856404" }}>Las fotos no viajan en el backup: se quedan en el dispositivo donde se tomaron.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => { restaurarDatos(copia.datos); setCopia(null); }} color={ORANGE} full small>Restaurar</Btn>
            <Btn onClick={() => setCopia(null)} color={TEXT_SUB} outline full small>Cancelar</Btn>
          </div>
        </div>
      )}
      <h3 style={{ margin: "20px 0 10px", fontSize: 15 }}>🏢 Datos del presupuesto</h3>
      <Card>
        {!editandoEmpresa ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{empresa.nombre}</p>
              <p style={{ margin: 0, color: TEXT_SUB }}>{empresa.rif}</p>
              <p style={{ margin: 0, color: TEXT_SUB }}>{empresa.telefonos}</p>
            </div>
            <Btn onClick={() => { setBorradorEmpresa({ ...empresa }); setEditandoEmpresa(true); }} color={ac} outline small>Editar</Btn>
          </div>
        ) : (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: TEXT_SUB }}>Es el membrete que sale impreso en cada presupuesto.</p>
            <Inp label="Nombre o razón social" value={borradorEmpresa.nombre || ""} onChange={v => setBorradorEmpresa(p => ({ ...p, nombre: v }))} />
            <Inp label="RIF" value={borradorEmpresa.rif || ""} onChange={v => setBorradorEmpresa(p => ({ ...p, rif: v }))} />
            <Inp label="Eslogan" value={borradorEmpresa.eslogan || ""} onChange={v => setBorradorEmpresa(p => ({ ...p, eslogan: v }))} />
            <Inp label="Dirección" value={borradorEmpresa.direccion || ""} onChange={v => setBorradorEmpresa(p => ({ ...p, direccion: v }))} />
            <Inp label="Teléfonos" value={borradorEmpresa.telefonos || ""} onChange={v => setBorradorEmpresa(p => ({ ...p, telefonos: v }))} />
            <Inp label="Email" value={borradorEmpresa.email || ""} onChange={v => setBorradorEmpresa(p => ({ ...p, email: v }))} />
            <Inp label="Web" value={borradorEmpresa.web || ""} onChange={v => setBorradorEmpresa(p => ({ ...p, web: v }))} />
            <div style={{ margin: "6px 0 4px", fontSize: 12, color: TEXT_SUB, fontWeight: 700 }}>AVISO DE STOCK BAJO</div>
            <Inp label="Avisar cuando un repuesto quede en esta cantidad o menos" type="number" value={borradorEmpresa.stockMinimo ?? 1} onChange={v => setBorradorEmpresa(p => ({ ...p, stockMinimo: v }))} />
            <CampoImagen label="Logo" valor={borradorEmpresa.logo} preparar={prepararLogo} alto={70}
              onCambio={v => setBorradorEmpresa(p => ({ ...p, logo: v }))}
              ayuda="Sale en la cabecera de cada presupuesto impreso." />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => { setEmpresa({ ...borradorEmpresa, id: "datos" }); setEditandoEmpresa(false); }} color={ac} small full>Guardar</Btn>
              <Btn onClick={() => setEditandoEmpresa(false)} color={TEXT_SUB} outline small full>Cancelar</Btn>
            </div>
          </>
        )}
      </Card>

      <Usuarios correoPropio={correo} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 12px" }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>👷 Técnicos</h3>
        <Btn onClick={() => { setForm({ id: uid(), nombre: "", telefono: "", especialidad: "Instalación" }); setModal(true); }} color={ac} small>+ Nuevo</Btn>
      </div>
      {tecnicos.map(t => (
        <Card key={t.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{t.nombre}</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>{t.telefono ? `📞 ${t.telefono} · ` : ""}{t.especialidad}</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn onClick={() => { setForm({ ...t }); setModal(true); }} color={ac} outline small>✏️</Btn>
              <Btn onClick={() => { if (confirm(`¿Eliminar a ${t.nombre}? Las tareas que ya cerró conservan su nombre en el historial.`)) setTecnicos(p => p.filter(x => x.id !== t.id)); }} color={RED} outline small>🗑️</Btn>
            </div>
          </div>
        </Card>
      ))}
      {modal && (
        <Modal onClose={() => setModal(false)}>
          <h3 style={{ margin: "0 0 20px", color: ac }}>Técnico</h3>
          <Inp label="Nombre" value={form.nombre || ""} onChange={v => setForm(f => ({ ...f, nombre: v }))} />
          <Inp label="Teléfono" value={form.telefono || ""} onChange={v => setForm(f => ({ ...f, telefono: v }))} />
          <Sel label="Especialidad" value={form.especialidad || "Instalación"} onChange={v => setForm(f => ({ ...f, especialidad: v }))} options={["Instalación", "Mantenimiento", "Reparación", "Todos"].map(t => ({ value: t, label: t }))} />
          <div style={{ display: "flex", gap: 10 }}><Btn onClick={guardar} color={ac} full>Guardar</Btn><Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ── HOJA «+ NUEVO»: única puerta para crear venta / proyecto / mantenimiento ───
// No cambia cómo se crea cada cosa; solo pregunta cuál y abre su formulario.
function HojaNuevo({ onElegir, onCerrar }) {
  const opciones = [
    { tipo: "venta",         icono: "💰", titulo: "Venta directa",  sub: "No · solo vender (mostrador)",  color: GREEN },
    { tipo: "proyecto",      icono: "🏗️", titulo: "Instalación",    sub: "Sí · a instalar en sitio",      color: ACENTOS.operaciones },
    { tipo: "mantenimiento", icono: "🔩", titulo: "Mantenimiento",  sub: "Sí · a dar servicio en sitio",  color: ORANGE },
  ];
  return (
    <Modal onClose={onCerrar}>
      <h3 style={{ margin: "0 0 2px", fontSize: 17, fontWeight: 900, color: TEXT_MAIN }}>¿Qué vas a registrar?</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: TEXT_SUB }}>¿Requiere que vaya un técnico?</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {opciones.map(o => (
          <button key={o.tipo} onClick={() => onElegir(o.tipo)}
            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${o.color}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ fontSize: 22 }}>{o.icono}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: TEXT_MAIN }}>{o.titulo}</span>
              <span style={{ display: "block", fontSize: 12.5, color: TEXT_SUB }}>{o.sub}</span>
            </span>
            <span style={{ color: TEXT_SUB, fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ── BIENVENIDA ────────────────────────────────────────────────────────────────

const Vacio = ({ texto }) => (
  <p style={{ margin: "14px 0 4px", fontSize: 13, color: TEXT_SUB, textAlign: "center" }}>{texto}</p>
);

const TituloPanel = ({ children, pie }) => (
  <>
    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT_MAIN }}>{children}</h2>
    {pie && <p style={{ margin: "2px 0 14px", fontSize: 12, color: TEXT_SUB }}>{pie}</p>}
  </>
);

const Panel = ({ children, style }) => (
  <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 18px", ...style }}>{children}</div>
);

/** Para los rótulos del gráfico: una letra por mes. */
const INICIAL_MES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * El panel: lo que hay que mirar al abrir la app, sin entrar en ninguna
 * sección. Cuatro cifras arriba, los avisos que no pueden esperar, la marcha
 * del negocio, qué se vende y qué visita toca a continuación.
 *
 * Va POR MESES, no por días, porque así es el trabajo: aquí no se vende cada
 * mañana como en una tienda: se instala un generador, se cobra, y pasan
 * semanas. Un panel diario estaría casi siempre a cero y no diría nada; doce
 * meses de barras sí enseñan si el año va mejor o peor. Lo único que se mira
 * a diario son las visitas de la agenda, y por eso esa cifra sí es de hoy.
 *
 * Las ventas canceladas no cuentan en ningún sitio: una venta anulada no es
 * dinero, y si entra en las cifras el panel dice que se facturó algo que se
 * deshizo. Las cobradas y las pendientes de cobro sí cuentan, y el anillo
 * enseña cuánto de lo vendido está todavía por cobrar.
 */
function ModuloBienvenida({ setTab, stats, onNuevo, onStockBajo, ventas = [], tareas = [], clientes = [], tecnicos = [] }) {
  const hoyISO = hoy();
  const primeroDeMes = hoyISO.slice(0, 8) + "01";
  const vivas = ventas.filter(v => v.estado !== "Cancelada");
  const suma = lista => lista.reduce((t, v) => t + (Number(v.total) || 0), 0);

  const delMes = vivas.filter(v => v.fecha >= primeroDeMes);
  // Lo que se debe, de cuando sea: una factura de marzo sin cobrar sigue sin
  // cobrarse en octubre, y es justo la que hay que perseguir.
  const porCobrar = suma(vivas.filter(v => v.estado !== "Cobrada"));

  // ── Ventas de los últimos 12 meses ──
  const meses = Array.from({ length: 12 }, (_, i) => {
    const clave = sumarMeses(primeroDeMes, -(11 - i)).slice(0, 7);
    return {
      clave,
      inicial: INICIAL_MES[Number(clave.slice(5, 7)) - 1],
      total: suma(vivas.filter(v => String(v.fecha).startsWith(clave))),
    };
  });
  const techo = Math.max(...meses.map(m => m.total), 1);
  const totalAño = meses.reduce((t, m) => t + m.total, 0);

  // Geometría de las barras, calculada aquí para que el dibujo no mienta.
  const BASE = 190, ALTO = 160, ANCHO = 30, PASO = 46, X0 = 34;
  const barras = meses.map((m, i) => {
    const h = (m.total / techo) * ALTO;
    const x = X0 + i * PASO, y = BASE - h, r = Math.min(4, h);
    return {
      ...m, x, cx: x + ANCHO / 2, textoY: y - 5,
      d: h <= 0 ? "" : `M${x},${BASE} V${y + r} Q${x},${y} ${x + r},${y} H${x + ANCHO - r} Q${x + ANCHO},${y} ${x + ANCHO},${y + r} V${BASE} Z`,
    };
  });

  // El resto del panel mira la misma ventana de doce meses que el gráfico: con
  // un mes solo, un negocio de instalaciones enseña dos artículos o ninguno.
  const desdeVentana = meses[0].clave + "-01";
  const enVentana = vivas.filter(v => v.fecha >= desdeVentana);

  // ── Lo que más se vende ──
  const porArticulo = {};
  for (const v of enVentana) {
    for (const it of v.items || []) {
      const nombre = (it.nombre || "").trim() || "Sin nombre";
      porArticulo[nombre] = (porArticulo[nombre] || 0) + (Number(it.cantidad) || 0);
    }
  }
  const top = Object.entries(porArticulo).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topeTop = Math.max(...top.map(([, n]) => n), 1);

  // ── Cuánto de lo vendido está cobrado ──
  const facturado = suma(enVentana);
  const cobrado = suma(enVentana.filter(v => v.estado === "Cobrada"));
  const porcentaje = facturado ? Math.round((cobrado / facturado) * 100) : 0;
  const VUELTA = 2 * Math.PI * 44;

  // ── Lo siguiente: las visitas abiertas, de la más próxima en adelante ──
  const abierta = t => t.estado === "Programada" || t.estado === "En proceso";
  const proximas = tareas
    .filter(t => abierta(t) && t.fecha >= hoyISO)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora || "").localeCompare(String(b.hora || "")));
  const nombreCliente = id => clientes.find(c => c.id === id)?.nombre || "Sin cliente";
  const quienVa = t => tecnicos.find(x => x.id === t.tecnicoId)?.nombre || "Sin técnico asignado";

  const largo = new Date().toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" });
  const hoyLargo = largo.charAt(0).toUpperCase() + largo.slice(1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12.5, color: TEXT_SUB, fontWeight: 600 }}>{hoyLargo}</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 27, fontWeight: 900, color: TEXT_MAIN, lineHeight: 1.1 }}>Panel del mes</h1>
        </div>
        {onNuevo && <Btn onClick={onNuevo} color={ACENTOS.ventas}>+ Nuevo</Btn>}
      </div>

      {/* Las cuatro cifras */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(138px, 1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Ventas del mes", valor: usd(suma(delMes)), pie: `${delMes.length} venta${delMes.length === 1 ? "" : "s"}`, al: "ventas" },
          { label: "Por cobrar", valor: usd(porCobrar), pie: "de cualquier fecha", al: "ventas" },
          { label: "Visitas hoy", valor: String(stats.tareasHoy), pie: "en la agenda", al: "tareas" },
          { label: "Cotizaciones", valor: String(stats.cotizacionesPendientes), pie: "por responder", al: "cotizaciones" },
        ].map(c => (
          <button key={c.label} onClick={() => c.al && setTab(c.al)}
            style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 16px", textAlign: "left", cursor: c.al ? "pointer" : "default", font: "inherit" }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: TEXT_SUB, fontWeight: 700 }}>{c.label}</p>
            <p style={{ margin: "7px 0 0", fontSize: 25, fontWeight: 900, color: TEXT_MAIN, lineHeight: 1 }}>{c.valor}</p>
            <p style={{ margin: "5px 0 0", fontSize: 12, color: TEXT_SUB }}>{c.pie}</p>
          </button>
        ))}
      </div>

      {stats.tareasAtrasadas > 0 && (
        <Card onClick={() => setTab("tareas")} style={{ background: RED + "11", border: `1px solid ${RED}44`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: RED }}>⚠️ {stats.tareasAtrasadas} tarea{stats.tareasAtrasadas > 1 ? "s" : ""} atrasada{stats.tareasAtrasadas > 1 ? "s" : ""}</span>
          <span style={{ color: RED, fontWeight: 900 }}>›</span>
        </Card>
      )}

      {[[stats.inspeccionesPorResolver, "inspección por resolver", "inspecciones por resolver", ORANGE],
        [stats.mantenimientosVencidos, "mantenimiento vencido", "mantenimientos vencidos", RED]]
        .filter(([n]) => n > 0).map(([n, uno, varios, color]) => (
          <Card key={uno} onClick={() => setTab("operaciones")} style={{ background: color + "11", border: `1px solid ${color}44`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color }}>🏗️ {n} {n > 1 ? varios : uno}</span>
            <span style={{ color, fontWeight: 900 }}>›</span>
          </Card>
        ))}

      {stats.repuestosStockBajo > 0 && (
        <Card onClick={onStockBajo || (() => setTab("inventario"))} style={{ background: ORANGE + "11", border: `1px solid ${ORANGE}44`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: ORANGE }}>📦 {stats.repuestosStockBajo} repuesto{stats.repuestosStockBajo > 1 ? "s" : ""} con stock bajo</span>
          <span style={{ color: ORANGE, fontWeight: 900 }}>›</span>
        </Card>
      )}

      {/* Ventas por día */}
      <Panel style={{ marginTop: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <TituloPanel>Ventas de los últimos 12 meses</TituloPanel>
          <span style={{ fontSize: 12, color: TEXT_SUB }}>
            Total <strong style={{ color: TEXT_MAIN }}>{usd(totalAño)}</strong>
          </span>
        </div>
        {totalAño === 0 ? (
          <Vacio texto="Todavía no hay ventas registradas" />
        ) : (
          <svg viewBox="0 0 600 215" style={{ width: "100%", height: "auto", display: "block", marginTop: 10 }}
            role="img" aria-label={`Ventas mensuales de los últimos doce meses. Total ${usd(totalAño)}.`}>
            {[190, 150, 110, 70, 30].map(y => <line key={y} x1="30" y1={y} x2="585" y2={y} stroke={BORDER} strokeWidth="1" />)}
            {/* El tope del eje no se escribe: en dólares, "$29.890,00" no cabe
                en el margen y sale cortado. La barra más alta ya lleva encima
                su cifra, y esa es la escala. */}
            <text x="24" y="193" textAnchor="end" fontSize="9.5" fill={TEXT_SUB}>0</text>
            {barras.map(b => (
              <g key={b.clave}>
                {b.d && <path d={b.d} fill={ACENTOS.ventas} />}
                {b.total > 0 && b.total === techo && (
                  <text x={b.cx} y={b.textoY} textAnchor="middle" fontSize="10" fontWeight="700" fill={TEXT_MAIN}>{usd(b.total)}</text>
                )}
                <text x={b.cx} y="205" textAnchor="middle" fontSize="9.5" fill={TEXT_SUB}>{b.inicial}</text>
              </g>
            ))}
          </svg>
        )}
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {/* Lo que más se vende */}
        <Panel>
          <TituloPanel pie="Artículos vendidos en los últimos 12 meses">Lo que más se vende</TituloPanel>
          {!top.length ? <Vacio texto="Sin ventas registradas" /> : top.map(([nombre, n]) => (
            <div key={nombre} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: TEXT_MAIN }}>{nombre}</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: TEXT_SUB }}>{n}</span>
              </div>
              <div style={{ height: 8, background: BG_APP, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(n / topeTop) * 100}%`, background: ACENTOS.ventas, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </Panel>

        {/* Cuánto está cobrado */}
        <Panel>
          <TituloPanel pie="De lo vendido en los últimos 12 meses">Cuánto está cobrado</TituloPanel>
          {!enVentana.length ? <Vacio texto="Sin ventas registradas" /> : (
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <svg viewBox="0 0 120 120" style={{ width: 118, height: 118, flex: "none" }}
                role="img" aria-label={`${porcentaje} por ciento cobrado, ${100 - porcentaje} por ciento pendiente de cobro.`}>
                <circle cx="60" cy="60" r="44" fill="none" stroke={ORANGE} strokeWidth="18" />
                <circle cx="60" cy="60" r="44" fill="none" stroke={GREEN} strokeWidth="18"
                  strokeDasharray={`${(porcentaje / 100) * VUELTA} ${VUELTA}`} transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="35" fill={BG_CARD} />
                <text x="60" y="57" textAnchor="middle" fontSize="21" fontWeight="800" fill={TEXT_MAIN}>{enVentana.length}</text>
                <text x="60" y="71" textAnchor="middle" fontSize="9.5" fill={TEXT_SUB}>ventas</text>
              </svg>
              <div style={{ flex: 1, minWidth: 140 }}>
                {[["Cobrado", GREEN, porcentaje, cobrado], ["Por cobrar", ORANGE, 100 - porcentaje, facturado - cobrado]].map(([txt, color, pct, importe]) => (
                  <div key={txt} style={{ marginBottom: 11 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 11, height: 11, borderRadius: 3, background: color, flex: "none" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_MAIN, flex: 1 }}>{txt}</span>
                      <strong style={{ fontSize: 15, color: TEXT_MAIN }}>{pct} %</strong>
                    </div>
                    <p style={{ margin: "2px 0 0 20px", fontSize: 12, color: TEXT_SUB }}>{usd(importe)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Lo siguiente */}
      <Panel style={{ marginTop: 14, marginBottom: 10 }}>
        <TituloPanel pie={proximas.length ? `${proximas.length} visita${proximas.length === 1 ? "" : "s"} por delante` : null}>Lo siguiente</TituloPanel>
        {!proximas.length ? <Vacio texto="No hay visitas programadas" /> : proximas.slice(0, 5).map(t => {
          const color = ACENTOS.tareas;
          return (
            <button key={t.id} onClick={() => setTab("tareas")}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderTop: `1px solid ${BG_APP}`, background: "none", border: "none", cursor: "pointer", textAlign: "left", font: "inherit" }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: color + "1a", display: "grid", placeItems: "center", flex: "none", fontSize: 16 }}>📅</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: TEXT_MAIN }}>
                  {t.tipo === "Interna" ? (t.descripcion || "Tarea interna") : nombreCliente(t.clienteId)}
                </span>
                <span style={{ display: "block", fontSize: 12, color: TEXT_SUB }}>
                  {t.hora ? `${t.hora} · ` : ""}{quienVa(t)}
                </span>
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: t.fecha === hoyISO ? color : TEXT_SUB, whiteSpace: "nowrap" }}>
                {t.fecha === hoyISO ? "Hoy" : fechaCorta(t.fecha)}
              </span>
            </button>
          );
        })}
      </Panel>
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  // La pestaña se recuerda mientras la sesión siga abierta: si cierran y
  // reabren la app SIN salir, vuelven donde estaban. Al cerrar sesión se
  // olvida (ver `salir`), de modo que al volver a entrar se empieza en el
  // Panel del mes.
  const [tab, setTab]                   = useState(() => {
    try { return localStorage.getItem("vf_tab") || "inicio"; } catch { return "inicio"; }
  });
  useEffect(() => { try { localStorage.setItem("vf_tab", tab); } catch { /* modo privado */ } }, [tab]);
  // El menú vive fijo a la izquierda si la pantalla da de sí; si no, es un
  // cajón y `menuAbierto` dice si está fuera.
  const menuFijo = usePantallaAncha();
  const [menuAbierto, setMenuAbierto]   = useState(false);
  // Cada lista es un documento por registro en Firestore (ver datos.js). El
  // arranque siempre es local, así que la app abre y funciona sin red.
  // Las reglas le niegan a un técnico las colecciones de dinero. Si la app se
  // suscribiera igualmente, solo conseguiría errores: no se conecta siquiera.
  const { cargando: cargandoSesion, sesion, sinAcceso } = useSesion();
  const conectado = !!sesion;
  const esOficina = sesion?.rol === "admin";

  const [clientes, setClientes]         = useColeccion("clientes", [], conectado);
  const [cotizaciones, setCotizaciones] = useColeccion("cotizaciones", [], esOficina);
  const [ventas, setVentas]             = useColeccion("ventas", [], esOficina);
  // El técnico pide solo las publicadas. No es cosmético: las reglas le niegan
  // el resto, y pedir la colección entera haría que se denegara toda la
  // consulta, dejándole sin ninguna tarea.
  const [tareas, setTareas, tareasListas] = useColeccion("tareas", [], conectado,
                                            esOficina ? null : ["publicada", true]);
  const [inventario, setInventario]     = useColeccion("inventario", [], conectado);
  const [repuestos, setRepuestos]       = useColeccion("repuestos", [], conectado);
  const [garantias, setGarantias]       = useColeccion("garantias", [], conectado);
  const [movimientos, setMovimientos]   = useColeccion("movimientos", [], esOficina);
  const [kit, setKit]                   = useColeccion("kit", [], conectado);
  const [tecnicos, setTecnicos]         = useColeccion("tecnicos", [], conectado);
  // Membrete del presupuesto: una sola ficha, pero se sincroniza igual que el
  // resto para que ambos dispositivos emitan con los mismos datos.
  const [empresaLista, setEmpresaLista] = useColeccion("empresa", [EMPRESA_POR_DEFECTO], esOficina);
  const [proyectos, setProyectos, proyectosListos] = useColeccion("proyectos", [], esOficina);
  // Cotización que hay que abrir ya rellenada al llegar desde una inspección.
  const [cotizacionInicial, setCotizacionInicial] = useState(null);
  const empresa = empresaLista[0] || EMPRESA_POR_DEFECTO;
  // Aviso de stock bajo: umbral configurable en Admin (por defecto, 1 o menos).
  const umbralStock = Math.max(0, Number(empresa.stockMinimo ?? 1));
  const [verBajos, setVerBajos] = useState(false);   // señal para abrir el inventario en los repuestos con poco stock

  // Entrada única para crear. En vez de un botón «+» distinto en cada módulo,
  // un solo «+ Nuevo» pregunta qué se va a registrar y abre el MISMO formulario
  // de siempre (no cambia nada de cómo se crea cada cosa, solo la puerta).
  const [nuevoMenu, setNuevoMenu] = useState(false);
  const [abrirNuevo, setAbrirNuevo] = useState(null);   // null | "venta" | "proyecto" | "mantenimiento"
  const pedirNuevo = tipo => {
    setNuevoMenu(false);
    setTab(tipo === "venta" ? "ventas" : "operaciones");
    setAbrirNuevo(tipo);
  };


  const hayVersionNueva = useNuevaVersion();



  // Lo que la tarea hereda del presupuesto. Se calcula aparte porque se usa al
  // aprobar y también cada vez que la cotización se modifica después.
  const alcanceDeCotizacion = q => ({
    // El equipo es la primera línea que corresponda a algo del inventario; si
    // no hay ninguna, la primera línea del presupuesto.
    modelo: (q.items.find(i => inventario.some(m => m.nombre === i.nombre)) || q.items[0])?.nombre || "",
    descripcion: q.items.map(i => `• ${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${i.nombre}${i.detalle ? ` (${i.detalle})` : ""}`).join("\n"),
    costo: q.total,
  });

  // Crea un proyecto y su tarea de instalación, sin publicar. Es la puerta
  // común de las tres formas de empezar un trabajo: una cotización aprobada,
  // una inspección que se concretó o un proyecto creado directamente.
  // Registra una venta y descuenta su material del inventario en el acto. Es la
  // ÚNICA puerta por la que el stock baja: la usan la venta directa, la
  // cotización aprobada y el proyecto directo. Si algo queda en negativo, avisa
  // sin bloquear.
  // Deja constancia en el historial de inventario de cada movimiento, con su
  // fecha y desde dónde. Así se sigue qué material entró o salió y por qué.
  const anotarMov = (material, tipo, origen) => {
    if (!material?.length) return;
    setMovimientos(p => [...p, ...material.map(m => ({
      id: uid(), fecha: hoy(), tipo, clase: m.clase, articuloId: m.id, articuloNombre: m.nombre,
      cantidad: Math.abs(m.cantidad || 0), origen, creadoEn: new Date().toISOString(),
    }))]);
  };

  const registrarVenta = ({ clienteId, items = [], total, formaPago = "Por definir", origen = "Directa", proyectoId = null, cotizacionId = null, mantenimientoId = null, estado = "Pendiente cobro", nota = "" }) => {
    const consumo = materialDeItems(items);
    if (consumo.length) {
      const r = moverStock(inventario, repuestos, consumo, -1);
      setInventario(r.inventario);
      setRepuestos(r.repuestos);
      if (r.faltantes.length) setTimeout(() => alert(avisoFaltantes(r.faltantes)), 50);
    }
    const suma = total ?? items.reduce((sum, i) => sum + (Number(i.subtotal) || (Number(i.cantidad) || 0) * (Number(i.precio) || 0)), 0);
    // Correlativo único: si la venta nace de una cotización, hereda su número;
    // si es directa (o de un proyecto/mantenimiento directo), toma el siguiente
    // libre del mismo hilo compartido con las cotizaciones.
    const numero = (cotizacionId && cotizaciones.find(c => c.id === cotizacionId)?.numero)
      || numeroPara([...cotizaciones, ...ventas], hoy());
    const venta = { id: uid(), fecha: hoy(), numero, clienteId, items, total: suma, formaPago, estado, origen, proyectoId, cotizacionId, mantenimientoId, nota, consumoStock: consumo, creadaEn: new Date().toISOString() };
    setVentas(p => [...p, venta]);
    anotarMov(consumo, "salida", origen);
    return venta;
  };

  // Eliminar una venta le devuelve al inventario su material.
  const eliminarVenta = v => {
    if (!confirm("¿Eliminar esta venta?\n\nSi tenía material, volverá al inventario. No se puede deshacer.")) return;
    if (v.consumoStock?.length && v.estado !== "Cancelada") {
      const r = moverStock(inventario, repuestos, v.consumoStock, +1);
      setInventario(r.inventario);
      setRepuestos(r.repuestos);
      anotarMov(v.consumoStock, "entrada", "Devolución: venta eliminada");
    }
    setVentas(p => p.filter(x => x.id !== v.id));
    setGarantias(p => p.filter(g => g.ventaId !== v.id));
  };

  // Editar una venta (p. ej. un precio mal puesto). Ajusta el inventario por la
  // diferencia: devuelve lo que descontaba antes y descuenta lo nuevo.
  const editarVenta = (ventaId, cambios) => {
    const vieja = ventas.find(v => v.id === ventaId);
    if (!vieja) return;
    const nuevoConsumo = materialDeItems(cambios.items);
    let inv = inventario, rep = repuestos;
    if (vieja.estado !== "Cancelada" && vieja.consumoStock?.length) {
      const back = moverStock(inv, rep, vieja.consumoStock, +1); inv = back.inventario; rep = back.repuestos;
    }
    const fwd = moverStock(inv, rep, nuevoConsumo, -1);
    setInventario(fwd.inventario);
    setRepuestos(fwd.repuestos);
    if (fwd.faltantes.length) setTimeout(() => alert(avisoFaltantes(fwd.faltantes)), 50);
    const total = cambios.items.reduce((s, i) => s + (Number(i.subtotal) || (Number(i.cantidad) || 0) * (Number(i.precio) || 0)), 0);
    setVentas(p => p.map(v => v.id === ventaId ? { ...v, clienteId: cambios.clienteId, items: cambios.items, formaPago: cambios.formaPago, nota: cambios.nota ?? v.nota ?? "", total, consumoStock: nuevoConsumo } : v));
    // Anotar en el historial la diferencia de material por la edición.
    const vMap = new Map((vieja.consumoStock || []).map(m => [m.clase + ":" + m.id, m]));
    const nMap = new Map(nuevoConsumo.map(m => [m.clase + ":" + m.id, m]));
    const movs = [];
    for (const k of new Set([...vMap.keys(), ...nMap.keys()])) {
      const o = vMap.get(k), n = nMap.get(k);
      const delta = (n?.cantidad || 0) - (o?.cantidad || 0);
      if (!delta) continue;
      const base = n || o;
      movs.push({ id: uid(), fecha: hoy(), tipo: delta > 0 ? "salida" : "entrada", clase: base.clase, articuloId: base.id, articuloNombre: base.nombre, cantidad: Math.abs(delta), origen: "Venta editada", creadoEn: new Date().toISOString() });
    }
    if (movs.length) setMovimientos(p => [...p, ...movs]);
  };

  // Crea un proyecto y su tarea de instalación, sin publicar y SIN tocar el
  // stock: quien descuenta es la venta. Base común de una cotización aprobada,
  // una inspección concretada o un proyecto directo.
  const crearProyecto = (datos, tarea = {}) => {
    const { consumo, ventaItems, precioVenta, ...limpio } = datos;
    const proyecto = registrar(proyectoVacio(limpio), `Creado (${datos.origen || "Directo"})`, "Oficina");
    setProyectos(p => [...p, proyecto]);
    setTareas(p => [...p, registrar(tareaDeProyecto(proyecto, {
      tipo: "Instalación",
      fecha: proyecto.fechaInicio,
      descripcion: proyecto.descripcion,
      ...tarea,
    }), `Creada con el proyecto «${proyecto.nombre}»`, "Oficina")]);
    return proyecto;
  };

  // Proyecto creado directamente en la oficina: además del proyecto y su tarea,
  // genera su venta (el equipo como artículo, si es una planta del inventario)
  // y descuenta el stock.
  const crearProyectoDirecto = (datos, tarea = {}) => {
    const proyecto = crearProyecto(datos, tarea);
    let items = datos.ventaItems && datos.ventaItems.length ? datos.ventaItems : [];
    if (!items.length && datos.equipo) {
      const precio = Number(datos.precioVenta) || 0;
      const planta = inventario.find(m => m.nombre === datos.equipo);
      items = [{ id: uid(), modeloId: planta?.id, nombre: datos.equipo, cantidad: 1, precio, subtotal: precio }];
    }
    const total = items.reduce((s, i) => s + (Number(i.subtotal) || (Number(i.cantidad) || 0) * (Number(i.precio) || 0)), 0);
    registrarVenta({ clienteId: datos.clienteId, items, total, origen: `Proyecto: ${proyecto.nombre}`, proyectoId: proyecto.id, nota: datos.nota || "" });
    return proyecto;
  };

  // Aprobar una cotización abre su proyecto con la tarea de instalación, que
  // nace sin publicar: la oficina la agenda y decide cuándo la ve el técnico.
  const aprobarCotizacion = q => {
    setCotizaciones(p => p.map(x => x.id === q.id ? { ...x, estado: "Aprobada" } : x));
    const alcance = alcanceDeCotizacion(q);
    // Un mantenimiento cotizado no abre proyecto: crea directamente su tarea de
    // Mantenimiento (aparece en Tareas y en el módulo Mantenimientos) y su venta.
    if (q.tipoTrabajo === "Mantenimiento") {
      const cliente = clientes.find(c => c.id === q.clienteId);
      const tarea = registrar({
        ...tareaVacia(q.clienteId),
        tipo: "Mantenimiento",
        modelo: alcance.modelo,
        direccion: cliente?.direccion || "",
        descripcion: alcance.descripcion,
        costo: alcance.costo,
        cotizacionId: q.id,
      }, `Creada al aprobar la cotización Nº ${q.numero}`, "Oficina");
      setTareas(p => [...p, tarea]);
      registrarVenta({ clienteId: q.clienteId, items: q.items, total: q.total, origen: `Cotización Nº ${q.numero} (mantenimiento)`, cotizacionId: q.id });
      setTab("tareas");
      return;
    }
    const proyecto = crearProyecto({
      nombre: `Instalación ${alcance.modelo || "cotización " + q.numero}`,
      clienteId: q.clienteId,
      direccion: clientes.find(c => c.id === q.clienteId)?.direccion || "",
      equipo: alcance.modelo,
      descripcion: alcance.descripcion,
      origen: `Cotización Nº ${q.numero}`,
      cotizacionId: q.id,
      inspeccionId: q.inspeccionId || null,
    }, { duracionDias: 2, cotizacionId: q.id, costo: alcance.costo });
    // La cotización aprobada es ya una venta: descuenta su material.
    registrarVenta({ clienteId: q.clienteId, items: q.items, total: q.total, origen: `Cotización Nº ${q.numero}`, proyectoId: proyecto.id, cotizacionId: q.id });
    setTab("tareas");
  };

  // Cancelar un proyecto le devuelve al inventario el material que había
  // salido y da por cerradas sus tareas pendientes. Es la vuelta atrás de una
  // venta que al final no fue.
  const cancelarProyecto = proyecto => {
    if (!confirm(`¿Cancelar la instalación «${proyecto.nombre}»?\n\nSu venta se anula, el material vuelve al inventario y sus visitas pendientes se cancelan.`)) return;
    const venta = ventas.find(v => v.proyectoId === proyecto.id && v.estado !== "Cancelada");
    if (venta?.consumoStock?.length) {
      const r = moverStock(inventario, repuestos, venta.consumoStock, +1);
      setInventario(r.inventario);
      setRepuestos(r.repuestos);
      anotarMov(venta.consumoStock, "entrada", "Devolución: proyecto cancelado");
    }
    if (venta) setVentas(p => p.map(v => v.id === venta.id ? { ...v, estado: "Cancelada" } : v));
    setProyectos(p => p.map(x => x.id === proyecto.id
      ? registrar({ ...x, estado: "Cancelado", autoCierre: false }, "Proyecto cancelado · venta anulada y material devuelto", "Oficina")
      : x));
    setTareas(p => p.map(t => (t.proyectoId === proyecto.id && (t.estado === "Programada" || t.estado === "En proceso"))
      ? registrar({ ...t, estado: "Cancelada" }, "Cancelada al cancelar el proyecto", "Oficina")
      : t));
  };

  // Borrado completo de un proyecto creado por error: devuelve el material,
  // borra su venta, sus garantías y sus tareas, y quita el proyecto.
  // La oficina registra el material de un mantenimiento: ajusta el stock por la
  // diferencia respecto a lo que ya tenía anotado y lo deja en el historial.
  // Un mantenimiento creado directamente (fuera de cotización) genera su venta,
  // con sus artículos y servicios, y descuenta el inventario. Igual que un
  // proyecto directo.
  const registrarVentaDeMantenimiento = tarea => {
    const items = tarea.items || [];
    const total = items.reduce((s, i) => s + (Number(i.subtotal) || (Number(i.cantidad) || 0) * (Number(i.precio) || 0)), 0);
    const cliente = clientes.find(c => c.id === tarea.clienteId);
    registrarVenta({ clienteId: tarea.clienteId, items, total, origen: `Mantenimiento${cliente ? " · " + cliente.nombre : ""}`, mantenimientoId: tarea.id, nota: tarea.notaVenta || "" });
  };

  // Qué pasa con el dinero al cerrar una tarea. Devuelve { ok }:
  //  • Si la tarea YA tiene su venta (de una cotización, un proyecto o un
  //    mantenimiento con artículos): NO se crea otra (así no se duplica). Se
  //    puede cerrar aunque la venta aún no esté cobrada.
  //  • Si la tarea NO tiene venta y se puso un costo final (p. ej. un
  //    mantenimiento directo): esa es su única venta y se crea al cerrar.
  const alCerrarTarea = (tarea, cierre) => {
    const ligada = ventas.some(v => v.estado !== "Cancelada" && (
      v.mantenimientoId === tarea.id ||
      (tarea.ventaId && v.id === tarea.ventaId) ||
      (tarea.proyectoId && v.proyectoId === tarea.proyectoId) ||
      (tarea.cotizacionId && v.cotizacionId === tarea.cotizacionId)
    ));
    if (ligada) return { ok: true };   // ya tiene venta: se cierra sin crear otra
    // Sin venta ligada: si hay costo final, esa es su única venta.
    const costo = Number(cierre?.costoFinal) || 0;
    if (costo > 0 && !tarea.proyectoId) {
      const cliente = clientes.find(c => c.id === tarea.clienteId);
      registrarVenta({
        clienteId: tarea.clienteId,
        items: [],
        total: costo,
        origen: `${tarea.tipo || "Servicio"}${cliente ? " · " + cliente.nombre : ""}`,
        mantenimientoId: tarea.id,
        nota: cierre.trabajoRealizado || "",
      });
    }
    return { ok: true };
  };

  const guardarMaterialMantenimiento = (tarea, materiales) => {
    const nuevos = materiales.map(m => ({ ...m, cantidad: Number(m.cantidad) || 0 })).filter(m => m.cantidad > 0);
    const viejos = tarea.materiales || [];
    let inv = inventario, rep = repuestos;
    if (viejos.length) { const back = moverStock(inv, rep, viejos, +1); inv = back.inventario; rep = back.repuestos; }
    const fwd = moverStock(inv, rep, nuevos, -1);
    setInventario(fwd.inventario);
    setRepuestos(fwd.repuestos);
    if (fwd.faltantes.length) setTimeout(() => alert(avisoFaltantes(fwd.faltantes)), 50);
    const vMap = new Map(viejos.map(m => [m.clase + ":" + m.id, m]));
    const nMap = new Map(nuevos.map(m => [m.clase + ":" + m.id, m]));
    const cli = clientes.find(c => c.id === tarea.clienteId)?.nombre || "";
    const origen = `Mantenimiento${cli ? " · " + cli : ""}`;
    const movs = [];
    for (const k of new Set([...vMap.keys(), ...nMap.keys()])) {
      const o = vMap.get(k), n = nMap.get(k);
      const delta = (n?.cantidad || 0) - (o?.cantidad || 0);
      if (!delta) continue;
      const base = n || o;
      movs.push({ id: uid(), fecha: hoy(), tipo: delta > 0 ? "salida" : "entrada", clase: base.clase, articuloId: base.id, articuloNombre: base.nombre, cantidad: Math.abs(delta), origen, creadoEn: new Date().toISOString() });
    }
    if (movs.length) setMovimientos(p => [...p, ...movs]);
    setTareas(p => p.map(t => t.id === tarea.id ? registrar({ ...t, materiales: nuevos }, "Material del mantenimiento actualizado", "Oficina") : t));
  };

  const eliminarProyecto = proyecto => {
    if (!confirm(`¿Eliminar la instalación «${proyecto.nombre}»?\n\nSe borran también su venta y sus tareas, y el material vuelve al inventario. No se puede deshacer.`)) return;
    const venta = ventas.find(v => v.proyectoId === proyecto.id && v.estado !== "Cancelada");
    if (venta?.consumoStock?.length) {
      const r = moverStock(inventario, repuestos, venta.consumoStock, +1);
      setInventario(r.inventario);
      setRepuestos(r.repuestos);
      anotarMov(venta.consumoStock, "entrada", "Devolución: proyecto eliminado");
    }
    setVentas(p => p.filter(v => v.proyectoId !== proyecto.id));
    setGarantias(p => p.filter(g => g.proyectoId !== proyecto.id));
    setTareas(p => p.filter(t => t.proyectoId !== proyecto.id));
    setProyectos(p => p.filter(x => x.id !== proyecto.id));
  };

  // Cerrar el círculo de una inspección ya realizada: o se convierte en
  // trabajo, o queda escrito que no se concretó y por qué.
  // Descuenta del KIT (no del inventario) el material que se listó en la
  // inspección, y lo deja en el historial del kit con fecha y usuario.
  const descontarKitDeInspeccion = (insp, destino) => {
    const mats = insp.materialKit || [];
    if (!mats.length) return;
    const cli = clientes.find(c => c.id === insp.clienteId)?.nombre || "";
    const quien = sesion?.nombre || "Oficina";
    setKit(prev => prev.map(k => { const m = mats.find(x => x.id === k.id); return m ? { ...k, cantidad: (Number(k.cantidad) || 0) - (Number(m.cantidad) || 0) } : k; }));
    setMovimientos(p => [...p, ...mats.map(m => ({ id: uid(), fecha: hoy(), tipo: "salida", clase: "repuesto", articuloId: m.id, articuloNombre: m.nombre, cantidad: Number(m.cantidad) || 0, origen: `Inspección → ${destino}${cli ? " · " + cli : ""}`, ubicacion: "kit", quien, creadoEn: new Date().toISOString() }))]);
  };

  const resolverInspeccion = (insp, resultado) => {
    const marcar = (campos, accion) => setTareas(p => p.map(t => t.id === insp.id ? registrar({ ...t, ...campos }, accion, sesion?.nombre || "Oficina") : t));
    const cliente = clientes.find(c => c.id === insp.clienteId);

    if (resultado === "no") {
      const motivo = window.prompt("¿Por qué no se concretó? (opcional)");
      if (motivo === null) return;
      marcar({ resultado: "No concretada", motivoNoConcretada: motivo.trim() }, "Resultado: no se concretó");
      return;
    }
    if (resultado === "cotizacion") {
      // La cotización no descuenta el kit: no se aprobó, no se usó nada.
      marcar({ resultado: "Cotización" }, "Resultado: se hace cotización");
      setCotizacionInicial({ clienteId: insp.clienteId, inspeccionId: insp.id });
      setTab("cotizaciones");
      return;
    }
    if (resultado === "mantenimiento") {
      const tarea = registrar({
        ...tareaVacia(insp.clienteId),
        tipo: "Mantenimiento",
        modelo: insp.modelo || "",
        direccion: insp.direccion || cliente?.direccion || "",
        descripcion: insp.descripcion || "",
        inspeccionId: insp.id,
        materialKit: insp.materialKit || [],
      }, "Creado desde una inspección", "Oficina");
      setTareas(p => [...p, tarea]);
      descontarKitDeInspeccion(insp, "Mantenimiento");
      marcar({ resultado: "Mantenimiento", mantenimientoIdGenerado: tarea.id }, "Resultado: mantenimiento");
      setTab("operaciones");
      return;
    }
    const proyecto = crearProyecto({
      nombre: insp.modelo ? `Instalación ${insp.modelo}` : `Instalación ${cliente?.nombre || ""}`.trim(),
      clienteId: insp.clienteId,
      direccion: insp.direccion || cliente?.direccion || "",
      equipo: insp.modelo || "",
      descripcion: insp.descripcion || "",
      origen: "Inspección",
      inspeccionId: insp.id,
      materialKitUsado: insp.materialKit || [],
    });
    descontarKitDeInspeccion(insp, "Instalación");
    marcar({ resultado: "Instalación", proyectoIdGenerado: proyecto.id }, `Resultado: instalación «${proyecto.nombre}»`);
    setTab("operaciones");
  };

  // Automatismos: cerrar los proyectos cuyo trabajo ha terminado y programar
  // su siguiente mantenimiento. Solo en la oficina —las reglas no dejan a un
  // técnico crear tareas ni tocar proyectos— y solo cuando las dos listas ya
  // han llegado de la nube: decidir con la copia local, que puede estar
  // anticuada, podría pisar un mantenimiento que ya existe.
  useEffect(() => {
    if (!esOficina || !tareasListas || !proyectosListos) return;
    const plan = planAutomatico(proyectos, tareas);
    if (plan.proyectos.length) {
      const porId = new Map(plan.proyectos.map(p => [p.id, p]));
      setProyectos(prev => prev.map(p => porId.get(p.id) || p));
    }
    if (plan.tareasNuevas.length) {
      setTareas(prev => [...prev, ...plan.tareasNuevas.filter(n => !prev.some(t => t.id === n.id))]);
    }
  }, [esOficina, tareasListas, proyectosListos, proyectos, tareas]);

  // Si el cliente cambia de idea y se modifica un presupuesto ya aprobado, todo
  // lo que salió de esa cotización tiene que reflejarlo:
  //  1) La tarea/proyecto: el técnico va a la calle con el nuevo alcance.
  //  2) La venta ya generada: sus artículos y total, y el inventario se ajusta
  //     por la diferencia (si añadió material, ese material sale del stock).
  // Así, añadir material a una cotización aprobada aparece también en Ventas.
  const actualizarTareaDeCotizacion = q => {
    setTareas(p => p.map(t => {
      if (t.cotizacionId !== q.id) return t;
      const alcance = alcanceDeCotizacion(q);
      const sinCambios = t.modelo === alcance.modelo && t.descripcion === alcance.descripcion && t.costo === alcance.costo;
      if (sinCambios) return t;
      return {
        ...t,
        ...alcance,
        historial: [...(t.historial || []), { accion: `Alcance actualizado desde la cotización Nº ${q.numero}`, quien: "Oficina", cuando: new Date().toISOString() }],
      };
    }));
    // La venta de esa cotización (mientras no esté anulada) se pone al día con
    // el nuevo material y total. editarVenta ya devuelve al inventario lo viejo
    // y descuenta lo nuevo, y anota la diferencia en los movimientos.
    const venta = ventas.find(v => v.cotizacionId === q.id && v.estado !== "Cancelada");
    if (venta) {
      const mismos = JSON.stringify(venta.items) === JSON.stringify(q.items);
      if (!mismos) editarVenta(venta.id, { clienteId: venta.clienteId, items: q.items, formaPago: venta.formaPago, nota: venta.nota });
    }
  };

  const restaurarDatos = d => {
    if (Array.isArray(d.clientes))     setClientes(d.clientes);
    if (Array.isArray(d.cotizaciones)) setCotizaciones(d.cotizaciones);
    if (Array.isArray(d.ventas))       setVentas(d.ventas);
    if (Array.isArray(d.tareas))       setTareas(d.tareas);
    if (Array.isArray(d.inventario))   setInventario(d.inventario);
    if (Array.isArray(d.repuestos))    setRepuestos(d.repuestos);
    if (Array.isArray(d.garantias))    setGarantias(d.garantias);
    if (Array.isArray(d.movimientos))  setMovimientos(d.movimientos);
    if (Array.isArray(d.kit))          setKit(d.kit);
    if (Array.isArray(d.tecnicos))     setTecnicos(d.tecnicos);
    if (Array.isArray(d.proyectos))    setProyectos(d.proyectos);
    setTab("inicio");
  };

  const exportarDatos = () => {
    const datos = { clientes, cotizaciones, ventas, tareas, proyectos, inventario, repuestos, garantias, movimientos, kit, tecnicos, exportado: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vicfan-backup-${hoy()}.json`;
    a.click();
  };

  // Mientras Firebase recuerda si ya había sesión, no se enseña nada: si no,
  // parpadearía la pantalla de acceso cada vez que se abre la app.
  if (cargandoSesion) {
    return <div style={{ minHeight: "100vh", background: NAVY, display: "grid", placeItems: "center", color: "#94b4d4", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>Cargando…</div>;
  }
  // Cuenta valida pero sin permiso asignado. Pasa si alguien se registra por su
  // cuenta, o si la oficina le retiro el acceso mientras estaba dentro.
  if (sinAcceso) {
    return (
      <div style={{ minHeight: "100vh", background: NAVY, display: "grid", placeItems: "center", padding: 24, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: 320, textAlign: "center" }}>
          <p style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>Sin acceso</p>
          <p style={{ color: "#94b4d4", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
            Tu cuenta existe, pero la oficina todavía no te ha dado permiso para entrar.
          </p>
          <button onClick={() => cerrarSesion()}
            style={{ background: "#ffffff22", border: "none", borderRadius: 50, color: "#fff", padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  if (!sesion) return <PantallaLogin />;

  const esTecnico = sesion.rol === "tecnico";
  const salir = () => { cerrarSesion().catch(() => {}); try { localStorage.removeItem("vf_tab"); } catch { /* modo privado */ } setTab("inicio"); };

  const abierta = t => t.estado === "Programada" || t.estado === "En proceso";
  // Un técnico solo cuenta lo suyo; la oficina cuenta todo.
  const mias = esTecnico ? tareas.filter(t => t.tecnicoId === sesion.tecnicoId) : tareas;
  const stats = {
    cotizacionesPendientes: cotizaciones.filter(q => q.estado === "Pendiente").length,
    tareasHoy: mias.filter(t => t.fecha === hoy()).length,
    tareasAtrasadas: mias.filter(t => abierta(t) && t.fecha < hoy()).length,
    inspeccionesPorResolver: tareas.filter(t => t.tipo === "Inspección" && t.estado === "Completada" && !t.resultado).length,
    mantenimientosVencidos: tareas.filter(t => t.tipo === "Mantenimiento" && abierta(t) && t.fecha < hoy()).length,
    repuestosStockBajo: esOficina ? repuestos.filter(r => (Number(r.stock) || 0) <= umbralStock).length : 0,
  };

  const irInicio = () => { setTab("inicio"); setMenuAbierto(false); };

  /**
   * Los dos avisos que no se pueden perder de vista: que hay versión nueva y
   * que quedan fotos sin subir. Van arriba del todo, tanto en el móvil (sobre
   * la cabecera) como en el ordenador (sobre el contenido), porque con el menú
   * fijo ya no hay cabecera donde meterlos.
   *
   * Son elementos, no componentes: definir un componente aquí dentro lo vuelve
   * a montar en cada repintado, y el aviso de fotos perdería su cuenta.
   */
  const avisos = (
    <>
      {hayVersionNueva && (
        <button onClick={() => window.location.reload()}
          style={{ width: "100%", background: ORANGE, border: "none", color: "#fff", padding: "11px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          ⬆️ Hay una versión nueva · toca aquí para actualizar
        </button>
      )}
      <AvisoPendientes />
    </>
  );

  const marca = (
    <>
      <h1 style={{ color: "#fff", margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-1px" }}>⚡ VICFAN</h1>
      <p style={{ color: "#94b4d4", margin: 0, fontSize: 11 }}>{esTecnico ? `👷 ${sesion.nombre}` : "Generadores GENERAC"}</p>
    </>
  );

  // En el iPhone, con la app instalada, la página ocupa también la franja de
  // la hora y la batería: la cabecera se baja lo que mida esa franja para que
  // sus botones queden donde se pueden tocar.
  const cabecera = (
    <div style={{ position: "sticky", top: 0, zIndex: 100, background: NAVY, paddingTop: "env(safe-area-inset-top)" }}>
      {avisos}
      <div style={{ background: NAVY, padding: "12px 16px", boxShadow: "0 2px 12px #0003" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: 11 }}>
          {!esTecnico && (
            <button onClick={() => setMenuAbierto(true)} aria-label="Abrir el menú"
              style={{ width: 42, height: 42, borderRadius: 11, border: "1px solid #ffffff2e", background: "#ffffff1a", cursor: "pointer", display: "grid", placeItems: "center", flex: "none", position: "relative" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              {stats.tareasHoy > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 999, background: ACENTOS.tareas, color: "#fff", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center", border: `2px solid ${NAVY}` }}>
                  {stats.tareasHoy}
                </span>
              )}
            </button>
          )}
          <button onClick={() => !esTecnico && irInicio()} style={{ background: "none", border: "none", cursor: esTecnico ? "default" : "pointer", padding: 0, textAlign: "left", flex: 1, minWidth: 0 }}>
            {marca}
          </button>
          {esTecnico && (
            <button onClick={salir} style={{ background: "#ffffff22", border: "none", borderRadius: 10, color: "#fff", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, flex: "none" }}>Salir</button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Vista del técnico: solo su día, sin acceso a ventas ni precios ──────────
  // No lleva menú: solo tiene una pantalla, y una lista de una sección sobra.
  if (esTecnico) {
    return (
      <div style={{ background: BG_APP, minHeight: "100vh", fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: TEXT_MAIN }}>
        {cabecera}
        <div className="main-content" style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 40 }}>
          <AvisoInstalar />
          <ModuloTareas tareas={tareas} setTareas={setTareas} clientes={clientes} setClientes={setClientes} tecnicos={tecnicos} sesion={sesion} kit={kit} />
        </div>
      </div>
    );
  }

  // ── Menú lateral. Fijo si hay sitio; si no, un cajón con velo por delante ───
  const menuLateral = (
    <nav aria-label="Menú principal" aria-hidden={!menuFijo && !menuAbierto}
      style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: ANCHO_MENU, maxWidth: menuFijo ? ANCHO_MENU : "82vw",
        background: BG_CARD, zIndex: menuFijo ? 40 : 80, display: "flex", flexDirection: "column",
        boxShadow: menuFijo ? "none" : "18px 0 50px rgba(13,27,46,.35)",
        borderRight: menuFijo ? `1px solid ${BORDER}` : "none",
        transform: menuFijo || menuAbierto ? "translateX(0)" : "translateX(-105%)",
        transition: "transform .22s ease",
      }}>
      {/* Con el menú fijo, la marca vive aquí arriba: es lo primero que se lee. */}
      {menuFijo ? (
        <button onClick={irInicio}
          style={{ background: NAVY, border: "none", cursor: "pointer", padding: "15px 18px", paddingTop: "calc(15px + env(safe-area-inset-top))", textAlign: "left" }}>
          {marca}
        </button>
      ) : (
        <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: TEXT_SUB, fontWeight: 700 }}>Menú</span>
          <button onClick={() => setMenuAbierto(false)} aria-label="Cerrar el menú"
            style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${BORDER}`, background: BG_APP, cursor: "pointer", display: "grid", placeItems: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_SUB} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {SECCIONES.map(s => {
          const activo = tab === s.id;
          const color = ACENTOS[s.id] || ORANGE;
          return (
            <button key={s.id} onClick={() => { setTab(s.id); setMenuAbierto(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "11px 12px", marginBottom: 1, borderRadius: 11, border: "none", cursor: "pointer",
                background: activo ? color : "transparent",
                color: activo ? "#fff" : TEXT_MAIN, textAlign: "left", fontFamily: "inherit",
              }}>
              <span style={{ fontSize: 17, width: 22, textAlign: "center", flex: "none" }}>{s.icon}</span>
              <span style={{ fontSize: 14, fontWeight: activo ? 700 : 600 }}>{s.label}</span>
              {s.id === "tareas" && stats.tareasHoy > 0 && (
                <span style={{ marginLeft: "auto", background: activo ? "#ffffff2e" : ACENTOS.tareas, color: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 11.5, fontWeight: 800 }}>
                  {stats.tareasHoy}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "12px 18px 16px", borderTop: `1px solid ${BORDER}` }}>
        <p style={{ margin: 0, fontSize: 11.5, color: TEXT_SUB }}>Sesión de</p>
        <p style={{ margin: "1px 0 6px", fontSize: 12.5, fontWeight: 700, color: TEXT_MAIN, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {sesion?.correo || sesion?.nombre || "—"}
        </p>
        <button onClick={salir}
          style={{ width: "100%", background: BG_APP, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT_SUB, padding: "9px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Salir
        </button>
      </div>
    </nav>
  );

  // ── Vista de la oficina ─────────────────────────────────────────────────────
  return (
    <div style={{ background: BG_APP, minHeight: "100vh", fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: TEXT_MAIN }}>
      {/* Cabecera solo en pantalla estrecha: con el menú fijo, la marca vive
          dentro del propio menú y la barra de arriba sobra. */}
      {!menuFijo && cabecera}

      {/* El contenido se aparta del menú fijo, y con él gana ancho: en un
          monitor, 760 px dejaban media pantalla en blanco. */}
      <div style={{ paddingLeft: menuFijo ? ANCHO_MENU : 0 }}>
      {menuFijo && avisos}
      <div className="main-content" style={{ maxWidth: menuFijo ? 1180 : 760, margin: "0 auto" }}>
        {tab === "inicio"       && <><AvisoInstalar /><ModuloBienvenida setTab={setTab} stats={stats} onNuevo={() => setNuevoMenu(true)} onStockBajo={() => { setTab("inventario"); setVerBajos(true); }}
                                       ventas={ventas} tareas={tareas} clientes={clientes} tecnicos={tecnicos} /></>}
        {tab === "tareas"       && <ModuloTareas tareas={tareas} setTareas={setTareas} clientes={clientes} setClientes={setClientes} tecnicos={tecnicos} sesion={sesion} kit={kit} ventas={ventas} onResolverInspeccion={resolverInspeccion} onCerrarTarea={alCerrarTarea} />}
        {tab === "operaciones"  && <ModuloOperaciones proyectos={proyectos} setProyectos={setProyectos} tareas={tareas} setTareas={setTareas}
                                     clientes={clientes} setClientes={setClientes} inventario={inventario} repuestos={repuestos}
                                     garantias={garantias} setGarantias={setGarantias}
                                     crearProyecto={crearProyectoDirecto} onCancelarProyecto={cancelarProyecto} onEliminarProyecto={eliminarProyecto} onGuardarMaterialMantenimiento={guardarMaterialMantenimiento} onVentaMantenimiento={registrarVentaDeMantenimiento} onResolverInspeccion={resolverInspeccion}
                                     abrirNuevo={abrirNuevo} onNuevoListo={() => setAbrirNuevo(null)} />}
        {tab === "clientes"     && <ModuloClientes clientes={clientes} setClientes={setClientes} />}
        {tab === "cotizaciones" && <ModuloCotizaciones cotizaciones={cotizaciones} setCotizaciones={setCotizaciones} ventas={ventas} clientes={clientes} setClientes={setClientes} inventario={inventario} repuestos={repuestos} empresa={empresa} onAprobar={aprobarCotizacion} onEditarAprobada={actualizarTareaDeCotizacion}
                                     inicial={cotizacionInicial} onInicialUsado={() => setCotizacionInicial(null)} />}
        {tab === "ventas"       && <ModuloVentas ventas={ventas} setVentas={setVentas} clientes={clientes} setClientes={setClientes} inventario={inventario} repuestos={repuestos} garantias={garantias} setGarantias={setGarantias} empresa={empresa} onNuevaVenta={d => registrarVenta({ ...d, origen: "Directa" })} onEditarVenta={editarVenta} onEliminarVenta={eliminarVenta} abrirNuevo={abrirNuevo === "venta"} onNuevoListo={() => setAbrirNuevo(null)} />}
        {tab === "inventario"   && <ModuloInventario inventario={inventario} setInventario={setInventario} repuestos={repuestos} setRepuestos={setRepuestos} movimientos={movimientos} setMovimientos={setMovimientos} kit={kit} setKit={setKit} usuario={sesion?.nombre || "Oficina"} umbralStock={umbralStock} verBajos={verBajos} onVerBajosListo={() => setVerBajos(false)} />}
        {tab === "garantias"    && <ModuloGarantias garantias={garantias} clientes={clientes} />}
        {tab === "admin"        && <ModuloAdmin tecnicos={tecnicos} setTecnicos={setTecnicos} exportarDatos={exportarDatos} restaurarDatos={restaurarDatos}
          empresa={empresa} setEmpresa={d => setEmpresaLista([d])} correo={sesion.correo} />}
      </div>
      </div>

      {/* Velo del cajón: tocar fuera lo cierra. */}
      {menuAbierto && !menuFijo && (
        <div onClick={() => setMenuAbierto(false)}
          style={{ position: "fixed", inset: 0, background: "#0d1b2e66", zIndex: 70 }} />
      )}
      {menuLateral}

      {nuevoMenu && <HojaNuevo onElegir={pedirNuevo} onCerrar={() => setNuevoMenu(false)} />}
    </div>
  );
}
