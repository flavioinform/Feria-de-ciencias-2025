
function Footer() {
    return(
        <footer className="bg-[#0A192F] text-[#CCD6F6] border-t border-[#112240] py-8 px-6 text-center">
                 <h2 className="text-accent text-xl font-semibold mb-2">Feria de ciencias</h2> 
                   <p className="text-xs text-slate-500">
        © {new Date().getFullYear()} flavioInform — Todos los derechos reservados.
      </p>
        </footer>
    )
}export default Footer;