import { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../socket';

const UIContext = createContext();

// Hook réutilisable pour tout ce qui s'ouvre/se ferme
function useToggle(initial = false) {
    const [isOpen, setIsOpen] = useState(initial);
    return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), toggle: () => setIsOpen(prev => !prev) };
}

export const UIProvider = ({ children }) => {
    // Mode de jeu
    const [gameMode, setGameMode] = useState(false);
    const [currentRoomID, setCurrentRoomID] = useState(null);
    const [currentHost, setCurrentHost] = useState(null);
    const newGame = () => setGameMode(true);
    const joinGame = (roomID, host) => { setCurrentRoomID(roomID); setCurrentHost(host); setGameMode(true); };
    const exitGame = () => { setCurrentRoomID(null); setCurrentHost(null); setGameMode(false); };

    // Fenêtres dynamiques
    const gridCreate = useToggle();
    const palette = useToggle();
    const chatbox = useToggle();
    const gallery = useToggle();

    // Couleur
    const [selectedColor, setSelectedColor] = useState('#ffffffff');
    const selectColor = (color) => setSelectedColor(color);

    // Utilisateur connecté
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(!!localStorage.getItem('token')); // true si un token existe au démarrage
    const loginUser = (pseudo, gridID, gridName) => { setUser({ pseudo, gridID, gridName: gridName || gridID }) };
    const updateGridID = (newGridID) => { setUser(prev => prev ? { ...prev, gridID: newGridID } : null) };
    const logoutUser = () => { setUser(null); localStorage.removeItem('token'); };
    //auto-connect
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            socket.emit('verifyToken', token);

            // Timeout de sécurité : si le serveur ne répond pas après 3s, on arrête le loading
            const timeout = setTimeout(() => {
                setIsAuthLoading(false);
            }, 3000);

            const handleVerifyToken = (data) => {
                clearTimeout(timeout);
                if (data && data.pseudo) {
                    loginUser(data.pseudo, data.gridID, data.gridName);
                }
                setIsAuthLoading(false);
            };

            socket.on('verifyToken', handleVerifyToken);

            return () => {
                clearTimeout(timeout);
                socket.off('verifyToken', handleVerifyToken);
            };
        } else {
            setIsAuthLoading(false);
        }
    }, []);


    return (
        <UIContext.Provider value={{ gameMode, currentRoomID, currentHost, newGame, joinGame, exitGame, gridCreate, palette, chatbox, gallery, selectedColor, selectColor, user, isAuthLoading, loginUser, updateGridID, logoutUser }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);