import { useState } from "react";
import { NAVY, ORANGE, BG_CARD, BORDER, TEXT_MAIN, TEXT_SUB } from "./ui.jsx";
import { entrar, mensajeDeError } from "./auth.js";

// Pantalla de acceso.
//
// Se entra una sola vez por dispositivo: la sesión queda guardada aunque se
// cierre el navegador o se reinicie el móvil. Por eso compensa pedir correo y
// contraseña en vez de un PIN — la fricción se paga una vez y a cambio el
// servidor sabe de verdad quién es cada quien.

const campo = {
  width: "100%", background: BG_CARD, border: `1.5px solid ${BORDER}`, borderRadius: 12,
  color: TEXT_MAIN, padding: "14px 16px", fontSize: 16, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit", marginBottom: 12,
};

export default function PantallaLogin() {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  const enviar = async e => {
    e.preventDefault();
    if (!correo.trim() || !clave) return;
    setEntrando(true);
    setError("");
    try {
      await entrar(correo, clave);
      // No hace falta hacer nada más: el estado de sesión avisa a la app.
    } catch (err) {
      setError(mensajeDeError(err?.code));
      setEntrando(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: NAVY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 style={{ color: "#fff", margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: "-1.5px" }}>⚡ VICFAN</h1>
        <p style={{ color: "#94b4d4", margin: "2px 0 0", fontSize: 13 }}>Generadores GENERAC</p>
      </div>

      <form onSubmit={enviar} style={{ width: "100%", maxWidth: 340 }}>
        <label style={{ display: "block", color: "#94b4d4", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Correo</label>
        <input
          type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off"
          value={correo} onChange={e => setCorreo(e.target.value)}
          placeholder="tucorreo@ejemplo.com" style={campo} disabled={entrando}
        />

        <label style={{ display: "block", color: "#94b4d4", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Contraseña</label>
        <div style={{ position: "relative" }}>
          <input
            type={verClave ? "text" : "password"} autoComplete="current-password"
            value={clave} onChange={e => setClave(e.target.value)}
            placeholder="••••••••" style={{ ...campo, paddingRight: 74 }} disabled={entrando}
          />
          {/* En un móvil, con una mano y guantes, escribir a ciegas es la
              primera causa de "no me deja entrar". */}
          <button type="button" onClick={() => setVerClave(v => !v)}
            style={{ position: "absolute", right: 12, top: 13, background: "none", border: "none", color: TEXT_SUB, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {verClave ? "Ocultar" : "Ver"}
          </button>
        </div>

        {error && (
          <p style={{ background: "#ffffff18", border: "1px solid #ff9a9a55", borderRadius: 10, color: "#ff9a9a", fontSize: 13, fontWeight: 600, padding: "10px 12px", margin: "2px 0 12px" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={entrando || !correo.trim() || !clave}
          style={{ width: "100%", background: entrando ? "#ffffff33" : ORANGE, border: "none", borderRadius: 50, color: "#fff", padding: "15px", fontSize: 16, fontWeight: 700, cursor: entrando ? "default" : "pointer", fontFamily: "inherit" }}>
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p style={{ color: "#94b4d4", fontSize: 12, marginTop: 24, textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>
        Solo tienes que entrar una vez en este teléfono.<br />
        ¿No tienes cuenta? Pídesela a la oficina.
      </p>
    </div>
  );
}
