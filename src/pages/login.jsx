import { useState, useContext } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

function Login() {
  const [rut, setRut] = useState("");
  const [pin, setPin] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AppContext); // Obtener función login del context

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setCargando(true);

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("id, nombre, rut, pin_hash, role")
      .eq("rut", rut)
      .maybeSingle();

    if (error || !usuario) {
      setMensaje("RUT no registrado");
      setTipo("error");
      setCargando(false);
      return;
    }

    if (usuario.pin_hash !== pin) {
      setMensaje("PIN incorrecto");
      setTipo("error");
      setCargando(false);
      return;
    }

    // Guardar usuario en el contexto y localStorage
    const userData = {
      id: usuario.id,
      nombre: usuario.nombre,
      rut: usuario.rut,
      role: usuario.role
    };
    
    login(userData); // Esto guarda en context y localStorage

    setMensaje(`Bienvenido/a ${usuario.nombre}`);
    setTipo("success");
    setCargando(false);

    // Redirigir después de un momento
    setTimeout(() => {
      navigate("/categorias");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Iniciar sesión</h1>
            <p className="text-gray-500">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RUT
              </label>
              <input
                type="text"
                placeholder="12.345.678-9"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 text-gray-800 placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN
              </label>
              <input
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 text-gray-800"
                required
              />
            </div>

            {mensaje && (
              <div
                className={`p-4 rounded-lg border ${
                  tipo === "error"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-green-50 border-green-200 text-green-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {tipo === "error" ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  <p className="font-medium">{mensaje}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
{/* 
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              ¿No tienes cuenta?{" "}
              <a href="/registro" className="text-blue-600 hover:text-blue-700 font-medium">
                Regístrate aquí
              </a>
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default Login;