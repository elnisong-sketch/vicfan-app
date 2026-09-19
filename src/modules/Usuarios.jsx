import { useState } from "react";
import { ACENTOS, BG_INPUT, BORDER, TEXT_SUB, RED, Badge, Btn, Card, Inp, Sel, Modal } from "../ui.jsx";
import { useAccesos, crearUsuario, quitarAcceso, cambiarClave, mensajeDeError } from "../auth.js";

const ac = ACENTOS.admin;

// ── Cambiar la contraseña de alguien que ya existe ────────────────────────────
function ModalClave({ persona, propia, onCerrar }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState(false);

  const distintas = repetida && nueva !== repetida;
  const valido = actual && nueva.length >= 6 && nueva === repetida && nueva !== actual;

  const guardar = async () => {
    if (!valido) return;
    setGuardando(true);
    setError("");
    try {
      await cambiarClave({ correo: persona.correo, actual, nueva });
      setHecho(true);
    } catch (err) {
      const c = err?.code;
      setError(c === "auth/invalid-credential" || c === "auth/wrong-password"
        ? "La contraseña actual no es correcta."
        : mensajeDeError(c));
    } finally {
      setGuardando(false);
    }
  };

  if (hecho) {
    return (
      <Modal onClose={onCerrar}>
        <h3 style={{ margin: "0 0 12px", color: ac }}>✅ Contraseña cambiada</h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
          {propia
            ? "Desde ahora entras con tu contraseña nueva."
            : <>A partir de ahora <b>{persona.nombre}</b> entra con la contraseña nueva. Si tenía la app abierta en su móvil, le pedirá que vuelva a entrar.</>}
        </p>
        <Btn onClick={onCerrar} color={ac} full>Entendido</Btn>
      </Modal>
    );
  }

  const tipo = ver ? "text" : "password";
  return (
    <Modal onClose={() => !guardando && onCerrar()}>
      <h3 style={{ margin: "0 0 4px", color: ac }}>🔑 Cambiar contraseña</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: TEXT_SUB }}>{persona.nombre} · {persona.correo}</p>

      <Inp label={propia ? "Tu contraseña actual" : "Contraseña actual"} type={tipo} value={actual} onChange={setActual} />
      <Inp label="Contraseña nueva (mínimo 6 caracteres)" type={tipo} value={nueva} onChange={setNueva} />
      <Inp label="Repite la contraseña nueva" type={tipo} value={repetida} onChange={setRepetida} />

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TEXT_SUB, margin: "-4px 0 14px", cursor: "pointer" }}>
        <input type="checkbox" checked={ver} onChange={e => setVer(e.target.checked)} style={{ width: 16, height: 16 }} />
        Mostrar las contraseñas
      </label>

      {distintas && <p style={{ color: RED, fontSize: 12.5, fontWeight: 600, margin: "-6px 0 12px" }}>Las dos contraseñas nuevas no coinciden.</p>}
      {!distintas && nueva && actual && nueva === actual && <p style={{ color: RED, fontSize: 12.5, fontWeight: 600, margin: "-6px 0 12px" }}>La nueva tiene que ser distinta de la actual.</p>}

      {!propia && (
        <div style={{ background: BG_INPUT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: TEXT_SUB, lineHeight: 1.6 }}>
          Hace falta la contraseña que tiene ahora: sin un servidor propio, Firebase no deja cambiarla sin ella.
          Si nadie la recuerda, crea un usuario nuevo para esa persona y retira este.
        </div>
      )}

      {error && (
        <p style={{ background: RED + "11", border: `1px solid ${RED}44`, borderRadius: 10, color: RED, fontSize: 13, fontWeight: 600, padding: "10px 12px", margin: "0 0 12px" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={guardar} color={ac} full disabled={guardando || !valido}>{guardando ? "Cambiando…" : "Cambiar contraseña"}</Btn>
        <Btn onClick={onCerrar} color={TEXT_SUB} outline full disabled={guardando}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

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
  const [cambiando, setCambiando] = useState(null);   // persona a la que se cambia la contraseña

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
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch", flex: "0 0 auto" }}>
              <Btn onClick={() => setCambiando(a)} color={ac} outline small>🔑 Contraseña</Btn>
              {a.correo !== correoPropio && (
                <Btn onClick={() => quitar(a)} color={RED} outline small>Retirar</Btn>
              )}
            </div>
          </div>
        </Card>
      ))}

      <p style={{ margin: "8px 2px 0", fontSize: 11.5, color: TEXT_SUB, lineHeight: 1.6 }}>
        Quien no aparezca en esta lista no puede leer nada, aunque tenga una cuenta.
      </p>

      {cambiando && (
        <ModalClave persona={cambiando} propia={cambiando.correo === correoPropio} onCerrar={() => setCambiando(null)} />
      )}

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
