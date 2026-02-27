import React from 'react';
import { useUI } from '../../context/UIProvider';
import { useState } from 'react';
import { updateSocketAuth } from '../../socket';

function LoginForm({ }) {
    const { loginUser } = useUI();

    const nodeRef = React.useRef(null);

    // Fonction pour basculer entre inscription et connexion
    const [isRegistering, setIsRegistering] = useState(false);
    const toggleRegister = () => { setIsRegistering(prev => !prev); setError(''); };

    //Variables pour stocker les inputs
    const [pseudo, setPseudo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');


    //Fonction pour envoyer dans la DB
    const handleSubmit = async (e) => {
        e.preventDefault(); // Empêche le rechargement de la page par défaut
        setError("");
        setSuccess("");

        try {
            const url = isRegistering ? '/api/register' : '/api/login';
            const response = await fetch(import.meta.env.VITE_API_URL + url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pseudo, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Si erreur
                throw new Error(data.message || "Une erreur est survenue");
            }

            setPassword('');
            setSuccess(data.message);
            if (isRegistering) {
                toggleRegister(); // On bascule vers le login
            } else {
                localStorage.setItem('token', data.token); // On stocke le JWT token, valide 7 jours
                updateSocketAuth(); // On reconnecte le socket avec le nouveau token
                loginUser(pseudo, data.gridID, data.gridName); // On met le pseudo dans le context global
            }

        } catch (err) {
            setError(err.message);
        }
    };

    return ( //Interface de la page de connexion
        <div ref={nodeRef} className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[1.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.1)] w-[90%] max-w-sm border border-white/50">

            {/* Titre */}
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center text-gray-800">
                {isRegistering ? "Inscription" : "Connexion"}
            </h2>


            <form onSubmit={handleSubmit} className="space-y-3">

                {/*Pseudo */}
                <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Pseudo</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm rounded-xl bg-gray-100/50 backdrop-blur-sm border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all placeholder-gray-400 shadow-sm"
                        placeholder="Ton pseudo..."
                        value={pseudo}
                        onChange={(e) => setPseudo(e.target.value)}
                        required
                    />
                </div>

                {/* Mot de passe */}
                <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                    <input
                        type="password"
                        className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm rounded-xl bg-gray-100/50 backdrop-blur-sm border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all placeholder-gray-400 shadow-sm"
                        placeholder="🚨 bdd non sécurisée 🚨"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-2.5 text-sm sm:text-base rounded-xl shadow-md transform transition hover:-translate-y-1 mt-2"
                >
                    {isRegistering ? "S'inscrire" : "Se connecter"}
                </button>

            </form>

            <div className="mt-4 text-center text-sm text-gray-500">
                {isRegistering
                    ? <>Déjà un compte ? <span onClick={toggleRegister} className="text-blue-600 cursor-pointer hover:underline">Se connecter</span></>
                    : <>Pas encore de compte ? <span onClick={toggleRegister} className="text-blue-600 cursor-pointer hover:underline">S'inscrire</span></>
                }
            </div>

            {/* Info, Ok ou pas OK */}
            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            {success && <p className="text-green-500 text-center mt-4">{success}</p>}

        </div>
    )
}

export default LoginForm