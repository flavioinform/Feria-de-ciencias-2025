import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useContext } from "react";

import Navbar from "./components/Navbar";
import Footer from "./components/footer";
import { AppProvider, AppContext } from "./context/AppContext";
import { AlumnoProvider, useAlumno } from "./context/AlumnoContext";
import AdminLayout from "./layouts/AdminLayout";
import EvaluarProyecto from "./pages/EvaluarProyecto";
import ProyectosPorCategoria from "./pages/ProyectosPorCategoria";
import AdminPorQuienVino from "./pages/admin/AdminPorQuienVino";
import AdminResultadosJurado from "./pages/admin/AdminResultadosJurado";
import RegistroLogin from "./pages/admin/registroLogin";
import AdminCoevaluaciones from "./pages/admin/AdminCoevaluaciones";
import AdminConfiguracion from "./pages/admin/AdminConfiguracion";
import AlumnoCoevaluacion from "./pages/alumno/AlumnoCoevaluacion";
import AdminCategorias from "./pages/admin/AdminCategorias";
import AdminProyectosPorCategoria from "./pages/admin/AdminProyectosPorCategoria";
import AdminJurados from "./pages/admin/AdminJurados";
import AlumnoLogin from "./pages/alumno/AlumnoLogin";
import AlumnoProyecto from "./pages/alumno/AlumnoProyecto";
import Categorias from "./pages/categorias";
import Home from "./pages/home";
import Login from "./pages/login";
// import Registro from "./pages/registro";

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  CIERRE DE LA FERIA
 *  Mientras esto sea `true`, el público (visitantes, alumnos, jurados y
 *  ayudantes) solo ve el mensaje de cierre. El ADMIN sigue con acceso por
 *  /login y /admin para revisar resultados y exportar los Excel.
 *  Para reabrir la feria por completo el próximo semestre: cambiar a `false`.
 * ─────────────────────────────────────────────────────────────────────────
 */
const FERIA_CONCLUIDA = false;

/** Rutas que siguen disponibles para el admin aunque la feria esté cerrada */
function esRutaAdmin(pathname) {
  return pathname === "/login" || pathname.startsWith("/admin");
}

/** Pantalla de cierre que se muestra en cualquier ruta cuando la feria terminó */
function FeriaConcluida() {
  return (
    <div className="min-h-screen bg-white bg-brutalist-noise flex items-center justify-center px-4 relative overflow-hidden">
      {/* Glows de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0b6e99]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#0b6e99]/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-lg w-full text-center relative z-10">
        <p className="text-[#0b6e99] font-bold text-xs tracking-[0.25em] uppercase mb-4">
          Feria de Ciencias
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase leading-tight mb-4">
          La Feria de Ciencias ha concluido
        </h1>
        <div className="w-16 h-[3px] bg-[#0b6e99] mx-auto mb-5" />
        <p className="text-slate-600 text-base sm:text-lg">
          ¡Gracias por participar! Nos vemos el otro semestre. 👋
        </p>
      </div>
    </div>
  );
}

/** Ruta protegida: redirige a login si no hay sesión de alumno */
function RutaAlumno({ children }) {
  const { alumno } = useAlumno();
  return alumno ? children : <Navigate to="/alumno/login" replace />;
}

/** Ruta protegida: admin o ayudante (el rol viene del token, lo fija el servidor) */
function RutaAdminAyudante({ children }) {
  const { user, loading } = useContext(AppContext);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user || (user.role !== "admin" && user.role !== "ayudante")) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/** Ruta protegida: solo admin */
function RutaAdmin({ children }) {
  const { user, loading } = useContext(AppContext);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user || user.role !== "admin") {
    return <Navigate to={user ? "/admin/registroLogin" : "/login"} replace />;
  }

  return children;
}

/** Ruta pública */
function RutaPublica({ children }) {
  return children;
}

/** Rutas de visitante/jurado: requieren sesión de visitante o jurado */
function RutaVisitante({ children }) {
  const { user, loading } = useContext(AppContext);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin/categorias-proyectos" replace />;
  if (user.role === "ayudante") return <Navigate to="/admin/registroLogin" replace />;
  return children;
}

function AppContent() {
  const location = useLocation();
  const isGestionProyecto = location.pathname === "/alumno/proyecto";

  // Feria cerrada: todo muestra el mensaje de cierre, EXCEPTO las rutas de
  // admin (/login y /admin), que siguen habilitadas para el administrador.
  if (FERIA_CONCLUIDA && !esRutaAdmin(location.pathname)) {
    return <FeriaConcluida />;
  }

  return (
    <div className={`text-slate-900 min-h-screen flex flex-col justify-between selection:bg-[#0b6e99] selection:text-white ${isGestionProyecto ? "bg-slate-50" : "bg-white bg-brutalist-noise"
      }`}>
      <div>
        <Navbar />

        <Routes>
          <Route path="/" element={<RutaPublica><Home /></RutaPublica>} />
          <Route path="/login" element={<RutaPublica><Login /></RutaPublica>} />

          {/* ── Rutas de visitante/jurado (protegidas) ── */}
          <Route
            path="/categorias"
            element={
              <RutaVisitante>
                <Categorias />
              </RutaVisitante>
            }
          />
          <Route
            path="/proyectos/categoria/:idCategoria"
            element={
              <RutaVisitante>
                <ProyectosPorCategoria />
              </RutaVisitante>
            }
          />
          <Route
            path="/evaluar/:proyectoId"
            element={
              <RutaVisitante>
                <EvaluarProyecto />
              </RutaVisitante>
            }
          />

          {/* ── Rutas del alumno ── */}
          <Route path="/alumno/login" element={<RutaPublica><AlumnoLogin /></RutaPublica>} />
          <Route
            path="/alumno/proyecto"
            element={
              <RutaPublica>
                <RutaAlumno>
                  <AlumnoProyecto />
                </RutaAlumno>
              </RutaPublica>
            }
          />
          <Route
            path="/alumno/coevaluacion"
            element={
              <RutaPublica>
                <RutaAlumno>
                  <AlumnoCoevaluacion />
                </RutaAlumno>
              </RutaPublica>
            }
          />

          {/* ── Rutas de admin ── */}
          <Route
            path="/admin"
            element={
              <RutaAdminAyudante>
                <AdminLayout />
              </RutaAdminAyudante>
            }
          >
            <Route path="registroLogin" element={<RegistroLogin />} />
            <Route
              path="resultados"
              element={
                <RutaAdmin>
                  <AdminResultadosJurado />
                </RutaAdmin>
              }
            />
            <Route
              path="por-quien-vino"
              element={
                <RutaAdmin>
                  <AdminPorQuienVino />
                </RutaAdmin>
              }
            />
            <Route
              path="categorias-proyectos"
              element={
                <RutaAdmin>
                  <AdminCategorias />
                </RutaAdmin>
              }
            />
            <Route
              path="proyectos/categoria/:idCategoria"
              element={
                <RutaAdmin>
                  <AdminProyectosPorCategoria />
                </RutaAdmin>
              }
            />
            <Route
              path="jurados"
              element={
                <RutaAdmin>
                  <AdminJurados />
                </RutaAdmin>
              }
            />
            <Route
              path="coevaluaciones"
              element={
                <RutaAdmin>
                  <AdminCoevaluaciones />
                </RutaAdmin>
              }
            />
            <Route
              path="configuracion"
              element={
                <RutaAdmin>
                  <AdminConfiguracion />
                </RutaAdmin>
              }
            />
          </Route>
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AlumnoProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AlumnoProvider>
    </AppProvider>
  );
}

export default App;
