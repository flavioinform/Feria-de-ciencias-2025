// import banner from "../assets/img/bannerpr.png";
import banner2 from  "../assets/img/banneruta.jpg";
import { Link} from "react-router-dom";


function Hero() {
  

  return (
   <section
      className="relative flex flex-col items-center justify-center h-[700px] w-[100%] mx-auto text-center bg-cover bg-center bg-no-repeat shadow-lg"
      style={{
        backgroundImage: `linear-gradient(rgba(10,25,47,0.7), rgba(10,15,27,0.9)), url(${banner2})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: '-webkit-optimize-contrast',
      }}
     
    >
         {/* <img
        src={logo}
        alt="logo uta"
        className="w-32 h-32 object-contain mb-6 mt-6"
      /> */}
      
      <h1 className="text-white text-4xl md:text-5xl font-extrabold leading-tight mb-4">
        Bienvenido a la Feria de ciencias
      </h1>
        

      <p className="text-[#CCD6F6] text-base md:text-lg mb-6 max-w-xl">
        Profesores : Olga Penagos , Patricio Soto , Bastian Rojo
      </p>
      <Link
                to="/login"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
              >
                Iniciar sesión
              </Link> 
    </section>
  );
}

export default Hero;
