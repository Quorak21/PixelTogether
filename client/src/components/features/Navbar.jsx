import { useUI } from "../../context/UIProvider";
import { socket } from '../../socket.js';

function Navbar() {
  const { login, exitGame, currentRoomID, currentHost, user, logoutUser } = useUI();

  const handleExit = () => {
    if (currentRoomID) {
      // Si c'est l'host qui quitte → on ferme la room pour tout le monde
      if (socket.id === currentHost) {
        socket.emit('closeRoom', { roomId: currentRoomID });
      } else {
        // Si c'est un joueur → il quitte juste la room
        socket.emit('exitGame', { roomId: currentRoomID });
      }
    }
    exitGame();
  };

  return (
    <div className="navbar bg-base-100 shadow-lg z-50 relative">
      <div className="flex-1">
        <a onClick={handleExit} className="btn btn-ghost text-xl text-primary font-bold uppercase">Pixel Together</a>
      </div>
      <div className="flex-none">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="font-bold text-primary">{user.pseudo}</span>
            <button onClick={() => { logoutUser(); handleExit(); }} className="btn btn-outline btn-sm">Déconnexion</button>
          </div>
        ) : (
          <button onClick={login.open} className="btn btn-primary font-bold text-white">Connexion</button>
        )}
      </div>
    </div>
  )
}

export default Navbar