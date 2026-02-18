import React from 'react';
import { useUI } from '../../context/UIProvider';
import { X } from 'lucide-react';
import { useState } from 'react';

function LoginForm({ }) {
    const { login } = useUI();

    const nodeRef = React.useRef(null);

    // Fonction pour basculer entre inscription et connexion
    const [isRegistering, setIsRegistering] = useState(false);
    const toggleRegister = () => { setIsRegistering(prev => !prev); setError(''); };

    //Variables pour stocker les inputs
    const [pseudo, setPseudo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');


    //Fonction pour envoyer dans la DB
    const handleSubmit = async (e) => {
        e.preventDefault(); // Empêche le rechargement de la page par défaut
        setError("");

        try {
            const response = await fetch('http://localhost:3000/api/test-db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pseudo, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Si le serveur répond une erreur (ex: Pseudo pris)
                throw new Error(data.message || "Une erreur est survenue");
            }

            // SI TOUT EST OK :
            console.log("Succès :", data);
            if (isRegistering) {
                alert("Compte créé ! Connecte-toi maintenant.");
                toggleRegister(); // On bascule vers le login
            } else {
                alert("Connecté ! (Token à gérer plus tard)");
                login.close();
            }

        } catch (err) {
            setError(err.message);
        }
    };
    return (
        login.isOpen ? (
            <div ref={nodeRef} className="bg-white p-8 rounded-2xl shadow-2xl w-96 z-50 relative">

                {/* 1. La Croix pour fermer */}
                <button
                    onClick={login.close}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
                >
                    <X size={24} />
                </button>

                {/* 2. Le Titre */}
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    {isRegistering ? "Inscription" : "Connexion"}
                </h2>

                {/* 3. Le Formulaire*/}
                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Champ Pseudo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pseudo</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ton pseudo..."
                            value={pseudo}
                            onChange={(e) => setPseudo(e.target.value)}
                        />
                    </div>

                    {/* Champ Mot de passe */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {/* Bouton Valider */}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition"
                    >
                        {isRegistering ? "S'inscrire" : "Se connecter"}
                    </button>

                </form>

                {/* 4. Le petit lien en bas */}
                <div className="mt-4 text-center text-sm text-gray-500">
                    {isRegistering
                        ? <>Déjà un compte ? <span onClick={toggleRegister} className="text-blue-600 cursor-pointer hover:underline">Se connecter</span></>
                        : <>Pas encore de compte ? <span onClick={toggleRegister} className="text-blue-600 cursor-pointer hover:underline">S'inscrire</span></>
                    }
                </div>

            </div>

        ) : null
    )
}

export default LoginForm