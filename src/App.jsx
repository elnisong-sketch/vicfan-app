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
import ModuloCotizaciones, { EMPRESA_POR_DEFECTO, LineasItems } from "./modules/Cotizaciones.jsx";
import { SelectorCliente } from "./modules/Inspeccion.jsx";
import PantallaLogin from "./sesion.jsx";
import { useSesion, salir as cerrarSesion } from "./auth.js";
import Usuarios from "./modules/Usuarios.jsx";
import { useNuevaVersion } from "./version.js";
import AvisoInstalar from "./instalar.jsx";

const TABS = [
  { id: "tareas",       icon: "📅", label: "Tareas" },
  { id: "operaciones",  icon: "🏗️", label: "Proyectos" },
  { id: "clientes",     icon: "👥", label: "Clientes" },
  { id: "cotizaciones", icon: "📋", label: "Cotizac." },
  { id: "ventas",       icon: "💰", label: "Ventas" },
  { id: "inventario",   icon: "📦", label: "Inventario" },
  { id: "garantias",    icon: "🛡️", label: "Garantías" },
  { id: "admin",        icon: "⚙️", label: "Admin" },
];

// ── CLIENTES ──────────────────────────────────────────────────────────────────
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

function ModuloVentas({ ventas, setVentas, clientes, setClientes, inventario, repuestos, garantias, setGarantias, onNuevaVenta, onEditarVenta, onEliminarVenta }) {
  const ac = ACENTOS.ventas;
  const [modal, setModal] = useState(false);
  const [f, setF] = useState(null);
  const [busqueda, setBusqueda] = useState("");
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
          Sin ventas todavía. Se crean aquí, o solas al aprobar una cotización o crear un proyecto.
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
              <p style={{ margin: 0, fontSize: 12, color: TEXT_SUB }}>{v.origen}{v.items?.length ? ` · ${v.items.length} ítem(s)` : ""}</p>
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
            {f.id ? "Al cambiar los artículos, el inventario se ajusta por la diferencia." : "Descuenta el material del inventario. No genera cotización, proyecto ni tarea."}
          </p>
        </Modal>
      )}
    </div>
  );
}

// ── INVENTARIO ────────────────────────────────────────────────────────────────
function ModuloInventario({ inventario, setInventario, repuestos, setRepuestos, movimientos, setMovimientos }) {
  const [sub, setSub] = useState("modelos");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [entrada, setEntrada] = useState(null);        // { item, clase } al que se le añade stock
  const [entCant, setEntCant] = useState("");
  const [entCosto, setEntCosto] = useState("");
  const [histFiltro, setHistFiltro] = useState("todo");
  const ac = ACENTOS.inventario;
  const todos = [...inventario, ...repuestos];
  const totalUnidades = todos.reduce((s, x) => s + (Number(x.stock) || 0), 0);
  const valorTotal = todos.reduce((s, x) => s + (Number(x.stock) || 0) * (Number(x.precio) || 0), 0);
  const agotados = todos.filter(x => (Number(x.stock) || 0) <= 0).length;

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
  const lista = sub === "modelos" ? inventario : repuestos;
  const setLista = sub === "modelos" ? setInventario : setRepuestos;
  // Búsqueda sin distinguir mayúsculas ni acentos, por nombre o código, y todo
  // en orden alfabético para encontrarlo rápido cuando la lista crece.
  const norm = t => (t ?? "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const q = norm(busqueda);
  const visibles = lista
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
        {sub !== "historial" && <Btn onClick={() => { setForm(sub === "modelos" ? { id: uid(), codigo: "", nombre: "", potencia: "", combustible: "Gasolina", precio: 0, stock: 0 } : { id: uid(), codigo: "", nombre: "", precio: 0, stock: 0 }); setModal(true); }} color={ac} small>+ Nuevo</Btn>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[["Unidades", totalUnidades, ac], ["Valor", usd(valorTotal), GREEN], ["Agotados", agotados, agotados ? RED : GREEN]].map(([t, v, col]) => (
          <Card key={t} style={{ padding: "10px 12px" }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase" }}>{t}</p>
            <p style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 900, color: col }}>{v}</p>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[{ id: "modelos", label: "⚡ Plantas" }, { id: "repuestos", label: "🔩 Repuestos" }, { id: "historial", label: "📥 Historial" }].map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{ padding: "11px 6px", borderRadius: 12, border: `2px solid ${sub === t.id ? ac : BORDER}`, background: sub === t.id ? ac + "22" : BG_CARD, color: sub === t.id ? ac : TEXT_SUB, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>{t.label}</button>
        ))}
      </div>

      {sub !== "historial" && <>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o código…"
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 36px 11px 12px", borderRadius: 12, border: `1px solid ${BORDER}`, background: BG_CARD, color: TEXT_MAIN, fontSize: 14, fontFamily: "inherit" }} />
        {busqueda
          ? <button onClick={() => setBusqueda("")} aria-label="Limpiar" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: TEXT_SUB, fontSize: 15, cursor: "pointer", padding: 4 }}>✕</button>
          : <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: TEXT_SUB, fontSize: 14, pointerEvents: "none" }}>🔍</span>}
      </div>
      {busqueda && <p style={{ margin: "-6px 2px 12px", fontSize: 12, color: TEXT_SUB }}>{visibles.length} resultado{visibles.length === 1 ? "" : "s"}</p>}

      {visibles.length === 0 && (
        <p style={{ color: TEXT_SUB, textAlign: "center", padding: "24px 0", fontSize: 14 }}>
          {busqueda ? "Nada coincide con la búsqueda." : sub === "modelos" ? "Sin plantas todavía." : "Sin repuestos todavía."}
        </p>
      )}
      {visibles.map(item => (
        <Card key={item.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            {item.imagen && <img src={item.imagen} alt="" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8, border: `1px solid ${BORDER}` }} />}
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15 }}>{item.nombre}</p>
              {item.potencia && <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT_SUB }}>⚡ {item.potencia} · {item.combustible}</p>}
              <p style={{ margin: "0 0 6px", fontSize: 13, color: TEXT_SUB }}>Cód: {item.codigo}</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: ac, fontWeight: 800, fontSize: 16 }}>{usd(item.precio)}</span>
                <Badge text={`Stock: ${item.stock}`} color={item.stock > 0 ? GREEN : RED} />
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
            const movs = [...movimientos].filter(m => histFiltro === "todo" || m.tipo === histFiltro).sort((a, b) => (b.creadoEn || "").localeCompare(a.creadoEn || ""));
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
      {garantias.length === 0 && <p style={{ color: TEXT_SUB, textAlign: "center", marginTop: 40 }}>Sin garantías todavía. Se activan desde cada proyecto, el día de la puesta en marcha.</p>}
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

