function Footer() {
  return (
    <footer className="bg-[#050505] text-slate-400 border-t border-[#f490b1]/15 py-10 px-6 text-center relative z-10 bg-brutalist-noise select-none">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Logo/Name */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <h2 
            className="text-2xl font-display font-black text-transparent uppercase tracking-wider mb-1"
            style={{ WebkitTextStroke: "1px #f490b1" }}
          >
            Feria de Ciencias
          </h2>
          <p className="text-[10px] font-tech font-bold text-slate-500 uppercase tracking-widest">
            Universidad de Tarapacá
          </p>
        </div>

        {/* Copyright */}
        <p className="text-[10px] font-tech font-bold text-slate-500 uppercase tracking-widest">
          © {new Date().getFullYear()} flavioInform · Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

export default Footer;