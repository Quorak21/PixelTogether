import React from 'react';
import { Globe, Users, Lock } from 'lucide-react';

const HelpGridCreation = () => {

    return (
        <div className="z-50 w-60 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden animate-fade-in-up">
            <div className="flex flex-col">
                <div className="flex items-center gap-3 p-3 hover:bg-base-200 transition-colors border-b border-base-200">
                    <div className="p-2 bg-success/10 rounded-lg text-success shrink-0">
                        <Globe size={18} />
                    </div>
                    <div className="flex flex-col text-left justify-center">
                        <h3 className="font-bold text-sm text-base-content">Public</h3>
                        <p className="text-xs text-base-content/60 mt-0.5">Ouvert à tous</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 hover:bg-base-200 transition-colors border-b border-base-200">
                    <div className="p-2 bg-warning/10 rounded-lg text-warning shrink-0">
                        <Users size={18} />
                    </div>
                    <div className="flex flex-col text-left justify-center">
                        <h3 className="font-bold text-sm text-base-content">Restreint</h3>
                        <p className="text-xs text-base-content/60 mt-0.5">Participation sur invitation</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 hover:bg-base-200 transition-colors">
                    <div className="p-2 bg-error/10 rounded-lg text-error shrink-0">
                        <Lock size={18} />
                    </div>
                    <div className="flex flex-col text-left justify-center">
                        <h3 className="font-bold text-sm text-base-content">Privé</h3>
                        <p className="text-xs text-base-content/60 mt-0.5">Invisible et personnel</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpGridCreation;
