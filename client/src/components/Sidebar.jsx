
function Sidebar({ newCanvas, openChat }) {   


  return (
    <div>
      <div className="w-40 bg-base-100 p-4 shadow-lg z-10 hidden md:block">
        <h2 className="font-bold text-lg mb-4 text-primary">Outils</h2>
        <ul className="menu bg-base-100 w-full rounded-box p-0">
          <h3>Couleur</h3>
          <li><a>Rouge</a></li>
          <li><a>Vert</a></li>
          <li><a>Bleu</a></li>
          <h3>Outils</h3>
          <li><a>Gomme</a></li>
          <h3 className="font-bold text-lg ">Grilles : </h3>
          <div className="flex flex-col justify-center items-center w-full">
            <li><button onClick={() => newCanvas(20, 20)} className="btn btn-primary my-2 w-16 text-white">20x20</button></li>
            <li><button onClick={() => newCanvas(40, 40)} className="btn btn-primary my-2 w-16 text-white">40x40</button></li>
            <li><button onClick={() => newCanvas(60, 60)} className="btn btn-primary my-2 w-16 text-white">60x60</button></li>
            <li><button onClick={() => newCanvas(80, 80)} className="btn btn-primary my-2 w-16 text-white">80x80</button></li>
            <li><button onClick={() => newCanvas(100, 100)} className="btn btn-primary my-2 w-16 text-white">100x100</button></li>
          <h3 className="font-bold text-lg text-left">Chat :  </h3>
          <li><button onClick={() => {openChat()}} className="btn btn-primary my-2 w-16 text-white">😸</button></li>
          </div>
        </ul>
      </div>
    </div>
  )
}

export default Sidebar