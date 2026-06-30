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
import AdminAyudantes from "./pages/admin/AdminAyudantes";
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
import RegistroParticipantePage from "./pages/RegistroParticipantePage";

/** Ruta protegida: redirige a login si no hay sesión de alumno */
function RutaAlumno({ children }) {
  const { alumno } = useAlumno();
  return alumno ? children : <Navigate to="/alumno/login" replace />;
}

/** Ruta protegida: solo admin y ayudante */
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
    return <Navigate to="/admin/registroLogin" replace />;
  }

  return children;
}

/** Ruta pública: redirige a ayudantes al panel */
function RutaPublica({ children }) {
  const { user } = useContext(AppContext);

  if (user && user.role === "ayudante") {
    return <Navigate to="/admin/registroLogin" replace />;
  }

  return children;
}

/** Ruta protegida para visitantes/jurados: requiere sesión activa */
function RutaVisitante({ children }) {
  const { user, loading } = useContext(AppContext);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Los ayudantes y admins no deberían estar aquí
  if (user.role === "admin") return <Navigate to="/admin/categorias-proyectos" replace />;
  if (user.role === "ayudante") return <Navigate to="/admin/registroLogin" replace />;

  return children;
}

function AppContent() {
  const location = useLocation();
  const isGestionProyecto = location.pathname === "/alumno/proyecto";

  return (
    <div className={`text-slate-900 min-h-screen flex flex-col justify-between selection:bg-[#db2777] selection:text-white ${isGestionProyecto ? "bg-slate-50" : "bg-white bg-brutalist-noise"
      }`}>
      <div>
        <Navbar />

        <Routes>
          <Route path="/" element={<RutaPublica><Home /></RutaPublica>} />
          <Route path="/login" element={<RutaPublica><Login /></RutaPublica>} />
          {/* <Route path="/registro" element={<Registro />} /> */}
          <Route path="/registro-participante" element={<RutaPublica><RegistroParticipantePage /></RutaPublica>} />

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
              path="ayudantes"
              element={
                <RutaAdmin>
                  <AdminAyudantes />
                </RutaAdmin>
              }
            />
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