// ── BIENVENIDA ────────────────────────────────────────────────────────────────
function ModuloBienvenida({ setTab, stats }) {
  const secciones = TABS.map(t => ({ ...t, color: ACENTOS[t.id] }));
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: TEXT_MAIN }}>¡Bienvenido!</p>
        <p style={{ margin: 0, color: TEXT_SUB, fontSize: 14 }}>Panel de control VICFAN</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <Card onClick={() => setTab("tareas")} style={{ background: `linear-gradient(135deg, ${ACENTOS.tareas}22, ${ACENTOS.tareas}11)`, border: `1px solid ${ACENTOS.tareas}33`, cursor: "pointer" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase" }}>Visitas hoy</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 900, color: ACENTOS.tareas }}>{stats.tareasHoy}</p>
        </Card>
        <Card onClick={() => setTab("cotizaciones")} style={{ background: `linear-gradient(135deg, ${ACENTOS.cotizaciones}22, ${ACENTOS.cotizaciones}11)`, border: `1px solid ${ACENTOS.cotizaciones}33`, cursor: "pointer" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase" }}>Cotiz. pendientes</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 900, color: ACENTOS.cotizaciones }}>{stats.cotizacionesPendientes}</p>
        </Card>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 6 }}>
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
  const [tab, setTab]                   = useState("inicio");
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
  const [tecnicos, setTecnicos]         = useColeccion("tecnicos", [], conectado);
  // Membrete del presupuesto: una sola ficha, pero se sincroniza igual que el
  // resto para que ambos dispositivos emitan con los mismos datos.
  const [empresaLista, setEmpresaLista] = useColeccion("empresa", [EMPRESA_POR_DEFECTO], esOficina);
  const [proyectos, setProyectos, proyectosListos] = useColeccion("proyectos", [], esOficina);
  // Cotización que hay que abrir ya rellenada al llegar desde una inspección.
  const [cotizacionInicial, setCotizacionInicial] = useState(null);
  const empresa = empresaLista[0] || EMPRESA_POR_DEFECTO;


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

  const registrarVenta = ({ clienteId, items = [], total, formaPago = "Por definir", origen = "Directa", proyectoId = null, cotizacionId = null, estado = "Pendiente cobro", nota = "" }) => {
    const consumo = materialDeItems(items);
    if (consumo.length) {
      const r = moverStock(inventario, repuestos, consumo, -1);
      setInventario(r.inventario);
      setRepuestos(r.repuestos);
      if (r.faltantes.length) setTimeout(() => alert(avisoFaltantes(r.faltantes)), 50);
    }
    const suma = total ?? items.reduce((sum, i) => sum + (Number(i.subtotal) || (Number(i.cantidad) || 0) * (Number(i.precio) || 0)), 0);
    const venta = { id: uid(), fecha: hoy(), clienteId, items, total: suma, formaPago, estado, origen, proyectoId, cotizacionId, nota, consumoStock: consumo, creadaEn: new Date().toISOString() };
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
    if (!confirm(`¿Cancelar el proyecto «${proyecto.nombre}»?\n\nSu venta se anula, el material vuelve al inventario y sus visitas pendientes se cancelan.`)) return;
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
    if (!confirm(`¿Eliminar el proyecto «${proyecto.nombre}»?\n\nSe borran también su venta y sus tareas, y el material vuelve al inventario. No se puede deshacer.`)) return;
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
  const resolverInspeccion = (insp, resultado) => {
    const marcar = (campos, accion) => setTareas(p => p.map(t => t.id === insp.id ? registrar({ ...t, ...campos }, accion, "Oficina") : t));
    const cliente = clientes.find(c => c.id === insp.clienteId);

    if (resultado === "no") {
      const motivo = window.prompt("¿Por qué no se concretó? (opcional)");
      if (motivo === null) return;
      marcar({ resultado: "No concretada", motivoNoConcretada: motivo.trim() }, "Resultado: no se concretó");
      return;
    }
    if (resultado === "cotizacion") {
      marcar({ resultado: "Cotización" }, "Resultado: se hace cotización");
      setCotizacionInicial({ clienteId: insp.clienteId, inspeccionId: insp.id });
      setTab("cotizaciones");
      return;
    }
    const proyecto = crearProyecto({
      nombre: insp.modelo ? `Instalación ${insp.modelo}` : `Proyecto ${cliente?.nombre || ""}`.trim(),
      clienteId: insp.clienteId,
      direccion: insp.direccion || cliente?.direccion || "",
      equipo: insp.modelo || "",
      descripcion: insp.descripcion || "",
      origen: "Inspección",
      inspeccionId: insp.id,
    });
    marcar({ resultado: "Proyecto", proyectoIdGenerado: proyecto.id }, `Resultado: proyecto «${proyecto.nombre}»`);
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

  // Si el cliente cambia de idea y se modifica un presupuesto ya aprobado, la
  // tarea tiene que reflejarlo: el técnico va a la calle con ese alcance. El
  // cambio queda anotado en su historial para que no pase desapercibido.
  const actualizarTareaDeCotizacion = q => setTareas(p => p.map(t => {
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

  const restaurarDatos = d => {
    if (Array.isArray(d.clientes))     setClientes(d.clientes);
    if (Array.isArray(d.cotizaciones)) setCotizaciones(d.cotizaciones);
    if (Array.isArray(d.ventas))       setVentas(d.ventas);
    if (Array.isArray(d.tareas))       setTareas(d.tareas);
    if (Array.isArray(d.inventario))   setInventario(d.inventario);
    if (Array.isArray(d.repuestos))    setRepuestos(d.repuestos);
    if (Array.isArray(d.garantias))    setGarantias(d.garantias);
    if (Array.isArray(d.movimientos))  setMovimientos(d.movimientos);
    if (Array.isArray(d.tecnicos))     setTecnicos(d.tecnicos);
    if (Array.isArray(d.proyectos))    setProyectos(d.proyectos);
    setTab("inicio");
  };

  const exportarDatos = () => {
    const datos = { clientes, cotizaciones, ventas, tareas, proyectos, inventario, repuestos, garantias, movimientos, tecnicos, exportado: new Date().toISOString() };
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
  const salir = () => { cerrarSesion().catch(() => {}); setTab("inicio"); };

  const abierta = t => t.estado === "Programada" || t.estado === "En proceso";
  // Un técnico solo cuenta lo suyo; la oficina cuenta todo.
  const mias = esTecnico ? tareas.filter(t => t.tecnicoId === sesion.tecnicoId) : tareas;
  const stats = {
    cotizacionesPendientes: cotizaciones.filter(q => q.estado === "Pendiente").length,
    tareasHoy: mias.filter(t => t.fecha === hoy()).length,
    tareasAtrasadas: mias.filter(t => abierta(t) && t.fecha < hoy()).length,
    inspeccionesPorResolver: tareas.filter(t => t.tipo === "Inspección" && t.estado === "Completada" && !t.resultado).length,
    mantenimientosVencidos: tareas.filter(t => t.tipo === "Mantenimiento" && abierta(t) && t.fecha < hoy()).length,
  };

  // En el iPhone, con la app instalada, la página ocupa también la franja de
  // la hora y la batería: la cabecera se baja lo que mida esa franja para que
  // sus botones queden donde se pueden tocar.
  const Cabecera = () => (
    <div style={{ position: "sticky", top: 0, zIndex: 100, background: NAVY, paddingTop: "env(safe-area-inset-top)" }}>
    {hayVersionNueva && (
      <button onClick={() => window.location.reload()}
        style={{ width: "100%", background: ORANGE, border: "none", color: "#fff", padding: "11px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
        ⬆️ Hay una versión nueva · toca aquí para actualizar
      </button>
    )}
    <div style={{ background: NAVY, padding: "14px 20px", boxShadow: "0 2px 12px #0003" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <button onClick={() => !esTecnico && setTab("inicio")} style={{ background: "none", border: "none", cursor: esTecnico ? "default" : "pointer", padding: 0, textAlign: "left" }}>
          <h1 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-1px" }}>⚡ VICFAN</h1>
          <p style={{ color: "#94b4d4", margin: 0, fontSize: 11 }}>{esTecnico ? `👷 ${sesion.nombre}` : "Generadores GENERAC"}</p>
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {stats.tareasHoy > 0 && !esTecnico && (
            <button onClick={() => setTab("tareas")} style={{ textAlign: "center", background: ACENTOS.tareas + "33", border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>
              <p style={{ color: ACENTOS.tareas, fontWeight: 800, fontSize: 16, margin: 0 }}>{stats.tareasHoy}</p>
              <p style={{ color: "#94b4d4", fontSize: 10, margin: 0 }}>Hoy</p>
            </button>
          )}
          {!esTecnico && <button onClick={() => setTab("inicio")} style={{ background: "#ffffff22", border: "none", borderRadius: 10, color: "#fff", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>🏠</button>}
          <button onClick={salir} style={{ background: "#ffffff22", border: "none", borderRadius: 10, color: "#fff", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Salir</button>
        </div>
      </div>
    </div>
    </div>
  );

  // ── Vista del técnico: solo su día, sin acceso a ventas ni precios ──────────
  if (esTecnico) {
    return (
      <div style={{ background: BG_APP, minHeight: "100vh", fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: TEXT_MAIN }}>
        <Cabecera />
        <div className="main-content" style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 40 }}>
          <AvisoInstalar />
          <ModuloTareas tareas={tareas} setTareas={setTareas} clientes={clientes} setClientes={setClientes} tecnicos={tecnicos} sesion={sesion} />
        </div>
      </div>
    );
  }

  // ── Vista de la oficina ─────────────────────────────────────────────────────
  return (
    <div style={{ background: BG_APP, minHeight: "100vh", fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: TEXT_MAIN }}>
      <Cabecera />

      <div className="main-content" style={{ maxWidth: 760, margin: "0 auto" }}>
        {tab === "inicio"       && <><AvisoInstalar /><ModuloBienvenida setTab={setTab} stats={stats} /></>}
        {tab === "tareas"       && <ModuloTareas tareas={tareas} setTareas={setTareas} clientes={clientes} setClientes={setClientes} tecnicos={tecnicos} sesion={sesion} onResolverInspeccion={resolverInspeccion} />}
        {tab === "operaciones"  && <ModuloOperaciones proyectos={proyectos} setProyectos={setProyectos} tareas={tareas} setTareas={setTareas}
                                     clientes={clientes} setClientes={setClientes} inventario={inventario} repuestos={repuestos}
                                     garantias={garantias} setGarantias={setGarantias}
                                     crearProyecto={crearProyectoDirecto} onCancelarProyecto={cancelarProyecto} onEliminarProyecto={eliminarProyecto} onGuardarMaterialMantenimiento={guardarMaterialMantenimiento} onResolverInspeccion={resolverInspeccion} />}
        {tab === "clientes"     && <ModuloClientes clientes={clientes} setClientes={setClientes} />}
        {tab === "cotizaciones" && <ModuloCotizaciones cotizaciones={cotizaciones} setCotizaciones={setCotizaciones} clientes={clientes} setClientes={setClientes} inventario={inventario} repuestos={repuestos} empresa={empresa} onAprobar={aprobarCotizacion} onEditarAprobada={actualizarTareaDeCotizacion}
                                     inicial={cotizacionInicial} onInicialUsado={() => setCotizacionInicial(null)} />}
        {tab === "ventas"       && <ModuloVentas ventas={ventas} setVentas={setVentas} clientes={clientes} setClientes={setClientes} inventario={inventario} repuestos={repuestos} garantias={garantias} setGarantias={setGarantias} onNuevaVenta={d => registrarVenta({ ...d, origen: "Directa" })} onEditarVenta={editarVenta} onEliminarVenta={eliminarVenta} />}
        {tab === "inventario"   && <ModuloInventario inventario={inventario} setInventario={setInventario} repuestos={repuestos} setRepuestos={setRepuestos} movimientos={movimientos} setMovimientos={setMovimientos} />}
        {tab === "garantias"    && <ModuloGarantias garantias={garantias} clientes={clientes} />}
        {tab === "admin"        && <ModuloAdmin tecnicos={tecnicos} setTecnicos={setTecnicos} exportarDatos={exportarDatos} restaurarDatos={restaurarDatos}
          empresa={empresa} setEmpresa={d => setEmpresaLista([d])} correo={sesion.correo} />}
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
