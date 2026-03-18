import React, { useEffect, useRef } from 'react';
import { Globe, Lock, X, Sparkles } from 'lucide-react';

const Confetti = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    // Des couleurs fluo, ultra vibrantes et très visibles
    const colors = ['#FF0055', '#00FF66', '#00AAFF', '#FFD700', '#FF6600', '#CC00FF', '#ffffff'];

    // Left cannon
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width * 0.1,
        y: canvas.height + 20,
        r: Math.random() * 8 + 6, // Un peu plus grand pour être plus visible
        dx: Math.random() * 15 + 5, 
        dy: Math.random() * -22 - 15, 
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncrement: (Math.random() * 0.07) + 0.05,
        tiltAngle: 0
      });
    }

    // Right cannon
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width * 0.9,
        y: canvas.height + 20,
        r: Math.random() * 8 + 6, // Un peu plus grand
        dx: Math.random() * -15 - 5, 
        dy: Math.random() * -22 - 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncrement: (Math.random() * 0.07) + 0.05,
        tiltAngle: 0
      });
    }

    let animationFrameId;
    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncrement;
        p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle) * 2;
        p.dx *= 0.99; // air resistance
        p.dy += 0.4;  // gravity
        p.x += p.dx;
        p.y += p.dy;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
        ctx.stroke();
      });
    };
    render();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none w-full h-full" style={{ zIndex: 150 }} />;
};

const EndScreen = ({ onCancel, onConfirm, image = "" }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm transition-opacity duration-300 overflow-y-auto w-full h-full">

      {/* Confetti canvas stays fixed to viewport so it doesn't move when scrolling */}
      <Confetti />

      {/* Wrapper to allow vertical centering + scrolling if necessary */}
      <div className="min-h-[100dvh] flex items-center justify-center p-2 sm:p-4">

        {/* Main Container */}
        <div 
          className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg p-5 sm:p-8 bg-white/10 border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)] rounded-3xl backdrop-blur-xl my-4 sm:my-8"
          style={{ animation: 'pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
        >
          {/* Close Button */}
          <button 
            onClick={onCancel}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <style>
            {`
              @keyframes pop-in {
                0% { transform: scale(0.6); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes halo-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes float {
                0%, 100% { transform: translateY(0) rotate(-2deg); }
                50% { transform: translateY(-8px) rotate(1deg); }
              }
            `}
          </style>

          {/* Title - Reduced margin on mobile */}
          <div className="text-center mb-4 sm:mb-6 mt-2 sm:mt-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)] tracking-wider uppercase flex items-center justify-center gap-1 sm:gap-2">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 drop-shadow-md" />
              Incroyable!
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 drop-shadow-md" />
            </h2>
            <p className="mt-1 sm:mt-2 text-base sm:text-xl text-white font-semibold drop-shadow-md">
              Ton chef-d'œuvre est terminé.
            </p>
          </div>

          {/* Image with Rainbow Halo - Scaled down slightly on mobile */}
          <div className="relative mb-5 sm:mb-8 flex items-center justify-center w-48 h-48 sm:w-64 sm:h-64">
            {/* Halo */}
            <div 
              className="absolute w-full h-full opacity-100 blur-xl rounded-full scale-[1.15] sm:scale-125"
              style={{ 
                background: 'conic-gradient(from 0deg, #ff0000, #ff7f00, #ffff00, #00ff00, #00ffff, #0000ff, #8b00ff, #ff0000)',
                animation: 'halo-spin 4s linear infinite'
              }}
            ></div>

            {/* Image */}
            <div 
              style={{ animation: 'float 4s ease-in-out infinite' }}
              className="relative z-10 p-2 sm:p-3 bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-4 border-white"
            >
              {image ? (
                <img src={image} alt="Ton chef-d'œuvre" className="w-36 h-36 sm:w-48 sm:h-48 object-contain rounded-md bg-white block" />
              ) : (
                <div className="w-36 h-36 sm:w-48 sm:h-48 bg-gradient-to-br from-gray-200 to-gray-400 rounded-md flex items-center justify-center">
                  <span className="text-gray-500 font-bold">Image</span>
                </div>
              )}
              <div className="absolute inset-0 ring-1 ring-black/10 rounded-xl pointer-events-none"></div>
            </div>
          </div>

          {/* Question Text */}
          <p className="text-center text-white text-base sm:text-lg font-bold mb-4 sm:mb-6 max-w-xs sm:max-w-md drop-shadow-lg leading-tight">
            Veux-tu partager ton art dans la galerie publique, ou la garder pour toi ?
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col w-full gap-3 sm:gap-4 px-2 sm:px-0">
            <button 
              onClick={() => onConfirm(true)}
              className="relative overflow-hidden group flex-1 flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 px-4 sm:px-6 rounded-2xl bg-gradient-to-b from-green-400 to-green-500 text-white font-extrabold text-lg sm:text-xl shadow-[0_6px_0_rgb(21,128,61),0_10px_25px_rgba(34,197,94,0.6)] hover:translate-y-[2px] hover:shadow-[0_4px_0_rgb(21,128,61),0_8px_15px_rgba(34,197,94,0.5)] active:translate-y-[6px] active:shadow-[0_0px_0_rgb(21,128,61),0_0px_0px_rgba(34,197,94,0.5)] transition-all"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent group-hover:opacity-50 transition-opacity rounded-2xl pointer-events-none"></div>
              <Globe className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-md" />
              <span className="drop-shadow-sm leading-none pt-1">Publier dans la galerie !</span>
            </button>

            <button 
              onClick={() => onConfirm(false)}
              className="relative overflow-hidden group flex-1 flex items-center justify-center gap-2 sm:gap-3 py-2.5 sm:py-3 px-4 sm:px-6 rounded-2xl bg-gradient-to-b from-slate-500 to-slate-600 text-white font-bold text-base sm:text-lg shadow-[0_4px_0_rgb(51,65,85),0_8px_20px_rgba(51,65,85,0.5)] hover:translate-y-[2px] hover:shadow-[0_2px_0_rgb(51,65,85),0_4px_10px_rgba(51,65,85,0.4)] active:translate-y-[4px] active:shadow-[0_0px_0_rgb(51,65,85),0_0px_0px_rgba(51,65,85,0.4)] transition-all mt-1 sm:mt-2"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent group-hover:opacity-50 transition-opacity rounded-2xl pointer-events-none"></div>
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" />
              <span className="drop-shadow-sm leading-none pt-1">Garder privée</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EndScreen;