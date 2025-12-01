import { Link,useNavigate} from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

function Navbar() {
  // const location = useLocation();
  const { user, logout } = useContext(AppContext);
  const navigate=useNavigate();
    const handleLogout = () => {
    logout();
    navigate("/");
  };
  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg sticky top-0 z-50 border-b border-slate-700/50">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent hover:from-emerald-300 hover:to-cyan-300 transition-all duration-300"
          >
            Feria de ciencias
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-white">
                  Hola, <span className="font-semibold text-emerald-400">{user.nombre}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                   
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;