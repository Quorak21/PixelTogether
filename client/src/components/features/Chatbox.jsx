import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { MessageSquare, Minus, Maximize2, X, Send, Crown, User } from 'lucide-react';
import { socket } from '../../socket';
import { useUI } from '../../context/UIProvider';

function Chatbox({ onClose, roomID }) {
    const nodeRef = React.useRef(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [userPanelOpen, setUserPanelOpen] = useState(false);

    const { user, currentHost } = useUI();

    const toggleMinimize = () => setIsMinimized(!isMinimized);

    const sendMessage = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            socket.emit('sendMessage', { roomId: roomID, message: inputValue, pseudo: user.pseudo });
            setInputValue('');
        }
    };

    const userPanel = () => {
        setUserPanelOpen(!userPanelOpen);
    };

    useEffect(() => {
        socket.emit('getChatMessages', { roomId: roomID });

        socket.on('chatMessages', (data) => {
            setChatMessages(data);
        });
        socket.on('receiveMessage', (data) => {
            setChatMessages((prevMessages) => [...prevMessages, { senderId: data.senderId, pseudo: data.pseudo, message: data.message }]);
        });
        socket.on('joinedRoom', (data) => {
            setChatMessages((prevMessages) => [...prevMessages, { senderId: data.senderId, pseudo: data.pseudo, message: 'a rejoint la room, welcome !' }]);
        });


        return () => {
            socket.off('receiveMessage');
            socket.off('joinedRoom');
            socket.off('chatMessages');
        };
    }, []);


    // Calcul de la position par défaut (en bas à droite)
    const defaultX = typeof window !== 'undefined' ? window.innerWidth - 350 : 500;
    const defaultY = typeof window !== 'undefined' ? window.innerHeight - 450 : 500;

    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".drag-handle"
            defaultPosition={{ x: defaultX, y: defaultY }}
            bounds="body"
        >
            <div
                ref={nodeRef}
                className={`fixed top-0 left-0 z-[100] flex flex-col bg-base-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden border border-base-200 ${isMinimized ? 'w-64 h-auto' : 'w-80 h-[26rem]'
                    }`}
            >
                {/* Header */}
                <div className="drag-handle bg-neutral text-neutral-content p-3 flex justify-between items-center cursor-move select-none group">
                    <div className="flex items-center gap-2">
                        <MessageSquare size={18} className="text-primary/80" />
                        <span className="font-bold text-sm tracking-wide">Chat</span>
                    </div>
                    <div className="flex items-center gap-1 cursor-default opacity-80 group-hover:opacity-100 transition-opacity">
                        {/* Bouton joueur */}
                        {!isMinimized && (
                            <button
                                onClick={userPanel}
                                className="p-1.5 hover:bg-accent hover:text-accent-content rounded-lg transition-colors cursor-pointer"
                                title="Joueurs"
                            >
                                <User size={16} />
                            </button>
                        )}
                        {/* Bouton minimiser / agrandir */}
                        <button
                            onClick={toggleMinimize}
                            className="p-1.5 hover:bg-accent hover:text-accent-content rounded-lg transition-colors cursor-pointer"
                            title={isMinimized ? "Agrandir" : "Réduire"}
                        >
                            {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                        </button>
                        {/* Bouton fermer */}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-error hover:text-error-content rounded-lg transition-colors cursor-pointer"
                                title="Fermer"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                {!isMinimized && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-base-200/30">
                            {chatMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-base-content/40 italic text-sm">
                                    <MessageSquare size={32} className="mb-3 opacity-20" />
                                    Aucun message pour le moment.
                                </div>
                            ) : (
                                chatMessages.map((msg, i) => (
                                    <div key={i} className="flex items-center gap-1 text-sm">
                                        {msg.senderId === currentHost ? (
                                            <span className="flex items-center gap-1 font-bold text-red-500 mr-2"><Crown size={16} color='black' fill='gold' /> {msg.pseudo}:</span>
                                        ) : (
                                            <span className="font-bold text-secondary mr-2">{msg.pseudo}:</span>
                                        )}
                                        <span className="text-base-content/90">{msg.message}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-base-100 border-t border-base-200 flex flex-col justify-center">
                            <form onSubmit={sendMessage} className="flex gap-2 relative items-center">
                                <input
                                    type="text"
                                    className="input input-sm input-bordered flex-1 rounded-full pl-4 pr-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner bg-base-200/50"
                                    placeholder="Écrire un message..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-sm btn-primary btn-circle absolute right-0.5 shadow-md flex items-right justify-center min-h-[1.75rem] h-7 w-7"
                                    disabled={!inputValue.trim()}
                                >
                                    <Send size={14} className={inputValue.trim() ? "text-primary-content -ml-0.5" : "text-base-content/30 -ml-0.5"} />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </Draggable>
    );
}

export default Chatbox;