// ── PALETA ────────────────────────────────────────────────────────────────────
export const NAVY      = "#0d1b2e";
export const ORANGE    = "#f26522";
export const GREEN     = "#10b981";
export const RED        = "#ef4444";
export const BG_APP    = "#f0f4f8";
export const BG_CARD   = "#ffffff";
export const BG_INPUT  = "#f8fafc";
export const BORDER    = "#e2e8f0";
export const TEXT_MAIN = "#1e293b";
export const TEXT_SUB  = "#64748b";

export const ACENTOS = {
  inicio:       NAVY,
  clientes:     "#6366f1",
  cotizaciones: "#f26522",
  ventas:       "#10b981",
  tareas:       "#0ea5e9",
  inventario:   "#8b5cf6",
  garantias:    "#ec4899",
  admin:        "#64748b",
};

export const ESTADO_COLOR = {
  "Pendiente": "#f59e0b", "Aprobada": GREEN, "Rechazada": RED,
  "Cobrada": GREEN, "Pendiente cobro": "#f59e0b", "Cancelada": RED,
  "Programada": "#0ea5e9", "En proceso": ORANGE, "Completada": GREEN,
  "Vigente": GREEN, "Vencida": RED,
};

export const PRIORIDAD_COLOR = { "Normal": TEXT_SUB, "Alta": "#f59e0b", "Urgente": RED };

// ── HELPERS DE FECHA ──────────────────────────────────────────────────────────
// Se ancla el mediodía para que el cambio de huso horario nunca corra el día.
const aFecha = iso => new Date(`${iso}T12:00:00`);
const aISO   = d => d.toISOString().split("T")[0];

export const hoy = () => aISO(new Date(new Date().setHours(12, 0, 0, 0)));
export const dn  = n => sumarDias(hoy(), -n);
export const sumarDias = (iso, n) => { const d = aFecha(iso); d.setDate(d.getDate() + n); return aISO(d); };
/** Lunes de la semana a la que pertenece `iso`. */
export const inicioSemana = iso => sumarDias(iso, -((aFecha(iso).getDay() + 6) % 7));
export const nombreDia = iso => ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][(aFecha(iso).getDay() + 6) % 7];
export const diaDelMes = iso => aFecha(iso).getDate();
export const fechaLarga = iso => aFecha(iso).toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" });
export const fechaCorta = iso => aFecha(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "short" });
export const esHoy = iso => iso === hoy();
export const esPasado = iso => iso < hoy();
export const horaLegible = ts => new Date(ts).toLocaleString("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// ── HELPERS VARIOS ────────────────────────────────────────────────────────────
export const usd = n => `$${Number(n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const uid = () => Math.random().toString(36).slice(2, 10);
export const cargarLS = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };

// ── COMPONENTES BASE ──────────────────────────────────────────────────────────
export function Badge({ text, color, small }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: small ? "2px 8px" : "3px 10px", fontSize: small ? 11 : 12, fontWeight: 700, whiteSpace: "nowrap" }}>{text}</span>;
}

export function Btn({ onClick, color = NAVY, children, outline, full, small, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: outline ? "transparent" : color, border: `1.5px solid ${color}`, color: outline ? color : "#fff", borderRadius: 50, padding: small ? "8px 18px" : "12px 28px", fontWeight: 600, fontSize: small ? 13 : 14, cursor: disabled ? "not-allowed" : "pointer", width: full ? "100%" : undefined, fontFamily: "'Inter', 'Helvetica Neue', sans-serif", letterSpacing: "0.01em", opacity: disabled ? 0.45 : 1 }}>
      {children}
    </button>
  );
}

export function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, marginBottom: 10, boxShadow: "0 1px 4px #0001", ...style }}>{children}</div>;
}

const baseInput = { width: "100%", background: BG_INPUT, border: `1.5px solid ${BORDER}`, borderRadius: 10, color: TEXT_MAIN, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
export const estiloInput = baseInput;

export function Etiqueta({ children }) {
  return <label style={{ fontSize: 12, fontWeight: 700, color: TEXT_SUB, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{children}</label>;
}

export function Inp({ label, value, onChange, type = "text", placeholder, style }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Etiqueta>{label}</Etiqueta>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...baseInput, ...style }} />
    </div>
  );
}

export function Area({ label, value, onChange, placeholder, filas = 3 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Etiqueta>{label}</Etiqueta>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={filas} style={{ ...baseInput, resize: "vertical" }} />
    </div>
  );
}

export function Sel({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Etiqueta>{label}</Etiqueta>}
      <select value={value} onChange={e => onChange(e.target.value)} style={baseInput}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/** Fila de botones-pastilla para filtrar. `opciones` = [{ value, label }] */
export function Chips({ value, onChange, opciones, color }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 12, scrollbarWidth: "none" }}>
      {opciones.map(o => {
        const activo = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{ flex: "0 0 auto", background: activo ? color : BG_CARD, color: activo ? "#fff" : TEXT_SUB, border: `1.5px solid ${activo ? color : BORDER}`, borderRadius: 50, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
