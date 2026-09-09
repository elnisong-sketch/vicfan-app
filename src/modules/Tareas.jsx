import { useState, useEffect } from "react";
import {
  ACENTOS, ESTADO_COLOR, PRIORIDAD_COLOR, BORDER, BG_CARD, BG_INPUT, TEXT_MAIN, TEXT_SUB, GREEN, ORANGE, RED, NAVY,
  hoy, sumarDias, inicioSemana, nombreDia, diaDelMes, fechaLarga, fechaCorta, esHoy, esPasado, horaLegible,
  usd, uid,
  Badge, Btn, Card, Inp, Area, Sel, Modal, Chips, Etiqueta, estiloInput,
} from "../ui.jsx";
import { guardarFoto, fotosDeTarea, borrarFoto } from "../fotos.js";

const ac = ACENTOS.tareas;

export const TIPOS_TAREA = ["Instalación", "Mantenimiento", "Reparación", "Garantía", "Inspección"];
const TIPO_ICONO = { "Instalación": "🔧", "Mantenimiento": "🔩", "Reparación": "🛠️", "Garantía": "🛡️", "Inspección": "🔍" };
const TIPOS_FOTO = [
  { id: "antes",   label: "Antes" },
  { id: "despues", label: "Después" },
  { id: "serial",  label: "Placa / Serial" },
  { id: "otro",    label: "Otro" },
];

export const tareaVacia = (clienteId, tecnicoId) => ({
  id: uid(),
  tipo: "Instalación",
  clienteId: clienteId || "",
  tecnicoId: tecnicoId || "",
  fecha: hoy(),
  hora: "09:00",
  duracionMin: 120,
  estado: "Programada",
  prioridad: "Normal",
  modelo: "",
  direccion: "",
  descripcion: "",
  costo: 0,
  notas: "",
  fotos: [],
  observaciones: [],
  historial: [],
  cierre: null,
  cierresPrevios: [],
  creadaEn: new Date().toISOString(),
});

/** Añade una línea al historial inmutable de la tarea. */
const registrar = (tarea, accion, quien) => ({
  ...tarea,
  historial: [...(tarea.historial || []), { accion, quien, cuando: new Date().toISOString() }],
});

const ordenarPorHora = (a, b) => (a.hora || "").localeCompare(b.hora || "");
const estaAbierta = t => t.estado === "Programada" || t.estado === "En proceso";
const estaAtrasada = t => estaAbierta(t) && esPasado(t.fecha);

