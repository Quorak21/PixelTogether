import React from 'react';
import Canvas from '../components/features/Canvas'
import ColorPalette from '../components/features/ColorPalette';
import { useUI } from '../context/UIProvider'

function GameView({ roomID }) {
    const { palette } = useUI();

    return (
        <div >
            <div className="absolute inset-0 overflow-auto bg-slate-200">
                <Canvas roomID={roomID} />
            </div>
            {/* Les fenêtres */}
            {palette.isOpen && (
                <ColorPalette />
            )}
        </div>
    )
}

export default GameView