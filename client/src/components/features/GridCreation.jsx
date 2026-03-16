import React, { useState } from 'react';
import { useUI } from '../../context/UIProvider';
import { X } from 'lucide-react';
import { socket } from '../../socket.js';
import { BadgeQuestionMark } from 'lucide-react';
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
            gridCreate.close()
            joinGame(response.id, response.host)
        })

    };



    return (
        gridCreate.isOpen ? (
            <div ref={nodeRef} className="w-80 bg-base-100 p-4 shadow-lg z-49 absolute item-center rounded-lg">
                {/*Haut de la fenêtre*/}
                <h2 className="font-bold text-center text-lg mb-4 text-primary">Création de la grille</h2>

                <button onClick={gridCreate.close} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
                    <X size={24} />
                </button>

                <div className="text-center bg-white rounded-2xl shadow-2xl pt-2 pb-2">
                    <p className="text-lg">Entrez les dimensions voulues :</p>
                    <p className="text-xs">Minimum : 20 / Maximum : 100</p>
                    <form onSubmit={createNewGrid} className="space-y-4">

                        <div className="flex flex-col justify-center items-center my-3 gap-3">
                            <label htmlFor="gridName">Nom du salon :</label>
                            <input
                                id="gridName"
                                type="text"
                                className="text-center mt-1 py-2 mx-2 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={gridName}
                                onChange={(e) => setGridName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex">


                            <div className="my-3">
                                <label htmlFor="largeurGrille" >Largeur : </label>
                                <input
                                    id="largeurGrille"
                                    type="number"
                                    min="20"
                                    max="100"
                                    className="text-center mt-1 w-17 py-2 mx-2 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={xSize}
                                    onChange={(e) => setXSize(parseInt(e.target.value))} />
                            </div>
                            <div className="my-3">
                                <label htmlFor="hauteurGrille">Hauteur : </label>
                                <input
                                    id="hauteurGrille"
                                    type="number"
                                    min="20"
                                    max="100"
                                    className="text-center mt-1 w-17 py-2 mx-2 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={ySize}
                                    onChange={(e) => setYSize(parseInt(e.target.value))} />
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <label className="text-sm text-gray-600">Type :</label>
                            <div className="flex items-center gap-2 relative p-1">
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="px-3 py-2 rounded-lg bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="public">Public</option>
                                    <option value="limited">Limité </option>
                                    <option value="private">Privé</option>
                                </select>
                                <button type="button" onMouseEnter={helpGridCreation.open} onMouseLeave={helpGridCreation.close} ><BadgeQuestionMark className="hover:size-7" color="#6e6e6eff" /></button>
                                {helpGridCreation.isOpen ? <HelpGridCreation /> : null}
                            </div>

                        </div>
                        <button type="submit" className="w-55 mb-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition">
                            Créer
                        </button>

                        <div>
                            <p className="text-red-500">{error}</p>
                        </div>
                    </form>
                </div >


            </div >

        ) : null
    )
}

export default GridCreation