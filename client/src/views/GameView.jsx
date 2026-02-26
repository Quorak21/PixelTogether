import Canvas from '../components/features/Canvas'
import ColorPalette from '../components/features/ColorPalette';
import Chatbox from '../components/features/Chatbox';
import { useUI } from '../context/UIProvider'
import GameUI from '../components/features/GameUI';

function GameView({ roomID }) {
    const { palette, chatbox } = useUI();

    return (
        <div >
            <div className="absolute inset-0 overflow-auto bg-slate-200">
                <Canvas roomID={roomID} />
                <GameUI roomID={roomID} />

            </div>
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