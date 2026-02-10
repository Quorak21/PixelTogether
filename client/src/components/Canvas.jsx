import { useEffect, useRef } from 'react'

function Canvas({ width, height }) {

    const canvasRef = useRef(null);
    const PIXEL_SIZE = 20;
    // Fonction pour dessiner la grille du canvas
    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        // 1. On nettoie tout (au cas où on redessine)
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 2. On configure le "style" du stylo
        ctx.beginPath()
        ctx.strokeStyle = '#ddd' // Gris clair pour la grille
        ctx.lineWidth = 1

        // 3. On trace les lignes VERTICALES (Colonnes)
        // Note bien le "x * PIXEL_SIZE"
        for (let x = 0; x <= width; x++) {
            ctx.moveTo(x * PIXEL_SIZE, 0)
            ctx.lineTo(x * PIXEL_SIZE, height * PIXEL_SIZE)
        }

        // 4. On trace les lignes HORIZONTALES (Rangées)
        // Note bien le "y * PIXEL_SIZE"
        for (let y = 0; y <= height; y++) {
            ctx.moveTo(0, y * PIXEL_SIZE)
            ctx.lineTo(width * PIXEL_SIZE, y * PIXEL_SIZE)
        }

        // 5. On applique l'encre
        ctx.stroke()

    }, [width, height]) // On redessine si la taille change

    return (
        <canvas
            ref={canvasRef}
            width={width * PIXEL_SIZE}
            height={height * PIXEL_SIZE}
            className="border border-black bg-white shadow-lg"
        />
    )
}

export default Canvas