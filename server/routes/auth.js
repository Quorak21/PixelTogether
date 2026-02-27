import express from 'express';
import User from '../models/User.js';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();


// Inscription
router.post('/register', async (req, res) => {
    try {
        const pseudo = req.body.pseudo.toLowerCase().trim();

        // Uniquement lettres, chiffres (3 à 20 caractères)
        if (!/^[a-z0-9]{3,20}$/.test(pseudo)) {
            return res.status(400).json({ message: "Le pseudo ne peut contenir que des lettres et chiffres (3-20 caractères)." });
        }

        // Min 6 caractères, au moins une majuscule, une minuscule et un chiffre
        // if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(req.body.password)) {
        //     return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères, une majuscule, une minuscule et un chiffre." });
        // }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const nouveauJoueur = new User({
            pseudo: req.body.pseudo.toLowerCase().trim(),
            password: hashedPassword
        });

        // JWT token
        const token = jwt.sign({ idUser: nouveauJoueur._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        nouveauJoueur.token = token;

        await nouveauJoueur.save();
        res.json({ message: "Inscription confirmée, " + req.body.pseudo + ", tu peux maintenant te connecter.", token, gridID: null });

    } catch (err) {
        console.error("❌ Erreur :", err);

        // Pseudo déjà pris
        if (err.code === 11000) {
            return res.status(400).json({ message: "Ce pseudo est déjà pris !" });
        }

        // Champs vides ou invalides (validation Mongoose)
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: "Pseudo et mot de passe sont obligatoires." });
        }
        res.status(500).json({ message: err.message });
    }
});

// Connexion
router.post('/login', async (req, res) => {
    try {
        // On cherche le joueur par son pseudo
        const joueur = await User.findOne({ pseudo: req.body.pseudo.toLowerCase().trim() });

        if (!joueur) {
            return res.status(400).json({ message: "Ce pseudo n'existe pas." });
        }

        // On vérifie le mot de passe hashé
        const match = await bcrypt.compare(req.body.password, joueur.password);
        if (!match) {
            return res.status(400).json({ message: "Mot de passe incorrect." });
        }
        // JWT token
        const token = jwt.sign({ idUser: joueur._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        joueur.token = token;

        res.json({ message: "Bienvenue, " + joueur.pseudo + " !", token, gridID: joueur.gridID });

    } catch (err) {
        console.error("❌ Erreur :", err);
        res.status(500).json({ message: err.message });
    }
});


export default router;