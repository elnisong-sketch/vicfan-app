import { useState } from "react";
import { ACENTOS, TEXT_SUB, RED, Btn, Inp, Area, Sel, Modal, Chips, Etiqueta, estiloInput } from "../ui.jsx";
import { tareaVacia, ETIQUETA_ORIGEN } from "./Tareas.jsx";
import { NuevoCliente } from "./Cotizaciones.jsx";

// Alta de inspecciones, compartida por la oficina y los técnicos. Hay dos
// clases: la que se hace para preparar un proyecto (ver dónde va el equipo,
// qué potencia hace falta) y la de diagnóstico, cuando un cliente llama porque
// su equipo falla. Por dentro se siguen llamando por su origen de siempre.

const ac = ACENTOS.operaciones;

// ── Cliente: elegir uno o crearlo sin salir ────────────────────────────────────
export function SelectorCliente({ clientes, valor, onCambio, onCrear }) {
  const [creando, setCreando] = useState(false);
  if (creando) {
    return <NuevoCliente onCrear={c => { onCrear(c); onCambio(c.id, c); setCreando(false); }} onCancelar={() => setCreando(false)} />;
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <Etiqueta>Cliente</Etiqueta>
      <select value={valor} style={estiloInput}
        onChange={e => e.target.value === "__nuevo__" ? setCreando(true) : onCambio(e.target.value, clientes.find(c => c.id === e.target.value))}>
        <option value="">— Selecciona un cliente —</option>
        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        <option value="__nuevo__">➕ Crear cliente nuevo…</option>
      </select>
    </div>
  );
}

// ── Nueva inspección ───────────────────────────────────────────────────────────
export function ModalInspeccion({ origen = "Visita comercial", clientes, onCrearCliente, onGuardar, onCerrar, esTecnico, autor }) {
  const [f, setF] = useState({
    ...tareaVacia(""),
    tipo: "Inspección",
    origen,
    prioridad: origen === "Incidencia del cliente" ? "Alta" : "Normal",
    // Un diagnóstico suele ser urgente: se propone publicarlo ya. La que lo
    // crea un técnico se publica siempre, o desaparecería de su propia vista.
    publicada: esTecnico || origen === "Incidencia del cliente",
    creadaPor: autor || "Oficina",
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const falla = f.origen === "Incidencia del cliente";
  const color = falla ? RED : ac;

  const cambiarClase = o => setF(p => ({
    ...p,
    origen: o,
    prioridad: o === "Incidencia del cliente" ? "Alta" : "Normal",
    publicada: esTecnico || o === "Incidencia del cliente",
  }));
  const elegirCliente = (id, c) => setF(p => ({ ...p, clienteId: id, direccion: p.direccion || c?.direccion || "" }));

  return (
    <Modal onClose={onCerrar}>
      <h3 style={{ margin: "0 0 14px", color }}>Nueva inspección</h3>
      <Chips value={f.origen} onChange={cambiarClase} color={color}
        opciones={Object.entries(ETIQUETA_ORIGEN).map(([value, label]) => ({ value, label }))} />

      <SelectorCliente clientes={clientes} valor={f.clienteId} onCambio={elegirCliente} onCrear={onCrearCliente} />

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
        <Inp label="Fecha de la visita" type="date" value={f.fecha} onChange={v => set("fecha", v)} />
        <Inp label="Hora" type="time" value={f.hora} onChange={v => set("hora", v)} />
      </div>
      <Inp label="Dirección" value={f.direccion} onChange={v => set("direccion", v)} />
      <Inp label={falla ? "Equipo con la falla" : "Equipo (si ya se sabe)"} value={f.modelo} onChange={v => set("modelo", v)} placeholder="Generac 22kW…" />
      <Area label={falla ? "¿Qué falla reporta el cliente?" : "Motivo de la visita"} value={f.descripcion} onChange={v => set("descripcion", v)}
        placeholder={falla ? "No arranca, hace ruido, se apaga sola, código de error…" : "Evaluar dónde instalar, qué potencia necesita…"} />
      <Sel label="Prioridad" value={f.prioridad} onChange={v => set("prioridad", v)} options={["Normal", "Alta", "Urgente"].map(p => ({ value: p, label: p }))} />

      {esTecnico ? (
        <p style={{ fontSize: 12, color: TEXT_SUB, lineHeight: 1.6, margin: "0 0 16px" }}>
          La verán el resto de técnicos y la oficina, que decidirá qué hacer cuando la finalices.
        </p>
      ) : (
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={f.publicada} onChange={e => set("publicada", e.target.checked)} style={{ width: 18, height: 18 }} />
          Publicarla ya a los técnicos
        </label>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={() => onGuardar(f)} color={color} full disabled={!f.clienteId}>Crear</Btn>
        <Btn onClick={onCerrar} color={TEXT_SUB} outline full>Cancelar</Btn>
      </div>
    </Modal>
  );
}
