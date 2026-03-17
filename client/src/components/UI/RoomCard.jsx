import { Users, Crown } from 'lucide-react';

function RoomCard({ roomName, roomId, pseudo, host, onJoin, image, playerCount, type }) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] group flex flex-col">
      <figure className="aspect-square w-full bg-base-200 relative overflow-hidden cursor-pointer flex items-center justify-center group-hover:bg-primary/5 transition-colors" onClick={() => onJoin(roomId, host)}>
        <img
          src={image}
          alt={roomName}
          className="object-contain z-45 w-[90%] h-[90%]"
        />
      </figure>
      <div className="card-body p-6 flex flex-col justify-between">
        <div>
          <h2 className="card-title text-xlfont-bold justify-between text-base-content truncate mb-2" title={roomName}>
            <span>{roomName}</span><span className="text-primary flex items-center gap-2"><Crown size={20} color="gold" /><span className="first-letter:uppercase">{pseudo}</span></span>
          </h2>
          <div className="text-sm text-base-content/60 font-medium flex justify-between gap-2">
            <div className="flex items-center gap-2"><Users size={16} /> {playerCount || 0} joueur{playerCount > 1 ? 's' : ''}</div>
            <div className="flex">
              {type === 'limited' ? (
                <span className="text-sm font-bold text-success">Restreint</span>
              ) : (
                <span className="text-sm font-bold text-success">Public</span>
              )}
            </div>
          </div>
        </div>
        <div className="card-actions justify-end mt-6">
          <button
            onClick={() => onJoin(roomId, host)}
            className="btn btn-outline btn-primary w-full shadow-sm"
          >
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoomCard;