import { Palette, Eraser, MessageCircle, Save, BadgeX } from 'lucide-react';
import { useUI } from "../../context/UIProvider";
import { socket } from '../../socket';
import { useState } from 'react';
import FinishConfirm from '../UI/FinishConfirm';

function GameUI({ roomID }) {
  const { palette, selectedColor, selectColor, chatbox, currentHost, updateGridID, exitGame } = useUI();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  // Fin du canvas
  const finishCanvas = () => {
    const token = localStorage.getItem('token');
    socket.emit('finishCanvas', { roomId: roomID, token });
    updateGridID(null);
    exitGame();
  };

  const deleteCanvas = () => {
    const token = localStorage.getItem('token');
    socket.emit('deleteCanvas', { roomId: roomID, token });
    updateGridID(null);
    exitGame();
  };

  const GlassButton = ({ onClick, children, className = "", title }) => (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#7a9dabc0] backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.18)] border border-[#8fbcbb50] text-white hover:bg-[#5e81ACd0] hover:scale-110 transition-all duration-200 ease-out active:scale-95 ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Haut droite */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex flex-col items-center gap-3 sm:gap-4 pointer-events-auto">

        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.18)] border-[3px] border-[#7a9dabc0] backdrop-blur-md flex-shrink-0"
          style={{ backgroundColor: selectedColor }}
          title="Couleur actuelle"
        />

        <GlassButton onClick={palette.open} title="Ouvrir la palette">
          <Palette className="w-6 h-6 sm:w-7 sm:h-7" />
        </GlassButton>

        <GlassButton onClick={() => selectColor('#ffffff')} title="Gomme">
          <Eraser className="w-6 h-6 sm:w-7 sm:h-7" />
        </GlassButton>
      </div>

      {/* Bas Gauche */}
      {currentHost === socket.id && (
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex gap-3 sm:gap-4 flex-col sm:flex-row pointer-events-auto">
          <GlassButton
            onClick={() => setShowFinishModal(true)}
            title="Sauvegarder"
            className="!bg-indigo-500/90 !text-white !border-indigo-400/30 hover:!bg-indigo-600 shadow-[0_4px_15px_rgba(99,102,241,0.4)]"
          >
            <Save className="w-6 h-6 sm:w-7 sm:h-7" />
          </GlassButton>

          <GlassButton
            onClick={() => setShowDeleteModal(true)}
            title="Supprimer"
            className="!bg-red-500/90 !text-white !border-red-400/30 hover:!bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.4)]"
          >
            <BadgeX className="w-6 h-6 sm:w-7 sm:h-7" />
          </GlassButton>
        </div>
      )}

      {/* Bas droite */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 pointer-events-auto">
        <GlassButton onClick={chatbox.open} title="Ouvrir le chat">
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
        </GlassButton>
      </div>

      {/* Fenêtres modales */}
      <div className="pointer-events-auto">
        {showFinishModal && <FinishConfirm title="Terminer" message="Êtes-vous sûr de vouloir terminer votre grille ? Vous ne pourrez plus la modifier !" onConfirm={finishCanvas} onCancel={() => setShowFinishModal(false)} />}
        {showDeleteModal && <FinishConfirm title="Suppression" message="Êtes-vous sûr de vouloir supprimer votre grille ?" onConfirm={deleteCanvas} onCancel={() => setShowDeleteModal(false)} />}
      </div>
    </div>
  )
}

export default GameUI