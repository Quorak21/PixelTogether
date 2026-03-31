import React, { useEffect, useState } from 'react';
import { useUI } from "../../context/UIProvider";
import { X } from 'lucide-react';
import { socket } from '../../socket.js';
import GalleryCard from '../UI/GalleryCard';

function Gallery() {
    const { gallery, showPersonalGallery } = useUI();
    const [galleryData, setGalleryData] = useState([]);

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

    const handleDelete = (gridId) => {
        socket.emit('deleteGrid', { gridId });
        setGalleryData(galleryData.filter(grid => grid.id !== gridId));
    };

    const handlePublic = (gridId, currentValue) => {
        socket.emit('updateGridOnGallery', { gridId, newValue: !currentValue });
        setGalleryData(galleryData.map(grid => grid.id === gridId ? { ...grid, onGallery: !currentValue } : grid));
    };

    if (!gallery.isOpen) return null;

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
                        <h2 className="text-3xl font-bold tracking-tight text-base-content">{showPersonalGallery ? 'Galerie personnelle' : 'Galerie'}</h2>
                        <p className="text-sm opacity-70 mt-1 text-base-content">{showPersonalGallery ? 'Gérez vos créations.' : 'Découvrez les meilleures créations de la communauté.'}</p>
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
                            <GalleryCard key={index} item={item} personal={showPersonalGallery} onDelete={handleDelete} onPublic={handlePublic} />
                        ))}
                    </div>
                </div>



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
