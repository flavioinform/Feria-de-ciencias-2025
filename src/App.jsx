// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/home";
import Footer from "./components/footer";
import Login from "./pages/login";
import Registro from "./pages/registro";
import RegistroLogin from "./pages/admin/registroLogin";
import Categorias from "./pages/categorias";
import ProyectosPorCategoria from "./pages/ProyectosPorCategoria";
import EvaluarProyecto from "./pages/EvaluarProyecto";
import AdminResultadosJurado from "./pages/admin/AdminResultadosJurado";

import { AppProvider } from "./context/AppContext";
import AdminLayout from "./layouts/AdminLayout";
import AdminResultados from "./pages/admin/AdminResultados";
import AdminPorQuienVino from "./pages/admin/AdminPorQuienVino";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        {/* NAVBAR PÚBLICO */}
        <div className="bg-[#adcff1] min-h-screen min-w-screen">
          <Navbar />
          <hr />

          <Routes>
            {/* público */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route
              path="/proyectos/categoria/:idCategoria"
              element={<ProyectosPorCategoria />}
            />
            <Route
              path="/evaluar/:proyectoId"
              element={<EvaluarProyecto />}
            />

            {/* ADMIN: todo lo que esté dentro de /admin usa AdminLayout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="registroLogin" element={<RegistroLogin />} />
              <Route path="resultados" element={<AdminResultadosJurado />} />
              <Route path="por-quien-vino" element={<AdminPorQuienVino />} />
            </Route>
          </Routes>
           
        </div>
         <Footer/>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
