import { useState } from "react";
import { ACENTOS, BG_INPUT, BORDER, TEXT_SUB, RED, Badge, Btn, Card, Inp, Sel, Modal } from "../ui.jsx";
import { useAccesos, crearUsuario, quitarAcceso, mensajeDeError } from "../auth.js";

const ac = ACENTOS.admin;

const ROLES = [
  { value: "tecnico", label: "👷 Técnico — solo sus tareas, sin importes" },
  { value: "admin",   label: "🏢 Oficina — acceso completo" },
];

/** Alta y baja de las personas que pueden entrar. Solo la oficina llega aquí. */
export default function Usuarios({ correoPropio }) {
  const accesos = useAccesos(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", correo: "", clave: "", rol: "tecnico" });
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const abrir = () => { setForm({ nombre: "", correo: "", clave: "", rol: "tecnico" }); setError(""); setModal(true); };

  const crear = async () => {
    if (!form.nombre.trim() || !form.correo.trim() || form.clave.length < 6) return;
    setCreando(true);
    setError("");
    try {
      await crearUsuario(form);
      setModal(false);
    } catch (err) {
      setError(mensajeDeError(err?.code));
    } finally {
      setCreando(false);
    }
  };

  const quitar = async a => {
    if (a.correo === correoPropio) return;
    if (!confirm(`¿Retirar el acceso de ${a.nombre}?\n\nNo podrá entrar más. Lo que ya hizo se conserva en el historial de las tareas.`)) return;
    await quitarAcceso(a.correo).catch(() => alert("No se pudo retirar el acceso."));
  };

  const ordenados = [...accesos].sort((a, b) =>
    a.rol === b.rol ? (a.nombre || "").localeCompare(b.nombre || "") : a.rol === "admin" ? -1 : 1);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 10px" }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>🔑 Usuarios y accesos</h3>
        <Btn onClick={abrir} color={ac} small>+ Nuevo</Btn>
      </div>

      {ordenados.length === 0 && (
        <Card><p style={{ margin: 0, fontSize: 13, color: TEXT_SUB }}>Cargando accesos…</p></Card>
      )}

      {ordenados.map(a => (
        <Card key={a.correo}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700 }}>
                {a.nombre} {a.correo === correoPropio && <span style={{ fontSize: 11, color: TEXT_SUB, fontWeight: 600 }}>(tú)</span>}
              </p>
              <p style={{ margin: "0 0 6px", fontSize: 12.5, color: TEXT_SUB, overflowWrap: "anywhere" }}>{a.correo}</p>
              <Badge text={a.rol === "admin" ? "Oficina" : "Técnico"} color={a.rol === "admin" ? ACENTOS.admin : ACENTOS.tareas} small />
            </div>
            {a.correo !== correoPropio && (
              <Btn onClick={() => quitar(a)} color={RED} outline small>Retirar</Btn>
            )}
          </div>
        </Card>
      ))}

      <p style={{ margin: "8px 2px 0", fontSize: 11.5, color: TEXT_SUB, lineHeight: 1.6 }}>
        Quien no aparezca en esta lista no puede leer nada, aunque tenga una cuenta.
      </p>

      {modal && (
        <Modal onClose={() => !creando && setModal(false)}>
          <h3 style={{ margin: "0 0 16px", color: ac }}>Nuevo usuario</h3>

          <Inp label="Nombre" value={form.nombre} onChange={v => set("nombre", v)}
            placeholder="Técnico 3" />
          <Inp label="Correo" type="email" value={form.correo} onChange={v => set("correo", v)}
            placeholder="tecnico3@vicfan.app" />
          <Inp label="Contraseña (mínimo 6 caracteres)" value={form.clave} onChange={v => set("clave", v)}
            placeholder="••••••" />
          <Sel label="Permisos" value={form.rol} onChange={v => set("rol", v)} options={ROLES} />

          <div style={{ background: BG_INPUT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: TEXT_SUB, lineHeight: 1.6 }}>
            El correo no tiene que existir de verdad: sirve de identificador para entrar.
            Apunta la contraseña y dásela en mano — no hay forma de recuperarla desde aquí.
          </div>

          {error && (
            <p style={{ background: RED + "11", border: `1px solid ${RED}44`, borderRadius: 10, color: RED, fontSize: 13, fontWeight: 600, padding: "10px 12px", margin: "0 0 12px" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={crear} color={ac} full
              disabled={creando || !form.nombre.trim() || !form.correo.trim() || form.clave.length < 6}>
              {creando ? "Creando…" : "Crear usuario"}
            </Btn>
            <Btn onClick={() => setModal(false)} color={TEXT_SUB} outline full disabled={creando}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
