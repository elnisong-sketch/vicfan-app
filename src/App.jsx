import { useState, useEffect } from "react";
import { useColeccion } from "./datos.js";
import {
  NAVY, ORANGE, GREEN, RED, BG_APP, BG_CARD, BORDER, TEXT_MAIN, TEXT_SUB,
  ACENTOS, ESTADO_COLOR, hoy, dn, usd, uid, cargarLS,
  Badge, Btn, Card, Inp, Sel, Modal,
} from "./ui.jsx";
import ModuloTareas, { tareaVacia } from "./modules/Tareas.jsx";
import ModuloCotizaciones, { EMPRESA_POR_DEFECTO } from "./modules/Cotizaciones.jsx";
import PantallaLogin, { PIN_ADMIN_POR_DEFECTO } from "./sesion.jsx";
import { useNuevaVersion } from "./version.js";

const TABS = [
  { id: "tareas",       icon: "📅", label: "Tareas" },
  { id: "clientes",     icon: "👥", label: "Clientes" },
  { id: "cotizaciones", icon: "📋", label: "Cotizac." },
  { id: "ventas",       icon: "💰", label: "Ventas" },
  { id: "inventario",   icon: "📦", label: "Inventario" },
  { id: "garantias",    icon: "🛡️", label: "Garantías" },
  { id: "admin",        icon: "⚙️", label: "Admin" },
];

