import { useState, useEffect } from "react";
import { useColeccion } from "./datos.js";
import {
  NAVY, ORANGE, GREEN, RED, BG_APP, BG_CARD, BORDER, TEXT_MAIN, TEXT_SUB,
  ACENTOS, ESTADO_COLOR, hoy, usd, uid, sumarMeses, fechaCorta,
  Badge, Btn, Card, Inp, Sel, Modal, CampoImagen,
} from "./ui.jsx";
import { prepararImagen, prepararLogo } from "./imagenes.js";
import ModuloTareas, { registrar } from "./modules/Tareas.jsx";
import ModuloOperaciones from "./modules/Operaciones.jsx";
import { proyectoVacio, tareaDeProyecto, planAutomatico, diasHasta } from "./proyectos.js";
import { materialDeItems, equipoComoMaterial, moverStock, avisoFaltantes } from "./inventario.js";
import ModuloCotizaciones, { EMPRESA_POR_DEFECTO } from "./modules/Cotizaciones.jsx";
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
  const [busqueda, setBusqueda] = useState("");
  const ac = ACENTOS.inventario;
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
    setLista(p => p.find(x => x.id === limpio.id) ? p.map(x => x.id === limpio.id ? limpio : x) : [...p, limpio]);
    setModal(false);
  };
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
  const crearProyecto = (datos, tarea = {}) => {
    // El material sale del inventario en cuanto se aprueba el trabajo. De una
    // cotización viene su lista de líneas; de un proyecto directo, su equipo si
    // coincide con una planta del catálogo.
    const consumo = datos.consumo || equipoComoMaterial(datos.equipo, inventario);
    const { consumo: _c, ...limpio } = datos;
    const proyecto = registrar(proyectoVacio({ ...limpio, consumoStock: consumo }), `Creado (${datos.origen || "Directo"})`, "Oficina");
    if (consumo.length) {
      const r = moverStock(inventario, repuestos, consumo, -1);
      setInventario(r.inventario);
      setRepuestos(r.repuestos);
      if (r.faltantes.length) setTimeout(() => alert(avisoFaltantes(r.faltantes)), 50);
    }
    setProyectos(p => [...p, proyecto]);
    setTareas(p => [...p, registrar(tareaDeProyecto(proyecto, {
      tipo: "Instalación",
      fecha: proyecto.fechaInicio,
      descripcion: proyecto.descripcion,
      ...tarea,
    }), `Creada con el proyecto «${proyecto.nombre}»`, "Oficina")]);
    return proyecto;
  };

  // Aprobar una cotización abre su proyecto con la tarea de instalación, que
  // nace sin publicar: la oficina la agenda y decide cuándo la ve el técnico.
  const aprobarCotizacion = q => {
    setCotizaciones(p => p.map(x => x.id === q.id ? { ...x, estado: "Aprobada" } : x));
    const alcance = alcanceDeCotizacion(q);
    crearProyecto({
      nombre: `Instalación ${alcance.modelo || "cotización " + q.numero}`,
      clienteId: q.clienteId,
      direccion: clientes.find(c => c.id === q.clienteId)?.direccion || "",
      equipo: alcance.modelo,
      descripcion: alcance.descripcion,
      origen: `Cotización Nº ${q.numero}`,
      cotizacionId: q.id,
      inspeccionId: q.inspeccionId || null,
      consumo: materialDeItems(q.items),
    }, { duracionDias: 2, cotizacionId: q.id, costo: alcance.costo });
    setTab("tareas");
  };

  // Cancelar un proyecto le devuelve al inventario el material que había
  // salido y da por cerradas sus tareas pendientes. Es la vuelta atrás de una
  // venta que al final no fue.
  const cancelarProyecto = proyecto => {
    if (!confirm(`¿Cancelar el proyecto «${proyecto.nombre}»?\n\nEl material descontado volverá al inventario y sus visitas pendientes se cancelarán.`)) return;
    if (proyecto.consumoStock?.length) {
      const r = moverStock(inventario, repuestos, proyecto.consumoStock, +1);
      setInventario(r.inventario);
      setRepuestos(r.repuestos);
    }
    setProyectos(p => p.map(x => x.id === proyecto.id
      ? registrar({ ...x, estado: "Cancelado", autoCierre: false, consumoStock: [] }, "Proyecto cancelado · material devuelto al inventario", "Oficina")
      : x));
    setTareas(p => p.map(t => (t.proyectoId === proyecto.id && (t.estado === "Programada" || t.estado === "En proceso"))
      ? registrar({ ...t, estado: "Cancelada" }, "Cancelada al cancelar el proyecto", "Oficina")
      : t));
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
    if (Array.isArray(d.tecnicos))     setTecnicos(d.tecnicos);
    if (Array.isArray(d.proyectos))    setProyectos(d.proyectos);
    setTab("inicio");
  };

  const exportarDatos = () => {
    const datos = { clientes, cotizaciones, ventas, tareas, proyectos, inventario, repuestos, garantias, tecnicos, exportado: new Date().toISOString() };
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
                                     clientes={clientes} setClientes={setClientes} inventario={inventario}
                                     garantias={garantias} setGarantias={setGarantias}
                                     crearProyecto={crearProyecto} onCancelarProyecto={cancelarProyecto} onResolverInspeccion={resolverInspeccion} />}
        {tab === "clientes"     && <ModuloClientes clientes={clientes} setClientes={setClientes} />}
        {tab === "cotizaciones" && <ModuloCotizaciones cotizaciones={cotizaciones} setCotizaciones={setCotizaciones} clientes={clientes} setClientes={setClientes} inventario={inventario} repuestos={repuestos} empresa={empresa} onAprobar={aprobarCotizacion} onEditarAprobada={actualizarTareaDeCotizacion}
                                     inicial={cotizacionInicial} onInicialUsado={() => setCotizacionInicial(null)} />}
        {tab === "ventas"       && <ModuloVentas ventas={ventas} setVentas={setVentas} clientes={clientes} />}
        {tab === "inventario"   && <ModuloInventario inventario={inventario} setInventario={setInventario} repuestos={repuestos} setRepuestos={setRepuestos} />}
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
