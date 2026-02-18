import { useEffect, useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import { useUI } from "../context/UIProvider";
import { socket } from '../socket';
import RoomCard from '../components/UI/RoomCard';

function LobbyView({ }) {

    const { gridCreate } = useUI();

    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        const handleRoomCreation = (data) => {
            setRooms(prev => [...prev, data]);
            console.log(data.roomName);
        };

        socket.on('createCanvas', handleRoomCreation);

        return () => {
            socket.off('createCanvas', handleRoomCreation);
        };
    }, []); // [] = exécute une seule fois au montage

    return (


        <div className="flex w-full bg-neutral-content h-full text-center">
            <div className="flex flex-col items-center h-screen-max w-1/3 uppercase text-xl bg-base-200 m-3 p-3 rounded-2xl shadow-2xl">
                <h1 className="font-bold uppercase text-xl pt-4">New Game</h1>
                <button onClick={gridCreate.open} className="btn btn-primary w-full max-w-xs h-auto aspect-square rounded-3xl mt-5"><Grid3x3 size={500} color="#ffffffff" /></button>
            </div>

            <div className="flex flex-col items-center font-bold h-screen-max w-2/3 uppercase text-xl bg-base-200 m-3 p-3 rounded-2xl shadow-2xl">
                <div className="p-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-8">Salons disponibles</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                        {rooms.map((room) => (
                            <RoomCard
                                key={room.roomName}
                                roomName={room.roomName}
                                onJoin={(name) => {
                                    console.log("Click sur rejoindre :", name);

                                }}
                            />
                        ))}

                        {/* Si pas de rooms, un petit message sympa */}
                        {rooms.length === 0 && (
                            <div className="col-span-full text-center text-slate-500 py-10 italic">
                                Aucune partie en cours. Créez-en une !
                            </div>
                        )}

                    </div>
                </div>
            </div>

        </div>

    )
}

export default LobbyView