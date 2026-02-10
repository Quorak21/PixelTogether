// client/src/components/Navbar.jsx

function Navbar() {
  return (
    <div className="navbar bg-base-100 shadow-lg z-50 relative">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl text-primary font-bold">Pixel Together</a>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li><a>Connexion</a></li>
          <li>
            <details>
              <summary>Thème</summary>
              <ul className="p-2 bg-base-100 rounded-t-none">
                <li><a>Retro</a></li>
                <li><a>Cyberpunk</a></li>
              </ul>
            </details>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Navbar