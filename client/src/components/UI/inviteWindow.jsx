import React, { useState, useEffect } from 'react';
import { UserPlus, Users, X } from 'lucide-react';
import { socket } from '../../socket';
import { useUI } from '../../context/UIProvider';

const InviteWindow = ({ roomID, onClose }) => {
    const [activeTab, setActiveTab] = useState('invite'); // 'invite' ou 'invitedList'
    const [pseudo, setPseudo] = useState('');
    // Exemple d'état pour les futurs messages : { type: 'success' | 'error', text: 'Message...' }
    const [statusMessage, setStatusMessage] = useState(null);
    const [invitedUsers, setInvitedUsers] = useState([]);
    const [activePlayers, setActivePlayers] = useState([]);

    const { user } = useUI();

    useEffect(() => {
        socket.emit('getPlayersList', { roomId: roomID });
        socket.on('playersList', (data) => {
            setInvitedUsers(data.invitedUsers);
            setActivePlayers(data.activePlayers);
        });

        return () => {
            socket.off('playersList');
        };
    }, []);


    const handleInvite = () => {
        socket.emit('invitePlayer', { roomId: roomID, pseudo: pseudo }, (reponse) => {
            if (reponse.error) {
                setStatusMessage({ type: 'error', text: reponse.error });
                return;
            } else {
                setStatusMessage({ type: 'success', text: reponse.success });
                setInvitedUsers(prev => [...prev, pseudo]);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-base-100 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-sm relative animate-fade-in-up border border-base-300 flex flex-col h-[450px]">
                {/* Bouton de fermeture */}
                <button
                    onClick={onClose}
                    className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-base-content/60 hover:text-base-content z-10"
                >
                    <X size={20} />
                </button>

                {/* En-tête */}
                <div className="flex items-center gap-3 mb-4 shrink-0">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        {activeTab === 'invite' ? <UserPlus size={24} /> : <Users size={24} />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-base-content">
                            {activeTab === 'invite' ? 'Inviter' : 'Joueurs invités'}
                        </h2>
                        <p className="text-sm text-base-content/60">
                            {activeTab === 'invite' ? 'Ajouter un joueur à la partie' : 'Liste des joueurs autorisés'}
                        </p>
                    </div>
                </div>

                {/* Système d'onglets DaisyUI */}
                <div className="tabs tabs-boxed mb-6 shrink-0 bg-base-200/50 p-1">
                    <button
                        className={`tab flex-1 font-semibold transition-all ${activeTab === 'invite' ? 'tab-active !bg-primary !text-primary-content shadow-sm' : 'text-base-content/60 hover:text-base-content'}`}
                        onClick={() => setActiveTab('invite')}
                    >
                        Inviter
                    </button>
                    <button
                        className={`tab flex-1 font-semibold transition-all ${activeTab === 'invitedList' ? 'tab-active !bg-primary !text-primary-content shadow-sm' : 'text-base-content/60 hover:text-base-content'}`}
                        onClick={() => setActiveTab('invitedList')}
                    >
                        Liste ({invitedUsers.length - 1})
                    </button>
                </div>

                {/* Contenu - Onglet 1 : Inviter */}
                {activeTab === 'invite' && (
                    <div className="flex flex-col flex-1 pb-2">
                        <div className="form-control w-full mb-auto">
                            <label className="label">
                                <span className="label-text font-medium text-base-content/80">Pseudo :</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Entrez le pseudo"
                                className="input input-bordered focus:border-primary focus:ring-1 focus:ring-primary w-full bg-base-200/50 transition-all mt-2"
                                value={pseudo}
                                onChange={(e) => setPseudo(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && pseudo.trim() && handleInvite()}
                                autoFocus
                            />
                        </div>

                        {statusMessage && (
                            <div className={`mt-4 p-3 rounded-lg text-sm font-medium text-center animate-fade-in-up ${statusMessage.type === 'error'
                                ? 'bg-error/10 text-error border border-error/20'
                                : 'bg-success/10 text-success border border-success/20'
                                }`}
                            >
                                {statusMessage.text}
                            </div>
                        )}

                        <div className="mt-4">
                            <button
                                onClick={handleInvite}
                                disabled={!pseudo.trim()}
                                className="btn btn-primary w-full shadow-sm"
                            >
                                Envoyer l'invitation
                            </button>


                        </div>
                    </div>
                )}

                {/* Contenu - Onglet 2 : Liste des invités */}
                {activeTab === 'invitedList' && (
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {invitedUsers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-base-content/40 space-y-3">
                                <Users size={48} className="opacity-20" />
                                <p className="text-center text-sm font-medium">Aucun joueur invité pour le moment</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {invitedUsers.filter((player) => player !== user.pseudo).map((player) => (

                                    <li key={player} className="flex items-center justify-between p-3 bg-base-200/50 hover:bg-base-200 transition-colors rounded-xl border border-base-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                                {player.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-base-content">{player}</span>
                                            {activePlayers.includes(player) && <span className="badge badge-success badge-sm">En ligne</span>}
                                        </div>
                                        {/* Bouton de révocation d'invitation (Optionnel, préparé visuellement) */}
                                        <button className="btn btn-xs btn-ghost text-error/60 hover:text-error hover:bg-error/10 transition-colors" title="Retirer l'invitation">
                                            <X size={14} />
                                        </button>
                                    </li>

                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InviteWindow;