// ── DATOS DEMO ────────────────────────────────────────────────────────────────
const MODELOS_DEMO = [
  { id: "g1", codigo: "GP3600",   nombre: "GENERAC GP3600",       potencia: "3600W",  combustible: "Gasolina",    precio: 850,  stock: 4 },
  { id: "g2", codigo: "GP5500",   nombre: "GENERAC GP5500",       potencia: "5500W",  combustible: "Gasolina",    precio: 1100, stock: 3 },
  { id: "g3", codigo: "GP8000E",  nombre: "GENERAC GP8000E",      potencia: "8000W",  combustible: "Gasolina",    precio: 1450, stock: 2 },
  { id: "g4", codigo: "XC8000E",  nombre: "GENERAC XC8000E",      potencia: "8000W",  combustible: "Gasolina",    precio: 1800, stock: 2 },
  { id: "g5", codigo: "RG022N",   nombre: "GENERAC Standby 22kW", potencia: "22000W", combustible: "Gas/Propano", precio: 4200, stock: 1 },
];
const REPUESTOS_DEMO = [
  { id: "r1", codigo: "BUJIA-GP",      nombre: "Bujía GENERAC GP",     precio: 8,  stock: 20 },
  { id: "r2", codigo: "FILTRO-ACEITE", nombre: "Filtro de aceite",     precio: 12, stock: 15 },
  { id: "r3", codigo: "FILTRO-AIRE",   nombre: "Filtro de aire",       precio: 18, stock: 10 },
  { id: "r4", codigo: "CARB-GP3600",   nombre: "Carburador GP3600",    precio: 45, stock: 5  },
  { id: "r5", codigo: "BATERIA-12V",   nombre: "Batería 12V arranque", precio: 65, stock: 8  },
];
const CLIENTES_DEMO = [
  { id: "c1", nombre: "Carlos Mendoza",      telefono: "0412-555-1234", email: "carlos@email.com",     direccion: "Urb. Las Mercedes, Caracas", tipo: "Residencial", notas: "" },
  { id: "c2", nombre: "Ferretería El Perno", telefono: "0212-555-6789", email: "ferreteria@email.com", direccion: "Av. Principal, Valencia",    tipo: "Comercial",   notas: "Compras frecuentes de repuestos" },
  { id: "c3", nombre: "María Rodríguez",     telefono: "0424-555-4321", email: "",                     direccion: "Res. La Castellana, Caracas", tipo: "Residencial", notas: "" },
  { id: "c4", nombre: "Clínica San Lucas",   telefono: "0261-555-8888", email: "admin@sanlucas.com",   direccion: "Av. Delicias, Maracaibo",    tipo: "Industrial",  notas: "Requiere garantía extendida" },
  { id: "c5", nombre: "Pedro Álvarez",       telefono: "0416-555-9999", email: "",                     direccion: "Urb. El Bosque, Valencia",   tipo: "Residencial", notas: "" },
];
const COTIZACIONES_DEMO = [
  { id: "q1", clienteId: "c1", fecha: dn(5), estado: "Pendiente", items: [{ id: "a1", tipo: "planta", nombre: "GENERAC GP5500", cantidad: 1, precio: 1100, subtotal: 1100 }, { id: "a2", tipo: "servicio", nombre: "Instalación eléctrica", cantidad: 1, precio: 150, subtotal: 150 }], total: 1250, notas: "Cliente interesado" },
  { id: "q2", clienteId: "c4", fecha: dn(3), estado: "Aprobada",  items: [{ id: "b1", tipo: "planta", nombre: "GENERAC Standby 22kW", cantidad: 1, precio: 4200, subtotal: 4200 }, { id: "b2", tipo: "servicio", nombre: "Instalación eléctrica", cantidad: 1, precio: 800, subtotal: 800 }], total: 5000, notas: "Instalación urgente" },
  { id: "q3", clienteId: "c3", fecha: dn(1), estado: "Pendiente", items: [{ id: "d1", tipo: "planta", nombre: "GENERAC GP3600", cantidad: 1, precio: 850, subtotal: 850 }, { id: "d2", tipo: "servicio", nombre: "Instalación eléctrica", cantidad: 1, precio: 120, subtotal: 120 }], total: 970, notas: "" },
];
const VENTAS_DEMO = [
  { id: "v1", clienteId: "c2", fecha: dn(10), estado: "Cobrada",         items: [{ nombre: "Bujía GENERAC GP", cantidad: 4, precio: 8, subtotal: 32 }],       total: 32,   formaPago: "Transferencia", notas: "" },
  { id: "v2", clienteId: "c5", fecha: dn(7),  estado: "Cobrada",         items: [{ nombre: "GENERAC GP8000E", cantidad: 1, precio: 1450, subtotal: 1450 }],   total: 1600, formaPago: "Efectivo USD",  notas: "Incluye instalación básica" },
  { id: "v3", clienteId: "c4", fecha: dn(2),  estado: "Pendiente cobro", items: [{ nombre: "GENERAC Standby 22kW", cantidad: 1, precio: 4200, subtotal: 4200 }], total: 5000, formaPago: "Transferencia", notas: "" },
];
const TECNICOS_DEMO = [
  { id: "t1", nombre: "Técnico 1", telefono: "", especialidad: "Instalación",   pin: "1234" },
  { id: "t2", nombre: "Técnico 2", telefono: "", especialidad: "Mantenimiento", pin: "0000" },
];
const GARANTIAS_DEMO = [
  { id: "ga1", clienteId: "c5", modelo: "GENERAC GP8000E", serial: "SN-2024-001", fechaInstalacion: dn(6), mesesGarantia: 24, notas: "" },
];

// Semillas antiguas: solo se usan para construir las tareas la primera vez.
const INSTALACIONES_PREVIAS = [
  { id: "i1", clienteId: "c5", tecnicoId: "t1", fechaProgramada: dn(6), estado: "Completada", modelo: "GENERAC GP8000E",      direccion: "Urb. El Bosque, Valencia", notas: "Instalación exitosa" },
  { id: "i2", clienteId: "c4", tecnicoId: "t1", fechaProgramada: hoy(), estado: "Programada", modelo: "GENERAC Standby 22kW", direccion: "Av. Delicias, Maracaibo",  notas: "Requiere revisión eléctrica previa" },
];
const SERVICIOS_PREVIOS = [
  { id: "s1", clienteId: "c2", tipo: "Mantenimiento", fecha: dn(4), tecnicoId: "t2", modelo: "GENERAC GP5500", descripcion: "Cambio de aceite y filtros", costo: 80, estado: "Completado" },
];

