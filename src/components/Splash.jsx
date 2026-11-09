import { useEffect, useState, useCallback } from "react";

const CLAVE = "splash_feria_visto";

export const LOGOS = [
  { src: "/logos/uta.png", alt: "Universidad de Tarapacá", h: "h-16 sm:h-24", hero: "h-10 sm:h-14" },
  { src: "/logos/puerto-iquique.png", alt: "Puerto Iquique, en el centro de Sudamérica", h: "h-20 sm:h-28", hero: "h-12 sm:h-16" },
  { src: "/logos/iti.png", alt: "ITI, Iquique Terminal Internacional", h: "h-24 sm:h-32", hero: "h-14 sm:h-20" },
];

const yaVisto = () => {
  try {
    return sessionStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
};

// Pantalla de bienvenida: se muestra una vez por sesión al abrir la portada.
// Se cierra sola, con un toque, con cualquier tecla o con el botón "Entrar".
export default function Splash() {
  const [montado, setMontado] = useState(() => !yaVisto());
  const [saliendo, setSaliendo] = useState(false);

  const cerrar = useCallback(() => {
    setSaliendo((s) => {
      if (s) return s;
      try {
        sessionStorage.setItem(CLAVE, "1");
      } catch {
        /* sin almacenamiento: se mostrará de nuevo, no es grave */
      }
      return true;
    });
  }, []);

  // Cierre automático
  useEffect(() => {
    if (!montado) return;
    const t = setTimeout(cerrar, 3600);
    return () => clearTimeout(t);
  }, [montado, cerrar]);

  // Desmontar cuando termina la salida
  useEffect(() => {
    if (!saliendo) return;
    const t = setTimeout(() => setMontado(false), 700);
    return () => clearTimeout(t);
  }, [saliendo]);

  // Teclado y bloqueo del scroll mientras está visible
  useEffect(() => {
    if (!montado) return;
    const alTeclado = () => cerrar();
    window.addEventListener("keydown", alTeclado);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alTeclado);
      document.body.style.overflow = previo;
    };
  }, [montado, cerrar]);

  if (!montado) return null;

  return (
    <div
      role="dialog"
      aria-label="Bienvenida a la Feria de Ciencias"
      onClick={cerrar}
      className={`splash fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center px-6 cursor-pointer select-none ${
        saliendo ? "splash-salida" : ""
      }`}
    >
      <p className="splash-item font-display text-6xl sm:text-8xl md:text-9xl font-black uppercase leading-[0.9] text-center text-slate-900" style={{ "--i": 0 }}>
        Feria de <span className="text-[#0b6e99]">Ciencias</span> 2026
      </p>

      <div className="mt-12 sm:mt-16 flex flex-wrap items-end justify-center gap-x-10 sm:gap-x-16 gap-y-8">
        {LOGOS.map((l, i) => (
          <img
            key={l.src}
            src={l.src}
            alt={l.alt}
            className={`splash-item w-auto ${l.h} object-contain`}
            style={{ "--i": i + 1 }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          cerrar();
        }}
        className="splash-item mt-14 px-8 py-3.5 bg-[#0b6e99] text-white font-tech text-sm font-bold uppercase tracking-widest rounded-sm hover:bg-[#095a7d] transition-colors cursor-pointer"
        style={{ "--i": 5 }}
      >
        Entrar
      </button>
    </div>
  );
}
