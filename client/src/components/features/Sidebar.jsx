import { Palette, Eraser, MessageCircle, Grid3x3 } from 'lucide-react';

function Sidebar() {


  return (
    <div>
      <div className="w-30 bg-base-100 p-4 shadow-lg z-10 hidden md:block">
        <ul className="menu bg-base-100 w-full rounded-box p-0">
          <div className="flex flex-col justify-center items-center w-full">
            <h3 className="font-bold text-lg ">Palette</h3>
            <li><button className="btn btn-primary my-2 w-16 text-white"><Palette /></button></li>
            <h3 className="font-bold text-lg ">Outils</h3>
            <li><button className="btn btn-primary my-2 w-16 text-white"><Eraser color="#ffffff" /></button></li>
            <h3 className="font-bold text-lg ">Grille </h3>
            <li><button className="btn btn-primary my-w w-16 text-white"><Grid3x3 /></button></li>
            <h3 className="font-bold text-lg text-left">Chat</h3>
            <li><button className="btn btn-primary my-2 w-16 text-white"><MessageCircle color="#ffffff" /></button></li>
          </div>
        </ul>
      </div>
    </div>
  )
}

export default Sidebar