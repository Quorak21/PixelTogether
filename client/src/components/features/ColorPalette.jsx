import Draggable from 'react-draggable';
import React from 'react';

function ColorPalette({ toggleColorPalette, colorPaletteIsVisible }) {

    const nodeRef = React.useRef(null);




    return (
        colorPaletteIsVisible ? (
            <Draggable
                nodeRef={nodeRef}
                handle=".drag-handle"
                defaultPosition={{ x: 100, y: 250 }}
                bounds="parent"
            >

                <div ref={nodeRef} className="drag-handle cursor-move w-80 bg-base-100 border-2 border-black pt-2 z-50 rounded-lg">
                    <h2 className="font-bold text-center text-lg mb-4 text-primary">Couleurs</h2>
                    <button onClick={toggleColorPalette} className="btn bg-transparent border-0 text-xl absolute top-1 right-1">❌</button>
                </div>
            </Draggable>
        ) : null
    )
}

export default ColorPalette