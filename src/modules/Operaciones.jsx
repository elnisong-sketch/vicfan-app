import { useState } from "react";
import {
  ACENTOS, ESTADO_COLOR, PRIORIDAD_COLOR, BG_INPUT, BORDER, TEXT_SUB, GREEN, ORANGE, RED,
  hoy, fechaCorta, fechaLarga, sumarDias, esPasado,
  Badge, Btn, Card, Inp, Area, Sel, Modal, Chips, Etiqueta, estiloInput,
} from "../ui.jsx";
import { registrar, estaAbierta, esIncidencia, claseInspeccion, ETIQUETA_ORIGEN, RESULTADO_COLOR } from "./Tareas.jsx";
import { SelectorCliente, ModalInspeccion } from "./Inspeccion.jsx";
import { proyectoVacio, tareaDeProyecto, MESES_MANTENIMIENTO, MESES_GARANTIA, diasHasta, garantiaDeProyecto } from "../proyectos.js";
import { resumenMaterial } from "../inventario.js";

// Proyectos, inspecciones y mantenimientos, en un solo sitio para la oficina.
//
// Todo lo que implica ir a casa del cliente sigue siendo una TAREA —con sus
// fotos, comentarios, publicación e historial— y aparece en el calendario y en
// el "Mi día" de los técnicos. Este módulo es la vista de oficina que las
// ordena: qué proyectos hay en marcha, qué inspecciones falta resolver y qué
// mantenimientos se vienen encima.

const ac = ACENTOS.operaciones;
const ICONO = { "Instalación": "🔧", "Mantenimiento": "🔩", "Reparación": "🛠️", "Garantía": "🛡️", "Inspección": "🔍" };

