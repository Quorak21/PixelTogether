import express from 'express';
import { createUser, findUserByPseudo } from '../store/memoryStore.js';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: { message: "Trop de tentatives, veuillez réessayer plus tard." }
});

router.use(apiLimiter);

router.post('/register', async (req, res) => {
    try {
        const pseudo = req.body.pseudo.toLowerCase().trim();

        if (!/^[a-z0-9]{3,20}$/.test(pseudo)) {
            return res.status(400).json({ message: "Le pseudo ne peut contenir que des lettres et chiffres (3-20 caractères)." });
        }

        if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=]{6,}$/.test(req.body.password)) {
            return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const nouveauJoueur = createUser({
            pseudo,
            password: hashedPassword,
        });

        const token = jwt.sign({ idUser: nouveauJoueur.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        nouveauJoueur.token = token;

        res.json({ message: "Inscription confirmée, " + req.body.pseudo + ", tu peux maintenant te connecter.", token, gridID: null });

    } catch (err) {
        console.error("❌ Erreur :", err);

        if (err.code === 11000) {
            return res.status(400).json({ message: "Ce pseudo est déjà pris !" });
        }

        res.status(500).json({ message: "Une erreur est survenue." });
    }
});

router.post('/login', async (req, res) => {
    try {
        if (typeof req.body.pseudo !== 'string') return res.status(400);

        const joueur = findUserByPseudo(req.body.pseudo);

        if (!joueur) {
            return res.status(400).json({ message: "Ce pseudo n'existe pas." });
        }

        const match = await bcrypt.compare(req.body.password, joueur.password);
        if (!match) {
            return res.status(400).json({ message: "Mot de passe incorrect." });
        }

        const token = jwt.sign({ idUser: joueur.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        joueur.token = token;

        res.json({ message: "Bienvenue, " + joueur.pseudo + " !", token, gridID: joueur.gridID, gold: joueur.gold });

    } catch (err) {
        console.error("❌ Erreur :", err);
        res.status(500).json({ message: "Une erreur est survenue." });
    }
});

export default router;
