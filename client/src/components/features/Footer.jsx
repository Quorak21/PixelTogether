import { useState } from 'react';
import logo from "../../assets/images/logoDokkCorp.png";

function Footer() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className="footer footer-center justify-center bg-base-100 shadow-lg text-base-content border-t border-black-200 md:h-16 h-10 ">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsFullscreen(true)}>
            <img src={logo} alt="Logo de la Dokk Corp." className="md:w-8 md:h-8 w-6 h-6" />
          </button>
          <h2 className="font-bold md:text-lg text-primary ">Dokk Corp. © 2026</h2>
        </div>
        <div className="">
          <p className="text-sm text-gray-500">Version beta 0.2.0</p>
        </div>
      </div>

      {/* Logo fullscreen */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-center items-center cursor-pointer transition-opacity duration-300"
          onClick={() => setIsFullscreen(false)}
          title="Fermer"
        >
          {/* Import temporaire de la police pour l'easter egg */}
          <style>
            {`@import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');`}
          </style>

          {/* Textes au-dessus */}
          <div className="flex flex-col items-center mb-12">
            <h1
              className="text-5xl md:text-7xl font-black text-primary drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] tracking-widest uppercase animate-bounce"
              style={{ fontFamily: "'MedievalSharp', cursive", textShadow: "0 0 20px currentColor" }}
            >
              L'ÉLITE
            </h1>
            <h2
              className="text-3xl md:text-5xl font-bold text-white drop-shadow-xl mt-6 tracking-wider"
              style={{ fontFamily: "'MedievalSharp', cursive" }}
            >
              Dokk Corp.
            </h2>
          </div>

          <img
            src={logo}
            alt="Dokk Corp Logo Fullscreen"
            className="w-[50vw] h-[50vh] object-contain animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] opacity-50 hover:opacity-100 transition-all duration-500 hover:scale-105"
          />
        </div>
      )}
    </>
  )
}

export default Footer;