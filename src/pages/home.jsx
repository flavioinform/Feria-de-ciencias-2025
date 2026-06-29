import { useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useAlumno } from "../context/AlumnoContext";
import Hero from "../components/hero";

function home(){
    const { logout } = useContext(AppContext);
    const { logoutAlumno } = useAlumno();

    useEffect(() => {
        // Limpiar ambas sesiones cuando se accede al home público
        logout();
        logoutAlumno();
    }, [logout, logoutAlumno]);

    return (
        <>
        <Hero></Hero>
        </>
    )
}export default home;