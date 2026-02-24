import { useEffect, useRef, useState } from 'react';
import { socket } from '../../socket.js';
import { useUI } from '../../context/UIProvider';

function Canvas({ roomID }) {

    const canvasRef = useRef(null);
    const PIXEL_SIZE = 20;
    const { selectedColor, exitGame, user, currentHost } = useUI();
    const [roomName, setRoomName] = useState('');

    // Création du canvas
    useEffect(() => {

        // On rejoint la room socket avec notre roomID reçu via le choix de lobby
        socket.emit('joinRoom', { roomId: roomID, pseudo: user.pseudo });

        // On reçoit l'état de la grid
        socket.on('gridState', (data) => {
            if (!canvasRef.current) return;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d')
            const width = data.width;
            const height = data.height;
            setRoomName(data.name);

            // On dimensionne le canvas
            canvas.width = width * PIXEL_SIZE;
            canvas.height = height * PIXEL_SIZE;

            // On dessine le quadrillage
            ctx.beginPath()
            ctx.strokeStyle = '#ddd'
            ctx.lineWidth = 1
            for (let gx = 0; gx <= width; gx++) {
                ctx.moveTo(gx * PIXEL_SIZE, 0)
                ctx.lineTo(gx * PIXEL_SIZE, height * PIXEL_SIZE)
            }
            for (let gy = 0; gy <= height; gy++) {
                ctx.moveTo(0, gy * PIXEL_SIZE)
                ctx.lineTo(width * PIXEL_SIZE, gy * PIXEL_SIZE)
            }
            ctx.stroke()

            // On dessine les pixels existants (s'il y en a)
            for (const coords in data.pixels) {
                const pixelColor = data.pixels[coords];
                const [x, y] = coords.split(',');
                ctx.fillStyle = pixelColor;
                ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        });

        // écoute de ce que font les autres + dessin
        socket.on('drawPixel', (data) => {
            const ctx = canvasRef.current.getContext('2d')
            ctx.fillStyle = data.color
            ctx.fillRect(data.x * PIXEL_SIZE, data.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)

            // Redessiner la bordure si c'est blanc
            if (data.color.startsWith('#ffffff')) {
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 1;
                ctx.strokeRect(data.x * PIXEL_SIZE, data.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        });

        // Si l'host ferme la room, on retourne au lobby
        socket.on('roomClosed', (closedRoomId) => {
            if (closedRoomId === roomID) {
                exitGame();
            }
        });

        // Nettoyage quand le composant se démonte
        return () => {
            socket.off('drawPixel')
            socket.off('gridState')
            socket.off('roomClosed')
        };

    }, []);

    // Dessin d'un pixel au clic
    const drawPixel = (event) => {
        const rect = canvasRef.current.getBoundingClientRect();

        // Position du clic par rapport au canvas
        const coordX = event.clientX - rect.left
        const coordY = event.clientY - rect.top

        // Convertir en coordonnées de la grid
        const x = Math.floor(coordX / PIXEL_SIZE)
        const y = Math.floor(coordY / PIXEL_SIZE)

        console.log(`Coordonnée ${x}:${y} | Couleur: ${selectedColor}`)

        // Dessiner localement
        const ctx = canvasRef.current.getContext('2d')
        ctx.fillStyle = selectedColor
        ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)

        // Redessiner la bordure si on met du blanc
        if (selectedColor.startsWith('#ffffff')) {
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }

        // Récup du token de l'user s'il en a un
        const token = localStorage.getItem('token');

        // Envoyer au serveur
        socket.emit('pixelPlaced', { x, y, color: selectedColor, roomId: roomID, token });
    };

    // Fin du canvas
    const finishCanvas = () => {

        const token = localStorage.getItem('token');
        socket.emit('finishCanvas', { roomId: roomID, token });
        exitGame();

    };

    return (
        <>
            <div className="flex justify-center mt-5">
                <h1 className="font-bold uppercase py-2.5 text-xl ">{roomName}</h1>
                {currentHost === socket.id && (
                    <button onClick={finishCanvas} className="relative px-6 py-2.5 font-bold text-white rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:bg-gradient-to-br shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all duration-300 ease-out mx-5 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 flex items-center gap-2">Terminer (⚠️ permanent ⚠️)</button>
                )}
            </div>
            <div className="w-max h-max min-w-full min-h-full flex items-center justify-center p-8">
                <canvas
                    ref={canvasRef}
                    onClick={drawPixel}
                    className="bg-white shadow-2xl shrink-0"
                />
            </div >
        </>
    )
};

export default Canvas