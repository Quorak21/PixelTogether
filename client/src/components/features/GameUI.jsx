import { Eraser, MessageCircle, Save, BadgeX, UserRoundPlus } from 'lucide-react';
import { useUI } from "../../context/UIProvider";
import { socket } from '../../socket';
import { useState, useEffect } from 'react';
import FinishConfirm from '../UI/FinishConfirm';
import EndScreen from '../UI/EndScreen';

function GameUI({ roomID, gridType }) {
  const { palette, selectedColor, selectColor, chatbox, currentHost, updateGridID, exitGame, inviteWindow } = useUI();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [snapshot, setSnapshot] = useState("");


  const askGallery = () => {
    const canvasElement = document.getElementById('canvas');
    if (canvasElement) {
      const snapshot = canvasElement.toDataURL('image/png');
      setSnapshot(snapshot);
    }
    setShowFinishModal(false);
    setShowEndScreen(true);
  };

  const finishCanvas = (isPublic) => {
    socket.emit('finishCanvas', { roomId: roomID, onGallery: isPublic });
    updateGridID(null);
    exitGame();
  };

  const deleteCanvas = () => {
    socket.emit('deleteCanvas', { roomId: roomID });
    updateGridID(null);
    exitGame();
  };

  useEffect(() => {
    socket.on('gridSaved', () => {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
      }, 2000);
    });
    return () => socket.off('gridSaved');
  }, []);


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

        <button
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.18)] border-[3px] border-[#7a9dabc0] backdrop-blur-md flex-shrink-0"
          style={{ backgroundColor: selectedColor }}
          onClick={palette.open} title="Ouvrir la palette"
        />

        <GlassButton onClick={() => selectColor('#ffffff')} title="Gomme">
          <Eraser className="w-6 h-6 sm:w-7 sm:h-7" />
        </GlassButton>
      </div>

      {/* Haut gauche */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex flex-col items-center gap-3 sm:gap-4 pointer-events-auto">

        {saved && <span className="text-black text-lg font-bold animate-pulse">💾 saved ...</span>}

      </div>

      {/* Bas Gauche */}
      {currentHost === socket.id && (
        <div className="absolute bottom-10 left-4 sm:bottom-6 sm:left-6 flex gap-3 sm:gap-4 flex-col sm:flex-row pointer-events-auto">
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
      <div className="absolute bottom-10 right-4 sm:bottom-6 sm:right-6 flex gap-3 sm:gap-4 flex-col sm:flex-row pointer-events-auto">
        {currentHost === socket.id && gridType === 'limited' && (

          <GlassButton onClick={inviteWindow.open} title="Inviter des joueurs">
            <UserRoundPlus className="w-6 h-6 sm:w-7 sm:h-7" />
          </GlassButton>
        )}
        <GlassButton onClick={chatbox.open} title="Ouvrir le chat">
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
        </GlassButton>
      </div>

      {/* Fenêtres modales */}
      <div className="pointer-events-auto">
        {showFinishModal && <FinishConfirm title="Terminer" message="Êtes-vous sûr de vouloir terminer votre grille ? Vous ne pourrez plus la modifier !" onConfirm={askGallery} onCancel={() => setShowFinishModal(false)} buttonText="Terminer" buttonColor="bg-indigo-500 hover:bg-indigo-600" />}
        {showDeleteModal && <FinishConfirm title="Suppression" message="Êtes-vous sûr de vouloir supprimer votre grille ?" onConfirm={deleteCanvas} onCancel={() => setShowDeleteModal(false)} buttonText="Supprimer" buttonColor="bg-red-500 hover:bg-red-600" />}
      </div>


      {/* End Screen */}
      <div className="pointer-events-auto">
        {showEndScreen && (<EndScreen onConfirm={finishCanvas} onCancel={() => setShowEndScreen(false)} image={snapshot} />)}
      </div>

    </div>
  )
}

export default GameUI