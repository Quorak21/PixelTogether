import { useEffect, useRef, useState } from 'react';
import { socket } from '../../socket.js';
import { useUI } from '../../context/UIProvider';

function Canvas({ }) {

    const canvasRef = useRef(null);
    const PIXEL_SIZE = 20;
    const { selectedColor } = useUI();
    const [roomName, setRoomName] = useState('');

    // Dessin Pixel
    const drawPixel = (event) => {
        // Position et taille du Canvas sur l'écran
        const rect = canvasRef.current.getBoundingClientRect();

        // Position clic souris
        const mouseX = event.clientX;
        const mouseY = event.clientY;

        // Calcul de l'endroit du pixel
        const coordX = mouseX - rect.left
        const coordY = mouseY - rect.top

        // pixel final
        const x = Math.floor(coordX / 20)
        const y = Math.floor(coordY / 20)

        console.log(`Coordonnée ${x}:${y}`)
        console.log(`Couleur: ${selectedColor}`)

        // maintenant on dessine
        const ctx = canvasRef.current.getContext('2d')
        ctx.fillStyle = selectedColor
        ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)

        // On redessine la bordure si c'est blanc
        if (selectedColor == '#ffffff') {
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }

        // On envoie au serveur
        socket.emit('pixelPlaced', { x, y, color: selectedColor });
    };


    // Fonction pour dessiner la grille du canvas
    useEffect(() => {

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        // Écoute pour un nouveau Canvas
        socket.on('createCanvas', (data) => {

            const width = data.width;
            const height = data.height;
            setRoomName(data.name);

            // 0. On dimensionne le canvas
            canvas.width = width * PIXEL_SIZE;
            canvas.height = height * PIXEL_SIZE;

            // 1. On nettoie tout (au cas où on redessine)
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // 2. On configure le "style" du stylo
            ctx.beginPath()
            ctx.strokeStyle = '#ddd' // Gris clair pour la grille
            ctx.lineWidth = 1

            // 3. On trace les lignes VERTICALES (Colonnes)
            for (let x = 0; x <= width; x++) {
                ctx.moveTo(x * PIXEL_SIZE, 0)
                ctx.lineTo(x * PIXEL_SIZE, height * PIXEL_SIZE)
            }

            // 4. On trace les lignes HORIZONTALES (Rangées)
            for (let y = 0; y <= height; y++) {
                ctx.moveTo(0, y * PIXEL_SIZE)
                ctx.lineTo(width * PIXEL_SIZE, y * PIXEL_SIZE)
            }

            // 5. On applique l'encre
            ctx.stroke()
        });


        // On écoute les pixel des autres
        socket.on('drawPixel', (data) => {
            console.log(`Pixel reçu : ${data.x}:${data.y} avec la couleur ${data.color}`)

            const ctx = canvasRef.current.getContext('2d')
            ctx.fillStyle = data.color
            ctx.fillRect(data.x * PIXEL_SIZE, data.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)

            // On redessine la bordure si c'est blanc
            // On redessine la bordure si c'est blanc
            if (data.color == '#ffffff') {
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 1;
                ctx.strokeRect(data.x * PIXEL_SIZE, data.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
            }
        });

        return () => {
            socket.off('createCanvas')
            socket.off('drawPixel')
        };





    }, []);

    return (
        <>
            <div className="flex justify-center mt-5">
                <h1 className="font-bold uppercase text-xl ">{roomName}</h1>
            </div>
            <div onClick={drawPixel} className="w-max h-max min-w-full min-h-full flex items-center justify-center p-8">
                <canvas
                    ref={canvasRef}
                    className="bg-white shadow-2xl shrink-0"
                />
            </div >
        </>
    )
};

export default Canvas