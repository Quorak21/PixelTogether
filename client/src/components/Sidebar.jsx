import { Palette, Eraser, MessageCircle } from 'lucide-react';

function Sidebar({ newCanvas, openChat, openColorPalette }) {


  return (
    <div>
      <div className="w-30 bg-base-100 p-4 shadow-lg z-10 hidden md:block">
        <ul className="menu bg-base-100 w-full rounded-box p-0">
          <div className="flex flex-col justify-center items-center w-full">
            <h3 className="font-bold text-lg ">Couleur</h3>
            <li><button onClick={() => openColorPalette()} className="btn btn-primary my-2 w-16 text-white"><Palette /></button></li>
            <h3 className="font-bold text-lg ">Outils</h3>
            <li><button className="btn btn-primary my-2 w-16 text-white"><Eraser color="#ffffff" /></button></li>
            <h3 className="font-bold text-lg ">Grilles : </h3>
            <li><button onClick={() => newCanvas(20, 20)} className="btn btn-primary my-2 w-16 text-white">20x20</button></li>
            <li><button onClick={() => newCanvas(40, 40)} className="btn btn-primary my-2 w-16 text-white">40x40</button></li>
            <li><button onClick={() => newCanvas(60, 60)} className="btn btn-primary my-2 w-16 text-white">60x60</button></li>
            <li><button onClick={() => newCanvas(80, 80)} className="btn btn-primary my-2 w-16 text-white">80x80</button></li>
            <li><button onClick={() => newCanvas(100, 100)} className="btn btn-primary my-2 w-16 text-white">100x100</button></li>
            <h3 className="font-bold text-lg text-left">Chat :  </h3>
            <li><button onClick={() => { openChat() }} className="btn btn-primary my-2 w-16 text-white"><MessageCircle color="#ffffff" /></button></li>
          </div>
        </ul>
      </div>
    </div>
  )
}

export default Sidebar