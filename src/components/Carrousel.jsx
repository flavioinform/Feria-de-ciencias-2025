import * as React from "react"

// Componente de carrusel simplificado: evita dependencias/alias que no existen
export default function Carrousel() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square bg-gray-800 rounded flex items-center justify-center text-white text-4xl"
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  )
}