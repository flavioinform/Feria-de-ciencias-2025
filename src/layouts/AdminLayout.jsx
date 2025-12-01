// src/layouts/AdminLayout.jsx
import { Outlet, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import AdminNavbar from "../components/AdminNavbar";

function AdminLayout() {
  const { user, loading } = useContext(AppContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  // si no es admin, fuera del panel
  if (!user || user.role !== "admin") {
    return <Navigate to="/registro" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNavbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