// ── Alta de proyecto sin pasar por cotización ──────────────────────────────────
function ModalProyecto({ clientes, onCrearCliente, inventario, onGuardar, onCerrar }) {
  const [f, setF] = useState({ ...proyectoVacio(), duracionDias: 2, hora: "09:00" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const elegirCliente = (id, c) => setF(p => ({ ...p, clienteId: id, direccion: p.direccion || c?.direccion || "" }));
  const elegirEquipo = nombre => setF(p => ({ ...p, equipo: nombre, nombre: p.nombre || (nombre ? `Instalación ${nombre}` : "") }));

  return (
    <Modal onClose={onCerrar}>
      <h3 style={{ margin: "0 0 16px", color: ac }}>🏗️ Nuevo proyecto</h3>
      <SelectorCliente clientes={clientes} valor={f.clienteId} onCambio={elegirCliente} onCrear={onCrearCliente} />

      <Etiqueta>Equipo</Etiqueta>
      <select value={inventario.some(m => m.nombre === f.equipo) ? f.equipo : ""} onChange={e => elegirEquipo(e.target.value)} style={{ ...estiloInput, marginBottom: 8 }}>
        <option value="">— Del inventario, o escríbelo abajo —</option>
        {inventario.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
      </select>
      <Inp value={f.equipo} onChange={v => set("equipo", v)} placeholder="Generac 26kW…" />

      <Inp label="Nombre del proyecto" value={f.nombre} onChange={v => set("nombre", v)} placeholder="Instalación Generac 26kW" />
      <Inp label="Dirección" value={f.direccion} onChange={v => set("direccion", v)} />
      <Area label="Alcance del trabajo" value={f.descripcion} onChange={v => set("descripcion", v)} placeholder="Qué incluye, instrucciones para el técnico…" />

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 10 }}>
        <Inp label="Inicio de la instalación" type="date" value={f.fechaInicio} onChange={v => set("fechaInicio", v)} />
        <Inp label="Duración (días)" type="number" value={String(f.duracionDias)} onChange={v => set("duracionDias", Math.max(1, Number(v) || 1))} />
      </div>
      <Sel label="Mantenimiento tras el cierre" value={String(f.mantenimientoMeses)} onChange={v => set("mantenimientoMeses", Number(v))}
        options={MESES_MANTENIMIENTO.map(o => ({ value: String(o.value), label: o.label }))} />

      <div style={{ background: BG_INPUT, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: TEXT_SUB, lineHeight: 1.6 }}>
        Se crea también la tarea de instalación, sin publicar. Cuando la finalicen, el proyecto se cierra solo y se programa su primer mantenimiento.
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={() => onGuardar(f)} color={ac} full disabled={!f.clienteId || !f.nombre.trim()}>Crear proyecto</Btn>
        <Btn onClick={onCerrar} color={TEXT_SUB} outline full>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Detalle del proyecto ───────────────────────────────────────────────────────
// ── Garantía: empieza a correr el día de la puesta en marcha ──────────────────
function BloqueGarantia({ garantia, onActivar, onAnular }) {
  const [fecha, setFecha] = useState(hoy());
  const [serial, setSerial] = useState("");
  const verde = ACENTOS.garantias;

  if (garantia) {
    const dias = diasHasta(garantia.vence);
    const color = dias > 30 ? GREEN : dias > 0 ? ORANGE : RED;
    return (
      <div style={{ border: `1.5px solid ${color}55`, background: color + "11", borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 13, lineHeight: 1.7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <b style={{ color, fontSize: 14 }}>🛡️ Garantía activa</b>
          <Badge text={dias > 0 ? `${dias} días` : "Vencida"} color={color} small />
        </div>
        <div>▶️ <b>Puesta en marcha:</b> {fechaLarga(garantia.fechaInstalacion)}</div>
        <div>⏳ <b>Vence:</b> {fechaLarga(garantia.vence)} ({garantia.mesesGarantia} meses)</div>
        {garantia.serial && <div>🔢 <b>Serial:</b> {garantia.serial}</div>}
        <button onClick={onAnular} style={{ background: "none", border: "none", color: TEXT_SUB, fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0, marginTop: 4 }}>
          Anular (si se activó por error)
        </button>
      </div>
    );
  }
  return (
    <div style={{ border: `1.5px dashed ${verde}88`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 14, color: verde }}>🛡️ Garantía sin activar</p>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: TEXT_SUB, lineHeight: 1.5 }}>
        Actívala el día que la planta se pone en funcionamiento: desde ese día corren sus {MESES_GARANTIA} meses.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <Etiqueta>Puesta en marcha</Etiqueta>
          <input type="date" value={fecha} max={hoy()} onChange={e => setFecha(e.target.value)} style={estiloInput} />
        </div>
        <div>
          <Etiqueta>Serial (opcional)</Etiqueta>
          <input value={serial} onChange={e => setSerial(e.target.value)} placeholder="Nº de serie" style={estiloInput} />
        </div>
      </div>
      <Btn onClick={() => onActivar({ fecha, serial })} color={verde} full disabled={!fecha}>🛡️ Activar garantía</Btn>
    </div>
  );
}

function DetalleProyecto({ proyecto, tareas, garantia, nombreCliente, onVisita, onCerrarProyecto, onReabrir, onMeses, onActivarGarantia, onAnularGarantia, onCancelarProyecto, onCerrar }) {
  const [tipoVisita, setTipoVisita] = useState("Reparación");
  const [fechaVisita, setFechaVisita] = useState(hoy());
  const suyas = tareas.filter(t => t.proyectoId === proyecto.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proximo = suyas.find(t => t.tipo === "Mantenimiento" && estaAbierta(t));
  const cerrado = proyecto.estado === "Cerrado";
  const cancelado = proyecto.estado === "Cancelado";

  return (
    <Modal onClose={onCerrar}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <h3 style={{ margin: 0, color: ac }}>🏗️ {proyecto.nombre}</h3>
        <Badge text={proyecto.estado} color={cerrado ? GREEN : ac} />
      </div>
      <p style={{ margin: "4px 0 14px", fontSize: 13, color: TEXT_SUB }}>
        {nombreCliente(proyecto.clienteId)} · Origen: {proyecto.origen}{proyecto.fechaCierre ? ` · Cerrado el ${fechaCorta(proyecto.fechaCierre)}` : ""}
      </p>

      <div style={{ background: BG_INPUT, borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 13, lineHeight: 1.7 }}>
        {proyecto.equipo && <div>⚡ <b>Equipo:</b> {proyecto.equipo}</div>}
        {proyecto.direccion && <div>📍 <b>Dirección:</b> {proyecto.direccion}</div>}
        {proyecto.descripcion && <div style={{ whiteSpace: "pre-line" }}>📝 {proyecto.descripcion}</div>}
        <div>🔩 <b>Próximo mantenimiento:</b> {proximo ? fechaLarga(proximo.fecha) : cerrado ? "—" : "se programa al cerrar el proyecto"}</div>
        {proyecto.consumoStock?.length > 0 && <div>📦 <b>Material descontado:</b> {resumenMaterial(proyecto.consumoStock)}</div>}
      </div>

      <BloqueGarantia garantia={garantia} onActivar={onActivarGarantia} onAnular={onAnularGarantia} />

      <Sel label="Mantenimiento" value={String(proyecto.mantenimientoMeses ?? 6)} onChange={v => onMeses(Number(v))}
        options={MESES_MANTENIMIENTO.map(o => ({ value: String(o.value), label: o.label }))} />

      <Etiqueta>Visitas del proyecto ({suyas.length})</Etiqueta>
      {suyas.length === 0 && <p style={{ fontSize: 13, color: TEXT_SUB, margin: "0 0 12px" }}>Todavía no hay visitas.</p>}
      {suyas.map(t => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${ESTADO_COLOR[t.estado] || TEXT_SUB}`, borderRadius: 10, padding: "8px 10px", marginBottom: 6, fontSize: 13 }}>
          <span style={{ flex: 1 }}>{ICONO[t.tipo]} {t.tipo}{t.mantenimientoN ? ` nº ${t.mantenimientoN}` : ""}</span>
          <span style={{ color: TEXT_SUB }}>{fechaCorta(t.fecha)}</span>
          <Badge text={t.estado} color={ESTADO_COLOR[t.estado] || TEXT_SUB} small />
        </div>
      ))}

      <div style={{ background: BG_INPUT, borderRadius: 12, padding: 12, margin: "12px 0" }}>
        <Etiqueta>Programar otra visita</Etiqueta>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <select value={tipoVisita} onChange={e => setTipoVisita(e.target.value)} style={estiloInput}>
            {["Reparación", "Inspección", "Instalación", "Garantía", "Mantenimiento"].map(t => <option key={t} value={t}>{ICONO[t]} {t}</option>)}
          </select>
          <input type="date" value={fechaVisita} onChange={e => setFechaVisita(e.target.value)} style={estiloInput} />
        </div>
        <Btn onClick={() => onVisita(tipoVisita, fechaVisita)} color={ac} outline small>+ Añadir visita</Btn>
      </div>

      {(proyecto.historial || []).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Etiqueta>Historial</Etiqueta>
          {proyecto.historial.map((h, i) => (
            <p key={i} style={{ margin: "0 0 4px", fontSize: 12, color: TEXT_SUB }}><b style={{ color: "inherit" }}>{h.accion}</b> — {h.quien}</p>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {cerrado
          ? <Btn onClick={onReabrir} color={ORANGE} outline small>↺ Reabrir proyecto</Btn>
          : !cancelado && <Btn onClick={onCerrarProyecto} color={GREEN} small>✓ Cerrar proyecto</Btn>}
        {!cerrado && !cancelado && <Btn onClick={onCancelarProyecto} color={RED} outline small>✗ Cancelar proyecto</Btn>}
        <Btn onClick={onCerrar} color={TEXT_SUB} outline small>Cerrar</Btn>
      </div>
    </Modal>
  );
}

// ── Módulo ─────────────────────────────────────────────────────────────────────
export default function ModuloOperaciones({ proyectos, setProyectos, tareas, setTareas, clientes, setClientes, inventario, garantias, setGarantias, crearProyecto, onCancelarProyecto, onResolverInspeccion }) {
  const garantiaDe = id => garantias.find(g => g.proyectoId === id);
  const [vista, setVista] = useState("proyectos");
  const [modal, setModal] = useState(null);          // "proyecto" | "Visita comercial" | "Incidencia del cliente"
  const [detalle, setDetalle] = useState(null);

  const nombreCliente = id => clientes.find(c => c.id === id)?.nombre || "— sin cliente —";
  const crearCliente = c => setClientes(p => [...p, c]);
  const actualizarProyecto = (id, fn) => setProyectos(p => p.map(x => x.id === id ? fn(x) : x));
  const actualizarTarea = (id, fn) => setTareas(p => p.map(t => t.id === id ? fn(t) : t));

  const inspecciones = tareas.filter(t => t.tipo === "Inspección");
  const porResolver = inspecciones.filter(t => t.estado === "Completada" && !t.resultado);
  const pendientesVisita = inspecciones.filter(estaAbierta).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const resueltas = inspecciones.filter(t => t.resultado || t.estado === "Cancelada").sort((a, b) => b.fecha.localeCompare(a.fecha));

  const mants = tareas.filter(t => t.tipo === "Mantenimiento" && estaAbierta(t)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const vencidos = mants.filter(t => esPasado(t.fecha));
  const proximos = mants.filter(t => !esPasado(t.fecha) && t.fecha <= sumarDias(hoy(), 60));
  const masAdelante = mants.filter(t => t.fecha > sumarDias(hoy(), 60));

  const abiertos = proyectos.filter(p => p.estado !== "Cerrado" && p.estado !== "Cancelado");
  const cerrados = proyectos.filter(p => p.estado === "Cerrado" || p.estado === "Cancelado");

  const guardarInspeccion = f => {
    setTareas(p => [...p, registrar(f, `Inspección creada (${ETIQUETA_ORIGEN[f.origen]})`, "Oficina")]);
    setModal(null);
    setVista("inspecciones");
  };

  const guardarProyecto = f => {
    const { duracionDias, hora, ...datos } = f;
    crearProyecto(datos, { duracionDias, hora, fecha: f.fechaInicio });
    setModal(null);
  };

  const proyectoAbierto = detalle && proyectos.find(p => p.id === detalle);

  const tarjetaInspeccion = t => (
    <Card key={t.id} style={{ borderLeft: `4px solid ${esIncidencia(t) ? RED : ac}`, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 3px", fontWeight: 700 }}>{esIncidencia(t) ? "🩺" : "🔍"} {nombreCliente(t.clienteId)}</p>
          <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: esIncidencia(t) ? RED : ac }}>
            {claseInspeccion(t)}{t.creadaPor && t.creadaPor !== "Oficina" ? ` · abierta por 👷 ${t.creadaPor}` : ""}
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: TEXT_SUB }}>{fechaCorta(t.fecha)} · {t.hora}{t.descripcion ? ` · ${t.descripcion.slice(0, 60)}` : ""}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <Badge text={t.resultado || t.estado} color={RESULTADO_COLOR[t.resultado] || ESTADO_COLOR[t.estado] || TEXT_SUB} small />
          {t.prioridad !== "Normal" && <Badge text={t.prioridad} color={PRIORIDAD_COLOR[t.prioridad]} small />}
          {t.publicada === false && estaAbierta(t) && <Badge text="Sin publicar" color={TEXT_SUB} small />}
        </div>
      </div>
      {t.estado === "Completada" && !t.resultado && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <Btn onClick={() => onResolverInspeccion(t, "proyecto")} color={GREEN} small>🏗️ Proyecto</Btn>
          <Btn onClick={() => onResolverInspeccion(t, "cotizacion")} color={ORANGE} small>📋 Cotizar</Btn>
          <Btn onClick={() => onResolverInspeccion(t, "no")} color={TEXT_SUB} outline small>✗ No se concretó</Btn>
        </div>
      )}
      {estaAbierta(t) && t.publicada === false && (
        <div style={{ marginTop: 10 }}>
          <Btn onClick={() => actualizarTarea(t.id, x => registrar({ ...x, publicada: true }, "Publicada a los técnicos", "Oficina"))} color={ACENTOS.tareas} small full>📢 Publicar a los técnicos</Btn>
        </div>
      )}
    </Card>
  );

  const colorProyecto = p => p.estado === "Cerrado" ? GREEN : p.estado === "Cancelado" ? TEXT_SUB : ac;
  const tarjetaProyecto = p => {
    const suyas = tareas.filter(t => t.proyectoId === p.id);
    const pendientes = suyas.filter(estaAbierta).length;
    const proximo = suyas.filter(t => t.tipo === "Mantenimiento" && estaAbierta(t)).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    return (
      <Card key={p.id} onClick={() => setDetalle(p.id)} style={{ cursor: "pointer", borderLeft: `4px solid ${colorProyecto(p)}`, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: "0 0 3px", fontWeight: 700 }}>🏗️ {p.nombre}</p>
            <p style={{ margin: 0, fontSize: 12.5, color: TEXT_SUB }}>{nombreCliente(p.clienteId)} · {p.origen}</p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: TEXT_SUB }}>
              {pendientes ? `${pendientes} visita${pendientes === 1 ? "" : "s"} pendiente${pendientes === 1 ? "" : "s"}` : "Sin visitas pendientes"}
              {proximo ? ` · 🔩 ${fechaCorta(proximo.fecha)}` : ""}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 700, color: garantiaDe(p.id) ? ACENTOS.garantias : TEXT_SUB }}>
              {garantiaDe(p.id) ? `🛡️ Garantía hasta el ${fechaCorta(garantiaDe(p.id).vence)}` : "🛡️ Garantía sin activar"}
            </p>
          </div>
          <Badge text={p.estado} color={colorProyecto(p)} small />
        </div>
      </Card>
    );
  };

  const seccion = (titulo, lista, render, color = TEXT_SUB) => lista.length > 0 && (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: "0 0 8px", fontWeight: 900, fontSize: 13.5, color }}>{titulo} ({lista.length})</p>
      {lista.map(render)}
    </div>
  );

  return (
    <div>
      <h2 style={{ color: ac, margin: "0 0 14px", fontSize: 18, fontWeight: 900 }}>🏗️ Proyectos</h2>

      <Chips value={vista} onChange={setVista} color={ac} opciones={[
        { value: "proyectos",     label: `🏗️ Proyectos${abiertos.length ? ` (${abiertos.length})` : ""}` },
        { value: "inspecciones",  label: `🔍 Inspecciones${porResolver.length + pendientesVisita.length ? ` (${porResolver.length + pendientesVisita.length})` : ""}` },
        { value: "mantenimientos", label: `🔩 Mantenimientos${vencidos.length ? ` ⚠️${vencidos.length}` : ""}` },
      ]} />

      {vista === "proyectos" && <>
        <Btn onClick={() => setModal("proyecto")} color={ac} small>+ Nuevo proyecto</Btn>
        <div style={{ height: 14 }} />
        {proyectos.length === 0 && <p style={{ color: TEXT_SUB, fontSize: 14, textAlign: "center", padding: "24px 0" }}>Todavía no hay proyectos. Nacen al aprobar una cotización, al resolver una inspección o creándolos aquí.</p>}
        {seccion("En marcha", abiertos, tarjetaProyecto, ac)}
        {seccion("Cerrados y cancelados", [...cerrados].sort((a, b) => (b.fechaCierre || "").localeCompare(a.fechaCierre || "")), tarjetaProyecto)}
      </>}

      {vista === "inspecciones" && <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Btn onClick={() => setModal("Visita comercial")} color={ac} small>🏗️ Inspección para proyecto</Btn>
          <Btn onClick={() => setModal("Incidencia del cliente")} color={RED} small>🩺 Diagnóstico de falla</Btn>
        </div>
        {inspecciones.length === 0 && <p style={{ color: TEXT_SUB, fontSize: 14, textAlign: "center", padding: "24px 0" }}>Sin inspecciones todavía.</p>}
        {seccion("Por resolver", porResolver, tarjetaInspeccion, ORANGE)}
        {seccion("Pendientes de visita", pendientesVisita, tarjetaInspeccion, ac)}
        {seccion("Resueltas", resueltas, tarjetaInspeccion)}
      </>}

      {vista === "mantenimientos" && <>
        {mants.length === 0 && <p style={{ color: TEXT_SUB, fontSize: 14, textAlign: "center", padding: "24px 0" }}>No hay mantenimientos programados. Se programan solos al cerrarse cada proyecto.</p>}
        {[["⚠️ Vencidos", vencidos, RED], ["Próximos 60 días", proximos, ac], ["Más adelante", masAdelante, TEXT_SUB]].map(([titulo, lista, color]) =>
          seccion(titulo, lista, t => (
            <Card key={t.id} style={{ padding: 14, borderLeft: `4px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: "0 0 3px", fontWeight: 700 }}>🔩 {nombreCliente(t.clienteId)}</p>
                  <p style={{ margin: 0, fontSize: 12.5, color: TEXT_SUB }}>{fechaLarga(t.fecha)}{t.proyectoNombre ? ` · ${t.proyectoNombre}` : ""}{t.mantenimientoN ? ` · nº ${t.mantenimientoN}` : ""}</p>
                </div>
                {t.publicada === false && <Badge text="Sin publicar" color={TEXT_SUB} small />}
              </div>
              {t.publicada === false && (
                <div style={{ marginTop: 10 }}>
                  <Btn onClick={() => actualizarTarea(t.id, x => registrar({ ...x, publicada: true }, "Publicada a los técnicos", "Oficina"))} color={ACENTOS.tareas} small full>📢 Publicar a los técnicos</Btn>
                </div>
              )}
            </Card>
          ), color))}
      </>}

      {modal === "proyecto" && (
        <ModalProyecto clientes={clientes} onCrearCliente={crearCliente} inventario={inventario}
          onGuardar={guardarProyecto} onCerrar={() => setModal(null)} />
      )}
      {(modal === "Visita comercial" || modal === "Incidencia del cliente") && (
        <ModalInspeccion origen={modal} clientes={clientes} onCrearCliente={crearCliente}
          onGuardar={guardarInspeccion} onCerrar={() => setModal(null)} />
      )}
      {proyectoAbierto && (
        <DetalleProyecto proyecto={proyectoAbierto} tareas={tareas} nombreCliente={nombreCliente}
          onVisita={(tipo, fecha) => setTareas(p => [...p, registrar(tareaDeProyecto(proyectoAbierto, { tipo, fecha }), `${tipo} añadida al proyecto`, "Oficina")])}
          onCerrarProyecto={() => actualizarProyecto(proyectoAbierto.id, x => registrar({ ...x, estado: "Cerrado", fechaCierre: hoy() }, "Cerrado a mano", "Oficina"))}
          onReabrir={() => actualizarProyecto(proyectoAbierto.id, x => registrar({ ...x, estado: "Abierto", fechaCierre: null, autoCierre: false }, "Reabierto", "Oficina"))}
          onCancelarProyecto={() => { onCancelarProyecto(proyectoAbierto); setDetalle(null); }}
          garantia={garantiaDe(proyectoAbierto.id)}
          onActivarGarantia={({ fecha, serial }) => {
            const g = garantiaDeProyecto(proyectoAbierto, { fecha, serial });
            setGarantias(p => [...p.filter(x => x.id !== g.id), g]);
            actualizarProyecto(proyectoAbierto.id, x => registrar({ ...x, fechaPuestaEnMarcha: fecha }, `Garantía activada: puesta en marcha el ${fechaCorta(fecha)}, vence el ${fechaCorta(g.vence)}`, "Oficina"));
          }}
          onAnularGarantia={() => {
            if (!confirm("¿Anular la garantía de este proyecto?")) return;
            setGarantias(p => p.filter(x => x.proyectoId !== proyectoAbierto.id));
            actualizarProyecto(proyectoAbierto.id, x => registrar({ ...x, fechaPuestaEnMarcha: null }, "Garantía anulada", "Oficina"));
          }}
          onMeses={m => actualizarProyecto(proyectoAbierto.id, x => registrar({ ...x, mantenimientoMeses: m }, m ? `Mantenimiento cada ${m} meses` : "Sin mantenimiento", "Oficina"))}
          onCerrar={() => setDetalle(null)} />
      )}
    </div>
  );
}
