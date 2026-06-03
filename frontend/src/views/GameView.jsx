import { useEffect, useRef, useState } from 'react';
import Canvas from '../components/features/Canvas'
import ColorPalette from '../components/features/ColorPalette';
import Chatbox from '../components/features/Chatbox';
import { useUI } from '../context/UIProvider'
import { socket } from '../socket.js';
import GameUI from '../components/features/GameUI';
import InviteWindow from '../components/UI/inviteWindow.jsx';

function GameView({ roomID }) {

    const [gridType, setGridType] = useState('null');
    const { palette, chatbox, currentHost, exitGame, inviteWindow } = useUI();
    const bgTimerRef = useRef(null);

    // 1. L'Interrupteur (State)
    const [hintMessage, setHintMessage] = useState(null);

    // 2. Le chrono des 5 secondes à chaque notification
    useEffect(() => {
        if (!hintMessage) return;

        const timer = setTimeout(() => {
            setHintMessage(null);
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [hintMessage]);

    // 3. Le radar natif pour savoir qui arrive/part
    useEffect(() => {
        const onJoinedRoom = (data) => {
            setHintMessage(`✨ ${data.pseudo} a rejoint la partie !`);
        };

        const onExitGame = (data) => {
            setHintMessage(`🏃 ${data.user} a quitté la partie.`);
        };

        socket.on('joinedRoom', onJoinedRoom);
        socket.on('exitGame', onExitGame);

        return () => {
            socket.off('joinedRoom', onJoinedRoom);
            socket.off('exitGame', onExitGame);
        };
    }, []);

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
                <Canvas roomID={roomID} setGridType={setGridType} />
            </div>

            {/* Infobulle connection */}
            {hintMessage && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-opacity duration-1000 ease-out">
                    <div className="bg-primary/95 text-primary-content backdrop-blur-md px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce border-2 border-primary-content/20">
                        <span className="text-sm font-bold tracking-wide">{hintMessage}</span>
                    </div>
                </div>
            )}

            {/* UI */}
            <GameUI roomID={roomID} gridType={gridType} />
            {/* Les fenêtres */}
            {palette.isOpen && (
                <ColorPalette />
            )}
            {chatbox.isOpen && (
                <Chatbox roomID={roomID} onClose={chatbox.close} />
            )}
            {inviteWindow.isOpen && (
                <InviteWindow roomID={roomID} onClose={inviteWindow.close} />
            )}
        </div>
    )
}

export default GameView