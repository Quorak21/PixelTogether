// client/src/components/Navbar.jsx

function Navbar() {
  return (
    <div className="navbar bg-base-100 shadow-lg z-50 relative">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl text-primary font-bold uppercase">Pixel Together</a>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li><a>Connexion</a></li>
        </ul>
      </div>
    </div>
  )
}

export default Navbar