// ── MIGRACIÓN A TAREAS ────────────────────────────────────────────────────────
// Instalaciones y Servicios eran dos módulos casi idénticos. Ahora son un solo
// tipo de Tarea. Esto corre una sola vez: los arreglos originales quedan
// intactos en localStorage por si hiciera falta volver atrás.
const normalizarEstado = e => (e === "Completado" ? "Completada" : e || "Programada");

const desdeInstalacion = i => ({
  id: i.id, tipo: "Instalación", clienteId: i.clienteId, tecnicoId: i.tecnicoId || "",
  fecha: i.fechaProgramada || hoy(), hora: "09:00", duracionDias: 1,
  estado: normalizarEstado(i.estado), prioridad: "Normal",
  modelo: i.modelo || "", direccion: i.direccion || "", descripcion: "",
  costo: 0, notas: i.notas || "", fotos: [], historial: [], cierre: null,
  creadaEn: new Date().toISOString(),
});

const desdeServicio = s => ({
  id: s.id, tipo: s.tipo || "Mantenimiento", clienteId: s.clienteId, tecnicoId: s.tecnicoId || "",
  fecha: s.fecha || hoy(), hora: "09:00", duracionDias: 1,
  estado: normalizarEstado(s.estado), prioridad: "Normal",
  modelo: s.modelo || "", direccion: "", descripcion: s.descripcion || "",
  costo: s.costo || 0, notas: "", fotos: [], historial: [], cierre: null,
  creadaEn: new Date().toISOString(),
});

