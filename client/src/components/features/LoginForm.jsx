import React from 'react';
import { useUI } from '../../context/UIProvider';
import { X } from 'lucide-react';
import { useState } from 'react';

function LoginForm({ }) {
    const { login, loginUser } = useUI();

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
            const response = await fetch('https://pixeltogether.onrender.com' + url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pseudo, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Si erreur
                throw new Error(data.message || "Une erreur est survenue");
            }

            setPseudo('');
            setPassword('');
            setSuccess(data.message);
            if (isRegistering) {
                toggleRegister(); // On bascule vers le login
            } else {
                localStorage.setItem('token', data.token); // On stocke le JWT token, valide 7 jours
                loginUser(pseudo, data.gridID, data.gridName); // On met le pseudo dans le context global

                login.close();
            }

        } catch (err) {
            setError(err.message);
        }
    };

    return ( //Interface de la page de connexion
        login.isOpen ? (
            <div ref={nodeRef} className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-[90%] max-w-sm z-50 absolute">

                {/* Fermer */}
                <button
                    onClick={login.close}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
                >
                    <X size={24} />
                </button>

                {/* Titre */}
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    {isRegistering ? "Inscription" : "Connexion"}
                </h2>


                <form onSubmit={handleSubmit} className="space-y-4">

                    {/*Pseudo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pseudo</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ton pseudo..."
                            value={pseudo}
                            onChange={(e) => setPseudo(e.target.value)}
                            required
                        />
                    </div>

                    {/* Mot de passe */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 rounded-lg bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="🚨 bdd non sécurisée 🚨"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition"
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

        ) : null
    )
}

export default LoginForm