const FinishConfirm = ({ onCancel, onConfirm, title = "", message = "" }) => {

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-lg w-80 text-center relative animate-fade-in-up">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">{title}</h2>
                <p className="text-gray-600 mb-6 text-sm">{message}</p>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors font-medium"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors font-medium shadow-sm"
                    >
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinishConfirm;
