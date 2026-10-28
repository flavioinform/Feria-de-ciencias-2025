import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Hero() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date("2026-11-20T09:00:00");

    const updateTimer = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative flex items-center justify-center min-h-[85vh] w-full overflow-hidden bg-white px-6 py-20 border-b border-[#0b6e99]/15">

      <div className="relative z-10 max-w-5xl w-full flex flex-col md:flex-row items-center justify-between gap-12 select-none">

        {/* ── COLUMNA IZQUIERDA: Cuenta Regresiva ── */}
        <div className="flex flex-col gap-6 max-w-[420px] w-full text-left order-2 md:order-1">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center relative select-none">
              <svg className="w-9 h-9 text-[#0b6e99]" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                {/* Nucleus with pulse animation */}
                <circle cx="50" cy="50" r="7" fill="#0b6e99" className="animate-pulse" />

                {/* 3 electron orbits spinning infinitely around the center */}
                <g className="animate-[spin_4s_linear_infinite] origin-center" style={{ transformOrigin: '50px 50px' }}>
                  <ellipse cx="50" cy="50" rx="38" ry="12" strokeWidth="2.2" stroke="#0b6e99" />
                </g>
                <g className="animate-[spin_7s_linear_infinite] origin-center" style={{ transformOrigin: '50px 50px' }}>
                  <ellipse cx="50" cy="50" rx="38" ry="12" strokeWidth="2.2" stroke="#0b6e99" transform="rotate(60 50 50)" />
                </g>
                <g className="animate-[spin_10s_linear_infinite] origin-center" style={{ transformOrigin: '50px 50px' }}>
                  <ellipse cx="50" cy="50" rx="38" ry="12" strokeWidth="2.2" stroke="#0b6e99" transform="rotate(120 50 50)" />
                </g>
              </svg>
            </div>
            <span className="font-display text-lg font-black text-[#0b6e99] select-none">
              Edición 2026
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="font-display text-5xl sm:text-6xl font-black text-slate-900 leading-[0.95] tracking-tight">
              20 de noviembre
            </p>
            <p className="text-base font-semibold text-slate-700">
              Cuenta regresiva oficial
            </p>
          </div>

          {/* Cuenta regresiva: bloques planos, el número manda */}
          <div
            role="timer"
            aria-label={`Faltan ${timeLeft.days} días, ${timeLeft.hours} horas, ${timeLeft.minutes} minutos y ${timeLeft.seconds} segundos para la feria`}
            className="grid grid-cols-4 gap-3 select-none"
          >
            {[
              { label: "Días", value: timeLeft.days },
              { label: "Horas", value: timeLeft.hours },
              { label: "Minutos", value: timeLeft.minutes },
              { label: "Segundos", value: timeLeft.seconds },
            ].map((unit) => (
              <div
                key={unit.label}
                className="bg-[#0b6e99]/10 hover:bg-[#0b6e99]/15 rounded-xl px-1 py-4 flex flex-col items-center justify-center transition-colors duration-300"
              >
                <span
                  aria-hidden="true"
                  className="text-4xl sm:text-5xl font-display font-black text-slate-900 leading-none tabular-nums"
                >
                  {String(unit.value).padStart(2, "0")}
                </span>
                <span className="text-sm font-bold text-[#095a7e] mt-2">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* ── COLUMNA DERECHA: Títulos Gigantes y Botones ── */}
        <div className="flex-1 flex flex-col items-center md:items-end text-center md:text-right order-1 md:order-2 w-full">

          <div className="relative mb-8">
            {/* Outline 0 Excuses o similar en el fondo */}
            <div className="absolute -top-16 md:-right-8 text-[180px] sm:text-[240px] font-display font-black text-transparent leading-none pointer-events-none select-none"
              style={{ WebkitTextStroke: "1px rgba(11,110,153, 0.08)" }}>
              UTA
            </div>

            <h1 className="font-display text-6xl sm:text-8xl md:text-9xl font-black text-slate-900 leading-[0.85] tracking-tight relative z-10">
              <span className="block text-slate-900">
                FERIA DE
              </span>
              <span className="block text-transparent stroke-2" style={{ WebkitTextStroke: "2px #0b6e99" }}>
                CIENCIAS
              </span>
            </h1>
          </div>

          <p className="font-tech text-xs sm:text-sm text-[#0b6e99] uppercase tracking-[0.3em] mb-4">
            Universidad de Tarapacá — Chile
          </p>

          <div className="font-tech text-[10px] sm:text-xs text-slate-450 uppercase tracking-widest mb-12 flex flex-wrap justify-center md:justify-end gap-x-4 gap-y-1.5 select-none">
            <span><span className="text-[#0b6e99] font-bold">Profesores:</span> Olga Penagos y Patricio Soto</span>
          </div>

          {/* Botones de acción Brutalistas */}
          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto z-20">
            <Link
              to="/alumno/login"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-[#0b6e99] text-slate-900 hover:bg-[#0b6e99] hover:text-white font-tech text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[4px_4px_0px_#0b6e99] hover:shadow-[0px_0px_0px_transparent] active:translate-x-1 active:translate-y-1 text-center"
            >
              Portal del Alumno
            </Link>

            {/* <Link
              to="/registro-participante"
              className="w-full sm:w-auto px-8 py-4 bg-[#050505] border-2 border-white text-white hover:bg-white hover:text-[#050505] font-tech text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[4px_4px_0px_#ffffff] hover:shadow-[0px_0px_0px_transparent] active:translate-x-1 active:translate-y-1 text-center"
            >
              Registrar Proyecto
            </Link> */}
          </div>
        </div>

      </div>

    </section>
  );
}

export default Hero;
