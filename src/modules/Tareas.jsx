import { useState, useEffect, useRef } from "react";
import {
  ACENTOS, ESTADO_COLOR, PRIORIDAD_COLOR, BORDER, BG_CARD, BG_INPUT, TEXT_MAIN, TEXT_SUB, GREEN, ORANGE, RED,
  hoy, sumarDias, inicioSemana, nombreDia, diaDelMes, fechaLarga, fechaCorta, esHoy, esPasado, horaLegible,
  usd, uid,
  Badge, Btn, Card, Inp, Area, Sel, Modal, Chips, Etiqueta, estiloInput,
} from "../ui.jsx";
import { guardarFoto, asegurarFoto, borrarFoto, subirPendientes, contarPendientes } from "../fotos.js";

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
  duracionDias: 1,
  estado: "Programada",
  prioridad: "Normal",
  // La tarea nace privada: la oficina la prepara, la asigna y la publica
  // cuando decide. Hasta entonces el técnico no la ve.
  publicada: false,
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
// Las tareas anteriores a esta función no tienen el campo, y deben seguir
// viéndose: solo se oculta lo que se marcó explícitamente como no publicado.
const estaPublicada = t => t.publicada !== false;
// Las tareas antiguas guardaban minutos. Una instalación llave en mano se
// mide en días, no en minutos, así que se muestran días y las viejas cuentan
// como un día.
const duracionEnDias = t => t.duracionDias ?? 1;
const textoDuracion = t => { const d = duracionEnDias(t); return `${d} día${d === 1 ? "" : "s"}`; };

