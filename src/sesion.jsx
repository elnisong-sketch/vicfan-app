import { useState } from "react";
import { NAVY, ORANGE, RED, BG_CARD, BORDER, TEXT_MAIN, TEXT_SUB, ACENTOS } from "./ui.jsx";

// Identificación por PIN, no cuentas con correo y contraseña.
//
// El objetivo aquí es RESPONSABILIDAD (que quede registrado quién cerró cada
// tarea), no seguridad contra un atacante: un técnico subido en una escalera
// no va a escribir un correo y una contraseña larga en el teléfono. Cuando
// haga falta seguridad real —o si algún día hay rotación de personal— esto se
// cambia por Firebase Auth sin tocar el resto de la app.

export const PIN_ADMIN_POR_DEFECTO = "9999";

function Tecla({ children, onClick, tenue }) {
  return (
    <button onClick={onClick}
      style={{ background: tenue ? "transparent" : BG_CARD, border: `1.5px solid ${tenue ? "transparent" : BORDER}`, borderRadius: 16, padding: "18px 0", fontSize: tenue ? 20 : 26, fontWeight: 700, color: tenue ? TEXT_SUB : TEXT_MAIN, cursor: "pointer", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}

export default function PantallaLogin({ tecnicos, pinAdmin, onEntrar }) {
  const [quien, setQuien] = useState(null);   // null | "admin" | id de técnico
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const identidades = [
    { id: "admin", nombre: "Oficina", detalle: "Acceso completo", color: NAVY, icono: "🏢" },
    ...tecnicos.map(t => ({ id: t.id, nombre: t.nombre, detalle: t.especialidad || "Técnico", color: ACENTOS.tareas, icono: "👷", pin: t.pin })),
  ];

  const elegida = identidades.find(i => i.id === quien);

  const teclear = d => {
    if (pin.length >= 4) return;
    const nuevo = pin + d;
    setPin(nuevo);
    setError(false);
    if (nuevo.length === 4) setTimeout(() => verificar(nuevo), 120);
  };

  const verificar = valor => {
    const esperado = quien === "admin" ? (pinAdmin || PIN_ADMIN_POR_DEFECTO) : elegida?.pin;
    if (valor === esperado) {
      onEntrar(quien === "admin"
        ? { rol: "admin", tecnicoId: null, nombre: "Oficina" }
        : { rol: "tecnico", tecnicoId: quien, nombre: elegida.nombre });
    } else {
      setError(true);
      setPin("");
    }
  };

  const volver = () => { setQuien(null); setPin(""); setError(false); };

  return (
    <div style={{ minHeight: "100vh", background: NAVY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ color: "#fff", margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: "-1.5px" }}>⚡ VICFAN</h1>
        <p style={{ color: "#94b4d4", margin: "2px 0 0", fontSize: 13 }}>Generadores GENERAC</p>
      </div>

      <div style={{ width: "100%", maxWidth: 340 }}>
        {!quien ? (
          <>
            <p style={{ color: "#94b4d4", fontSize: 13, fontWeight: 700, textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>¿Quién eres?</p>
            {identidades.map(i => (
              <button key={i.id} onClick={() => setQuien(i.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${i.color}`, borderRadius: 14, padding: "16px 18px", marginBottom: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                <span style={{ fontSize: 26 }}>{i.icono}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 800, fontSize: 16, color: TEXT_MAIN }}>{i.nombre}</span>
                  <span style={{ display: "block", fontSize: 12, color: TEXT_SUB }}>{i.detalle}</span>
                </span>
                <span style={{ color: TEXT_SUB, fontSize: 20 }}>›</span>
              </button>
            ))}
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <p style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: "0 0 2px" }}>{elegida.icono} {elegida.nombre}</p>
              <p style={{ color: error ? "#ff9a9a" : "#94b4d4", fontSize: 13, margin: 0 }}>
                {error ? "PIN incorrecto, intenta de nuevo" : "Ingresa tu PIN"}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 26 }}>
              {[0, 1, 2, 3].map(i => (
                <span key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: i < pin.length ? (error ? RED : ORANGE) : "#ffffff22", border: `2px solid ${i < pin.length ? (error ? RED : ORANGE) : "#ffffff33"}`, transition: "background 0.15s" }} />
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => <Tecla key={d} onClick={() => teclear(d)}>{d}</Tecla>)}
              <Tecla tenue onClick={volver}>‹</Tecla>
              <Tecla onClick={() => teclear("0")}>0</Tecla>
              <Tecla tenue onClick={() => { setPin(p => p.slice(0, -1)); setError(false); }}>⌫</Tecla>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
