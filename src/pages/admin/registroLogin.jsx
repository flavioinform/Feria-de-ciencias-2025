import { useState } from "react";
import { supabase } from "../../lib/supabase";

// ---------- Helpers de RUT ----------

// normaliza el RUT para guardar/consultar en BD (sin puntos ni guion, DV en mayúscula)
const normalizarRut = (rut) =>
  rut.replace(/[.\-]/g, "").toUpperCase();

// valida formato + módulo 11 + evita RUTs imposibles
const validarRut = (rut) => {
  if (!rut) return false;

  const rutLimpio = normalizarRut(rut);

  // mínimo: 2 caracteres (cuerpo + DV)
  if (rutLimpio.length < 2) return false;

  // debe ser solo números + DV (número o K)
  if (!/^[0-9]+[0-9K]$/.test(rutLimpio)) return false;

  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);

  // ❌ evitar RUTs con todos los dígitos iguales (11111111, 22222222, etc.)
  if (/^(\d)\1+$/.test(cuerpo)) return false;

  // ❌ limitar a un rango razonable de RUTs de personas naturales
  const num = parseInt(cuerpo, 10);
  if (num < 1000000 || num > 27000000) return false;

  // ✅ cálculo módulo 11
  let suma = 0;
  let factor = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const resto = suma % 11;
  const calculadoNum = 11 - resto;

  let dvEsperado;
  if (calculadoNum === 11) dvEsperado = "0";
  else if (calculadoNum === 10) dvEsperado = "K";
  else dvEsperado = calculadoNum.toString();

  return dv === dvEsperado;
};

function RegistroLogin() {
  const [form, setForm] = useState({
    nombre: "",
    rut: "",
    vienePorAlguien: false,
    por_quien_vino: "",
  });

  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState(""); // "ok" | "error"
  const [pinGenerado, setPinGenerado] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // PIN de 4 dígitos
  const generarPin = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipo("");
    setPinGenerado("");
    setCargando(true);

    try {
      const rutIngresado = form.rut.trim();

      // 0) Validar RUT antes de cualquier cosa
      if (!validarRut(rutIngresado)) {
        setMensaje(
          "RUT inválido. Verifica el número, el dígito verificador y que sea un RUT real."
        );
        setTipo("error");
        setCargando(false);
        return;
      }

      // usamos el RUT normalizado para BD
      const rutNormalizado = normalizarRut(rutIngresado);

      // 1) revisar si el RUT ya existe
      const { data: existente, error: errorBusqueda } = await supabase
        .from("usuarios")
        .select("id")
        .eq("rut", rutNormalizado)
        .maybeSingle();

      if (errorBusqueda) {
        console.error(errorBusqueda);
        setMensaje("Error al buscar el RUT");
        setTipo("error");
        return;
      }

      if (existente) {
        setMensaje("Este RUT ya está registrado.");
        setTipo("error");
        return;
      }

      // 2) generar PIN
      const nuevoPin = generarPin();

      // 3) insertar usuario visitante
      const { error: errorInsert } = await supabase.from("usuarios").insert({
        nombre: form.nombre,
        rut: rutNormalizado, // se guarda normalizado
        viene_por_alguien: form.vienePorAlguien,
        por_quien_vino: form.vienePorAlguien ? form.por_quien_vino : null,
        pin_hash: nuevoPin,
        role: "visitante",
      });

      if (errorInsert) {
        console.error(errorInsert);
        setMensaje("Error al registrar al visitante");
        setTipo("error");
        return;
      }

      setMensaje("Visitante registrado correctamente.");
      setTipo("ok");
      setPinGenerado(nuevoPin);

      // limpiar formulario
      setForm({
        nombre: "",
        rut: "",
        vienePorAlguien: false,
        por_quien_vino: "",
      });
    } catch (err) {
      console.error("Error inesperado en registroLogin:", err);
      setMensaje("Error inesperado del servidor");
      setTipo("error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Registro de visitantes
            </h1>
            <p className="text-gray-500">
              Ingresa los datos del visitante para generar su PIN de acceso.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre completo
              </label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-gray-50 text-black"
                required
              />
            </div>

            {/* RUT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RUT
              </label>
              <input
                type="text"
                name="rut"
                value={form.rut}
                onChange={handleChange}
                placeholder="12.345.678-9"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-gray-50 text-black"
                required
              />
            </div>

            {/* Viene por alguien */}
            <div className="flex items-center gap-2">
              <input
                id="vienePorAlguien"
                type="checkbox"
                name="vienePorAlguien"
                checked={form.vienePorAlguien}
                onChange={handleChange}
                className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
              />
              <label
                htmlFor="vienePorAlguien"
                className="text-sm text-gray-700"
              >
                ¿Viene por un estudiante?
              </label>
            </div>

            {form.vienePorAlguien && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Por quién viene?
                </label>
                <input
                  type="text"
                  name="por_quien_vino"
                  value={form.por_quien_vino}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-gray-50 text-black"
                />
              </div>
            )}

            {/* Mensajes */}
            {mensaje && (
              <div
                className={`p-4 rounded-lg border ${
                  tipo === "error"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-green-50 border-green-200 text-green-700"
                }`}
              >
                <p className="font-medium">{mensaje}</p>
              </div>
            )}

            {pinGenerado && (
              <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800 text-center">
                <p className="font-semibold">
                  PIN generado para el visitante:
                  <span className="ml-2 text-2xl font-bold">{pinGenerado}</span>
                </p>
                <p className="text-sm mt-1">
                  Entrégale este PIN a la persona para que pueda iniciar sesión.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? "Registrando..." : "Registrar visitante"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegistroLogin;
