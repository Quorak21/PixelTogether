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
    const newGame = () => setGameMode(true);
    const exitGame = () => setGameMode(false);

    // Fenêtres dynamiques
    const login = useToggle();
    const gridCreate = useToggle();
    const palette = useToggle();

    // Couleur
    const [selectedColor, setSelectedColor] = useState('#ffffffff');
    const selectColor = (color) => setSelectedColor(color);


    return (
        <UIContext.Provider value={{ gameMode, newGame, exitGame, login, gridCreate, palette, selectedColor, selectColor }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);