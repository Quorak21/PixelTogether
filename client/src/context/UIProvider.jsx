import { createContext, useContext, useState } from 'react';

const UIContext = createContext();

// Hook réutilisable pour tout ce qui s'ouvre/se ferme
function useToggle(initial = false) {
    const [isOpen, setIsOpen] = useState(initial);
    return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
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

    // Couleur
    const [selectedColor, setSelectedColor] = useState('#ffffffff');
    const selectColor = (color) => setSelectedColor(color);


    return (
        <UIContext.Provider value={{ gameMode, currentRoomID, currentHost, newGame, joinGame, exitGame, login, gridCreate, palette, selectedColor, selectColor }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);