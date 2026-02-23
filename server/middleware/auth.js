import jwt from 'jsonwebtoken';
import 'dotenv/config';

// Middleware d'authentification JWT
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Token manquant. Connecte-toi d'abord." });
    }

    const token = authHeader.split(' ')[1]; // "Bearer abc123" → "abc123"

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.idUser; // On attache l'ID du joueur à la requête
        next(); // Tout est bon → on passe à la route
    } catch (err) {
        return res.status(401).json({ message: "Token invalide ou expiré." });
    }
};

export default authMiddleware;
