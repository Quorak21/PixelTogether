import { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [gameMode, setGameMode] = useState('lobby');

    // Ouverture du formulaire de login
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    const openLogin = () => setIsLoginOpen(true);
    const closeLogin = () => setIsLoginOpen(false);

    return (
        <UIContext.Provider value={{ gameMode, setGameMode, isLoginOpen, openLogin, closeLogin }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);