const cargarTareas = () => {
  const guardadas = cargarLS("vf_tareas", null);
  if (guardadas) return guardadas;
  const inst = cargarLS("vf_instalaciones", INSTALACIONES_PREVIAS) || [];
  const serv = cargarLS("vf_servicios", SERVICIOS_PREVIOS) || [];
  return [...inst.map(desdeInstalacion), ...serv.map(desdeServicio)];
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
        <Btn onClick={() => { setForm({ id: uid(), nombre: "", documento: "", telefono: "", email: "", direccion: "", tipo: "Residencial", notas: "" }); setModal(true); }} color={ac} small>+ Nuevo</Btn>
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
              <Btn onClick={() => { setForm({ ...c }); setModal(true); }} color={ac} outline small>✏️</Btn>
              <Btn onClick={() => setClientes(p => p.filter(x => x.id !== c.id))} color={RED} outline small>🗑️</Btn>
            </div>
          </div>
        </Card>
      ))}
      {modal && (
        <Modal onClose={() => setModal(false)}>
          <h3 style={{ margin: "0 0 20px", color: ac }}>Cliente</h3>
          <Inp label="Nombre o razón social" value={form.nombre || ""} onChange={v => setForm(p => ({ ...p, nombre: v }))} />
          <Inp label="C.I. / RIF" value={form.documento || ""} onChange={v => setForm(p => ({ ...p, documento: v }))} placeholder="V-14.930.796" />
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
                <Badge text={`Stock: ${item.stock}`} color={item.stock > 0 ? GREEN : RED} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn onClick={() => { setForm({ ...item }); setModal(true); }} color={ac} outline small>✏️</Btn>
              <Btn onClick={() => setLista(p => p.filter(x => x.id !== item.id))} color={RED} outline small>🗑️</Btn>
            </div>
          </div>
        </Card>
      ))}
      {modal && (
        <Modal onClose={() => setModal(false)}>
          <h3 style={{ margin: "0 0 20px", color: ac }}>{sub === "modelos" ? "Planta / Modelo" : "Repuesto"}</h3>
          <Inp label="Código" value={form.codigo || ""} onChange={v => setForm(f => ({ ...f, codigo: v }))} />
          <Inp label="Nombre" value={form.nombre || ""} onChange={v => setForm(f => ({ ...f, nombre: v }))} />
          {sub === "modelos" && <>
            <Inp label="Potencia" value={form.potencia || ""} onChange={v => setForm(f => ({ ...f, potencia: v }))} placeholder="5500W" />
            <Sel label="Combustible" value={form.combustible || "Gasolina"} onChange={v => setForm(f => ({ ...f, combustible: v }))} options={["Gasolina", "Gas/Propano", "Diésel", "Dual"].map(t => ({ value: t, label: t }))} />
          </>}
          <Inp label="Precio ($)" value={String(form.precio || 0)} onChange={v => setForm(f => ({ ...f, precio: Number(v) }))} type="number" />
          <Inp label="Stock" value={String(form.stock || 0)} onChange={v => setForm(f => ({ ...f, stock: Number(v) }))} type="number" />
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
        const col = dias > 30 ? GREEN : dias > 0 ? ORANGE : RED;
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

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function ModuloAdmin({ tecnicos, setTecnicos, exportarDatos, restaurarDatos, cargarDemo, pinAdmin, setPinAdmin, empresa, setEmpresa }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [editandoPin, setEditandoPin] = useState(false);
  const [pinNuevo, setPinNuevo] = useState("");
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
    if (!/^\d{4}$/.test(form.pin || "")) { alert("El PIN debe tener exactamente 4 dígitos."); return; }
    setTecnicos(p => p.find(x => x.id === form.id) ? p.map(x => x.id === form.id ? form : x) : [...p, form]);
    setModal(false);
  };
  const guardarPinAdmin = () => {
    if (!/^\d{4}$/.test(pinNuevo)) { alert("El PIN debe tener exactamente 4 dígitos."); return; }
    setPinAdmin(pinNuevo);
    setEditandoPin(false);
    setPinNuevo("");
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
      <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>🏢 Datos del presupuesto</h3>
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
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => { setEmpresa({ ...borradorEmpresa, id: "datos" }); setEditandoEmpresa(false); }} color={ac} small full>Guardar</Btn>
              <Btn onClick={() => setEditandoEmpresa(false)} color={TEXT_SUB} outline small full>Cancelar</Btn>
            </div>
          </>
        )}
      </Card>

      <h3 style={{ margin: "20px 0 10px", fontSize: 15 }}>🔑 Acceso de la oficina</h3>
      <Card>
        {!editandoPin ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontWeight: 700 }}>PIN de Oficina</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>
                {pinAdmin === PIN_ADMIN_POR_DEFECTO ? "⚠️ Sigue siendo el PIN por defecto" : "•••• configurado"}
              </p>
            </div>
            <Btn onClick={() => { setEditandoPin(true); setPinNuevo(""); }} color={ac} outline small>Cambiar</Btn>
          </div>
        ) : (
          <>
            <Inp label="Nuevo PIN (4 dígitos)" value={pinNuevo} onChange={v => setPinNuevo(v.replace(/\D/g, "").slice(0, 4))} type="tel" placeholder="••••" />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={guardarPinAdmin} color={ac} small full>Guardar</Btn>
              <Btn onClick={() => setEditandoPin(false)} color={TEXT_SUB} outline small full>Cancelar</Btn>
            </div>
          </>
        )}
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 12px" }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>👷 Técnicos</h3>
        <Btn onClick={() => { setForm({ id: uid(), nombre: "", telefono: "", especialidad: "Instalación", pin: "" }); setModal(true); }} color={ac} small>+ Nuevo</Btn>
      </div>
      {tecnicos.map(t => (
        <Card key={t.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{t.nombre}</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>{t.telefono ? `📞 ${t.telefono} · ` : ""}{t.especialidad} · 🔑 PIN {t.pin || "sin asignar"}</p>
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
          <Inp label="Nombre" value={form.nombre || ""} onChange={v => setForm(f => ({ ...f, nombre: v }))} placeholder="Como aparecerá al iniciar sesión" />
          <Inp label="Teléfono" value={form.telefono || ""} onChange={v => setForm(f => ({ ...f, telefono: v }))} />
          <Sel label="Especialidad" value={form.especialidad || "Instalación"} onChange={v => setForm(f => ({ ...f, especialidad: v }))} options={["Instalación", "Mantenimiento", "Reparación", "Todos"].map(t => ({ value: t, label: t }))} />
          <Inp label="PIN de acceso (4 dígitos)" value={form.pin || ""} onChange={v => setForm(f => ({ ...f, pin: v.replace(/\D/g, "").slice(0, 4) }))} type="tel" placeholder="1234" />
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
  const [clientes, setClientes]         = useColeccion("clientes", CLIENTES_DEMO);
  const [cotizaciones, setCotizaciones] = useColeccion("cotizaciones", COTIZACIONES_DEMO);
  const [ventas, setVentas]             = useColeccion("ventas", VENTAS_DEMO);
  const [tareas, setTareas]             = useColeccion("tareas", cargarTareas);
  const [inventario, setInventario]     = useColeccion("inventario", MODELOS_DEMO);
  const [repuestos, setRepuestos]       = useColeccion("repuestos", REPUESTOS_DEMO);
  const [garantias, setGarantias]       = useColeccion("garantias", GARANTIAS_DEMO);
  const [tecnicos, setTecnicos]         = useColeccion("tecnicos", TECNICOS_DEMO);
  // Membrete del presupuesto: una sola ficha, pero se sincroniza igual que el
  // resto para que ambos dispositivos emitan con los mismos datos.
  const [empresaLista, setEmpresaLista] = useColeccion("empresa", [EMPRESA_POR_DEFECTO]);
  const empresa = empresaLista[0] || EMPRESA_POR_DEFECTO;

  // La sesión y el PIN de la oficina son de este dispositivo: no se sincronizan.
  const [pinAdmin, setPinAdmin] = useState(() => cargarLS("vf_pin_admin", PIN_ADMIN_POR_DEFECTO));
  const [sesion, setSesion]     = useState(() => cargarLS("vf_sesion", null));

  const hayVersionNueva = useNuevaVersion();

  const guardarLocal = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch {} };
  useEffect(() => { guardarLocal("vf_sesion", sesion); }, [JSON.stringify(sesion)]);
  useEffect(() => { guardarLocal("vf_pin_admin", pinAdmin); }, [pinAdmin]);

  const cargarDemo = () => {
    setClientes(CLIENTES_DEMO); setCotizaciones(COTIZACIONES_DEMO); setVentas(VENTAS_DEMO);
    setTareas([...INSTALACIONES_PREVIAS.map(desdeInstalacion), ...SERVICIOS_PREVIOS.map(desdeServicio)]);
    setInventario(MODELOS_DEMO); setRepuestos(REPUESTOS_DEMO);
    setGarantias(GARANTIAS_DEMO); setTecnicos(TECNICOS_DEMO);
  };

  // Lo que la tarea hereda del presupuesto. Se calcula aparte porque se usa al
  // aprobar y también cada vez que la cotización se modifica después.
  const alcanceDeCotizacion = q => ({
    // El equipo es la primera línea que corresponda a algo del inventario; si
    // no hay ninguna, la primera línea del presupuesto.
    modelo: (q.items.find(i => inventario.some(m => m.nombre === i.nombre)) || q.items[0])?.nombre || "",
    descripcion: q.items.map(i => `• ${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${i.nombre}${i.detalle ? ` (${i.detalle})` : ""}`).join("\n"),
    costo: q.total,
  });

  // Aprobar una cotización crea la tarea de instalación correspondiente. Nace
  // sin publicar: la oficina la agenda y decide cuándo se la enseña al técnico.
  const aprobarCotizacion = q => {
    setCotizaciones(p => p.map(x => x.id === q.id ? { ...x, estado: "Aprobada" } : x));
    setTareas(p => [...p, {
      ...tareaVacia(q.clienteId),
      tipo: "Instalación",
      direccion: clientes.find(c => c.id === q.clienteId)?.direccion || "",
      duracionDias: 2,
      cotizacionId: q.id,
      ...alcanceDeCotizacion(q),
      historial: [{ accion: `Creada desde la cotización Nº ${q.numero}`, quien: "Oficina", cuando: new Date().toISOString() }],
    }]);
    setTab("tareas");
  };

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
    if (Array.isArray(d.tecnicos))     setTecnicos(d.tecnicos);
    setTab("inicio");
  };

  const exportarDatos = () => {
    const datos = { clientes, cotizaciones, ventas, tareas, inventario, repuestos, garantias, tecnicos, exportado: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vicfan-backup-${hoy()}.json`;
    a.click();
  };

  if (!sesion) return <PantallaLogin tecnicos={tecnicos} pinAdmin={pinAdmin} onEntrar={setSesion} />;

  const esTecnico = sesion.rol === "tecnico";
  const salir = () => { setSesion(null); setTab("inicio"); };

  const abierta = t => t.estado === "Programada" || t.estado === "En proceso";
  // Un técnico solo cuenta lo suyo; la oficina cuenta todo.
  const mias = esTecnico ? tareas.filter(t => t.tecnicoId === sesion.tecnicoId) : tareas;
  const stats = {
    cotizacionesPendientes: cotizaciones.filter(q => q.estado === "Pendiente").length,
    tareasHoy: mias.filter(t => t.fecha === hoy()).length,
    tareasAtrasadas: mias.filter(t => abierta(t) && t.fecha < hoy()).length,
  };

  const Cabecera = () => (
    <>
    {hayVersionNueva && (
      <button onClick={() => window.location.reload()}
        style={{ width: "100%", background: ORANGE, border: "none", color: "#fff", padding: "11px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
        ⬆️ Hay una versión nueva · toca aquí para actualizar
      </button>
    )}
    <div style={{ background: NAVY, padding: "14px 20px", boxShadow: "0 2px 12px #0003", position: "sticky", top: 0, zIndex: 100 }}>
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
    </>
  );

  // ── Vista del técnico: solo su día, sin acceso a ventas ni precios ──────────
  if (esTecnico) {
    return (
      <div style={{ background: BG_APP, minHeight: "100vh", fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: TEXT_MAIN }}>
        <Cabecera />
        <div className="main-content" style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 40 }}>
          <ModuloTareas tareas={tareas} setTareas={setTareas} clientes={clientes} tecnicos={tecnicos} sesion={sesion} />
        </div>
      </div>
    );
  }

  // ── Vista de la oficina ─────────────────────────────────────────────────────
  return (
    <div style={{ background: BG_APP, minHeight: "100vh", fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: TEXT_MAIN }}>
      <Cabecera />

      <div className="main-content" style={{ maxWidth: 760, margin: "0 auto" }}>
        {tab === "inicio"       && <ModuloBienvenida setTab={setTab} stats={stats} />}
        {tab === "tareas"       && <ModuloTareas tareas={tareas} setTareas={setTareas} clientes={clientes} tecnicos={tecnicos} sesion={sesion} />}
        {tab === "clientes"     && <ModuloClientes clientes={clientes} setClientes={setClientes} />}
        {tab === "cotizaciones" && <ModuloCotizaciones cotizaciones={cotizaciones} setCotizaciones={setCotizaciones} clientes={clientes} setClientes={setClientes} inventario={inventario} repuestos={repuestos} empresa={empresa} onAprobar={aprobarCotizacion} onEditarAprobada={actualizarTareaDeCotizacion} />}
        {tab === "ventas"       && <ModuloVentas ventas={ventas} setVentas={setVentas} clientes={clientes} />}
        {tab === "inventario"   && <ModuloInventario inventario={inventario} setInventario={setInventario} repuestos={repuestos} setRepuestos={setRepuestos} />}
        {tab === "garantias"    && <ModuloGarantias garantias={garantias} clientes={clientes} />}
        {tab === "admin"        && <ModuloAdmin tecnicos={tecnicos} setTecnicos={setTecnicos} exportarDatos={exportarDatos} restaurarDatos={restaurarDatos} cargarDemo={cargarDemo} pinAdmin={pinAdmin} setPinAdmin={setPinAdmin}
          empresa={empresa} setEmpresa={d => setEmpresaLista([d])} />}
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
