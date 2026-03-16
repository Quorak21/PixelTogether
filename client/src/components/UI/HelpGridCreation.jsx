const helpGridCreation = ({ }) => {

    return (
        <div className="z-50 w-60 bg-accent absolute bottom-full left-1/2 -translate-x-1/2 rounded-xl shadow-xl p-2 overflow-auto">
            <div className="items-center justify-center text-primary-content">
                <div>
                    <h3 className="font-bold text-lg text-primary">Public</h3>
                    <p className="text-sm">Visible / Rejoignable par tous</p>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-primary">Limité</h3>
                    <p className="text-sm">Visible / Rejoignable par les invités</p>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-primary">Privé</h3>
                    <p className="text-sm">Invisible / Personnel</p>
                </div>
            </div>
        </div>
    );
};

export default helpGridCreation;