// ── GALERÍA DE FOTOS ──────────────────────────────────────────────────────────
function Fotos({ tareaId, fotos, onCambio, soloLectura, autor }) {
  const [tipo, setTipo] = useState("despues");
  const [urls, setUrls] = useState({});
  const [cargando, setCargando] = useState(false);
  const [ampliada, setAmpliada] = useState(null);
  // El arreglo cambia de identidad en cada render; la lista de ids no.
  const clave = fotos.map(f => f.id).join(",");

  // Se resuelve foto a foto: las que tomó este dispositivo salen de su copia
  // local, y las que tomó el otro técnico se bajan de Firestore la primera vez
  // y quedan cacheadas. Así la oficina ve lo que subieron desde la calle.
  useEffect(() => {
    let vivo = true;
    const creadas = [];
    (async () => {
      for (const f of fotos) {
        const blob = await asegurarFoto(f.id).catch(() => null);
        if (!vivo) return;
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        creadas.push(url);
        setUrls(prev => ({ ...prev, [f.id]: url }));
      }
    })();
    return () => { vivo = false; creadas.forEach(URL.revokeObjectURL); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const agregar = async e => {
    const archivos = Array.from(e.target.files || []);
    if (!archivos.length) return;
    setCargando(true);
    try {
      const nuevas = [];
      const cuando = new Date().toISOString();
      for (const file of archivos) {
        const id = uid();
        await guardarFoto({ id, tareaId, tipo, autor, file });
        nuevas.push({ id, tipo, autor, cuando });
      }
      const etiqueta = TIPOS_FOTO.find(t => t.id === tipo)?.label || tipo;
      onCambio([...fotos, ...nuevas], {
        accion: `${nuevas.length} foto${nuevas.length === 1 ? "" : "s"} añadida${nuevas.length === 1 ? "" : "s"} (${etiqueta})`,
      });
    } catch {
      alert("No se pudo guardar la foto. Revisa el espacio disponible en el teléfono.");
    } finally {
      setCargando(false);
      e.target.value = "";
    }
  };

  const quitar = async id => {
    await borrarFoto(id).catch(() => {});
    onCambio(fotos.filter(f => f.id !== id), { accion: "Foto eliminada" });
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
                ? <img src={urls[f.id]} alt={f.tipo} onClick={() => setAmpliada({ url: urls[f.id], tipo: f.tipo, autor: f.autor, cuando: f.cuando })} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }} />
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
        <div onClick={() => setAmpliada(null)} style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 16 }}>
          <img src={ampliada.url} alt="" style={{ maxWidth: "100%", maxHeight: "82%", objectFit: "contain" }} />
          <p style={{ margin: 0, color: "#fff", fontSize: 13, textAlign: "center" }}>
            {TIPOS_FOTO.find(t => t.id === ampliada.tipo)?.label || ampliada.tipo}
            {ampliada.autor ? ` · ${ampliada.autor}` : ""}
            {ampliada.cuando ? ` · ${horaLegible(ampliada.cuando)}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ── TARJETA DE TAREA ──────────────────────────────────────────────────────────
function TarjetaTarea({ tarea, nombreCliente, esTecnico, onAbrir, onIniciar, onCerrar, onFotos, onPublicar, compacta }) {
  const atrasada = estaAtrasada(tarea);
  const publicada = estaPublicada(tarea);
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
          {/* Las tareas son del equipo, no de una persona. Los nombres de los
              técnicos solo aparecen en el registro de quién cerró o subió qué. */}
          <p style={{ margin: 0, fontSize: 12, color: TEXT_SUB }}>👷 Técnicos</p>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <Badge text={tarea.estado} color={ESTADO_COLOR[tarea.estado] || TEXT_SUB} small />
          {!esTecnico && !publicada && <Badge text="Sin publicar" color={TEXT_SUB} small />}
          {atrasada && <Badge text="Atrasada" color={RED} small />}
          {tarea.prioridad !== "Normal" && <Badge text={tarea.prioridad} color={PRIORIDAD_COLOR[tarea.prioridad]} small />}
          {tarea.fotos?.length > 0 && <span style={{ fontSize: 11, color: TEXT_SUB, fontWeight: 700 }}>📷 {tarea.fotos.length}</span>}
        </div>
      </div>

      {/* Publicar es lo único que hace visible la tarea a los técnicos. No
          depende de a quién esté asignada: la ven todos. */}
      {!esTecnico && !publicada && estaAbierta(tarea) && (
        <div style={{ marginTop: 10 }}>
          <Btn onClick={onPublicar} color={ACENTOS.tareas} small full>📢 Publicar a los técnicos</Btn>
        </div>
      )}

      {estaAbierta(tarea) && (esTecnico || publicada) && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn onClick={onFotos} color={ACENTOS.tareas} outline small>📷</Btn>
          {tarea.estado === "Programada" && <Btn onClick={onIniciar} color={ORANGE} small full>▶ Iniciar</Btn>}
          <Btn onClick={onCerrar} color={GREEN} small full>✓ Finalizar tarea</Btn>
        </div>
      )}
    </Card>
  );
}

// ── MODAL: CREAR / EDITAR ─────────────────────────────────────────────────────
function ModalTarea({ form, setForm, clientes, onGuardar, onCerrar }) {
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

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
        <Inp label="Fecha" type="date" value={form.fecha} onChange={v => set("fecha", v)} />
        <Inp label="Hora" type="time" value={form.hora} onChange={v => set("hora", v)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label="Duración (días)" type="number" value={String(form.duracionDias ?? 1)} onChange={v => set("duracionDias", Math.max(1, Number(v) || 1))} />
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
      <h3 style={{ margin: "0 0 4px", color: GREEN }}>✓ Finalizar tarea</h3>
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

      <Fotos tareaId={tarea.id} fotos={tarea.fotos || []} onCambio={onFotos} autor={sesion?.nombre || "Oficina"} />

      {/* El técnico nunca ve ni toca importes: el costo lo lleva la oficina. */}
      {!esTecnico && <Inp label="Costo final ($)" type="number" value={costoFinal} onChange={setCostoFinal} />}

      <div style={{ background: BG_INPUT, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: TEXT_SUB }}>
        Se registrará automáticamente la fecha y hora junto con el nombre de quien realizó el trabajo.
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={confirmar} color={GREEN} full disabled={!quien || !trabajo.trim()}>Confirmar finalización</Btn>
        <Btn onClick={onCancelar} color={TEXT_SUB} outline full>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── GUARDAR EN LÍNEA ──────────────────────────────────────────────────────────
// Las anotaciones viajan solas en cuanto se escriben, pero las fotos pesan y
// pueden quedarse en cola sin señal. Este botón le da al técnico algo que
// pulsar y, sobre todo, una respuesta clara de si su trabajo ya está a salvo.
function GuardarEnLinea({ fotos }) {
  const [pendientes, setPendientes] = useState(0);
  const [estado, setEstado] = useState("");   // "" | "subiendo" | "ok" | "error"

  const ids = fotos.map(f => f.id);
  const clave = ids.join(",");

  const revisar = () => contarPendientes(ids).then(setPendientes).catch(() => {});

  // La subida ocurre en segundo plano al tomar la foto. Sin volver a mirar, el
  // aviso se quedaba en "sin subir" cuando ya estaba arriba, y un indicador que
  // miente es peor que no tenerlo. Se comprueba de nuevo mientras queden.
  useEffect(() => {
    revisar();
    const id = setInterval(() => {
      contarPendientes(ids).then(n => {
        setPendientes(n);
        if (n === 0) clearInterval(id);
      }).catch(() => {});
    }, 2500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // Al recuperar la conexión se reintenta solo, sin esperar a que pulse nada.
  useEffect(() => {
    const alVolver = () => subirPendientes().then(r => setPendientes(r.pendientes)).catch(() => {});
    window.addEventListener("online", alVolver);
    return () => window.removeEventListener("online", alVolver);
  }, []);

  const guardar = async () => {
    setEstado("subiendo");
    try {
      const r = await subirPendientes();
      setPendientes(r.pendientes);
      setEstado(r.pendientes === 0 ? "ok" : "error");
    } catch {
      setEstado("error");
      revisar();
    }
    setTimeout(() => setEstado(""), 4000);
  };

  const mensaje =
    estado === "subiendo" ? "Subiendo…" :
    estado === "ok"       ? "✓ Guardado en línea" :
    estado === "error"    ? `Sin conexión · ${pendientes} foto${pendientes === 1 ? "" : "s"} en espera` :
    pendientes > 0        ? `${pendientes} foto${pendientes === 1 ? "" : "s"} sin subir` :
                            "✓ Todo guardado en línea";

  const color = pendientes > 0 && estado !== "subiendo" ? ORANGE : GREEN;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: BG_INPUT, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 16 }}>
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color }}>{mensaje}</span>
      <Btn onClick={guardar} color={color} small disabled={estado === "subiendo"}>
        {pendientes > 0 ? "💾 Guardar" : "↻ Comprobar"}
      </Btn>
    </div>
  );
}

// ── OBSERVACIONES ─────────────────────────────────────────────────────────────
// Se acumulan en vez de sobrescribirse: cada nota queda firmada y fechada, de
// modo que la oficina puede leer lo que el técnico fue anotando durante el
// trabajo sin que una nota tape a la anterior.
function Observaciones({ notas, onAgregar, onBorrador, quien }) {
  const [texto, setTexto] = useState("");
  const escribir = v => { setTexto(v); onBorrador?.(v); };
  const agregar = () => { if (!texto.trim()) return; onAgregar(texto.trim()); escribir(""); };
  const pendiente = texto.trim().length > 0;

  return (
    <div style={{ marginBottom: 16 }}>
      <Etiqueta>💬 Observaciones {notas.length > 0 && `(${notas.length})`}</Etiqueta>

      {notas.length === 0 && (
        <p style={{ margin: "0 0 8px", fontSize: 12.5, color: TEXT_SUB }}>Todavía no hay observaciones.</p>
      )}

      {notas.map(n => (
        <div key={n.id} style={{ background: BG_INPUT, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
          <p style={{ margin: "0 0 4px", fontSize: 14 }}>{n.texto}</p>
          <p style={{ margin: 0, fontSize: 11, color: TEXT_SUB, fontWeight: 700 }}>{n.autor} · {horaLegible(n.cuando)}</p>
        </div>
      ))}

      <div style={{ marginTop: 12 }}>
        <Etiqueta>Comentarios</Etiqueta>
        <textarea value={texto} onChange={e => escribir(e.target.value)} rows={2}
          placeholder={`Escribe un comentario como ${quien}…`}
          style={{ ...estiloInput, resize: "vertical", marginBottom: 8,
                   borderColor: pendiente ? ORANGE : BORDER }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn onClick={agregar} color={pendiente ? ORANGE : ac} outline={!pendiente} small disabled={!pendiente}>
            + Añadir comentario
          </Btn>
          {pendiente && (
            <span style={{ fontSize: 11.5, color: ORANGE, fontWeight: 700 }}>Sin guardar todavía</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MODAL: DETALLE / HISTORIAL ────────────────────────────────────────────────
function ModalDetalle({ tarea, nombreCliente, sesion, onEditar, onReprogramar, onCancelarTarea, onFotos, onObservacion, onReabrir, onPublicar, onCerrar }) {
  const [nuevaFecha, setNuevaFecha] = useState(tarea.fecha);
  const [reprogramando, setReprogramando] = useState(false);
  const [confirmarReapertura, setConfirmarReapertura] = useState(false);
  const c = tarea.cierre;
  const esTecnico = sesion?.rol === "tecnico";

  // Un comentario escrito y no añadido se guardaba en silencio a la basura al
  // cerrar la ventana. Ahora se conserva: quien lo escribió quería dejarlo.
  const borrador = useRef("");
  const cerrarGuardando = () => {
    const pendiente = borrador.current.trim();
    if (pendiente) onObservacion(pendiente);
    borrador.current = "";
    onCerrar();
  };

  return (
    <Modal onClose={cerrarGuardando}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <h3 style={{ margin: 0, color: ac }}>{TIPO_ICONO[tarea.tipo]} {nombreCliente}</h3>
        <Badge text={tarea.estado} color={ESTADO_COLOR[tarea.estado] || TEXT_SUB} />
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: TEXT_SUB }}>{tarea.tipo} · {fechaLarga(tarea.fecha)} · {tarea.hora}</p>

      {/* Estado de publicación: lo primero que la oficina necesita ver, porque
          es lo que decide si los técnicos tienen la tarea o no. */}
      {!esTecnico && estaAbierta(tarea) && (
        <div style={{ background: estaPublicada(tarea) ? ACENTOS.tareas + "11" : BG_INPUT,
                      border: `1px solid ${estaPublicada(tarea) ? ACENTOS.tareas + "44" : BORDER}`,
                      borderRadius: 12, padding: "12px 14px", marginBottom: 14,
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: estaPublicada(tarea) ? ACENTOS.tareas : TEXT_SUB }}>
            {estaPublicada(tarea) ? "📢 Visible para los técnicos" : "🔒 En preparación · los técnicos no la ven"}
          </span>
          {estaPublicada(tarea)
            ? <Btn onClick={() => onPublicar(false)} color={TEXT_SUB} outline small>Retirar</Btn>
            : <Btn onClick={() => onPublicar(true)} color={ACENTOS.tareas} small>Publicar</Btn>}
        </div>
      )}

      <div style={{ background: BG_INPUT, borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, lineHeight: 1.7 }}>
        <div>👷 <b>Asignada a:</b> Técnicos</div>
        {tarea.modelo && <div>⚡ <b>Equipo:</b> {tarea.modelo}</div>}
        {tarea.direccion && <div>📍 <b>Dirección:</b> {tarea.direccion}</div>}
        <div>⏱️ <b>Duración prevista:</b> {textoDuracion(tarea)}</div>
        {/* Los técnicos nunca ven importes. */}
        {!esTecnico && <div>💵 <b>Costo:</b> {usd(c?.costoFinal ?? tarea.costo)}</div>}
      </div>

      {tarea.descripcion && (
        <div style={{ marginBottom: 16 }}>
          <Etiqueta>Qué hay que hacer</Etiqueta>
          <p style={{ margin: 0, fontSize: 14 }}>{tarea.descripcion}</p>
        </div>
      )}

      {c && (
        <div style={{ background: GREEN + "11", border: `1px solid ${GREEN}44`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 800, color: GREEN, fontSize: 13 }}>✓ FINALIZADA</p>
          <p style={{ margin: "0 0 6px", fontSize: 13 }}><b>Por:</b> {c.tecnicoNombre}</p>
          <p style={{ margin: "0 0 8px", fontSize: 13 }}><b>Cuándo:</b> {horaLegible(c.cerradaEn)}</p>
          <p style={{ margin: 0, fontSize: 14 }}>{c.trabajoRealizado}</p>
        </div>
      )}

      {/* Las fotos se pueden cargar en cualquier momento, no solo al cerrar:
          el técnico necesita documentar el "antes" apenas llega al sitio. */}
      {/* Una vez cerrada la tarea, el técnico ya no puede tocar las fotos: son
          la evidencia de lo que entregó. La oficina sí conserva el control. */}
      <Fotos tareaId={tarea.id} fotos={tarea.fotos || []} onCambio={onFotos} autor={sesion?.nombre || "Oficina"}
        soloLectura={tarea.estado === "Cancelada" || (esTecnico && !estaAbierta(tarea))} />

      <Observaciones notas={tarea.observaciones || []} onAgregar={onObservacion}
        onBorrador={v => { borrador.current = v; }} quien={sesion?.nombre || "Oficina"} />

      <GuardarEnLinea fotos={tarea.fotos || []} />

      {tarea.cierresPrevios?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Etiqueta>Finalizaciones anteriores</Etiqueta>
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
            La tarea volverá a estar programada. Lo ya registrado y sus fotos se conservan como historial.
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

      <Btn onClick={cerrarGuardando} color={TEXT_SUB} outline full>Cerrar</Btn>
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
  const [detalle, setDetalle]     = useState(null);
  const [form, setForm]           = useState(null);
  const [cerrando, setCerrando]   = useState(null);

  const esTecnico = sesion?.rol === "tecnico";
  const quienActua = sesion?.nombre || "Oficina";

  const nombreCliente = id => clientes.find(c => c.id === id)?.nombre || "— sin cliente —";

  // Los técnicos comparten la misma cartelera: todos ven todas las tareas que
  // la oficina haya publicado, estén asignadas a quien estén. El técnico
  // asignado es información de quién la lleva, no un muro de visibilidad.
  // Lo único que decide qué ve un técnico es que esté publicada.
  // No hay filtro por técnico: la lista es la misma para todos. Quién hizo qué
  // se sabe por el cierre y por el autor de cada foto y observación.
  const visibles = esTecnico ? tareas.filter(estaPublicada) : tareas;

  const deHoy     = visibles.filter(t => t.fecha === hoy()).sort(ordenarPorHora);
  const atrasadas = visibles.filter(estaAtrasada).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proximas  = visibles.filter(t => estaAbierta(t) && t.fecha > hoy()).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  const actualizar = (id, fn) => setTareas(p => p.map(t => t.id === id ? fn(t) : t));

  const iniciar = t => actualizar(t.id, x => registrar({ ...x, estado: "En proceso" }, "Iniciada", quienActua));

  const confirmarCierre = cierre => {
    actualizar(cerrando.id, x => registrar({ ...x, estado: "Completada", cierre }, "Finalizada", cierre.tecnicoNombre));
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

  const publicar = (t, valor) => actualizar(t.id, x => registrar(
    { ...x, publicada: valor },
    valor ? "Publicada a los técnicos" : "Retirada de la vista de los técnicos",
    quienActua,
  ));

  // El comentario se guarda y ademas deja huella en el historial, para que la
  // visita se pueda leer en orden sin ir saltando entre secciones.
  const agregarObservacion = (t, texto) => actualizar(t.id, x => registrar({
    ...x,
    observaciones: [...(x.observaciones || []), { id: uid(), texto, autor: quienActua, cuando: new Date().toISOString() }],
  }, "Comentario añadido", quienActua));

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

  const nueva = () => setForm({
    ...tareaVacia(clientes[0]?.id),
    fecha: vista === "semana" ? baseSemana : hoy(),
  });

  const tarjeta = t => (
    <TarjetaTarea key={t.id} tarea={t} esTecnico={esTecnico}
      nombreCliente={nombreCliente(t.clienteId)}
      onAbrir={() => setDetalle(t)} onIniciar={() => iniciar(t)} onCerrar={() => setCerrando(t)}
      onFotos={() => setDetalle(t)} onPublicar={() => publicar(t, true)} />
  );

  const vacio = texto => <p style={{ color: TEXT_SUB, textAlign: "center", padding: "30px 0", fontSize: 14 }}>{texto}</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ color: ac, margin: 0, fontSize: 18, fontWeight: 900 }}>{esTecnico ? "📅 Mi día" : "📅 Tareas"}</h2>
        {/* Crear tareas es de oficina. Además, una tarea nace sin publicar, así
            que si la creara un técnico desaparecería de su propia vista. */}
        {!esTecnico && <Btn onClick={nueva} color={ac} small>+ Nueva</Btn>}
      </div>

      <Chips value={vista} onChange={setVista} color={ac} opciones={[
        { value: "hoy",    label: `Hoy${deHoy.length ? ` (${deHoy.length})` : ""}` },
        { value: "semana", label: "Semana" },
        { value: "todas",  label: "Todas" },
      ]} />


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
        <ModalTarea form={form} setForm={setForm} clientes={clientes}
          onGuardar={guardar} onCerrar={() => setForm(null)} />
      )}

      {detalle && !form && !cerrando && (
        <ModalDetalle tarea={tareas.find(t => t.id === detalle.id) || detalle}
          nombreCliente={nombreCliente(detalle.clienteId)} sesion={sesion}
          onEditar={() => { setForm({ ...detalle }); setDetalle(null); }}
          onReprogramar={f => reprogramar(detalle, f)}
          onCancelarTarea={() => cancelarTarea(detalle)}
          onFotos={(fotos, info) => actualizar(detalle.id, x =>
            info?.accion ? registrar({ ...x, fotos }, info.accion, quienActua) : { ...x, fotos })}
          onObservacion={texto => agregarObservacion(detalle, texto)}
          onReabrir={() => reabrir(detalle)}
          onPublicar={valor => publicar(detalle, valor)}
          onCerrar={() => setDetalle(null)} />
      )}

      {cerrando && (
        <ModalCierre tarea={tareas.find(t => t.id === cerrando.id) || cerrando} tecnicos={tecnicos} sesion={sesion}
          onFotos={(fotos, info) => actualizar(cerrando.id, x =>
            info?.accion ? registrar({ ...x, fotos }, info.accion, quienActua) : { ...x, fotos })}
          onConfirmar={confirmarCierre} onCancelar={() => setCerrando(null)} />
      )}
    </div>
  );
}
