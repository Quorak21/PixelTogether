import { useEffect, useRef, useState } from 'react';
import { socket } from '../../socket.js';
import { useUI } from '../../context/UIProvider';

function Canvas({ roomID }) {

    const canvasRef = useRef(null);
    const PIXEL_SIZE = 20;
    const { selectedColor, exitGame, user } = useUI();
    const [roomName, setRoomName] = useState('');
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });



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
        const coordX = (event.clientX - rect.left) / scale;
        const coordY = (event.clientY - rect.top) / scale;

        // Convertir en coordonnées de la grid
        const x = Math.floor(coordX / PIXEL_SIZE)
        const y = Math.floor(coordY / PIXEL_SIZE)

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

    // Gestion zoom
    const handleWheel = (event) => {
        event.preventDefault();
        if (event.deltaY < 0) {
            setScale(Math.min(scale * 1.1, 2));
        } else {
            setScale(Math.max(scale / 1.1, 0.5));
        }
    };

    // Gestion déplacement avec click molette ou Toucher
    const hasMoved = useRef(false);
    const pointerDownPos = useRef({ x: 0, y: 0 });
    const pinchDist = useRef(null);

    const handlePointerDown = (event) => {
        // Clic molette (PC) OU 1 doigt (Mobile)
        if (event.button === 1 || event.pointerType === 'touch') {
            setIsDragging(true);
            hasMoved.current = false;
            pointerDownPos.current = { x: event.clientX, y: event.clientY };
            setDragStart({ x: event.clientX - position.x, y: event.clientY - position.y });
        }
    };

    const handlePointerMove = (event) => {
        if (isDragging) {
            // Marge de tolérance (10px) pour éviter qu'un simple tap tremblant sur mobile soit considéré comme un drag
            const dist = Math.hypot(event.clientX - pointerDownPos.current.x, event.clientY - pointerDownPos.current.y);
            if (dist > 10) {
                hasMoved.current = true;
            }

            let newX = event.clientX - dragStart.x;
            let newY = event.clientY - dragStart.y;

            if (canvasRef.current && hasMoved.current) {
                const canvas = canvasRef.current;
                const boundX = Math.max(0, (canvas.width * scale - window.innerWidth) / 2) + 150;
                const boundY = Math.max(0, (canvas.height * scale - window.innerHeight) / 2) + 150;
                newX = Math.max(-boundX, Math.min(boundX, newX));
                newY = Math.max(-boundY, Math.min(boundY, newY));
                setPosition({ x: newX, y: newY });
            }
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        pinchDist.current = null;
    };


    // Zoom Pinch ultra-compact (Mobile)
    const handleTouchZoomStart = (e) => {
        if (e.touches.length === 2) {
            pinchDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            setIsDragging(false);
        }
    };

    const handleTouchZoom = (e) => {
        if (e.touches.length === 2 && pinchDist.current) {
            const currentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            // On calcule un différentiel très faible et on l'applique
            const diff = currentDist - pinchDist.current;

            // Sensibilité (0.01)
            setScale(s => Math.min(Math.max(s + (diff * 0.01), 0.5), 3));
            pinchDist.current = currentDist;
        }
    };

    // Wrapper pour le clic qui draw seulement s'il n'y a pas eu de pan (déplacement)
    const handleDraw = (e) => {
        // e.button !== 1 empêche de dessiner si on fait juste le clic molette sans bouger
        if (!hasMoved.current && e.button !== 1) {
            drawPixel(e);
        }
        hasMoved.current = false;
    };

    return (
        <>
            <div className="absolute w-full z-10 flex justify-center mt-5 pt-12 md:pt-0 pointer-events-none">
                <h1 className="font-bold uppercase py-2.5 text-xl bg-slate-200/80 rounded-lg px-4 backdrop-blur-sm pointer-events-auto hidden md:block">{roomName}</h1>
            </div>

            <div
                className="w-full h-full flex items-center justify-center p-3 touch-none"
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onTouchStart={handleTouchZoomStart}
                onTouchMove={handleTouchZoom}
            >
                <canvas
                    ref={canvasRef}
                    onPointerUp={handleDraw}
                    className="bg-white shadow-2xl shrink-0 cursor-crosshair"
                    style={{ transition: isDragging ? 'none' : 'transform 0.1s ease-in-out', transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
                />
            </div >
        </>
    )
};

export default Canvas