import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

// ── PALETA ────────────────────────────────────────────────────────────────────
const NAVY     = "#0d1b2e";
const ORANGE   = "#f26522";
const GREEN    = "#10b981";
const BG_APP   = "#f0f4f8";
const BG_CARD  = "#ffffff";
const BG_INPUT = "#f8fafc";
const BORDER   = "#e2e8f0";
const TEXT_MAIN= "#1e293b";
const TEXT_SUB = "#64748b";

const ACENTOS = {
  inicio:       NAVY,
  clientes:     "#6366f1",
  cotizaciones: "#f26522",
  ventas:       "#10b981",
  instalaciones:"#0ea5e9",
  inventario:   "#8b5cf6",
  garantias:    "#ec4899",
  servicio:     "#f59e0b",
  admin:        "#64748b",
};

const TABS = [
  { id: "clientes",     icon: "👥", label: "Clientes" },
  { id: "cotizaciones", icon: "📋", label: "Cotizaciones" },
  { id: "ventas",       icon: "💰", label: "Ventas" },
  { id: "instalaciones",icon: "🔧", label: "Instalac." },
  { id: "inventario",   icon: "📦", label: "Inventario" },
  { id: "garantias",    icon: "🛡️", label: "Garantías" },
  { id: "servicio",     icon: "🔩", label: "Servicio" },
  { id: "admin",        icon: "⚙️", label: "Admin" },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().split("T")[0];
const dn = (n) => { const f = new Date(); f.setDate(f.getDate() - n); return f.toISOString().split("T")[0]; };
const usd = (n) => `$${Number(n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const uid = () => Math.random().toString(36).slice(2, 10);
const cargarLS = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };

// ── DATOS DEMO ────────────────────────────────────────────────────────────────
const MODELOS_DEMO = [
  { id: "g1", codigo: "GP3600",   nombre: "GENERAC GP3600",       potencia: "3600W",  combustible: "Gasolina",    precio: 850,  stock: 4 },
  { id: "g2", codigo: "GP5500",   nombre: "GENERAC GP5500",       potencia: "5500W",  combustible: "Gasolina",    precio: 1100, stock: 3 },
  { id: "g3", codigo: "GP8000E",  nombre: "GENERAC GP8000E",      potencia: "8000W",  combustible: "Gasolina",    precio: 1450, stock: 2 },
  { id: "g4", codigo: "XC8000E",  nombre: "GENERAC XC8000E",      potencia: "8000W",  combustible: "Gasolina",    precio: 1800, stock: 2 },
  { id: "g5", codigo: "RG022N",   nombre: "GENERAC Standby 22kW", potencia: "22000W", combustible: "Gas/Propano", precio: 4200, stock: 1 },
];
const REPUESTOS_DEMO = [
  { id: "r1", codigo: "BUJIA-GP",      nombre: "Bujía GENERAC GP",      precio: 8,  stock: 20 },
  { id: "r2", codigo: "FILTRO-ACEITE", nombre: "Filtro de aceite",       precio: 12, stock: 15 },
  { id: "r3", codigo: "FILTRO-AIRE",   nombre: "Filtro de aire",         precio: 18, stock: 10 },
  { id: "r4", codigo: "CARB-GP3600",   nombre: "Carburador GP3600",      precio: 45, stock: 5  },
  { id: "r5", codigo: "BATERIA-12V",   nombre: "Batería 12V arranque",   precio: 65, stock: 8  },
];
const CLIENTES_DEMO = [
  { id: "c1", nombre: "Carlos Mendoza",    telefono: "0412-555-1234", email: "carlos@email.com",       direccion: "Urb. Las Mercedes, Caracas",  tipo: "Residencial", notas: "" },
  { id: "c2", nombre: "Ferretería El Perno", telefono: "0212-555-6789", email: "ferreteria@email.com", direccion: "Av. Principal, Valencia",      tipo: "Comercial",   notas: "Compras frecuentes de repuestos" },
  { id: "c3", nombre: "María Rodríguez",   telefono: "0424-555-4321", email: "",                       direccion: "Res. La Castellana, Caracas",  tipo: "Residencial", notas: "" },
  { id: "c4", nombre: "Clínica San Lucas", telefono: "0261-555-8888", email: "admin@sanLucas.com",     direccion: "Av. Delicias, Maracaibo",      tipo: "Industrial",  notas: "Requiere garantía extendida" },
  { id: "c5", nombre: "Pedro Álvarez",     telefono: "0416-555-9999", email: "",                       direccion: "Urb. El Bosque, Valencia",     tipo: "Residencial", notas: "" },
];
const COTIZACIONES_DEMO = [
  { id: "q1", clienteId: "c1", fecha: dn(5), estado: "Pendiente", items: [{ modeloId: "g2", nombre: "GENERAC GP5500", cantidad: 1, precio: 1100, subtotal: 1100 }], instalacion: 150, total: 1250, notas: "Cliente interesado" },
  { id: "q2", clienteId: "c4", fecha: dn(3), estado: "Aprobada",  items: [{ modeloId: "g5", nombre: "GENERAC Standby 22kW", cantidad: 1, precio: 4200, subtotal: 4200 }], instalacion: 800, total: 5000, notas: "Instalación urgente" },
  { id: "q3", clienteId: "c3", fecha: dn(1), estado: "Pendiente", items: [{ modeloId: "g1", nombre: "GENERAC GP3600", cantidad: 1, precio: 850, subtotal: 850 }], instalacion: 120, total: 970, notas: "" },
];
const VENTAS_DEMO = [
  { id: "v1", clienteId: "c2", fecha: dn(10), estado: "Cobrada",         items: [{ nombre: "Bujía GENERAC GP", cantidad: 4, precio: 8, subtotal: 32 }],    total: 32,   formaPago: "Transferencia", notas: "" },
  { id: "v2", clienteId: "c5", fecha: dn(7),  estado: "Cobrada",         items: [{ nombre: "GENERAC GP8000E",  cantidad: 1, precio: 1450, subtotal: 1450 }],total: 1600, formaPago: "Efectivo USD",  notas: "Incluye instalación básica" },
  { id: "v3", clienteId: "c4", fecha: dn(2),  estado: "Pendiente cobro", items: [{ nombre: "GENERAC Standby 22kW", cantidad: 1, precio: 4200, subtotal: 4200 }], total: 5000, formaPago: "Transferencia", notas: "" },
];
const TECNICOS_DEMO = [
  { id: "t1", nombre: "Víctor Suárez",    telefono: "0414-555-1111", especialidad: "Instalación" },
  { id: "t2", nombre: "Francisco Nieves", telefono: "0426-555-2222", especialidad: "Mantenimiento" },
];
const INSTALACIONES_DEMO = [
  { id: "i1", clienteId: "c5", tecnicoId: "t1", fechaProgramada: dn(6), estado: "Completada",  modelo: "GENERAC GP8000E",      direccion: "Urb. El Bosque, Valencia", notas: "Instalación exitosa" },
  { id: "i2", clienteId: "c4", tecnicoId: "t1", fechaProgramada: hoy(), estado: "Programada",  modelo: "GENERAC Standby 22kW", direccion: "Av. Delicias, Maracaibo",  notas: "Requiere revisión eléctrica previa" },
];
const GARANTIAS_DEMO = [
  { id: "ga1", clienteId: "c5", modelo: "GENERAC GP8000E", serial: "SN-2024-001", fechaInstalacion: dn(6), mesesGarantia: 24, notas: "" },
];
const SERVICIOS_DEMO = [
  { id: "s1", clienteId: "c2", tipo: "Mantenimiento", fecha: dn(4), tecnicoId: "t2", modelo: "GENERAC GP5500", descripcion: "Cambio de aceite y filtros", costo: 80, estado: "Completado" },
];

// ── COMPONENTES BASE ──────────────────────────────────────────────────────────
function Badge({ text, color }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{text}</span>;
}
function Btn({ onClick, color = NAVY, children, outline, full, small }) {
  return (
    <button onClick={onClick} style={{ background: outline ? "transparent" : color, border: `1.5px solid ${color}`, color: outline ? color : "#fff", borderRadius: 50, padding: small ? "8px 18px" : "12px 28px", fontWeight: 600, fontSize: small ? 13 : 14, cursor: "pointer", width: full ? "100%" : undefined, fontFamily: "'Inter', 'Helvetica Neue', sans-serif", letterSpacing: "0.01em" }}>{children}</button>
  );
}
function Card({ children, style }) {
  return <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, marginBottom: 10, boxShadow: "0 1px 4px #0001", ...style }}>{children}</div>;
}
function Inp({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: BG_INPUT, border: `1.5px solid ${BORDER}`, borderRadius: 10, color: TEXT_MAIN, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}
function Sel({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: BG_INPUT, border: `1.5px solid ${BORDER}`, borderRadius: 10, color: TEXT_MAIN, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

const ESTADO_COLOR = {
  "Pendiente": "#f59e0b", "Aprobada": GREEN, "Rechazada": "#ef4444",
  "Cobrada": GREEN, "Pendiente cobro": "#f59e0b", "Cancelada": "#ef4444",
  "Programada": "#0ea5e9", "En proceso": ORANGE, "Completada": GREEN, "Completado": GREEN, "Vigente": GREEN, "Vencida": "#ef4444",
};

// ── CLIENTES ──────────────────────────────────────────────────────────────────
function ModuloClientes({ clientes, setClientes }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const ac = ACENTOS.clientes;
  const guardar = () => { if (!form.nombre?.trim()) return; setClientes(p => p.find(x => x.id === form.id) ? p.map(x => x.id === form.id ? form : x) : [...p, form]); setModal(false); };
  const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.telefono.includes(busqueda));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>👥 Clientes</h2>
        <Btn onClick={() => { setForm({ id: uid(), nombre: "", telefono: "", email: "", direccion: "", tipo: "Residencial", notas: "" }); setModal(true); }} color={ac} small>+ Nuevo</Btn>
      </div>
      <Inp placeholder="Buscar..." value={busqueda} onChange={setBusqueda} />
      {filtrados.map(c => (
        <Card key={c.id}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{c.nombre}</p>
              <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>📞 {c.telefono}{c.email ? ` · ✉️ ${c.email}` : ""}</p>
              {c.direccion && <p style={{ margin: "0 0 4px", fontSize: 13, color: TEXT_SUB }}>📍 {c.direccion}</p>}
              <Badge text={c.tipo} color={ac} />
            </div>
            <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
              <Btn onClick={() => { setForm({ ...c }); setModal(true); }} color={ac} outline small>✏️</Btn>
              <Btn onClick={() => setClientes(p => p.filter(x => x.id !== c.id))} color="#ef4444" outline small>🗑️</Btn>
            </div>
          </div>
        </Card>
      ))}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", color: ac }}>Cliente</h3>
            <Inp label="Nombre" value={form.nombre || ""} onChange={v => setForm(p => ({ ...p, nombre: v }))} />
            <Inp label="Teléfono" value={form.telefono || ""} onChange={v => setForm(p => ({ ...p, telefono: v }))} placeholder="0412-555-1234" />
            <Inp label="Email" value={form.email || ""} onChange={v => setForm(p => ({ ...p, email: v }))} type="email" />
            <Inp label="Dirección" value={form.direccion || ""} onChange={v => setForm(p => ({ ...p, direccion: v }))} />
            <Sel label="Tipo" value={form.tipo || "Residencial"} onChange={v => setForm(p => ({ ...p, tipo: v }))} options={["Residencial","Comercial","Industrial"].map(t => ({ value: t, label: t }))} />
            <div style={{ display: "flex", gap: 10 }}><Btn onClick={guardar} color={ac} full>Guardar</Btn><Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── COTIZACIONES ──────────────────────────────────────────────────────────────
const SERVICIOS_CATALOGO = [
  { id: "sv_inst",   nombre: "Instalación eléctrica",           precio: 150, tipo: "fijo" },
  { id: "sv_cerco",  nombre: "Cerco eléctrico",                 precio: 0,   tipo: "metro" },
  { id: "sv_cctv",   nombre: "Circuito cerrado (CCTV)",         precio: 0,   tipo: "libre" },
  { id: "sv_alarma", nombre: "Sistema de alarma",               precio: 0,   tipo: "libre" },
  { id: "sv_seg",    nombre: "Sistema de seguridad residencial", precio: 0,   tipo: "libre" },
  { id: "sv_mant",   nombre: "Mantenimiento preventivo",        precio: 80,  tipo: "fijo" },
  { id: "sv_otro",   nombre: "Otro servicio",                   precio: 0,   tipo: "libre" },
];

function ModuloCotizaciones({ cotizaciones, setCotizaciones, clientes, inventario }) {
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [form, setForm] = useState({});
  const [svTipo, setSvTipo] = useState("");
  const [svMetros, setSvMetros] = useState("");
  const [svCostoM, setSvCostoM] = useState("");
  const [svPrecio, setSvPrecio] = useState("");
  const ac = ACENTOS.cotizaciones;

  const nc = id => clientes.find(c => c.id === id)?.nombre || "—";

  const calcTotal = items => items.reduce((s, i) => s + (i.subtotal || 0), 0);

  const recalc = items => setForm(f => ({ ...f, items, total: calcTotal(items) }));

  const agregarPlanta = modeloId => {
    const m = inventario.find(x => x.id === modeloId); if (!m) return;
    const items = [...(form.items || []), { id: uid(), tipo: "planta", nombre: m.nombre, cantidad: 1, precio: m.precio, subtotal: m.precio }];
    recalc(items);
  };

  const agregarServicio = () => {
    const sv = SERVICIOS_CATALOGO.find(s => s.id === svTipo); if (!sv) return;
    let subtotal = 0, detNombre = sv.nombre, detalle = "";
    if (sv.tipo === "metro") {
      const m = Number(svMetros) || 0;
      const c = Number(svCostoM) || 0;
      subtotal = m * c;
      detalle = `${m} m × $${c}/m`;
    } else {
      subtotal = Number(svPrecio) || sv.precio;
    }
    const items = [...(form.items || []), { id: uid(), tipo: "servicio", nombre: detNombre, detalle, cantidad: 1, precio: subtotal, subtotal }];
    recalc(items);
    setSvTipo(""); setSvMetros(""); setSvCostoM(""); setSvPrecio("");
  };

  const eliminarItem = id => {
    const items = (form.items || []).filter(x => x.id !== id);
    recalc(items);
  };

  const guardar = () => {
    if (!form.clienteId) return;
    setCotizaciones(p => p.find(x => x.id === form.id) ? p.map(x => x.id === form.id ? form : x) : [...p, form]);
    setModal(false);
  };

  const svSeleccionado = SERVICIOS_CATALOGO.find(s => s.id === svTipo);
  const esCerco = svSeleccionado?.tipo === "metro";
  const esLibre = svSeleccionado?.tipo === "libre";

  const inputSt = { background: BG_INPUT, border: `1.5px solid ${BORDER}`, borderRadius: 10, color: TEXT_MAIN, padding: "10px 12px", fontSize: 14, boxSizing: "border-box", width: "100%" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>📋 Cotizaciones</h2>
        <Btn onClick={() => {
          setForm({ id: uid(), clienteId: clientes[0]?.id || "", fecha: hoy(), estado: "Pendiente", items: [], total: 0, notas: "" });
          setSvTipo(""); setSvMetros(""); setSvCostoM(""); setSvPrecio("");
          setModal(true);
        }} color={ac} small>+ Nueva</Btn>
      </div>

      {cotizaciones.map(q => (
        <Card key={q.id} style={{ cursor: "pointer" }}>
          <div onClick={() => setDetalle(q)} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{nc(q.clienteId)}</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>📅 {q.fecha} · {q.items.length} ítem(s)</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 16, color: ac }}>{usd(q.total)}</p>
              <Badge text={q.estado} color={ESTADO_COLOR[q.estado] || "#888"} />
            </div>
          </div>
          {q.estado === "Pendiente" && (
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setCotizaciones(p => p.map(x => x.id === q.id ? { ...x, estado: "Aprobada" } : x))} color={GREEN} small full>✓ Aprobar</Btn>
              <Btn onClick={() => setCotizaciones(p => p.map(x => x.id === q.id ? { ...x, estado: "Rechazada" } : x))} color="#ef4444" outline small full>✗ Rechazar</Btn>
            </div>
          )}
        </Card>
      ))}

      {detalle && (
        <div className="modal-overlay" onClick={() => setDetalle(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", color: ac }}>{nc(detalle.clienteId)}</h3>
            <p style={{ margin: "0 0 16px", color: TEXT_SUB, fontSize: 13 }}>{detalle.fecha}</p>
            {detalle.items.map((it, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{it.nombre}</span>
                  <span style={{ fontWeight: 700, color: ac }}>{usd(it.subtotal)}</span>
                </div>
                {it.detalle && <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT_SUB }}>{it.detalle}</p>}
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontWeight: 800, fontSize: 16 }}>
              <span>TOTAL</span><span style={{ color: ac }}>{usd(detalle.total)}</span>
            </div>
            {detalle.notas && <p style={{ color: TEXT_SUB, fontSize: 13 }}>📝 {detalle.notas}</p>}
            <Btn onClick={() => setDetalle(null)} color={TEXT_SUB} outline full>Cerrar</Btn>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", color: ac }}>Nueva Cotización</h3>

            <Sel label="Cliente" value={form.clienteId || clientes[0]?.id || ""} onChange={v => setForm(f => ({ ...f, clienteId: v }))} options={clientes.map(c => ({ value: c.id, label: c.nombre }))} />
            <Inp label="Fecha" value={form.fecha || hoy()} onChange={v => setForm(f => ({ ...f, fecha: v }))} type="date" />

            {/* Agregar planta */}
            <label style={{ fontSize: 12, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase", display: "block", marginBottom: 6 }}>⚡ Agregar planta / equipo</label>
            <select onChange={e => { if (e.target.value) { agregarPlanta(e.target.value); e.target.value = ""; } }} value=""
              style={{ ...inputSt, marginBottom: 14 }}>
              <option value="">Selecciona un modelo...</option>
              {inventario.map(m => <option key={m.id} value={m.id}>{m.nombre} — {usd(m.precio)}</option>)}
            </select>

            {/* Agregar servicio */}
            <label style={{ fontSize: 12, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase", display: "block", marginBottom: 6 }}>🔧 Agregar servicio</label>
            <select value={svTipo} onChange={e => { setSvTipo(e.target.value); setSvMetros(""); setSvCostoM(""); setSvPrecio(""); }}
              style={{ ...inputSt, marginBottom: 10 }}>
              <option value="">Selecciona un servicio...</option>
              {SERVICIOS_CATALOGO.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>

            {esCerco && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Metros</label>
                  <input type="number" value={svMetros} onChange={e => setSvMetros(e.target.value)} placeholder="Ej: 100" style={inputSt} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase", display: "block", marginBottom: 4 }}>$/metro</label>
                  <input type="number" value={svCostoM} onChange={e => setSvCostoM(e.target.value)} placeholder="Ej: 8" style={inputSt} />
                </div>
              </div>
            )}
            {(esLibre || (svSeleccionado?.tipo === "fijo")) && svTipo && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Costo ($)</label>
                <input type="number" value={svPrecio} onChange={e => setSvPrecio(e.target.value)} placeholder={svSeleccionado?.precio ? `Sugerido: $${svSeleccionado.precio}` : "0"} style={inputSt} />
              </div>
            )}
            {svTipo && (
              <div style={{ marginBottom: 14 }}>
                <Btn onClick={agregarServicio} color={ac} small>+ Agregar servicio</Btn>
                {esCerco && svMetros && svCostoM && (
                  <span style={{ fontSize: 13, color: TEXT_SUB, marginLeft: 10 }}>
                    Subtotal: {usd(Number(svMetros) * Number(svCostoM))}
                  </span>
                )}
              </div>
            )}

            {/* Lista de ítems */}
            {(form.items || []).length > 0 && (
              <div style={{ background: BG_INPUT, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
                {(form.items || []).map(it => (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{it.nombre}</span>
                      {it.detalle && <p style={{ margin: "1px 0 0", fontSize: 11, color: TEXT_SUB }}>{it.detalle}</p>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 700, color: ac, fontSize: 13 }}>{usd(it.subtotal)}</span>
                      <button onClick={() => eliminarItem(it.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Inp label="Notas" value={form.notas || ""} onChange={v => setForm(f => ({ ...f, notas: v }))} placeholder="Observaciones adicionales..." />

            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18, margin: "8px 0 16px", padding: "10px 0", borderTop: `2px solid ${ac}` }}>
              <span>TOTAL</span><span style={{ color: ac }}>{usd(form.total)}</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={guardar} color={ac} full>Guardar cotización</Btn>
              <Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VENTAS ────────────────────────────────────────────────────────────────────
function ModuloVentas({ ventas, setVentas, clientes }) {
  const ac = ACENTOS.ventas;
  const nc = id => clientes.find(c => c.id === id)?.nombre || "—";
  const totalCobrado = ventas.filter(v => v.estado === "Cobrada").reduce((s, v) => s + (v.total || 0), 0);
  return (
    <div>
      <h2 style={{ color: ac, margin: "0 0 12px", fontSize: 18, fontWeight: 900 }}>💰 Ventas</h2>
      <Card style={{ background: `linear-gradient(135deg, ${ac}22, ${ac}11)`, border: `1px solid ${ac}33` }}>
        <p style={{ margin: 0, color: TEXT_SUB, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Total cobrado</p>
        <p style={{ margin: "4px 0 0", color: ac, fontSize: 28, fontWeight: 900 }}>{usd(totalCobrado)}</p>
      </Card>
      {ventas.map(v => (
        <Card key={v.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{nc(v.clienteId)}</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>📅 {v.fecha} · 💳 {v.formaPago}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 16, color: ac }}>{usd(v.total)}</p>
              <Badge text={v.estado} color={ESTADO_COLOR[v.estado] || "#888"} />
            </div>
          </div>
          {v.estado === "Pendiente cobro" && <Btn onClick={() => setVentas(p => p.map(x => x.id === v.id ? { ...x, estado: "Cobrada" } : x))} color={GREEN} small full>✓ Marcar cobrada</Btn>}
        </Card>
      ))}
    </div>
  );
}

// ── INSTALACIONES ─────────────────────────────────────────────────────────────
function ModuloInstalaciones({ instalaciones, setInstalaciones, clientes, tecnicos }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const ac = ACENTOS.instalaciones;
  const nc = id => clientes.find(c => c.id === id)?.nombre || "—";
  const nt = id => tecnicos.find(t => t.id === id)?.nombre || "—";
  const guardar = () => { setInstalaciones(p => p.find(x => x.id === form.id) ? p.map(x => x.id === form.id ? form : x) : [...p, form]); setModal(false); };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>🔧 Instalaciones</h2>
        <Btn onClick={() => { setForm({ id: uid(), clienteId: clientes[0]?.id || "", tecnicoId: tecnicos[0]?.id || "", fechaProgramada: hoy(), estado: "Programada", modelo: "", direccion: "", notas: "" }); setModal(true); }} color={ac} small>+ Nueva</Btn>
      </div>
      {instalaciones.map(inst => (
        <Card key={inst.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{nc(inst.clienteId)}</p>
              <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>⚡ {inst.modelo}</p>
              <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>👷 {nt(inst.tecnicoId)} · 📅 {inst.fechaProgramada}</p>
              {inst.notas && <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>📝 {inst.notas}</p>}
            </div>
            <Badge text={inst.estado} color={ESTADO_COLOR[inst.estado] || "#888"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {inst.estado === "Programada"  && <Btn onClick={() => setInstalaciones(p => p.map(x => x.id === inst.id ? { ...x, estado: "En proceso" } : x))} color={ORANGE} small full>▶ Iniciar</Btn>}
            {inst.estado === "En proceso"  && <Btn onClick={() => setInstalaciones(p => p.map(x => x.id === inst.id ? { ...x, estado: "Completada" } : x))} color={GREEN} small full>✓ Completar</Btn>}
          </div>
        </Card>
      ))}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", color: ac }}>Nueva Instalación</h3>
            <Sel label="Cliente" value={form.clienteId || ""} onChange={v => setForm(f => ({ ...f, clienteId: v }))} options={clientes.map(c => ({ value: c.id, label: c.nombre }))} />
            <Inp label="Modelo instalado" value={form.modelo || ""} onChange={v => setForm(f => ({ ...f, modelo: v }))} placeholder="GENERAC GP5500" />
            <Inp label="Dirección" value={form.direccion || ""} onChange={v => setForm(f => ({ ...f, direccion: v }))} />
            <Sel label="Técnico" value={form.tecnicoId || ""} onChange={v => setForm(f => ({ ...f, tecnicoId: v }))} options={tecnicos.map(t => ({ value: t.id, label: t.nombre }))} />
            <Inp label="Fecha programada" value={form.fechaProgramada || hoy()} onChange={v => setForm(f => ({ ...f, fechaProgramada: v }))} type="date" />
            <Inp label="Notas" value={form.notas || ""} onChange={v => setForm(f => ({ ...f, notas: v }))} />
            <div style={{ display: "flex", gap: 10 }}><Btn onClick={guardar} color={ac} full>Guardar</Btn><Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── INVENTARIO ────────────────────────────────────────────────────────────────
function ModuloInventario({ inventario, setInventario, repuestos, setRepuestos }) {
  const [sub, setSub] = useState("modelos");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const ac = ACENTOS.inventario;
  const lista = sub === "modelos" ? inventario : repuestos;
  const setLista = sub === "modelos" ? setInventario : setRepuestos;
  const guardar = () => { if (!form.nombre?.trim()) return; setLista(p => p.find(x => x.id === form.id) ? p.map(x => x.id === form.id ? form : x) : [...p, form]); setModal(false); };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>📦 Inventario</h2>
        <Btn onClick={() => { setForm(sub === "modelos" ? { id: uid(), codigo: "", nombre: "", potencia: "", combustible: "Gasolina", precio: 0, stock: 0 } : { id: uid(), codigo: "", nombre: "", precio: 0, stock: 0 }); setModal(true); }} color={ac} small>+ Nuevo</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[{ id: "modelos", label: "⚡ Plantas" }, { id: "repuestos", label: "🔩 Repuestos" }].map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{ padding: "11px", borderRadius: 12, border: `2px solid ${sub === t.id ? ac : BORDER}`, background: sub === t.id ? ac + "22" : BG_CARD, color: sub === t.id ? ac : TEXT_SUB, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t.label}</button>
        ))}
      </div>
      {lista.map(item => (
        <Card key={item.id}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15 }}>{item.nombre}</p>
              {item.potencia && <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>⚡ {item.potencia} · {item.combustible}</p>}
              <p style={{ margin: "0 0 6px", fontSize: 13, color: TEXT_SUB }}>Cód: {item.codigo}</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: ac, fontWeight: 800, fontSize: 16 }}>{usd(item.precio)}</span>
                <Badge text={`Stock: ${item.stock}`} color={item.stock > 0 ? GREEN : "#ef4444"} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn onClick={() => { setForm({ ...item }); setModal(true); }} color={ac} outline small>✏️</Btn>
              <Btn onClick={() => setLista(p => p.filter(x => x.id !== item.id))} color="#ef4444" outline small>🗑️</Btn>
            </div>
          </div>
        </Card>
      ))}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", color: ac }}>{sub === "modelos" ? "Planta / Modelo" : "Repuesto"}</h3>
            <Inp label="Código" value={form.codigo || ""} onChange={v => setForm(f => ({ ...f, codigo: v }))} />
            <Inp label="Nombre" value={form.nombre || ""} onChange={v => setForm(f => ({ ...f, nombre: v }))} />
            {sub === "modelos" && <>
              <Inp label="Potencia" value={form.potencia || ""} onChange={v => setForm(f => ({ ...f, potencia: v }))} placeholder="5500W" />
              <Sel label="Combustible" value={form.combustible || "Gasolina"} onChange={v => setForm(f => ({ ...f, combustible: v }))} options={["Gasolina","Gas/Propano","Diésel","Dual"].map(t => ({ value: t, label: t }))} />
            </>}
            <Inp label="Precio ($)" value={String(form.precio || 0)} onChange={v => setForm(f => ({ ...f, precio: Number(v) }))} type="number" />
            <Inp label="Stock" value={String(form.stock || 0)} onChange={v => setForm(f => ({ ...f, stock: Number(v) }))} type="number" />
            <div style={{ display: "flex", gap: 10 }}><Btn onClick={guardar} color={ac} full>Guardar</Btn><Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GARANTÍAS ─────────────────────────────────────────────────────────────────
function ModuloGarantias({ garantias, clientes }) {
  const ac = ACENTOS.garantias;
  const nc = id => clientes.find(c => c.id === id)?.nombre || "—";
  const diasRestantes = (fechaInst, meses) => {
    const v = new Date(fechaInst); v.setMonth(v.getMonth() + meses);
    return Math.ceil((v - new Date()) / 86400000);
  };
  return (
    <div>
      <h2 style={{ color: ac, margin: "0 0 16px", fontSize: 18, fontWeight: 900 }}>🛡️ Garantías</h2>
      {garantias.length === 0 && <p style={{ color: TEXT_SUB, textAlign: "center", marginTop: 40 }}>Sin garantías registradas</p>}
      {garantias.map(g => {
        const dias = diasRestantes(g.fechaInstalacion, g.mesesGarantia);
        const col = dias > 30 ? GREEN : dias > 0 ? ORANGE : "#ef4444";
        return (
          <Card key={g.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{nc(g.clienteId)}</p>
                <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>⚡ {g.modelo} · 🔢 {g.serial}</p>
                <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>📅 Instalado: {g.fechaInstalacion} · {g.mesesGarantia} meses</p>
              </div>
              <Badge text={dias > 0 ? `${dias} días` : "Vencida"} color={col} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── SERVICIO POST-VENTA ───────────────────────────────────────────────────────
function ModuloServicio({ servicios, setServicios, clientes, tecnicos }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const ac = ACENTOS.servicio;
  const nc = id => clientes.find(c => c.id === id)?.nombre || "—";
  const nt = id => tecnicos.find(t => t.id === id)?.nombre || "—";
  const guardar = () => { setServicios(p => p.find(x => x.id === form.id) ? p.map(x => x.id === form.id ? form : x) : [...p, form]); setModal(false); };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>🔩 Servicio Post-Venta</h2>
        <Btn onClick={() => { setForm({ id: uid(), clienteId: clientes[0]?.id || "", tipo: "Mantenimiento", fecha: hoy(), tecnicoId: tecnicos[0]?.id || "", modelo: "", descripcion: "", costo: 0, estado: "Pendiente" }); setModal(true); }} color={ac} small>+ Nuevo</Btn>
      </div>
      {servicios.map(s => (
        <Card key={s.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{nc(s.clienteId)}</p>
              <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>🔧 {s.tipo} · 📅 {s.fecha} · 👷 {nt(s.tecnicoId)}</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>📝 {s.descripcion}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 800, color: ac }}>{usd(s.costo)}</p>
              <Badge text={s.estado} color={ESTADO_COLOR[s.estado] || "#888"} />
            </div>
          </div>
          {s.estado === "Pendiente" && <Btn onClick={() => setServicios(p => p.map(x => x.id === s.id ? { ...x, estado: "Completado" } : x))} color={GREEN} small full>✓ Completar</Btn>}
        </Card>
      ))}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", color: ac }}>Nuevo Servicio</h3>
            <Sel label="Cliente" value={form.clienteId || ""} onChange={v => setForm(f => ({ ...f, clienteId: v }))} options={clientes.map(c => ({ value: c.id, label: c.nombre }))} />
            <Sel label="Tipo" value={form.tipo || "Mantenimiento"} onChange={v => setForm(f => ({ ...f, tipo: v }))} options={["Mantenimiento","Reparación","Garantía","Inspección"].map(t => ({ value: t, label: t }))} />
            <Inp label="Modelo" value={form.modelo || ""} onChange={v => setForm(f => ({ ...f, modelo: v }))} placeholder="GENERAC GP5500" />
            <Sel label="Técnico" value={form.tecnicoId || ""} onChange={v => setForm(f => ({ ...f, tecnicoId: v }))} options={tecnicos.map(t => ({ value: t.id, label: t.nombre }))} />
            <Inp label="Fecha" value={form.fecha || hoy()} onChange={v => setForm(f => ({ ...f, fecha: v }))} type="date" />
            <Inp label="Descripción" value={form.descripcion || ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))} />
            <Inp label="Costo ($)" value={String(form.costo || 0)} onChange={v => setForm(f => ({ ...f, costo: Number(v) }))} type="number" />
            <div style={{ display: "flex", gap: 10 }}><Btn onClick={guardar} color={ac} full>Guardar</Btn><Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function ModuloAdmin({ tecnicos, setTecnicos, exportarDatos, cargarDemo }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [confirmDemo, setConfirmDemo] = useState(false);
  const ac = ACENTOS.admin;
  const guardar = () => { if (!form.nombre?.trim()) return; setTecnicos(p => p.find(x => x.id === form.id) ? p.map(x => x.id === form.id ? form : x) : [...p, form]); setModal(false); };
  return (
    <div>
      <h2 style={{ color: ac, margin: "0 0 16px", fontSize: 18, fontWeight: 900 }}>⚙️ Administración</h2>
      <button onClick={exportarDatos} style={{ width: "100%", background: NAVY, border: "none", borderRadius: 12, color: "#fff", padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>📤 Exportar Backup</button>
      {!confirmDemo ? (
        <button onClick={() => setConfirmDemo(true)} style={{ width: "100%", background: BG_CARD, border: `1px dashed ${BORDER}`, borderRadius: 12, color: TEXT_SUB, padding: "11px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>🧪 Cargar datos de prueba</button>
      ) : (
        <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#856404" }}>⚠️ Reemplazará todos los datos con datos ficticios.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => { cargarDemo(); setConfirmDemo(false); }} color={ORANGE} full small>Sí, cargar demo</Btn>
            <Btn onClick={() => setConfirmDemo(false)} color={TEXT_SUB} outline full small>Cancelar</Btn>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>👷 Técnicos</h3>
        <Btn onClick={() => { setForm({ id: uid(), nombre: "", telefono: "", especialidad: "Instalación" }); setModal(true); }} color={ac} small>+ Nuevo</Btn>
      </div>
      {tecnicos.map(t => (
        <Card key={t.id}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><p style={{ margin: "0 0 2px", fontWeight: 700 }}>{t.nombre}</p><p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>📞 {t.telefono} · {t.especialidad}</p></div>
            <Btn onClick={() => { setForm({ ...t }); setModal(true); }} color={ac} outline small>✏️</Btn>
          </div>
        </Card>
      ))}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", color: ac }}>Técnico</h3>
            <Inp label="Nombre" value={form.nombre || ""} onChange={v => setForm(f => ({ ...f, nombre: v }))} />
            <Inp label="Teléfono" value={form.telefono || ""} onChange={v => setForm(f => ({ ...f, telefono: v }))} />
            <Sel label="Especialidad" value={form.especialidad || "Instalación"} onChange={v => setForm(f => ({ ...f, especialidad: v }))} options={["Instalación","Mantenimiento","Reparación","Todos"].map(t => ({ value: t, label: t }))} />
            <div style={{ display: "flex", gap: 10 }}><Btn onClick={guardar} color={ac} full>Guardar</Btn><Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full>Cancelar</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BIENVENIDA ────────────────────────────────────────────────────────────────
function ModuloBienvenida({ setTab, stats }) {
  const secciones = [
    { id: "clientes",     icon: "👥", label: "Clientes",      color: ACENTOS.clientes },
    { id: "cotizaciones", icon: "📋", label: "Cotizaciones",  color: ACENTOS.cotizaciones },
    { id: "ventas",       icon: "💰", label: "Ventas",        color: ACENTOS.ventas },
    { id: "instalaciones",icon: "🔧", label: "Instalaciones", color: ACENTOS.instalaciones },
    { id: "inventario",   icon: "📦", label: "Inventario",    color: ACENTOS.inventario },
    { id: "garantias",    icon: "🛡️", label: "Garantías",     color: ACENTOS.garantias },
    { id: "servicio",     icon: "🔩", label: "Servicio",      color: ACENTOS.servicio },
    { id: "admin",        icon: "⚙️", label: "Admin",         color: ACENTOS.admin },
  ];
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: TEXT_MAIN }}>¡Bienvenido!</p>
        <p style={{ margin: 0, color: TEXT_SUB, fontSize: 14 }}>Panel de control VICFAN</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Card style={{ background: `linear-gradient(135deg, ${ACENTOS.cotizaciones}22, ${ACENTOS.cotizaciones}11)`, border: `1px solid ${ACENTOS.cotizaciones}33` }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase" }}>Cotizaciones pendientes</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 900, color: ACENTOS.cotizaciones }}>{stats.cotizacionesPendientes}</p>
        </Card>
        <Card style={{ background: `linear-gradient(135deg, ${ACENTOS.instalaciones}22, ${ACENTOS.instalaciones}11)`, border: `1px solid ${ACENTOS.instalaciones}33` }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase" }}>Instalaciones hoy</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 900, color: ACENTOS.instalaciones }}>{stats.instalacionesHoy}</p>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {secciones.map(s => (
          <button key={s.id} onClick={() => setTab(s.id)} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderTop: `3px solid ${s.color}`, borderRadius: 14, padding: "16px 8px", cursor: "pointer", textAlign: "center", boxShadow: "0 2px 8px #0001" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MAIN }}>{s.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                     = useState("inicio");
  const [clientes, setClientes]           = useState(() => cargarLS("vf_clientes", CLIENTES_DEMO));
  const [cotizaciones, setCotizaciones]   = useState(() => cargarLS("vf_cotizaciones", COTIZACIONES_DEMO));
  const [ventas, setVentas]               = useState(() => cargarLS("vf_ventas", VENTAS_DEMO));
  const [instalaciones, setInstalaciones] = useState(() => cargarLS("vf_instalaciones", INSTALACIONES_DEMO));
  const [inventario, setInventario]       = useState(() => cargarLS("vf_inventario", MODELOS_DEMO));
  const [repuestos, setRepuestos]         = useState(() => cargarLS("vf_repuestos", REPUESTOS_DEMO));
  const [garantias, setGarantias]         = useState(() => cargarLS("vf_garantias", GARANTIAS_DEMO));
  const [servicios, setServicios]         = useState(() => cargarLS("vf_servicios", SERVICIOS_DEMO));
  const [tecnicos, setTecnicos]           = useState(() => cargarLS("vf_tecnicos", TECNICOS_DEMO));
  const [listo, setListo]                 = useState(false);

  const sync = (key, data) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    setDoc(doc(db, "vicfan", key), { valor: JSON.stringify(data) }).catch(() => {});
  };

  useEffect(() => { if (listo) sync("vf_clientes", clientes); },        [JSON.stringify(clientes)]);
  useEffect(() => { if (listo) sync("vf_cotizaciones", cotizaciones); }, [JSON.stringify(cotizaciones)]);
  useEffect(() => { if (listo) sync("vf_ventas", ventas); },             [JSON.stringify(ventas)]);
  useEffect(() => { if (listo) sync("vf_instalaciones", instalaciones); },[JSON.stringify(instalaciones)]);
  useEffect(() => { if (listo) sync("vf_inventario", inventario); },     [JSON.stringify(inventario)]);
  useEffect(() => { if (listo) sync("vf_repuestos", repuestos); },       [JSON.stringify(repuestos)]);
  useEffect(() => { if (listo) sync("vf_garantias", garantias); },       [JSON.stringify(garantias)]);
  useEffect(() => { if (listo) sync("vf_servicios", servicios); },       [JSON.stringify(servicios)]);
  useEffect(() => { if (listo) sync("vf_tecnicos", tecnicos); },         [JSON.stringify(tecnicos)]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "vicfan", "vf_clientes"), snap => {
      if (snap.exists()) { const d = JSON.parse(snap.data().valor); setClientes(d); try { localStorage.setItem("vf_clientes", JSON.stringify(d)); } catch {} }
      setListo(true);
    }, () => setListo(true));
    return () => unsub();
  }, []);

  const cargarDemo = () => {
    setClientes(CLIENTES_DEMO); setCotizaciones(COTIZACIONES_DEMO); setVentas(VENTAS_DEMO);
    setInstalaciones(INSTALACIONES_DEMO); setInventario(MODELOS_DEMO); setRepuestos(REPUESTOS_DEMO);
    setGarantias(GARANTIAS_DEMO); setServicios(SERVICIOS_DEMO); setTecnicos(TECNICOS_DEMO);
  };

  const exportarDatos = () => {
    const datos = { clientes, cotizaciones, ventas, instalaciones, inventario, repuestos, garantias, servicios, tecnicos, exportado: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `vicfan-backup-${hoy()}.json`; a.click();
  };

  const stats = {
    cotizacionesPendientes: cotizaciones.filter(q => q.estado === "Pendiente").length,
    instalacionesHoy: instalaciones.filter(i => i.fechaProgramada === hoy()).length,
  };

  return (
    <div style={{ background: BG_APP, minHeight: "100vh", fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: TEXT_MAIN }}>
      <div style={{ background: NAVY, padding: "14px 20px", boxShadow: "0 2px 12px #0003", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setTab("inicio")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
            <h1 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Inter', 'Helvetica Neue', sans-serif", letterSpacing: "-1px" }}>⚡ VICFAN</h1>
            <p style={{ color: "#94b4d4", margin: 0, fontSize: 11, fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em" }}>Generadores GENERAC</p>
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {stats.cotizacionesPendientes > 0 && (
              <div style={{ textAlign: "center", background: ORANGE + "33", borderRadius: 10, padding: "6px 12px" }}>
                <p style={{ color: ORANGE, fontWeight: 800, fontSize: 16, margin: 0 }}>{stats.cotizacionesPendientes}</p>
                <p style={{ color: "#94b4d4", fontSize: 10, margin: 0 }}>Cotiz.</p>
              </div>
            )}
            <button onClick={() => setTab("inicio")} style={{ background: "#ffffff22", border: "none", borderRadius: 10, color: "#fff", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>🏠 Inicio</button>
          </div>
        </div>
      </div>

      <div className="main-content" style={{ maxWidth: 760, margin: "0 auto" }}>
        {tab === "inicio"        && <ModuloBienvenida setTab={setTab} stats={stats} />}
        {tab === "clientes"      && <ModuloClientes clientes={clientes} setClientes={setClientes} />}
        {tab === "cotizaciones"  && <ModuloCotizaciones cotizaciones={cotizaciones} setCotizaciones={setCotizaciones} clientes={clientes} inventario={inventario} />}
        {tab === "ventas"        && <ModuloVentas ventas={ventas} setVentas={setVentas} clientes={clientes} />}
        {tab === "instalaciones" && <ModuloInstalaciones instalaciones={instalaciones} setInstalaciones={setInstalaciones} clientes={clientes} tecnicos={tecnicos} />}
        {tab === "inventario"    && <ModuloInventario inventario={inventario} setInventario={setInventario} repuestos={repuestos} setRepuestos={setRepuestos} />}
        {tab === "garantias"     && <ModuloGarantias garantias={garantias} clientes={clientes} />}
        {tab === "servicio"      && <ModuloServicio servicios={servicios} setServicios={setServicios} clientes={clientes} tecnicos={tecnicos} />}
        {tab === "admin"         && <ModuloAdmin tecnicos={tecnicos} setTecnicos={setTecnicos} exportarDatos={exportarDatos} cargarDemo={cargarDemo} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: NAVY, zIndex: 50, boxShadow: "0 -2px 12px #0003" }}>
        <div className="nav-tabs" style={{ maxWidth: 760, margin: "0 auto" }}>
          {TABS.map(t => {
            const activo = tab === t.id;
            const color = ACENTOS[t.id];
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: "1 0 auto", minWidth: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: activo ? "#ffffff22" : "transparent", border: "none", borderTop: activo ? `3px solid ${color}` : "3px solid transparent", borderRadius: 0, padding: "8px 4px", cursor: "pointer" }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: activo ? color : "#94b4d4" }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
