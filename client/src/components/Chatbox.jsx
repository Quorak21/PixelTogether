import Draggable from 'react-draggable';
import React from 'react';

function Chatbox({ toggleChatbox, chatboxIsVisible }) {

    const nodeRef = React.useRef(null);


    

    return (
        chatboxIsVisible ? (
            <Draggable
                nodeRef={nodeRef}
                handle=".drag-handle" // 👈 MAGIE : Seule la barre avec cette classe permet de bouger
                defaultPosition={{ x: 0, y: 0 }} // Position de départ
                bounds="parent" // Empêche la fenêtre de sortir de l'écran
            >

                <div ref={nodeRef} className="chatbox w-80 bg-base-100 p-4 shadow-lg z-50 absolute right-5 bottom-5 rounded-lg">
                    <h2 className="drag-handle cursor-move font-bold text-center text-lg mb-4 text-primary">Chatbox</h2>
                    <button onClick={toggleChatbox} className="btn absolute top-2 right-2 bg-transparent border-0 text-xl">❌</button>
                    <div className="chat-messages h-48 overflow-auto mb-4 p-2 border rounded-lg bg-gray-50">
                        <div className="message mb-2">
                            <span className="font-bold text-sm text-primary">Alice:</span>
                            <span className="ml-2 text-sm text-gray-700">Salut tout le monde !</span>
                        </div>
                        <div className="message mb-2">
                            <span className="font-bold text-sm text-primary">Bob:</span>
                            <span className="ml-2 text-sm text-gray-700">Salut Alice !</span>
                        </div>
                    </div>
                    <div className="chat-input flex">
                        <input type="text" placeholder="Tapez votre message..." className="input input-bordered w-full" />
                        <button className="btn btn-primary ml-2">Envoyer</button>
                    </div>
                </div>
            </Draggable>
        ) : null
    )
}

export default Chatbox