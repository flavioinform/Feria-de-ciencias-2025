import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

function AdminNavbar() {
  const { user, logout } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  
  // Estado para el Dialog de Material UI
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);

  const handleLogoutClick = () => {
    setOpenLogoutDialog(true);
  };

  const confirmLogout = () => {
    setOpenLogoutDialog(false);
    logout();
    navigate("/");
  };

  const cancelLogout = () => {
    setOpenLogoutDialog(false);
  };

  // Componente interno para enlaces de navegación con estado activo
  const NavLink = ({ to, children }) => {
    const isActive = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
          isActive 
            ? "bg-white/25 text-white shadow-sm" 
            : "text-pink-50 hover:bg-white/15 hover:text-white"
        }`}
      >
        {children}
      </Link>
    );
  };

  return (
    <>
      <header className="bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 text-white shadow-lg sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Brand */}
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <span className="font-black text-xl tracking-wide hidden sm:block">FeriaAdmin</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1.5">
              <NavLink to="/admin/registroLogin">Visitantes</NavLink>
              <NavLink to="/admin/resultados">Resultados</NavLink>
              <NavLink to="/admin/por-quien-vino">Búsquedas</NavLink>
              <NavLink to="/admin/categorias-proyectos">Proyectos</NavLink>
            </div>

            {/* User & Logout (Desktop) */}
            <div className="hidden lg:flex items-center gap-5">
              {user && (
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-white leading-tight">{user.nombre || "Admin"}</span>
                  <span className="text-xs font-medium text-pink-100">Administrador</span>
                </div>
              )}
              <button
                onClick={handleLogoutClick}
                className="bg-white text-pink-600 hover:bg-pink-50 font-bold text-sm px-4 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                Salir
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="p-2 rounded-lg text-pink-50 hover:text-white hover:bg-white/20 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {menuAbierto ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Dropdown */}
        <div className={`lg:hidden transition-all duration-300 overflow-hidden ${menuAbierto ? "max-h-96" : "max-h-0"}`}>
          <div className="bg-pink-700/60 backdrop-blur-md shadow-inner">
            <div className="px-4 pt-3 pb-3 space-y-1">
              <Link to="/admin/registroLogin" onClick={() => setMenuAbierto(false)} className="block px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-white/20">Registrar visitantes</Link>
              <Link to="/admin/resultados" onClick={() => setMenuAbierto(false)} className="block px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-white/20">Resultados / votos</Link>
              <Link to="/admin/por-quien-vino" onClick={() => setMenuAbierto(false)} className="block px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-white/20">¿Por quién vinieron?</Link>
              <Link to="/admin/categorias-proyectos" onClick={() => setMenuAbierto(false)} className="block px-3 py-2.5 rounded-lg text-base font-semibold text-white hover:bg-white/20">Categorías y Proyectos</Link>
            </div>
            <div className="pt-4 pb-4 border-t border-pink-500/50">
              <div className="flex items-center px-6 gap-3">
                <div className="flex-shrink-0 bg-white/20 p-2 rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <div className="text-base font-bold text-white">{user?.nombre || "Administrador"}</div>
                  <div className="text-sm font-medium text-pink-200 mt-0.5">Gestión Feria</div>
                </div>
              </div>
              <div className="mt-4 px-4">
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-white text-pink-600 rounded-xl text-base font-bold shadow-sm hover:bg-pink-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Dialog Material UI para Cerrar Sesión */}
      <Dialog
        open={openLogoutDialog}
        onClose={cancelLogout}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"¿Confirmar cierre de sesión?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ¿Estás seguro de que deseas salir del panel de administración?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelLogout} color="inherit">
            Cancelar
          </Button>
          <Button onClick={confirmLogout} color="error" variant="contained" autoFocus>
            Sí, salir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AdminNavbar;
