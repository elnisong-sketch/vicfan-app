import { useState, useEffect } from "react";
import { ACENTOS, BG_CARD, BORDER, TEXT_MAIN, TEXT_SUB, Btn } from "./ui.jsx";

// Invitación a instalar la app en la pantalla de inicio.
//
// Sin esto nadie descubre que se puede: el navegador de Android esconde la
// opción en un menú, y en iPhone directamente no avisa. Y la diferencia es
// real — instalada abre a pantalla completa, con su icono, sin barra de
// direcciones y con acceso sin conexión.

const CLAVE_DESCARTADO = "vf_instalar_descartado";

const yaInstalada = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

const esIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

export default function AvisoInstalar() {
  const [evento, setEvento] = useState(null);     // Android/Chrome
  const [mostrarIOS, setMostrarIOS] = useState(false);
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem(CLAVE_DESCARTADO) === "1"; } catch { return false; }
  });

  useEffect(() => {
    if (yaInstalada()) return;

    // Android y escritorio: el navegador avisa de que se puede instalar.
    const alPoder = e => { e.preventDefault(); setEvento(e); };
    window.addEventListener("beforeinstallprompt", alPoder);

    // iPhone nunca lanza ese aviso: hay que explicarle al usuario el camino.
    if (esIOS()) setMostrarIOS(true);

    return () => window.removeEventListener("beforeinstallprompt", alPoder);
  }, []);

  const descartar = () => {
    setOculto(true);
    try { localStorage.setItem(CLAVE_DESCARTADO, "1"); } catch {}
  };

  const instalar = async () => {
    if (!evento) return;
    evento.prompt();
    await evento.userChoice.catch(() => {});
    setEvento(null);
  };

  if (oculto || yaInstalada() || (!evento && !mostrarIOS)) return null;

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${ACENTOS.tareas}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 14, color: TEXT_MAIN }}>📲 Instala VICFAN en tu móvil</p>
          <p style={{ margin: 0, fontSize: 12.5, color: TEXT_SUB, lineHeight: 1.55 }}>
            {evento
              ? "Se abre a pantalla completa, con su icono, y funciona aunque te quedes sin señal."
              : "Toca el botón de compartir de Safari y elige “Añadir a pantalla de inicio”."}
          </p>
        </div>
        <button onClick={descartar} aria-label="Descartar"
          style={{ background: "none", border: "none", color: TEXT_SUB, fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
      </div>
      {evento && (
        <div style={{ marginTop: 10 }}>
          <Btn onClick={instalar} color={ACENTOS.tareas} small full>Instalar</Btn>
        </div>
      )}
    </div>
  );
}
