import { Grid3x3 } from 'lucide-react';

function RoomCard({ roomName, roomId, host, onJoin }) {


  return (
    // LA CARTE GLOBALE
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-default flex flex-col">

      {/* 1. ZONE IMAGE (LE HAUT DE LA CARTE) */}
      {/* h-48 : Hauteur fixe pour que toutes les cartes soient alignées */}
      <div className="h-30 bg-slate-100 flex items-center justify-center group-hover:bg-blue-50/50 transition-colors relative overflow-hidden relative">

        {/* Un petit fond abstrait pour faire joli (optionnel) */}
        <div className="absolute inset-0 bg-grid-slate-200/[0.5] bg-[length:20px_20px]" />
        <Grid3x3 size={75} />

      </div>

      {/* 2. ZONE CONTENU (LE BAS DE LA CARTE) */}
      {/* flex-1 : pousse le contenu pour remplir la carte si besoin */}
      <div className="p-5 flex flex-col gap-4 justify-between border-t border-slate-100">
        <div>

          {/* LE NOM DE LA ROOM */}
          {/* 'truncate' est VITAL : coupe le texte avec "..." s'il est trop long */}
          <h3 className="text-xl font-bold text-slate-800 truncate" title={roomName}>
            {roomName}
          </h3>
        </div>

        {/* 3. LE BOUTON REJOINDRE */}
        {/* w-full : prend toute la largeur */}
        {/* active:scale-[0.98] : petit effet d'enfoncement au clic */}
        <button
          onClick={() => onJoin(roomId, host)}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm hover:shadow-md focus:ring-4 focus:ring-blue-500/30"
        >
          Rejoindre
        </button>
      </div>
    </div>
  );
};

export default RoomCard