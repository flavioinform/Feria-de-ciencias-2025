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
    const targetDate = new Date("2026-07-03T09:00:00");

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
    <section className="relative flex items-center justify-center min-h-[85vh] w-full overflow-hidden bg-brutalist-noise px-6 py-20 border-b border-[#db2777]/15">

      {/* Glows de Fondo Neon Rosa */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#db2777]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#db2777]/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Rejilla de Fondo Brutalista */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#db2777_1px,transparent_1px),linear-gradient(to_bottom,#db2777_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full flex flex-col md:flex-row items-center justify-between gap-12 select-none">

        {/* ── COLUMNA IZQUIERDA: Cuenta Regresiva ── */}
        <div className="flex flex-col gap-6 max-w-[340px] w-full text-left order-2 md:order-1">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center relative select-none">
              <svg className="w-9 h-9 text-[#db2777]" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                {/* Nucleus with pulse animation */}
                <circle cx="50" cy="50" r="7" fill="#db2777" className="animate-pulse" />

                {/* 3 electron orbits spinning infinitely around the center */}
                <g className="animate-[spin_4s_linear_infinite] origin-center" style={{ transformOrigin: '50px 50px' }}>
                  <ellipse cx="50" cy="50" rx="38" ry="12" strokeWidth="2.2" stroke="#db2777" />
                </g>
                <g className="animate-[spin_7s_linear_infinite] origin-center" style={{ transformOrigin: '50px 50px' }}>
                  <ellipse cx="50" cy="50" rx="38" ry="12" strokeWidth="2.2" stroke="#db2777" transform="rotate(60 50 50)" />
                </g>
                <g className="animate-[spin_10s_linear_infinite] origin-center" style={{ transformOrigin: '50px 50px' }}>
                  <ellipse cx="50" cy="50" rx="38" ry="12" strokeWidth="2.2" stroke="#db2777" transform="rotate(120 50 50)" />
                </g>
              </svg>
            </div>
            <span className="font-tech text-xs font-black tracking-[0.25em] text-[#db2777] select-none uppercase">
              EDICION 2026
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="font-display text-3xl font-black text-slate-900 uppercase tracking-wider">
              Feria de Ciencias
            </h3>
            <p className="font-tech text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              Cuenta regresiva oficial
            </p>
          </div>

          {/* Grid de cuenta regresiva brutalista */}
          <div className="grid grid-cols-4 gap-2.5 select-none">
            {[
              { label: "Días", value: timeLeft.days },
              { label: "Horas", value: timeLeft.hours },
              { label: "Minutos", value: timeLeft.minutes },
              { label: "Segundos", value: timeLeft.seconds },
            ].map((unit, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#db2777]/20 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden shadow-sm shadow-[#db2777]/10 group hover:border-[#db2777]/45 transition-colors duration-300"
              >
                {/* Micro accent */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#db2777]/20 group-hover:bg-[#db2777] transition-colors duration-300"></div>
                <span className="text-3xl font-display font-black text-slate-900 leading-none">
                  {String(unit.value).padStart(2, "0")}
                </span>
                <span className="text-[9px] font-tech font-bold uppercase tracking-widest text-[#db2777]/75 mt-1.5">
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
              style={{ WebkitTextStroke: "1px rgba(219, 39, 119, 0.08)" }}>
              UTA
            </div>

            <h1 className="font-display text-6xl sm:text-8xl md:text-9xl font-black text-slate-900 leading-[0.85] tracking-tight relative z-10">
              <span className="block text-grunge text-slate-900 drop-shadow-sm">
                FERIA DE
              </span>
              <span className="block text-transparent stroke-2" style={{ WebkitTextStroke: "2px #db2777" }}>
                CIENCIAS
              </span>
            </h1>
          </div>

          <p className="font-tech text-xs sm:text-sm text-[#db2777] uppercase tracking-[0.3em] mb-4">
            Universidad de Tarapacá — Chile
          </p>

          <div className="font-tech text-[10px] sm:text-xs text-slate-450 uppercase tracking-widest mb-12 flex flex-wrap justify-center md:justify-end gap-x-4 gap-y-1.5 select-none">
            <span><span className="text-[#db2777] font-bold">Profesor:</span> Olga Penagos</span>
            <span className="text-[#db2777]/30 hidden sm:inline">|</span>
            <span><span className="text-[#db2777] font-bold">Ayudante de Proyectos:</span> Cristóbal Aránguiz</span>
          </div>

          {/* Botones de acción Brutalistas */}
          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto z-20">
            <Link
              to="/alumno/login"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-[#db2777] text-slate-900 hover:bg-[#db2777] hover:text-white font-tech text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[4px_4px_0px_#db2777] hover:shadow-[0px_0px_0px_transparent] active:translate-x-1 active:translate-y-1 text-center"
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

      {/* Gradiente de Base */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}

export default Hero;
