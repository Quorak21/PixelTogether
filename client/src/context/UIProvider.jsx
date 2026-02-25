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
    const login = useToggle();
    const gridCreate = useToggle();
    const palette = useToggle();
    const chatbox = useToggle();
    const gallery = useToggle();

    // Couleur
    const [selectedColor, setSelectedColor] = useState('#ffffffff');
    const selectColor = (color) => setSelectedColor(color);

    // Utilisateur connecté
    const [user, setUser] = useState(null);
    const loginUser = (pseudo, gridID, gridName) => { setUser({ pseudo, gridID, gridName: gridName || gridID }) };
    const updateGridID = (newGridID) => { setUser(prev => prev ? { ...prev, gridID: newGridID } : null) };
    const logoutUser = () => { setUser(null); localStorage.removeItem('token'); };
    //auto-connect
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            socket.emit('verifyToken', token);
        }

        const handleVerifyToken = (data) => {
            if (data && data.pseudo) {
                loginUser(data.pseudo, data.gridID, data.gridName);
            }
        };

        socket.on('verifyToken', handleVerifyToken);

        return () => {
            socket.off('verifyToken', handleVerifyToken);
        };
    }, []);


    return (
        <UIContext.Provider value={{ gameMode, currentRoomID, currentHost, newGame, joinGame, exitGame, login, gridCreate, palette, chatbox, gallery, selectedColor, selectColor, user, loginUser, updateGridID, logoutUser }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);