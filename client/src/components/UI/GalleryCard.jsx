import { socket } from '../../socket';
import { User, Trash, Heart, X } from 'lucide-react';
import { useState } from 'react';
import { useUI } from '../../context/UIProvider';



const GalleryCard = ({ item, index, personal, onDelete, onPublic }) => {
    const [liked, setLiked] = useState(item.liked);
    const [likes, setLikes] = useState(item.likes);
    const [fullScreenImage, setFullScreenImage] = useState(null);

    const likeGrid = (gridId) => {
        socket.emit('likeGrid', { gridId }, (response) => {
            if (response.success) {
                setLiked(true);
                setLikes(response.likes);
            }
        });
    };

    const fullScreen = (item) => {
        setFullScreenImage(item);
    };

    return (
        <div key={index} onClick={() => fullScreen(item)} className="group h-64 relative break-inside-avoid mt-0 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 bg-base-100 border border-base-content/5 cursor-pointer">
            <div className="block h-full overflow-hidden">
                <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                />
            </div>
            {/* Overlay hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">{item.name}</h3>
                    {!personal && (
                        <div className="flex items-center mt-2 gap-2 text-white/80">
                            <User size={14} className="opacity-70" />
                            <p className="text-sm font-medium drop-shadow-md">{item.author}</p>
                        </div>
                    )}
                </div>
                <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    {personal && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item.id);
                            }}
                            className="btn btn-sm btn-circle bg-red-500/50 border-white/20 text-white hover:bg-red-500 hover:text-black transition-colors backdrop-blur-md">
                            <Trash size={16} />
                        </button>
                    )}
                </div>
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    <span className="text-lg font-bold text-red-500">{likes}</span>
                    <button onClick={(e) => {
                        if (!personal) {
                            e.stopPropagation();
                            likeGrid(item.id);
                        }
                    }}
                        className={`
                        ${personal || liked ? 'btn btn-sm btn-circle bg-red-500/50 border-white/20 text-black disabled' : 'btn btn-sm btn-circle bg-black/50 border-white/20 text-white hover:bg-white hover:text-black transition-colors backdrop-blur-md'}`}
                    >
                        <Heart size={16} />
                    </button>

                </div>
                {personal && (
                    <div className="absolute bottom-5 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                        <span className="text-sm font-bold text-success">Public</span>
                        <input
                            type="checkbox"
                            checked={item.onGallery}
                            className="toggle z-50 border-gray-600 bg-gray-500 checked:border-green-500 checked:bg-green-400 checked:text-green-800"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            onChange={(e) => {
                                onPublic(item.id, item.onGallery);
                            }}
                        />
                    </div>
                )}
            </div>
            {fullScreenImage && (
                <div
                    className="fixed inset-0 bg-black/96 backdrop-blur-sm flex justify-center items-center z-[9999] p-4"
                    onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
                >

                    <button
                        className="absolute hover:bg-accent/50 top-6 right-6 text-white rounded-xl shadow-lg hover:text-accent-content transition-colors"
                        onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
                    >
                        <X size={36} />
                    </button>



                    <img
                        src={fullScreenImage.image}
                        alt={fullScreenImage.name}
                        className="max-w-[85vw] max-h-[85vh] object-contain [image-rendering:pixelated] bg-white rounded-sm"
                    />
                </div>
            )}
        </div>
    );
};

export default GalleryCard;
