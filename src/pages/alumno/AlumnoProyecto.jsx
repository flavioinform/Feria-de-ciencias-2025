import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAlumno } from "../../context/AlumnoContext";

// ── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = ({ sm }) => (
  <svg className={`animate-spin text-cyan-400 ${sm ? "h-4 w-4" : "h-6 w-6"}`} viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ── Componente ────────────────────────────────────────────────────────────────
export default function AlumnoProyecto() {
  const { alumno, logoutAlumno, actualizarProyecto } = useAlumno();
  const navigate = useNavigate();

  const proyecto = alumno?.proyectos;
  const categoriaNombre = proyecto?.categorias?.nombre ?? "—";

  // Toast feedback (Material UI Style)
  const [toast, setToast] = useState(null); // { severity: "success" | "error" | "info", message: "" }

  const showToast = (severity, message) => {
    setToast({ severity, message });
    setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, 3000);
  };

  const [imagenUrl, setImagenUrl] = useState(proyecto?.image ?? "");
  const [guardandoImg, setGuardandoImg] = useState(false);

  const [integrantes, setIntegrantes] = useState([]);
  const [cargandoIntegrantes, setCargandoIntegrantes] = useState(false);

  // Estados para descripción editable
  const [isEditing, setIsEditing] = useState(false);
  const [descripcionText, setDescripcionText] = useState(proyecto?.descripcion || "");
  const [guardandoDesc, setGuardandoDesc] = useState(false);

  useEffect(() => {
    if (proyecto?.descripcion !== undefined) {
      setDescripcionText(proyecto.descripcion || "");
    }
  }, [proyecto?.descripcion]);

  // ── Cargar integrantes del grupo ──
  useEffect(() => {
    if (!proyecto?.id) return;

    const cargarIntegrantes = async () => {
      setCargandoIntegrantes(true);
      const { data, error } = await supabase
        .from("participantes")
        .select("nombre, rut")
        .eq("proyecto_id", proyecto.id)
        .order("nombre");

      if (!error && data) {
        setIntegrantes(data);
      }
      setCargandoIntegrantes(false);
    };

    cargarIntegrantes();
  }, [proyecto?.id]);

  // ── Bloqueo de Botón Atrás del Navegador (popstate) ──
  useEffect(() => {
    // Insertamos un estado ficticio para poder interceptar el retroceso
    window.history.pushState(null, null, window.location.pathname);

    const handlePopState = () => {
      const salir = window.confirm("¿Estás seguro de que deseas salir y cerrar tu sesión?");
      if (salir) {
        logoutAlumno();
        navigate("/alumno/login");
      } else {
        // Volvemos a empujar el estado para mantener al usuario aquí
        window.history.pushState(null, null, window.location.pathname);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [logoutAlumno, navigate]);

  // ── Bloqueo de Cierre/Recarga de Pestaña en el Navegador ──
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const msg = "¿Estás seguro de que deseas salir? Se cerrará tu sesión.";
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleLogout = () => {
    const salir = window.confirm("¿Estás seguro de que deseas cerrar sesión y salir?");
    if (salir) {
      logoutAlumno();
      navigate("/alumno/login");
    }
  };

  // ── Subir imagen ──────────────────────────────────────────────────────────
  const handleImagenChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vista previa local inmediata
    const preview = URL.createObjectURL(file);
    setImagenUrl(preview);
    setGuardandoImg(true);

    const ext = file.name.split(".").pop();
    const path = `proyecto-${proyecto.id}/${Date.now()}.${ext}`;

    // Subir a Storage
    const { error: uploadError } = await supabase.storage
      .from("proyectos-imagenes")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setGuardandoImg(false);
      showToast("error", `Error al subir imagen: ${uploadError.message}`);
      return;
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from("proyectos-imagenes")
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;

    // Actualizar registro en BD
    const { error: updateError } = await supabase
      .from("proyectos")
      .update({ image: publicUrl })
      .eq("id", proyecto.id);

    setGuardandoImg(false);

    if (updateError) {
      showToast("error", `Error al guardar URL: ${updateError.message}`);
    } else {
      setImagenUrl(publicUrl);
      actualizarProyecto({ image: publicUrl });
      showToast("success", "Imagen demostrativa actualizada y guardada con éxito.");
    }
  };

  // ── Guardar descripción editada ─────────────────────────────────────────────
  const handleGuardarDesc = async () => {
    const textNormalizado = descripcionText.trim();
    if (textNormalizado.length > 200) {
      showToast("error", "La descripción no puede superar los 200 caracteres.");
      return;
    }

    setGuardandoDesc(true);

    const { error: updateError } = await supabase
      .from("proyectos")
      .update({ descripcion: textNormalizado })
      .eq("id", proyecto.id);

    setGuardandoDesc(false);

    if (updateError) {
      showToast("error", `Error al guardar la descripción: ${updateError.message}`);
    } else {
      actualizarProyecto({ descripcion: textNormalizado });
      setIsEditing(false);
      showToast("success", "Descripción del proyecto actualizada con éxito.");
    }
  };

  const handleCancelarDesc = () => {
    setDescripcionText(proyecto?.descripcion || "");
    setIsEditing(false);
  };

  if (!alumno || !proyecto) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#050505] bg-brutalist-noise">
        <p className="text-slate-400 font-tech font-bold uppercase tracking-wider">Sesión no encontrada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] px-4 py-10 sm:py-16 max-w-2xl mx-auto text-slate-100 relative border-b border-[#f490b1]/10">
      {/* Dynamic Futuristic Scientific Backdrop specifically for Gestión de Proyecto */}
      <div className="fixed inset-0 bg-[#08080c] pointer-events-none" style={{ zIndex: -1 }}>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(244,144,177,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(244,144,177,0.025)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        {/* Radial ambient glow circles */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#f490b1]/5 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#f490b1]/3 rounded-full blur-[140px]"></div>
      </div>

      {/* Glows de fondo */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-[#f490b1]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#f490b1]/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between mb-10 gap-6 relative z-10 w-full">
        <div>
          <h1 className="text-4xl font-display font-black text-white tracking-tight uppercase leading-none">
            Gestión de Proyecto
          </h1>
          <p className="text-slate-400 text-xs font-tech mt-1 tracking-wide">
            Alumno participante:{" "}
            <span className="font-bold text-[#f490b1]">{alumno.nombre}</span>
          </p>

          {/* Chic Equipo Pills */}
          <div className="flex flex-wrap gap-2.5 mt-4">
            {cargandoIntegrantes ? (
              <div className="flex items-center gap-2 text-xs font-tech text-slate-500">
                <Spinner sm />
                <span>Cargando integrantes del equipo...</span>
              </div>
            ) : (
              integrantes.map((i, index) => (
                <div
                  key={i.rut || index}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-tech font-bold uppercase transition-all duration-300 select-none
                    ${i.rut === alumno.rut
                      ? "bg-[#f490b1]/15 border-[#f490b1]/45 text-[#f490b1] shadow-[0_0_12px_rgba(244,144,177,0.12)]"
                      : "bg-[#0d0d0d] border-slate-800 text-slate-400 hover:border-[#f490b1]/30"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${i.rut === alumno.rut ? "bg-[#f490b1] animate-pulse" : "bg-slate-600"}`}></span>
                  <span>{i.nombre}</span>
                  {i.rut === alumno.rut && <span className="text-[8px] bg-[#f490b1]/20 px-1.5 py-0.5 rounded-full font-black text-[#f490b1]">TÚ</span>}
                </div>
              ))
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 text-xs font-bold text-rose-500 border-2 border-rose-500 bg-transparent hover:bg-rose-500 hover:text-white font-tech transition-all duration-300 px-5 py-2.5 rounded-xl shadow-[3px_3px_0px_rgba(239,68,68,0.2)] hover:shadow-[0px_0px_0px_transparent] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>

      <div className="space-y-8 relative z-10">
        {/* ── Detalles Generales ── */}
        <div className="bg-[#0d0d0d]/85 backdrop-blur-xl rounded-3xl border-2 border-[#f490b1]/15 p-6 shadow-[8px_8px_0px_rgba(244,144,177,0.06)] relative overflow-hidden">
          {/* Subtle top stripe */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#f490b1]"></div>

          <h2 className="text-xs font-bold text-slate-300 font-tech uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f490b1] shadow-[0_0_8px_#f490b1]"></span>
            Detalles Generales
          </h2>
          <div className="space-y-6">
            {/* Título */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 font-tech uppercase tracking-wider mb-2">Título del Proyecto</p>
              <p className="text-white font-black text-2xl font-display leading-snug">
                {proyecto.titulo}
              </p>
            </div>

            {/* Asignatura / Categoría */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 font-tech uppercase tracking-wider mb-2">Asignatura / Categoría</p>
              <span className="inline-flex px-3.5 py-1.5 bg-[#f490b1]/10 border border-[#f490b1]/30 text-[#f490b1] rounded-lg text-xs font-tech font-bold tracking-wide">
                {categoriaNombre}
              </span>
            </div>
          </div>
        </div>



        {/* ── Imagen (Editable) ── */}
        <div className="bg-[#0d0d0d]/85 backdrop-blur-xl rounded-3xl border-2 border-[#f490b1]/15 p-6 shadow-[8px_8px_0px_rgba(244,144,177,0.06)] relative overflow-hidden">
          {/* Subtle top stripe */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#f490b1]"></div>

          <h2 className="text-xs font-bold text-slate-300 font-tech uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f490b1] shadow-[0_0_8px_#f490b1]"></span>
            Imágenes de Demostración
          </h2>

          {/* Vista previa */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/60 mb-4 border border-[#f490b1]/10 flex items-center justify-center">
            {imagenUrl ? (
              <img
                src={imagenUrl}
                alt="Imagen del proyecto"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 p-6 text-center">
                <svg className="w-12 h-12 text-[#f490b1]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs font-bold font-tech uppercase text-slate-400">No se ha cargado ninguna imagen</p>
                <p className="text-[10px] font-tech text-slate-600">Sube una foto de tu maqueta, prototipo o póster</p>
              </div>
            )}
            {guardandoImg && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-[#f490b1] font-tech font-bold text-xs">
                <Spinner />
                <span className="tracking-widest uppercase">Paciencia...</span>
              </div>
            )}
          </div>

          {/* Input file */}
          <label
            htmlFor="imagen-proyecto"
            className={`flex items-center justify-center gap-3 w-full px-4 py-3.5 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer text-xs font-tech font-black uppercase tracking-wider
              ${guardandoImg
                ? "border-slate-800 text-slate-600 cursor-not-allowed bg-black/10"
                : "border-[#f490b1]/20 hover:border-[#f490b1] text-[#f490b1] hover:bg-[#f490b1]/5 bg-black/40"}`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {guardandoImg ? "Subiendo..." : "Subir nueva imagen representativa"}
            <input
              id="imagen-proyecto"
              type="file"
              accept="image/*"
              disabled={guardandoImg}
              onChange={handleImagenChange}
              className="hidden"
            />
          </label>
        </div>

        {/* ── Descripción (Editable) ── */}
        <div className="bg-[#0d0d0d]/85 backdrop-blur-xl rounded-3xl border-2 border-[#f490b1]/15 p-6 shadow-[8px_8px_0px_rgba(244,144,177,0.06)] relative overflow-hidden">
          {/* Subtle top stripe */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[#f490b1]"></div>

          <div className="flex items-center justify-between mb-4 gap-4">
            <h2 className="text-xs font-bold text-slate-300 font-tech uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f490b1] shadow-[0_0_8px_#f490b1]"></span>
              Descripción del Proyecto
            </h2>
            {!isEditing ? (
              <button
                onClick={() => {
                  setDescripcionText(proyecto?.descripcion || "");
                  setIsEditing(true);
                }}
                className="text-[10px] font-bold font-tech uppercase text-[#f490b1] hover:text-white bg-[#f490b1]/10 hover:bg-[#f490b1]/20 border border-[#f490b1]/30 hover:border-[#f490b1] px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelarDesc}
                  disabled={guardandoDesc}
                  className="text-[10px] font-bold font-tech uppercase text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700 px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarDesc}
                  disabled={guardandoDesc}
                  className="text-[10px] font-bold font-tech uppercase text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500 px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                >
                  {guardandoDesc ? (
                    <>
                      <Spinner sm />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Guardar</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="w-full px-4 py-4 rounded-2xl border border-[#f490b1]/10 bg-black/40 text-slate-300 font-tech text-sm leading-relaxed whitespace-pre-wrap">
              {proyecto.descripcion || "No se ha ingresado una descripción para este proyecto."}
            </div>
          ) : (
            <div className="relative">
              <textarea
                value={descripcionText}
                onChange={(e) => setDescripcionText(e.target.value)}
                maxLength={200}
                placeholder="Ingresa una breve descripción de tu proyecto (máx. 200 caracteres)..."
                className="w-full min-h-[120px] px-4 py-4 pb-10 rounded-2xl border border-[#f490b1]/30 focus:border-[#f490b1] bg-black/60 text-slate-200 font-tech text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#f490b1]/30 resize-none transition-all duration-300"
              />
              <div className={`absolute bottom-3 right-4 text-[10px] font-tech font-bold ${descripcionText.length >= 180 ? "text-[#f490b1]" : "text-slate-500"
                }`}>
                {descripcionText.length}/200
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Notification Alert (Material UI style) ── */}
      {toast && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-auto md:max-w-sm z-[100] animate-[slideIn_0.25s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl relative overflow-hidden ${toast.severity === "success"
              ? "bg-[#142316] border-[#2e7d32] text-[#4caf50]"
              : "bg-[#2c1414] border-[#d32f2f] text-[#ef5350]"
            }`}>

            {/* Mini colored left bar indicator */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${toast.severity === "success" ? "bg-[#4caf50]" : "bg-[#ef5350]"
              }`}></div>

            {/* Left Icon (Material UI Success/Error SVG icons) */}
            <div className="flex-shrink-0 mt-0.5">
              {toast.severity === "success" ? (
                <svg className="w-5 h-5 text-[#4caf50]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[#ef5350]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              )}
            </div>

            {/* Message Body */}
            <div className="flex-1 select-none pr-2">
              <p className="text-[10px] font-tech uppercase tracking-widest font-black mb-0.5 text-slate-400">
                {toast.severity === "success" ? "Operación exitosa" : "Fallo en operación"}
              </p>
              <p className="text-xs font-tech font-bold leading-normal text-slate-200">
                {toast.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white transition-colors duration-200 flex-shrink-0 mt-0.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* SlideIn Keyframe style injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideIn {
          from {
            transform: translateY(120%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}} />
    </div>
  );
}
