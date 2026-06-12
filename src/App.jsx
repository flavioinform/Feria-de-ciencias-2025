import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/footer";
import { AppProvider } from "./context/AppContext";
import { AlumnoProvider, useAlumno } from "./context/AlumnoContext";
import AdminLayout from "./layouts/AdminLayout";
import EvaluarProyecto from "./pages/EvaluarProyecto";
import ProyectosPorCategoria from "./pages/ProyectosPorCategoria";
import AdminPorQuienVino from "./pages/admin/AdminPorQuienVino";
import AdminResultadosJurado from "./pages/admin/AdminResultadosJurado";
import RegistroLogin from "./pages/admin/registroLogin";
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

function AppContent() {
  const location = useLocation();
  const isGestionProyecto = location.pathname === "/alumno/proyecto";

  return (
    <div className={`text-slate-100 min-h-screen flex flex-col justify-between selection:bg-[#f490b1] selection:text-[#050505] ${isGestionProyecto ? "bg-[#08080c]" : "bg-[#050505] bg-brutalist-noise"
      }`}>
      <div>
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          {/* <Route path="/registro" element={<Registro />} /> */}
          <Route path="/registro-participante" element={<RegistroParticipantePage />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route
            path="/proyectos/categoria/:idCategoria"
            element={<ProyectosPorCategoria />}
          />
          <Route
            path="/evaluar/:proyectoId"
            element={<EvaluarProyecto />}
          />

          {/* ── Rutas del alumno ── */}
          <Route path="/alumno/login" element={<AlumnoLogin />} />
          <Route
            path="/alumno/proyecto"
            element={
              <RutaAlumno>
                <AlumnoProyecto />
              </RutaAlumno>
            }
          />

          {/* ── Rutas de admin ── */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="registroLogin" element={<RegistroLogin />} />
            <Route path="resultados" element={<AdminResultadosJurado />} />
            <Route path="por-quien-vino" element={<AdminPorQuienVino />} />
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
