import { useEffect, useState } from 'react';
import { Grid3x3, RefreshCcw } from 'lucide-react';
import { useUI } from "../context/UIProvider";
import { socket } from '../socket';
import RoomCard from '../components/UI/RoomCard';
import Gallery from '../components/features/Gallery';

function LobbyView({ }) {

    const { gridCreate, joinGame, user, login } = useUI();

    const [rooms, setRooms] = useState([]);

    // Demande au serveur de renvoyer la liste des rooms
    const handleRefresh = () => {
        socket.emit('getActiveGrids');
    };

    // Reprise d'une grid
    const handleResume = () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        socket.emit('resumeGrid', { token }, (response) => {
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
            setRooms(Object.values(data));

        });

        // En temps réel, quand on a une create
        socket.on('createCanvas', (data) => {
            setRooms(prev => [...prev, data]);
        });

        // pareil mais quand une grid est fermée
        socket.on('roomClosed', (roomId) => {
            setRooms(prev => prev.filter(room => room.id !== roomId));
        });


        return () => {

            socket.off('activeGrids');
            socket.off('createCanvas');
            socket.off('roomClosed');
        };
    }, []);


    return (
        <div className="flex w-full bg-neutral-content h-full text-center">

            <Gallery />

            {/* Zone personnelle*/}
            <div className="flex flex-col h-screen-max w-1/3 bg-base-200 m-3 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="p-8 pb-4 text-center w-full">
                    <h1 className="text-3xl font-bold text-slate-800">Jouer</h1>
                    <p className="text-slate-500 text-sm mt-2 font-medium">Créez ou reprenez votre partie actuelle.</p>
                </div>

                <div className="flex-1 flex flex-col items-center p-6 w-full">
                    {user ? (
                        user.gridID ? (
                            <button
                                onClick={handleResume}
                                className="group relative flex flex-col items-center justify-center w-full max-w-[280px] aspect-square rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_8px_30px_rgb(99,102,241,0.3)] hover:shadow-[0_8px_40px_rgb(99,102,241,0.5)] hover:-translate-y-2 transition-all duration-300 border border-white/10"
                            >
                                <div className="absolute inset-0 rounded-[2.5rem] bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                <div className="p-5 bg-white/10 rounded-full mb-6 shadow-inner ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-300">
                                    <Grid3x3 size={48} className="text-white drop-shadow-md" strokeWidth={2.5} />
                                </div>
                                <h2 className="font-bold uppercase tracking-widest text-2xl text-white mb-2 drop-shadow-sm">Continuer</h2>
                            </button>
                        ) : (
                            <button
                                onClick={gridCreate.open}
                                className="group relative flex flex-col items-center justify-center w-full max-w-[280px] aspect-square rounded-[2.5rem] bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:shadow-[0_8px_40px_rgb(16,185,129,0.5)] hover:-translate-y-2 transition-all duration-300 border border-white/10"
                            >
                                <div className="absolute inset-0 rounded-[2.5rem] bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                <div className="p-5 bg-white/10 rounded-full mb-6 shadow-inner ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-300">
                                    <Grid3x3 size={48} className="text-white drop-shadow-md" strokeWidth={2.5} />
                                </div>
                                <h2 className="font-bold uppercase tracking-widest text-2xl text-white mb-2 drop-shadow-sm">New Game</h2>
                                <span className="text-sm text-teal-50 font-medium normal-case opacity-80 group-hover:opacity-100 transition-opacity">Créer une grille</span>
                            </button>
                        )
                    ) : (
                        <button
                            onClick={login.open}
                            className="group relative flex flex-col items-center justify-center w-full max-w-[280px] aspect-square rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_8px_40px_rgb(59,130,246,0.5)] hover:-translate-y-2 transition-all duration-300 border border-white/10"
                        >
                            <div className="absolute inset-0 rounded-[2.5rem] bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                            <div className="p-5 bg-white/10 rounded-full mb-6 shadow-inner ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-300">
                                <Grid3x3 size={48} className="text-white drop-shadow-md" strokeWidth={2.5} />
                            </div>
                            <h2 className="font-bold uppercase tracking-widest text-2xl text-white mb-2 drop-shadow-sm">New Game</h2>
                            <span className="text-sm text-blue-100 font-medium normal-case opacity-80 group-hover:opacity-100 transition-opacity">Connexion requise</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Zone publique */}
            <div className="flex flex-col items-center font-bold h-screen-max w-2/3 uppercase text-xl bg-base-200 m-3 p-3 rounded-2xl shadow-2xl relative">
                <div className="p-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-8">Salons disponibles</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                        {rooms.map((room) => (
                            <RoomCard
                                key={room.id}
                                roomName={room.name}
                                roomId={room.id}
                                host={room.host}
                                onJoin={(id, host) => user ? joinGame(id, host) : login.open()}
                            />
                        ))}

                        {/* Si pas de rooms, un petit message */}
                        {rooms.length === 0 && (
                            <div className="col-span-full text-center text-slate-500 py-10 italic">
                                Aucune partie en cours. Créez-en une !
                            </div>
                        )}

                        {/* Un bouton pour refresh pour avoir a faire f5 */}
                        <button onClick={handleRefresh} className="absolute btn btn-primary aspect-square rounded-3xl top-5 left-5 absolute hover:scale-110 transition-all duration-300"><RefreshCcw color="#ffffffff" /></button>

                    </div>
                </div>
            </div>

        </div >

    )
}

export default LobbyView