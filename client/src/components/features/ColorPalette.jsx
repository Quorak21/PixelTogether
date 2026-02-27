import Draggable from 'react-draggable';
import React from 'react';
import { useUI } from "../../context/UIProvider";
import { X, Palette } from 'lucide-react';

function ColorPalette() {

    const nodeRef = React.useRef(null);
    const { palette, selectColor, selectedColor } = useUI();

    // 7 couleurs actives + 3 placeholders
    const colors = ['#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#c0c0c0', '#905a29', null, null, null];

    return (
        palette.isOpen ? (
            <Draggable
                nodeRef={nodeRef}
                handle=".drag-handle"
                cancel="button"
                defaultPosition={{ x: window.innerWidth - 500, y: 100 }}
                bounds="body"
            >
                <div ref={nodeRef} className="fixed top-0 left-0 z-[100] flex flex-col bg-base-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden border border-base-200 w-[18rem] sm:w-[22rem]">

                    {/* Header */}
                    <div className="drag-handle bg-neutral text-neutral-content p-3 flex justify-between items-center cursor-move select-none group">
                        <div className="flex items-center gap-2">
                            <Palette size={18} color="white" />
                            <span className="font-bold text-sm tracking-wide">Couleurs</span>
                        </div>
                        <div className="flex items-center gap-1 cursor-default opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={palette.close}
                                className="p-1.5 hover:bg-error hover:text-error-content rounded-lg transition-colors cursor-pointer"
                                title="Fermer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-5 bg-base-200/30">
                        <div className="grid grid-cols-5 gap-3 justify-items-center">
                            {colors.map((color, index) => (
                                color ? (
                                    <button
                                        key={`color-${index}`}
                                        onClick={() => { selectColor(color), palette.close() }}
                                        title={color}
                                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 transition-all duration-200 ease-out active:scale-95 shadow-sm border-[3px] ${selectedColor === color
                                            ? 'border-primary outline outline-offset-2 outline-primary scale-110 shadow-md z-10'
                                            : 'border-base-100 hover:scale-110 hover:shadow-md'
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ) : (
                                    <div
                                        key={`empty-${index}`}
                                        title="Emplacement vide (Bientôt !)"
                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 border-2 border-dashed border-base-content/20 bg-base-200/50 flex items-center justify-center opacity-70"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-base-content/20"></div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>

                </div>
            </Draggable>
        ) : null
    )
}

export default ColorPalette;