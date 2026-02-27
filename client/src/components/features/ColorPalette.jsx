import Draggable from 'react-draggable';
import React, { useEffect, useState } from 'react';
import { useUI } from "../../context/UIProvider";
import { X, Palette, Cog, Check, Plus } from 'lucide-react';
import { socket } from '../../socket';

function ColorPalette() {

    const nodeRef = React.useRef(null);
    const { palette, selectColor, selectedColor, chosenColors, setChosenColors } = useUI();
    const [colors, setColors] = useState([]);

    const [isEditing, setIsEditing] = useState(false);
    const [editingIndex, setEditingIndex] = useState(0);

    const toggleEditing = () => { setIsEditing(prev => !prev); };

    useEffect(() => {
        socket.emit('getColors', {});
        socket.on('colors', (data) => {
            setColors(data.colors);
            setChosenColors(prev => {
                if (prev.every(c => c === null) && data.colors) {
                    const initial = Array(10).fill(null);
                    let added = 0;
                    for (let i = 0; i < data.colors.length && added < 10; i++) {
                        if (data.colors[i]) {
                            initial[added] = data.colors[i];
                            added++;
                        }
                    }
                    return initial;
                }
                return prev;
            });
        });

        return () => {
            socket.off('colors');
        };
    }, [setChosenColors]);

    const handleReplaceColor = (color) => {
        setChosenColors(prev => {
            const newColors = [...prev];
            newColors[editingIndex] = color;
            return newColors;
        });
        setEditingIndex(prev => (prev + 1) % 10);
    };

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
                    <div className="drag-handle bg-neutral text-neutral-content p-3 flex justify-between items-center cursor-move select-none group transition-colors">
                        <div className="flex items-center gap-2">
                            <Palette size={18} color="white" />
                            <span className="font-bold text-md tracking-wide">{isEditing ? "Personnalisation" : "Couleurs actives"}</span>
                        </div>
                        <div className="flex items-center gap-1 cursor-default opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={toggleEditing}
                                className={`flex items-center justify-center p-1.5 hover:bg-accent hover:text-accent-content rounded-lg transition-colors cursor-pointer ${isEditing ? 'bg-primary text-primary-content hover:bg-primary-focus hover:text-primary-content' : ''}`}
                                title={isEditing ? "Terminer" : "Modifier"}
                            >
                                {isEditing ? <Check size={16} /> : <Cog size={16} />}
                            </button>
                            <button
                                onClick={palette.close}
                                className="flex items-center justify-center p-1.5 hover:bg-error hover:text-error-content rounded-lg transition-colors cursor-pointer"
                                title="Fermer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="flex flex-col">
                            {/* Palette Actuelle (Vos 10 couleurs) */}
                            <div className="p-4 sm:p-5 bg-base-200/50 border-b border-base-content/10">
                                <div className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-3 text-center">Vos 10 couleurs (Cliquez pour éditer)</div>
                                <div className="grid grid-cols-5 gap-3 justify-items-center">
                                    {Array.from({ length: 10 }).map((_, index) => {
                                        const color = chosenColors[index];
                                        return (
                                            <button
                                                key={`slot-${index}`}
                                                onClick={() => setEditingIndex(index)}
                                                className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 transition-all duration-200 shadow-sm border-[3px] flex items-center justify-center ${editingIndex === index ? 'border-primary outline outline-offset-2 outline-primary scale-110 shadow-md z-10' : 'border-base-100 hover:scale-105'
                                                    } ${!color ? 'border-dashed border-base-content/20 bg-base-200/50 opacity-70' : ''}`}
                                                style={color ? { backgroundColor: color } : {}}
                                            >
                                                {!color && <div className="w-2 h-2 rounded-full bg-base-content/20"></div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Stock complet */}
                            <div className="p-4 sm:p-5 bg-base-200/30">
                                <div className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-3 text-center">Stock disponible</div>
                                <div className="grid grid-cols-5 gap-3 justify-items-center">
                                    {colors.map((color, index) => (
                                        color ? (
                                            <button
                                                key={`stock-${index}`}
                                                onClick={() => handleReplaceColor(color)}
                                                title={color}
                                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 transition-all duration-200 ease-out active:scale-95 shadow-sm border-[3px] border-base-100 hover:scale-110 hover:shadow-md cursor-pointer"
                                                style={{ backgroundColor: color }}
                                            />
                                        ) : null
                                    ))}
                                    {/* Bouton d'ajout vers la boutique */}
                                    <button
                                        title="Débloquer de nouvelles couleurs (Bientôt !)"
                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 border-2 border-dashed border-base-content/40 bg-base-300 hover:bg-base-200 flex items-center justify-center opacity-80 hover:opacity-100 transition-all hover:scale-105 active:scale-95 cursor-pointer text-base-content/60 hover:text-base-content/90"
                                        onClick={() => {
                                            // Future action: open shop
                                            console.log("Ouvrir la boutique de couleurs");
                                        }}
                                    >
                                        <Plus size={20} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 sm:p-5 bg-base-200/30">
                            <div className="grid grid-cols-5 gap-3 justify-items-center">
                                {Array.from({ length: 10 }).map((_, index) => {
                                    const color = chosenColors[index];
                                    return color ? (
                                        <button
                                            key={`color-${index}`}
                                            onClick={() => { selectColor(color); palette.close(); }}
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
                                            title="Emplacement vide"
                                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 border-2 border-dashed border-base-content/20 bg-base-200/50 flex items-center justify-center opacity-70"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-base-content/20"></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
            </Draggable>
        ) : null
    )
}

export default ColorPalette;