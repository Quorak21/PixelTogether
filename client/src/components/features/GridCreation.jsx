import React, { useState } from 'react';
import { useUI } from '../../context/UIProvider';
import { X, Grid2X2, HelpCircle } from 'lucide-react';
import { socket } from '../../socket.js';
import HelpGridCreation from '../UI/HelpGridCreation';

function GridCreation({ }) {
    //Variables size grid
    const [xSize, setXSize] = useState(40);
    const [ySize, setYSize] = useState(40);
    const [gridName, setGridName] = useState('');
    const [error, setError] = useState('');
    const [type, setType] = useState('public');

    const nodeRef = React.useRef(null);

    // Fermeture
    const { gridCreate, joinGame, updateGridID, helpGridCreation } = useUI();

    // Envoi info au serveur
    const createNewGrid = async (e) => {
        e.preventDefault();

        socket.emit('newGrid', { width: xSize, height: ySize, name: gridName, type: type }, (response) => {
            if (response.error) {
                setError(response.error);
                return;
            }
            updateGridID(response.id);
            gridCreate.close();
            joinGame(response.id, response.host);
        })
    };

    return (
        gridCreate.isOpen ? (
            <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/50 backdrop-blur-sm p-4">
                <div ref={nodeRef} className="bg-base-100 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-sm relative animate-fade-in-up border border-base-300">

                    {/* Bouton de fermeture */}
                    <button
                        onClick={gridCreate.close}
                        className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-base-content/60 hover:text-base-content"
                    >
                        <X size={20} />
                    </button>

                    {/* En-tête de la modale */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <Grid2X2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-base-content">Nouvelle Grille</h2>
                            <p className="text-sm text-base-content/60">Configurez votre espace de jeu</p>
                        </div>
                    </div>

                    <form onSubmit={createNewGrid} className="space-y-4">

                        {/* Nom de la grille */}
                        <div className="form-control w-full">
                            <label className="label block text-center pb-1">
                                <span className="label-text font-bold text-base-content/80">Nom du salon</span>
                            </label>
                            <input
                                id="gridName"
                                type="text"
                                placeholder="Ma super oeuvre"
                                className="input input-bordered focus:border-primary focus:ring-1 focus:ring-primary w-full bg-base-200/50 transition-all font-medium"
                                value={gridName}
                                onChange={(e) => setGridName(e.target.value)}
                                required
                            />
                        </div>

                        {/* Dimensions */}
                        <div className="form-control w-full">
                            <label className="label block text-center pb-1">
                                <span className="label-text font-bold text-base-content/80">Taille de l'espace de jeu</span>
                            </label>
                            <div className="flex items-center justify-center gap-4 bg-base-200/30 p-4 rounded-xl border border-base-200">
                                <div className="flex flex-col items-center gap-1">
                                    <label className="text-xs text-base-content/60 font-semibold uppercase tracking-wider">Largeur</label>
                                    <input
                                        id="largeurGrille"
                                        type="number"
                                        min="20"
                                        max="100"
                                        className="input input-sm input-bordered focus:border-primary focus:ring-1 focus:ring-primary w-20 text-center font-bold text-lg bg-base-100 transition-all shadow-sm"
                                        value={xSize}
                                        onChange={(e) => setXSize(parseInt(e.target.value))}
                                        required
                                    />
                                </div>

                                <span className="text-base-content/40 font-bold text-xl mt-4">×</span>

                                <div className="flex flex-col items-center gap-1">
                                    <label className="text-xs text-base-content/60 font-semibold uppercase tracking-wider">Hauteur</label>
                                    <input
                                        id="hauteurGrille"
                                        type="number"
                                        min="20"
                                        max="100"
                                        className="input input-sm input-bordered focus:border-primary focus:ring-1 focus:ring-primary w-20 text-center font-bold text-lg bg-base-100 transition-all shadow-sm"
                                        value={ySize}
                                        onChange={(e) => setYSize(parseInt(e.target.value))}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Type de grille / Confidentialité */}
                        <div className="form-control w-full relative">
                            <div className="flex items-center justify-center gap-2 mb-2 relative w-full z-10">
                                <label className="label-text font-bold text-base-content/80 block">Confidentialité</label>
                                <button
                                    type="button"
                                    onMouseEnter={helpGridCreation.open}
                                    onMouseLeave={helpGridCreation.close}
                                    className="text-base-content/40 hover:text-primary transition-colors cursor-help"
                                >
                                    <HelpCircle size={16} color="black" />
                                </button>
                                {helpGridCreation.isOpen ? <HelpGridCreation /> : null}
                            </div>

                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="select select-bordered focus:border-primary focus:ring-1 focus:ring-primary w-full bg-base-200/50 transition-all font-medium"
                            >
                                <option value="public">Public</option>
                                <option value="limited">Restreint</option>
                                <option value="private">Privé</option>
                            </select>
                        </div>

                        {/* Bouton de soumission */}
                        <div className="pt-2">
                            <button type="submit" className="btn btn-primary w-full shadow-sm text-base">
                                Créer la grille
                            </button>
                        </div>

                        {/* Affichage d'erreur */}
                        {error && (
                            <div className="mt-2 p-3 text-sm font-medium text-center text-error bg-error/10 border border-error/20 rounded-lg animate-fade-in-up">
                                {error}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        ) : null
    )
}

export default GridCreation;