import { useEffect, useState } from 'react';
import { RefreshCcw, Plus, Play, LogIn, Grid3x3 } from 'lucide-react';
import { useUI } from "../context/UIProvider";
import { socket } from '../socket';
import RoomCard from '../components/UI/RoomCard';
import Gallery from '../components/features/Gallery';

function LobbyView({ }) {
    const { gridCreate, joinGame, user, login } = useUI();
    const [rooms, setRooms] = useState([]);
    const [images, setImages] = useState([]);

    // Demande au serveur de renvoyer la liste des rooms
    const handleRefresh = () => {
        socket.emit('getActiveGrids');
    };

    // Reprise d'une grid
    const handleResume = () => {
        socket.emit('resumeGrid', {}, (response) => {
            if (response.error) {
                console.error(response.error);
                return;
            }
            // On rejoint avec l'id et le host de la room récupérée
            joinGame(response.id, response.host);
        });
    };

    useEffect(() => {

        // On demande les rooms dès qu'on arrive sur le lobby
        socket.emit('getActiveGrids');

        // Au lancement du lobby, on demande les rooms
        socket.on('activeGrids', (data) => {
            setRooms(Object.values(data.activeGrids || {}).filter(room => room && room.id));
            setImages(data.images);
        });

        // En temps réel, quand on a une create (on évite les doublons)
        socket.on('createCanvas', (data) => {
            setRooms(prev => {
                if (prev.some(room => room.id === data.id)) return prev;
                return [...prev, data];
            });
            setImages(data.image);
        });
        socket.on('roomClosed', (data) => {
            setRooms(prev => prev.filter(room => room.id !== data.roomId));
            setImages(data.image);
        });

        // Rafraichissement automatique toutes les 15s (comme l'autosave du serveur)
        const refreshInterval = setInterval(() => {
            socket.emit('getActiveGrids');
        }, 15000);

        return () => {
            socket.off('activeGrids');
            socket.off('createCanvas');
            socket.off('roomClosed');
            clearInterval(refreshInterval);
        };
    }, []);

    const mainAction = user ? (user.gridID ? handleResume : gridCreate.open) : login.open;
    const ActionIcon = user ? (user.gridID ? () => {
        const gridImage = images[user.gridID] || user.userImg;
        return gridImage ? (
            <img
                src={gridImage}
                alt="Reprendre"
                className="object-contain z-40 w-[90%] h-[90%]"
            />
        ) : <Play size={64} className="text-primary-content/90 group-hover:text-white group-hover:scale-110 transition-transform duration-300 z-10" strokeWidth={1.5} />
    } : Plus) : LogIn;
    const actionTitle = user ? (user.gridID ? "Continuer" : "Nouvelle grille") : "Se connecter";
    const buttonText = user ? (user.gridID ? "Reprendre" : "Créer") : "Connexion";

    return (
        <div className="flex w-full bg-base-100 h-full overflow-hidden">
            <Gallery />

            {/* Zone de jeu unique */}
            <div className="flex flex-col flex-1 bg-base-200 m-3 p-6 md:p-10 rounded-3xl shadow-inner relative overflow-y-auto w-full">
                <div className="w-full max-w-7xl mx-auto flex flex-col h-full">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-base-content tracking-tight">Lobby</h1>
                            <p className="text-base-content/60 mt-2 text-lg font-medium">Rejoignez une partie publique ou créez la vôtre.</p>
                        </div>
                        <button onClick={handleRefresh} className="btn btn-circle bg-base-100 border-none shadow-sm hover:bg-base-300 hover:rotate-180 transition-all duration-500">
                            <RefreshCcw className="w-5 h-5 text-base-content/70" />
                        </button>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">

                        {/* 1. Carte joueur */}
                        <div onClick={mainAction} className="card bg-primary text-primary-content shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-none group relative overflow-hidden flex flex-col">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10"></div>
                            <figure className="aspect-square w-full relative flex items-center justify-center bg-black/10 overflow-hidden">
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_2px_2px,_currentColor_1px,_transparent_0)] bg-[length:16px_16px]" />
                                <ActionIcon size={64} className="text-primary-content/90 group-hover:text-white group-hover:scale-110 transition-transform duration-300 z-10" strokeWidth={1.5} />
                            </figure>
                            <div className="card-body items-center p-6 flex flex-col z-10">
                                <h2 className="card-title text-2xl font-bold tracking-tight mb-2">
                                    {actionTitle}
                                </h2>
                                <div className="card-actions justify-center mt-3">
                                    <button className="btn bg-base-100 text-primary hover:bg-white border-none w-full shadow-sm group-hover:shadow-md transition-all">
                                        {buttonText}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 2. Liste des salons */}
                        {rooms.map((room) => (
                            <RoomCard
                                key={room.id}
                                roomName={room.name}
                                roomId={room.id}
                                host={room.host}
                                pseudo={room.pseudo}
                                image={images[room.id]}
                                playerCount={room.playersList?.length || 0}
                                onJoin={(id, host) => user ? joinGame(id, host) : login.open()}
                            />
                        ))}

                    </div>

                    {/* Si pas de rooms (à part la carte joueur), un petit message */}
                    {rooms.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-base-content/40 italic pb-20">
                            <Grid3x3 size={64} className="mb-6 opacity-20" strokeWidth={1} />
                            <p className="text-lg">Aucune partie publique en cours.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

export default LobbyView