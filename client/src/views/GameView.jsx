import { useEffect, useRef } from 'react';
import Canvas from '../components/features/Canvas'
import ColorPalette from '../components/features/ColorPalette';
import Chatbox from '../components/features/Chatbox';
import { useUI } from '../context/UIProvider'
import { socket } from '../socket.js';
import GameUI from '../components/features/GameUI';

function GameView({ roomID }) {
    const { palette, chatbox, currentHost, exitGame } = useUI();
    const bgTimerRef = useRef(null);

    // Auto-fermeture de la room si le host met le browser en arrière-plan (mobile)
    useEffect(() => {
        const handleVisibility = () => {
            // Seulement si c'est le host
            if (socket.id !== currentHost) return;

            if (document.hidden) {
                // Le host a quitté le browser → timer de 10s avant fermeture
                bgTimerRef.current = setTimeout(() => {
                    socket.emit('closeRoom', { roomId: roomID });
                    exitGame();
                }, 10000);
            } else {
                // Le host est revenu → on annule le timer
                if (bgTimerRef.current) {
                    clearTimeout(bgTimerRef.current);
                    bgTimerRef.current = null;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
        };
    }, [currentHost, roomID, exitGame]);

    return (
        <div className="absolute inset-0">
            {/* Zone du jeu */}
            <div className="absolute inset-0 overflow-hidden bg-slate-200">
                <Canvas roomID={roomID} />
            </div>

            {/* UI */}
            <GameUI roomID={roomID} />
            {/* Les fenêtres */}
            {palette.isOpen && (
                <ColorPalette />
            )}
            {chatbox.isOpen && (
                <Chatbox roomID={roomID} onClose={chatbox.close} />
            )}
        </div>
    )
}

export default GameView