// ── GALERÍA DE FOTOS ──────────────────────────────────────────────────────────
function Fotos({ tareaId, fotos, onCambio, soloLectura }) {
  const [tipo, setTipo] = useState("despues");
  const [urls, setUrls] = useState({});
  const [cargando, setCargando] = useState(false);
  const [ampliada, setAmpliada] = useState(null);

  useEffect(() => {
    let vivo = true;
    const creadas = [];
    fotosDeTarea(tareaId).then(registros => {
      if (!vivo) return;
      const mapa = {};
      registros.forEach(r => { const u = URL.createObjectURL(r.blob); mapa[r.id] = u; creadas.push(u); });
      setUrls(mapa);
    }).catch(() => {});
    return () => { vivo = false; creadas.forEach(URL.revokeObjectURL); };
  }, [tareaId, fotos.length]);

  const agregar = async e => {
    const archivos = Array.from(e.target.files || []);
    if (!archivos.length) return;
    setCargando(true);
    try {
      const nuevas = [];
      for (const file of archivos) {
        const id = uid();
        await guardarFoto({ id, tareaId, tipo, file });
        nuevas.push({ id, tipo });
      }
      onCambio([...fotos, ...nuevas]);
    } catch {
      alert("No se pudo guardar la foto. Revisa el espacio disponible en el teléfono.");
    } finally {
      setCargando(false);
      e.target.value = "";
    }
  };

  const quitar = async id => {
    await borrarFoto(id).catch(() => {});
    onCambio(fotos.filter(f => f.id !== id));
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <Etiqueta>📷 Fotos {fotos.length > 0 && `(${fotos.length})`}</Etiqueta>

      {!soloLectura && (
        <>
          <Chips value={tipo} onChange={setTipo} color={ac} opciones={TIPOS_FOTO.map(t => ({ value: t.id, label: t.label }))} />
          <label style={{ display: "block", background: BG_INPUT, border: `1.5px dashed ${BORDER}`, borderRadius: 12, padding: "16px 12px", textAlign: "center", cursor: "pointer", marginBottom: 10, color: TEXT_SUB, fontSize: 14, fontWeight: 600 }}>
            {cargando ? "Procesando…" : "📸 Tomar o elegir foto"}
            <input type="file" accept="image/*" capture="environment" multiple onChange={agregar} disabled={cargando} style={{ display: "none" }} />
          </label>
        </>
      )}

      {fotos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {fotos.map(f => (
            <div key={f.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}`, background: BG_INPUT }}>
              {urls[f.id]
                ? <img src={urls[f.id]} alt={f.tipo} onClick={() => setAmpliada(urls[f.id])} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }} />
                : <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 11, color: TEXT_SUB }}>…</div>}
              <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#000000aa", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 5px", textAlign: "center" }}>
                {TIPOS_FOTO.find(t => t.id === f.tipo)?.label || f.tipo}
              </span>
              {!soloLectura && (
                <button onClick={() => quitar(f.id)} style={{ position: "absolute", top: 4, right: 4, background: "#000000aa", border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, lineHeight: 1 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {ampliada && (
        <div onClick={() => setAmpliada(null)} style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 300, display: "grid", placeItems: "center", padding: 16 }}>
          <img src={ampliada} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}

// ── TARJETA DE TAREA ──────────────────────────────────────────────────────────
function TarjetaTarea({ tarea, nombreCliente, nombreTecnico, onAbrir, onIniciar, onCerrar, onFotos, compacta }) {
  const atrasada = estaAtrasada(tarea);
  return (
    <Card style={{ borderLeft: `4px solid ${ESTADO_COLOR[tarea.estado] || TEXT_SUB}`, padding: compacta ? 12 : 18, marginBottom: compacta ? 8 : 10 }}>
      <div onClick={onAbrir} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: compacta ? 13 : 15 }}>🕐 {tarea.hora}</span>
            <span style={{ fontSize: compacta ? 13 : 15, fontWeight: 700 }}>{TIPO_ICONO[tarea.tipo]} {nombreCliente}</span>
          </div>
          <p style={{ margin: "0 0 3px", fontSize: 13, color: TEXT_SUB }}>{tarea.tipo}{tarea.modelo ? ` · ${tarea.modelo}` : ""}</p>
          {tarea.direccion && <p style={{ margin: "0 0 3px", fontSize: 12, color: TEXT_SUB }}>📍 {tarea.direccion}</p>}
          <p style={{ margin: 0, fontSize: 12, color: TEXT_SUB }}>👷 {nombreTecnico}</p>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <Badge text={tarea.estado} color={ESTADO_COLOR[tarea.estado] || TEXT_SUB} small />
          {atrasada && <Badge text="Atrasada" color={RED} small />}
          {tarea.prioridad !== "Normal" && <Badge text={tarea.prioridad} color={PRIORIDAD_COLOR[tarea.prioridad]} small />}
          {tarea.fotos?.length > 0 && <span style={{ fontSize: 11, color: TEXT_SUB, fontWeight: 700 }}>📷 {tarea.fotos.length}</span>}
        </div>
      </div>

      {estaAbierta(tarea) && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn onClick={onFotos} color={ACENTOS.tareas} outline small>📷</Btn>
          {tarea.estado === "Programada" && <Btn onClick={onIniciar} color={ORANGE} small full>▶ Iniciar</Btn>}
          <Btn onClick={onCerrar} color={GREEN} small full>✓ Cerrar</Btn>
        </div>
      )}
    </Card>
  );
}

// ── MODAL: CREAR / EDITAR ─────────────────────────────────────────────────────
function ModalTarea({ form, setForm, clientes, tecnicos, onGuardar, onCerrar }) {
  const cliente = clientes.find(c => c.id === form.clienteId);
  const set = (campo, v) => setForm(f => ({ ...f, [campo]: v }));

  // Al elegir cliente, se hereda su dirección si la tarea aún no tiene una.
  const elegirCliente = v => {
    const c = clientes.find(x => x.id === v);
    setForm(f => ({ ...f, clienteId: v, direccion: f.direccion || c?.direccion || "" }));
  };

  return (
    <Modal onClose={onCerrar}>
      <h3 style={{ margin: "0 0 16px", color: ac }}>{form.creadaEn && form.historial?.length ? "Editar tarea" : "Nueva tarea"}</h3>

      <Sel label="Tipo de tarea" value={form.tipo} onChange={v => set("tipo", v)} options={TIPOS_TAREA.map(t => ({ value: t, label: `${TIPO_ICONO[t]} ${t}` }))} />
      <Sel label="Cliente" value={form.clienteId} onChange={elegirCliente} options={[{ value: "", label: "— Selecciona —" }, ...clientes.map(c => ({ value: c.id, label: c.nombre }))]} />
      <Sel label="Técnico asignado" value={form.tecnicoId} onChange={v => set("tecnicoId", v)} options={[{ value: "", label: "— Sin asignar —" }, ...tecnicos.map(t => ({ value: t.id, label: t.nombre }))]} />

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
        <Inp label="Fecha" type="date" value={form.fecha} onChange={v => set("fecha", v)} />
        <Inp label="Hora" type="time" value={form.hora} onChange={v => set("hora", v)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label="Duración (min)" type="number" value={String(form.duracionMin)} onChange={v => set("duracionMin", Number(v))} />
        <Sel label="Prioridad" value={form.prioridad} onChange={v => set("prioridad", v)} options={["Normal", "Alta", "Urgente"].map(p => ({ value: p, label: p }))} />
      </div>

      <Inp label="Equipo / modelo" value={form.modelo} onChange={v => set("modelo", v)} placeholder="GENERAC GP5500" />
      <Inp label="Dirección" value={form.direccion} onChange={v => set("direccion", v)} placeholder={cliente?.direccion || "Dirección de la visita"} />
      <Area label="Qué hay que hacer" value={form.descripcion} onChange={v => set("descripcion", v)} placeholder="Instrucciones para el técnico…" />
      <Inp label="Costo estimado ($)" type="number" value={String(form.costo)} onChange={v => set("costo", Number(v))} />

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={onGuardar} color={ac} full disabled={!form.clienteId}>Guardar</Btn>
        <Btn onClick={onCerrar} color={TEXT_SUB} outline full>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── MODAL: CERRAR TAREA (evidencia + quién la cerró) ──────────────────────────
function ModalCierre({ tarea, tecnicos, sesion, onFotos, onConfirmar, onCancelar }) {
  const esTecnico = sesion?.rol === "tecnico";
  // Un técnico solo puede cerrar a su propio nombre; la oficina sí elige quién.
  const [quien, setQuien] = useState(esTecnico ? sesion.tecnicoId : (tarea.tecnicoId || tecnicos[0]?.id || ""));
  const [trabajo, setTrabajo] = useState("");
  const [costoFinal, setCostoFinal] = useState(String(tarea.costo || 0));

  const tecnico = tecnicos.find(t => t.id === quien);

  const confirmar = () => {
    if (!quien || !trabajo.trim()) return;
    onConfirmar({
      tecnicoId: quien,
      // El nombre se copia a propósito: si mañana borras al técnico de la
      // lista, el registro de quién cerró la tarea tiene que sobrevivir.
      tecnicoNombre: tecnico?.nombre || "—",
      cerradaEn: new Date().toISOString(),
      trabajoRealizado: trabajo.trim(),
      costoFinal: Number(costoFinal) || 0,
    });
  };

  return (
    <Modal onClose={onCancelar}>
      <h3 style={{ margin: "0 0 4px", color: GREEN }}>✓ Cerrar tarea</h3>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: TEXT_SUB }}>{tarea.tipo} · {fechaCorta(tarea.fecha)}</p>

      {esTecnico ? (
        <div style={{ marginBottom: 14 }}>
          <Etiqueta>Quien realiza el trabajo</Etiqueta>
          <div style={{ background: BG_INPUT, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, fontWeight: 700 }}>
            👷 {sesion.nombre}
          </div>
        </div>
      ) : (
        <Sel label="¿Quién realizó el trabajo?" value={quien} onChange={setQuien} options={tecnicos.map(t => ({ value: t.id, label: t.nombre }))} />
      )}
      <Area label="Trabajo realizado" value={trabajo} onChange={setTrabajo} filas={4} placeholder="Describe qué se hizo, qué se encontró, qué quedó pendiente…" />

      <Fotos tareaId={tarea.id} fotos={tarea.fotos || []} onCambio={onFotos} />

      <Inp label="Costo final ($)" type="number" value={costoFinal} onChange={setCostoFinal} />

      <div style={{ background: BG_INPUT, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: TEXT_SUB }}>
        Se registrará automáticamente la fecha y hora del cierre junto con el nombre de quien lo realizó.
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={confirmar} color={GREEN} full disabled={!quien || !trabajo.trim()}>Confirmar cierre</Btn>
        <Btn onClick={onCancelar} color={TEXT_SUB} outline full>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── OBSERVACIONES ─────────────────────────────────────────────────────────────
// Se acumulan en vez de sobrescribirse: cada nota queda firmada y fechada, de
// modo que la oficina puede leer lo que el técnico fue anotando durante el
// trabajo sin que una nota tape a la anterior.
function Observaciones({ notas, onAgregar, quien }) {
  const [texto, setTexto] = useState("");
  const agregar = () => { if (!texto.trim()) return; onAgregar(texto.trim()); setTexto(""); };

  return (
    <div style={{ marginBottom: 16 }}>
      <Etiqueta>💬 Observaciones {notas.length > 0 && `(${notas.length})`}</Etiqueta>

      {notas.map(n => (
        <div key={n.id} style={{ background: BG_INPUT, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
          <p style={{ margin: "0 0 4px", fontSize: 14 }}>{n.texto}</p>
          <p style={{ margin: 0, fontSize: 11, color: TEXT_SUB, fontWeight: 700 }}>{n.autor} · {horaLegible(n.cuando)}</p>
        </div>
      ))}

      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
        placeholder={`Escribe una observación como ${quien}…`}
        style={{ ...estiloInput, resize: "vertical", marginBottom: 8 }} />
      <Btn onClick={agregar} color={ac} outline small disabled={!texto.trim()}>+ Añadir observación</Btn>
    </div>
  );
}

// ── MODAL: DETALLE / HISTORIAL ────────────────────────────────────────────────
function ModalDetalle({ tarea, nombreCliente, nombreTecnico, sesion, onEditar, onReprogramar, onCancelarTarea, onFotos, onObservacion, onReabrir, onCerrar }) {
  const [nuevaFecha, setNuevaFecha] = useState(tarea.fecha);
  const [reprogramando, setReprogramando] = useState(false);
  const [confirmarReapertura, setConfirmarReapertura] = useState(false);
  const c = tarea.cierre;
  const esTecnico = sesion?.rol === "tecnico";

  return (
    <Modal onClose={onCerrar}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <h3 style={{ margin: 0, color: ac }}>{TIPO_ICONO[tarea.tipo]} {nombreCliente}</h3>
        <Badge text={tarea.estado} color={ESTADO_COLOR[tarea.estado] || TEXT_SUB} />
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: TEXT_SUB }}>{tarea.tipo} · {fechaLarga(tarea.fecha)} · {tarea.hora}</p>

      <div style={{ background: BG_INPUT, borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, lineHeight: 1.7 }}>
        <div>👷 <b>Técnico:</b> {nombreTecnico}</div>
        {tarea.modelo && <div>⚡ <b>Equipo:</b> {tarea.modelo}</div>}
        {tarea.direccion && <div>📍 <b>Dirección:</b> {tarea.direccion}</div>}
        <div>⏱️ <b>Duración prevista:</b> {tarea.duracionMin} min</div>
        <div>💵 <b>Costo:</b> {usd(c?.costoFinal ?? tarea.costo)}</div>
      </div>

      {tarea.descripcion && (
        <div style={{ marginBottom: 16 }}>
          <Etiqueta>Qué hay que hacer</Etiqueta>
          <p style={{ margin: 0, fontSize: 14 }}>{tarea.descripcion}</p>
        </div>
      )}

      {c && (
        <div style={{ background: GREEN + "11", border: `1px solid ${GREEN}44`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 800, color: GREEN, fontSize: 13 }}>✓ CERRADA</p>
          <p style={{ margin: "0 0 6px", fontSize: 13 }}><b>Por:</b> {c.tecnicoNombre}</p>
          <p style={{ margin: "0 0 8px", fontSize: 13 }}><b>Cuándo:</b> {horaLegible(c.cerradaEn)}</p>
          <p style={{ margin: 0, fontSize: 14 }}>{c.trabajoRealizado}</p>
        </div>
      )}

      {/* Las fotos se pueden cargar en cualquier momento, no solo al cerrar:
          el técnico necesita documentar el "antes" apenas llega al sitio. */}
      {/* Una vez cerrada la tarea, el técnico ya no puede tocar las fotos: son
          la evidencia de lo que entregó. La oficina sí conserva el control. */}
      <Fotos tareaId={tarea.id} fotos={tarea.fotos || []} onCambio={onFotos}
        soloLectura={tarea.estado === "Cancelada" || (esTecnico && !estaAbierta(tarea))} />

      <Observaciones notas={tarea.observaciones || []} onAgregar={onObservacion} quien={sesion?.nombre || "Oficina"} />

      {tarea.cierresPrevios?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Etiqueta>Cierres anteriores</Etiqueta>
          {tarea.cierresPrevios.map((p, i) => (
            <div key={i} style={{ background: BG_INPUT, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
              <p style={{ margin: "0 0 4px", fontSize: 13 }}>{p.trabajoRealizado}</p>
              <p style={{ margin: 0, fontSize: 11, color: TEXT_SUB, fontWeight: 700 }}>{p.tecnicoNombre} · {horaLegible(p.cerradaEn)}</p>
            </div>
          ))}
        </div>
      )}

      {tarea.historial?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Etiqueta>Historial</Etiqueta>
          {tarea.historial.map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: TEXT_SUB, padding: "5px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span><b style={{ color: TEXT_MAIN }}>{h.accion}</b> — {h.quien}</span>
              <span style={{ whiteSpace: "nowrap" }}>{horaLegible(h.cuando)}</span>
            </div>
          ))}
        </div>
      )}

      {reprogramando ? (
        <div style={{ background: BG_INPUT, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <Inp label="Nueva fecha" type="date" value={nuevaFecha} onChange={setNuevaFecha} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => { onReprogramar(nuevaFecha); setReprogramando(false); }} color={ORANGE} small full>Confirmar</Btn>
            <Btn onClick={() => setReprogramando(false)} color={TEXT_SUB} outline small full>Cancelar</Btn>
          </div>
        </div>
      ) : confirmarReapertura ? (
        <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#856404" }}>
            La tarea volverá a estar programada. El cierre actual y sus fotos se conservan como registro.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => { onReabrir(); setConfirmarReapertura(false); }} color={ORANGE} full small>Reabrir</Btn>
            <Btn onClick={() => setConfirmarReapertura(false)} color={TEXT_SUB} outline full small>Cancelar</Btn>
          </div>
        </div>
      ) : !esTecnico && (
        // Editar, reprogramar, cancelar y reabrir son decisiones de oficina.
        // El técnico documenta lo que hace (fotos y observaciones), no cambia
        // la planificación ni reabre lo que ya cerró.
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {estaAbierta(tarea) && <>
            <Btn onClick={onEditar} color={ac} outline small>✏️ Editar</Btn>
            <Btn onClick={() => setReprogramando(true)} color={ORANGE} outline small>📅 Reprogramar</Btn>
            <Btn onClick={onCancelarTarea} color={RED} outline small>✕ Cancelar tarea</Btn>
          </>}
          {!estaAbierta(tarea) && <Btn onClick={() => setConfirmarReapertura(true)} color={ORANGE} outline small>↺ Reabrir tarea</Btn>}
        </div>
      )}

      <Btn onClick={onCerrar} color={TEXT_SUB} outline full>Cerrar</Btn>
    </Modal>
  );
}

// ── VISTA SEMANA ──────────────────────────────────────────────────────────────
function VistaSemana({ tareas, base, setBase, nombreCliente, abrir }) {
  const lunes = inicioSemana(base);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Btn onClick={() => setBase(sumarDias(lunes, -7))} color={ac} outline small>‹</Btn>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_SUB }}>{fechaCorta(lunes)} — {fechaCorta(sumarDias(lunes, 6))}</span>
        <Btn onClick={() => setBase(sumarDias(lunes, 7))} color={ac} outline small>›</Btn>
      </div>

      {dias.map(dia => {
        const delDia = tareas.filter(t => t.fecha === dia).sort(ordenarPorHora);
        const hoyEs = esHoy(dia);
        return (
          <div key={dia} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 2px", borderBottom: `2px solid ${hoyEs ? ac : BORDER}`, marginBottom: 8 }}>
              <span style={{ fontWeight: 900, fontSize: 14, color: hoyEs ? ac : TEXT_MAIN }}>{nombreDia(dia)} {diaDelMes(dia)}</span>
              {hoyEs && <Badge text="Hoy" color={ac} small />}
              <span style={{ marginLeft: "auto", fontSize: 12, color: TEXT_SUB, fontWeight: 700 }}>
                {delDia.length === 0 ? "libre" : `${delDia.length} visita${delDia.length > 1 ? "s" : ""}`}
              </span>
            </div>
            {delDia.map(t => (
              <div key={t.id} onClick={() => abrir(t)} style={{ display: "flex", alignItems: "center", gap: 8, background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${ESTADO_COLOR[t.estado] || TEXT_SUB}`, borderRadius: 10, padding: "9px 12px", marginBottom: 6, cursor: "pointer" }}>
                <span style={{ fontWeight: 800, fontSize: 13, minWidth: 44 }}>{t.hora}</span>
                <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {TIPO_ICONO[t.tipo]} {nombreCliente(t.clienteId)}
                </span>
                {estaAtrasada(t) && <Badge text="!" color={RED} small />}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── MÓDULO PRINCIPAL ──────────────────────────────────────────────────────────
export default function ModuloTareas({ tareas, setTareas, clientes, tecnicos, sesion }) {
  const [vista, setVista]         = useState("hoy");
  const [baseSemana, setBaseSemana] = useState(hoy());
  const [filtroTecnico, setFiltroTecnico] = useState("todos");
  const [detalle, setDetalle]     = useState(null);
  const [form, setForm]           = useState(null);
  const [cerrando, setCerrando]   = useState(null);

  const esTecnico = sesion?.rol === "tecnico";
  const quienActua = sesion?.nombre || "Oficina";

  const nombreCliente = id => clientes.find(c => c.id === id)?.nombre || "— sin cliente —";
  const nombreTecnico = id => tecnicos.find(t => t.id === id)?.nombre || "Sin asignar";

  // Un técnico solo ve sus propias tareas; nunca las de sus compañeros.
  const propias = esTecnico ? tareas.filter(t => t.tecnicoId === sesion.tecnicoId) : tareas;
  const visibles = esTecnico || filtroTecnico === "todos" ? propias : propias.filter(t => t.tecnicoId === filtroTecnico);

  const deHoy     = visibles.filter(t => t.fecha === hoy()).sort(ordenarPorHora);
  const atrasadas = visibles.filter(estaAtrasada).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proximas  = visibles.filter(t => estaAbierta(t) && t.fecha > hoy()).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const sinAsignar = visibles.filter(t => estaAbierta(t) && !t.tecnicoId);

  const actualizar = (id, fn) => setTareas(p => p.map(t => t.id === id ? fn(t) : t));

  const iniciar = t => actualizar(t.id, x => registrar({ ...x, estado: "En proceso" }, "Iniciada", quienActua));

  const confirmarCierre = cierre => {
    actualizar(cerrando.id, x => registrar({ ...x, estado: "Completada", cierre }, "Cerrada", cierre.tecnicoNombre));
    setCerrando(null);
    setDetalle(null);
  };

  const reprogramar = (t, nuevaFecha) => {
    actualizar(t.id, x => registrar({ ...x, fecha: nuevaFecha, estado: "Programada" }, `Reprogramada al ${fechaCorta(nuevaFecha)}`, quienActua));
    setDetalle(null);
  };

  const cancelarTarea = t => {
    if (!confirm("¿Cancelar esta tarea?")) return;
    actualizar(t.id, x => registrar({ ...x, estado: "Cancelada" }, "Cancelada", quienActua));
    setDetalle(null);
  };

  const agregarObservacion = (t, texto) => actualizar(t.id, x => ({
    ...x,
    observaciones: [...(x.observaciones || []), { id: uid(), texto, autor: quienActua, cuando: new Date().toISOString() }],
  }));

  // Reabrir no borra el cierre anterior: lo archiva. Si una instalación hubo
  // que rehacerla, tiene que quedar constancia de que se cerró una primera vez
  // y de quién la cerró.
  const reabrir = t => actualizar(t.id, x => registrar({
    ...x,
    estado: "Programada",
    cierresPrevios: [...(x.cierresPrevios || []), x.cierre].filter(Boolean),
    cierre: null,
  }, "Reabierta", quienActua));

  const guardar = () => {
    if (!form.clienteId) return;
    setTareas(p => {
      const existe = p.find(x => x.id === form.id);
      if (existe) return p.map(x => x.id === form.id ? form : x);
      return [...p, registrar(form, "Creada", quienActua)];
    });
    setForm(null);
  };

  // Si la crea un técnico, queda asignada a él mismo.
  const nueva = () => setForm({
    ...tareaVacia(clientes[0]?.id, esTecnico ? sesion.tecnicoId : tecnicos[0]?.id),
    fecha: vista === "semana" ? baseSemana : hoy(),
  });

  const tarjeta = t => (
    <TarjetaTarea key={t.id} tarea={t}
      nombreCliente={nombreCliente(t.clienteId)} nombreTecnico={nombreTecnico(t.tecnicoId)}
      onAbrir={() => setDetalle(t)} onIniciar={() => iniciar(t)} onCerrar={() => setCerrando(t)} onFotos={() => setDetalle(t)} />
  );

  const vacio = texto => <p style={{ color: TEXT_SUB, textAlign: "center", padding: "30px 0", fontSize: 14 }}>{texto}</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>{esTecnico ? "📅 Mi día" : "📅 Tareas"}</h2>
        <Btn onClick={nueva} color={ac} small>+ Nueva</Btn>
      </div>

      <Chips value={vista} onChange={setVista} color={ac} opciones={[
        { value: "hoy",    label: `Hoy${deHoy.length ? ` (${deHoy.length})` : ""}` },
        { value: "semana", label: "Semana" },
        { value: "todas",  label: "Todas" },
      ]} />

      {!esTecnico && tecnicos.length > 1 && (
        <Chips value={filtroTecnico} onChange={setFiltroTecnico} color={NAVY}
          opciones={[{ value: "todos", label: "Todos" }, ...tecnicos.map(t => ({ value: t.id, label: t.nombre }))]} />
      )}

      {vista === "hoy" && (
        <div>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: TEXT_SUB, textTransform: "capitalize" }}>{fechaLarga(hoy())}</p>

          {atrasadas.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 14, color: RED }}>⚠️ Atrasadas</span>
                <Badge text={String(atrasadas.length)} color={RED} small />
              </div>
              {atrasadas.map(t => (
                <div key={t.id}>
                  <p style={{ margin: "0 0 3px 2px", fontSize: 11, fontWeight: 700, color: RED }}>{fechaCorta(t.fecha)}</p>
                  {tarjeta(t)}
                </div>
              ))}
            </div>
          )}

          {sinAsignar.length > 0 && (
            <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#856404", fontWeight: 600 }}>
              👷 {sinAsignar.length} tarea{sinAsignar.length > 1 ? "s" : ""} sin técnico asignado
            </div>
          )}

          {deHoy.length > 0 ? deHoy.map(tarjeta) : vacio("Sin visitas programadas para hoy")}

          {proximas.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <p style={{ margin: "0 0 8px", fontWeight: 900, fontSize: 14, color: TEXT_SUB }}>Próximas</p>
              {proximas.slice(0, 5).map(t => (
                <div key={t.id}>
                  <p style={{ margin: "0 0 3px 2px", fontSize: 11, fontWeight: 700, color: TEXT_SUB, textTransform: "capitalize" }}>{fechaCorta(t.fecha)}</p>
                  {tarjeta(t)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {vista === "semana" && (
        <VistaSemana tareas={visibles} base={baseSemana} setBase={setBaseSemana} nombreCliente={nombreCliente} abrir={setDetalle} />
      )}

      {vista === "todas" && (
        visibles.length > 0
          ? [...visibles].sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)).map(tarjeta)
          : vacio("Todavía no hay tareas registradas")
      )}

      {form && (
        <ModalTarea form={form} setForm={setForm} clientes={clientes} tecnicos={tecnicos}
          onGuardar={guardar} onCerrar={() => setForm(null)} />
      )}

      {detalle && !form && !cerrando && (
        <ModalDetalle tarea={tareas.find(t => t.id === detalle.id) || detalle}
          nombreCliente={nombreCliente(detalle.clienteId)} nombreTecnico={nombreTecnico(detalle.tecnicoId)}
          sesion={sesion}
          onEditar={() => { setForm({ ...detalle }); setDetalle(null); }}
          onReprogramar={f => reprogramar(detalle, f)}
          onCancelarTarea={() => cancelarTarea(detalle)}
          onFotos={fotos => actualizar(detalle.id, x => ({ ...x, fotos }))}
          onObservacion={texto => agregarObservacion(detalle, texto)}
          onReabrir={() => reabrir(detalle)}
          onCerrar={() => setDetalle(null)} />
      )}

      {cerrando && (
        <ModalCierre tarea={tareas.find(t => t.id === cerrando.id) || cerrando} tecnicos={tecnicos} sesion={sesion}
          onFotos={fotos => actualizar(cerrando.id, x => ({ ...x, fotos }))}
          onConfirmar={confirmarCierre} onCancelar={() => setCerrando(null)} />
      )}
    </div>
  );
}
