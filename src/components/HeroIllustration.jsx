/**
 * Objeto ilustrado del hero: un cohete despegando desde un blob orgánico,
 * rodeado de íconos científicos flotantes (átomo, molécula, matraz, estrella).
 * Inspirado en la composición "producto sobre blob + elementos flotando"
 * de héroes tipo landing de delivery, adaptado a la temática de feria de ciencias.
 */
function HeroIllustration() {
  return (
    <div className="relative w-full aspect-square max-w-[380px] mx-auto select-none">
      {/* Halo exterior */}
      <div className="absolute inset-0 bg-[#22D3EE]/20 rounded-full blur-[60px]" />

      {/* Blob orgánico central */}
      <div
        className="absolute inset-[8%] bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] shadow-2xl shadow-[#4C1D95]/30 animate-[spin_22s_linear_infinite]"
        style={{ borderRadius: "48% 52% 62% 38% / 56% 44% 56% 44%" }}
      />
      <div
        className="absolute inset-[8%] border-2 border-[#22D3EE]/40 animate-[spin_16s_linear_infinite_reverse]"
        style={{ borderRadius: "58% 42% 40% 60% / 44% 56% 44% 56%" }}
      />

      {/* Cohete central */}
      <svg
        viewBox="0 0 200 260"
        className="absolute inset-0 w-[54%] h-[54%] m-auto drop-shadow-xl"
      >
        {/* Llama */}
        <polygon
          points="82,178 100,240 118,178"
          fill="#FB923C"
          className="origin-top animate-pulse"
        />
        <polygon points="90,178 100,215 110,178" fill="#FFD166" />

        {/* Aletas */}
        <polygon points="70,150 38,196 70,196" fill="#FB923C" />
        <polygon points="130,150 162,196 130,196" fill="#FB923C" />

        {/* Cuerpo */}
        <rect x="68" y="60" width="64" height="120" rx="32" fill="#FFFBEA" />
        <path d="M100 8 L134 72 H66 Z" fill="#4C1D95" />

        {/* Ventana */}
        <circle cx="100" cy="108" r="19" fill="#4C1D95" />
        <circle cx="100" cy="108" r="12" fill="#22D3EE" />
      </svg>

      {/* Átomo flotante */}
      <div className="absolute -top-2 -left-2 sm:top-0 sm:left-0 w-16 h-16 animate-float" style={{ animationDelay: "0.2s" }}>
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
          <circle cx="50" cy="50" r="7" fill="#FB923C" />
          <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#4C1D95" strokeWidth="4" />
          <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#4C1D95" strokeWidth="4" transform="rotate(60 50 50)" />
          <ellipse cx="50" cy="50" rx="38" ry="14" stroke="#4C1D95" strokeWidth="4" transform="rotate(120 50 50)" />
        </svg>
      </div>

      {/* Estrella destello */}
      <div className="absolute top-2 right-0 sm:-right-2 w-10 h-10 animate-float-fast" style={{ animationDelay: "0.6s" }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z"
            fill="#22D3EE"
          />
        </svg>
      </div>

      {/* Matraz burbujeante */}
      <div className="absolute bottom-4 -left-3 sm:-left-4 w-14 h-14 animate-float-slow" style={{ animationDelay: "0.4s" }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <rect x="42" y="10" width="16" height="26" fill="#4C1D95" />
          <path d="M40 34 L20 82 Q18 90 28 90 H72 Q82 90 80 82 L60 34 Z" fill="#22D3EE" />
          <path d="M32 66 Q50 56 68 66 L60 34 H40 Z" fill="#7C3AED" />
          <circle cx="45" cy="76" r="4" fill="#FFFBEA" />
          <circle cx="58" cy="70" r="3" fill="#FFFBEA" />
        </svg>
      </div>

      {/* Molécula */}
      <div className="absolute -bottom-2 right-2 sm:right-0 w-14 h-14 animate-float" style={{ animationDelay: "0.9s" }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <line x1="25" y1="70" x2="55" y2="30" stroke="#4C1D95" strokeWidth="4" />
          <line x1="55" y1="30" x2="85" y2="55" stroke="#4C1D95" strokeWidth="4" />
          <circle cx="25" cy="70" r="12" fill="#FB923C" />
          <circle cx="55" cy="30" r="9" fill="#4C1D95" />
          <circle cx="85" cy="55" r="10" fill="#22D3EE" />
        </svg>
      </div>
    </div>
  );
}

export default HeroIllustration;
