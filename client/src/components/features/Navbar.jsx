import { useUI } from "../../context/UIProvider";

function Navbar({ }) {
  const { login, exitGame } = useUI();

  return (
    <div className="navbar bg-base-100 shadow-lg z-50 relative">
      <div className="flex-1">
        <a onClick={exitGame} className="btn btn-ghost text-xl text-primary font-bold uppercase">Pixel Together</a>
      </div>
      <div className="flex-none">
        <button onClick={login.open} className="btn btn-primary font-bold text-white">Connexion</button>
      </div>
    </div>
  )
}

export default Navbar