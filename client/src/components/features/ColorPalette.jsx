import Draggable from 'react-draggable';
import React from 'react';
import { useUI } from "../../context/UIProvider";
import { X } from 'lucide-react';

function ColorPalette({ }) {

    const nodeRef = React.useRef(null);
    const { palette, selectColor } = useUI();

    const colors = ['#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#c0c0c0', '#905a29']

    return (
        palette.isOpen ? (
            <Draggable
                nodeRef={nodeRef}
                handle=".drag-handle"
                defaultPosition={{ x: window.innerWidth - 500, y: 0 }}
                bounds="parent"
            >

                <div ref={nodeRef} className="w-95 bg-base-200 p-4 shadow-lg z-48 absolute item-center rounded-lg">

                    <button
                        onClick={palette.close}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
                    >
                        <X size={30} color="#ff0000" />
                    </button>

                    <h2 className="drag-handle cursor-move font-bold text-center text-lg mb-4 text-primary">
                        Couleurs
                    </h2>

                    <div className="flex bg-gray-100 justify-center gap-3 p-3">
                        {colors.map(color => (
                            <button key={color} onClick={() => { selectColor(color); palette.close(); }} className="btn active:scale-90 w-9 h-9 rounded-full hover:brightness-90 hover:scale-110" style={{ backgroundColor: color }}></button>
                        ))}
                    </div>

                </div>

            </Draggable>
        ) : null
    )
}

export default ColorPalette