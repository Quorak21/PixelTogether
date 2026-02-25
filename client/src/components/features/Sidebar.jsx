import { Palette, Eraser, MessageCircle } from 'lucide-react';
import { useUI } from "../../context/UIProvider";

function Sidebar() {

  const { palette, selectedColor, selectColor, chatbox } = useUI();



  return (
    <div className="w-30 h-full bg-base-100 p-4 shadow-lg z-10">
      <ul className="menu bg-base-100 w-full rounded-box p-0">
        <div className="flex flex-col justify-center items-center w-full">
          <h3 className="font-bold text-lg ">Palette</h3>
          <li><button onClick={palette.open} className="btn btn-primary my-2 w-16 text-white"><Palette /></button></li>
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: selectedColor }}></div>
          <h3 className="font-bold text-lg ">Gomme</h3>
          <li><button onClick={() => selectColor('#ffffff')} className="btn btn-primary my-2 w-16 text-white"><Eraser color="#ffffff" /></button></li>
          <h3 className="font-bold text-lg text-left">Chat</h3>
          <li><button onClick={chatbox.open} className="btn btn-primary my-2 w-16 text-white"><MessageCircle color="#ffffff" /></button></li>
        </div>
      </ul>
    </div>
  )
}

export default Sidebar