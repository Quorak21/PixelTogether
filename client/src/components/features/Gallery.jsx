import React, { useEffect, useState } from 'react';
import { useUI } from "../../context/UIProvider";
import { X, Heart, User, Trash } from 'lucide-react';
import { socket } from '../../socket.js';

function Gallery() {
    const { gallery, showPersonalGallery } = useUI();
    const [galleryData, setGalleryData] = useState([]);
    const [fullScreenImage, setFullScreenImage] = useState(null);

    useEffect(() => {
        if (gallery.isOpen) {
            if (showPersonalGallery) {
                socket.emit('askMyGallery', (response) => {
                    if (response && response.grids) {
                        setGalleryData(response.grids);
                    }
                });
            } else {
                socket.emit('askGallery', (response) => {
                    if (response && response.grids) {
                        setGalleryData(response.grids);
                    }
                });
            }
        }
    }, [gallery.isOpen]);

    if (!gallery.isOpen) return null;

    const fullScreen = (item) => {
        setFullScreenImage(item);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none text-left">
            {/* Overlay sombre */}
            <div
                className="absolute inset-0 bg-base-300/60 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
            ></div>

            {/* Fenêtre modale */}
            <div className="relative w-full max-w-[80vw] h-[80vh] bg-base-100/90 backdrop-blur-xl border border-base-content/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                {/* Header classe */}
                <div className="flex items-center justify-between p-6 sm:px-10 border-b border-base-content/10 bg-base-200/50">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-base-content">Galerie</h2>
                        <p className="text-sm opacity-70 mt-1 text-base-content">Découvrez les meilleures créations de la communauté.</p>
                    </div>
                    <button
                        onClick={gallery.close}
                        className="btn btn-circle btn-ghost bg-base-300/50 hover:bg-base-300 text-base-content no-animation"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Contenu - Grille d'images */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 space-y-6">
                        {galleryData.map((item, index) => (
                            <div key={index} onClick={() => fullScreen(item)} className="group h-64 relative break-inside-avoid mt-0 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 bg-base-100 border border-base-content/5 cursor-pointer">
                                <div className="block h-full overflow-hidden">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                </div>
                                {/* Overlay hover */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">{item.name}</h3>
                                        {!showPersonalGallery && (
                                            <div className="flex items-center mt-2 gap-2 text-white/80">
                                                <User size={14} className="opacity-70" />
                                                <p className="text-sm font-medium drop-shadow-md">{item.author}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                        {!showPersonalGallery && (
                                            <button onClick={(e) => { e.stopPropagation(); }} className="btn btn-sm btn-circle bg-black/50 border-white/20 text-white hover:bg-white hover:text-black transition-colors backdrop-blur-md">
                                                <Heart size={16} />
                                            </button>
                                        )}
                                        {showPersonalGallery && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    socket.emit('deleteGrid', { gridId: item.id });
                                                    setGalleryData(galleryData.filter((grid) => grid.id !== item.id));
                                                }}
                                                className="btn btn-sm btn-circle bg-red-500/50 border-white/20 text-white hover:bg-red-500 hover:text-black transition-colors backdrop-blur-md">
                                                <Trash size={16} />
                                            </button>
                                        )}
                                    </div>
                                    {showPersonalGallery && (
                                        <div className="absolute bottom-5 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                            <span className="text-sm font-bold text-success">Public</span>
                                            <input
                                                type="checkbox"
                                                checked={item.onGallery}
                                                className="toggle z-50 border-gray-600 bg-gray-500 checked:border-green-500 checked:bg-green-400 checked:text-green-800"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                }}
                                                onChange={(e) => {
                                                    socket.emit('updateGridOnGallery', { gridId: item.id, newValue: !item.onGallery });
                                                    setGalleryData(galleryData.map((grid) => grid.id === item.id ? { ...grid, onGallery: !item.onGallery } : grid));
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {fullScreenImage && (
                    <div
                        className="fixed inset-0 bg-black/96 backdrop-blur-sm flex justify-center items-center z-[9999] p-4"
                        onClick={() => setFullScreenImage(null)}
                    >

                        <button
                            className="absolute hover:bg-accent/50 top-6 right-6 text-white rounded-xl shadow-lg hover:text-accent-content transition-colors"
                            onClick={() => setFullScreenImage(null)}
                        >
                            <X size={36} />
                        </button>



                        <img
                            src={fullScreenImage.image}
                            alt={fullScreenImage.name}
                            className="max-w-[85vw] max-h-[85vh] object-contain [image-rendering:pixelated] bg-white rounded-sm"
                        />
                    </div>
                )}


            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(150, 150, 150, 0.3);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(150, 150, 150, 0.5);
                }
            `}</style>
        </div>
    );
}

export default Gallery;
