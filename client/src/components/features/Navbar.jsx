import { useUI } from "../../context/UIProvider";
import { socket } from '../../socket.js';
import coins from "../../assets/images/coins.png";

function Navbar() {
  const { exitGame, currentRoomID, currentHost, user, logoutUser, gameMode, gallery, setShowPersonalGallery, gold } = useUI();

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
      <div className="flex-none flex items-center gap-5">

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{gold}</span>
          <img src={coins} alt="gold" className="w-7 h-7" />

        </div>
        <div className="dropdown dropdown-end">
          <button tabIndex={0} className="btn btn-neutral rounded-full font-bold capitalize">{user.pseudo}</button>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
            {!gameMode ?
              <>
                <li>
                  <button onClick={() => { setShowPersonalGallery(false); gallery.toggle(); }}>Galerie publique</button>
                </li>
                <li>
                  <button onClick={() => { setShowPersonalGallery(true); gallery.toggle(); }}>Ma Galerie</button>
                </li>
              </>
              : null
            }
            <li>
              <button onClick={() => { logoutUser(); handleExit(); }}>Déconnexion</button>
            </li>
          </ul>

        </div>

      </div>
    </div>
  )
}

export default Navbar