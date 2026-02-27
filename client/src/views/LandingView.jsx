import LoginForm from "../components/features/LoginForm";
import { Brush, Palette, Users, Smile } from "lucide-react";

function LandingView() {
    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-sky-300 via-sky-200 to-sky-100 flex flex-col items-center justify-center relative overflow-hidden font-sans">

            {/* Décoration nuages doux en arrière-plan (glassmorphism naturel) */}
            <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-white/40 rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
            <div className="absolute top-[20%] right-[15%] w-80 h-80 bg-white/50 rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
            <div className="absolute bottom-[10%] left-[20%] w-72 h-72 bg-white/60 rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDuration: '7s' }}></div>

            {/* Pixels flottants pour le fun (2x plus) */}
            <div className="absolute top-[15%] right-[30%] w-8 h-8 bg-yellow-400 rounded-sm hover:-translate-y-2 transition-transform duration-300 animate-[bounce_4s_infinite] shadow-[0_0_15px_rgba(250,204,21,0.6)]"></div>
            <div className="absolute top-[40%] left-[15%] w-6 h-6 bg-pink-500 rounded-sm hover:-translate-y-2 transition-transform duration-300 animate-[bounce_3s_infinite_0.5s] shadow-[0_0_15px_rgba(236,72,153,0.6)]"></div>
            <div className="absolute bottom-[20%] right-[20%] w-10 h-10 bg-green-400 rounded-sm hover:-translate-y-2 transition-transform duration-300 animate-[bounce_5s_infinite_1s] shadow-[0_0_15px_rgba(74,222,128,0.6)]"></div>
            <div className="absolute bottom-[30%] left-[10%] w-5 h-5 bg-purple-500 rounded-sm hover:-translate-y-2 transition-transform duration-300 animate-[bounce_3.5s_infinite_0.2s] shadow-[0_0_15px_rgba(168,85,247,0.6)]"></div>

            {/* Nouveaux pixels flottants */}
            <div className="absolute top-[25%] left-[25%] w-7 h-7 bg-blue-500 rounded-sm hover:-translate-y-2 transition-transform duration-300 animate-[bounce_4.5s_infinite_0.8s] shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
            <div className="absolute top-[10%] left-[45%] w-4 h-4 bg-orange-400 rounded-sm transition-transform duration-300 animate-[bounce_2.5s_infinite_0.1s] shadow-[0_0_10px_rgba(251,146,60,0.6)]"></div>
            <div className="absolute bottom-[15%] right-[40%] w-9 h-9 bg-red-400 rounded-sm hover:-translate-y-2 transition-transform duration-300 animate-[bounce_5.5s_infinite_1.2s] shadow-[0_0_15px_rgba(248,113,113,0.6)]"></div>
            <div className="absolute bottom-[40%] right-[10%] w-6 h-6 bg-teal-400 rounded-sm hover:-translate-y-2 transition-transform duration-300 animate-[bounce_3.2s_infinite_0.4s] shadow-[0_0_15px_rgba(45,212,191,0.6)]"></div>

            {/* 50% de pixels en + */}
            <div className="absolute top-[5%] left-[70%] w-5 h-5 bg-lime-400 rounded-sm hover:-translate-y-2 transition-transform duration-300 animate-[bounce_3s_infinite_0.5s] shadow-[0_0_15px_rgba(163,230,53,0.6)]"></div>
            <div className="absolute bottom-[5%] left-[45%] w-8 h-8 bg-fuchsia-500 rounded-sm transition-transform duration-300 animate-[bounce_4s_infinite_0.3s] shadow-[0_0_15px_rgba(217,70,239,0.6)]"></div>
            <div className="absolute top-[50%] right-[5%] w-4 h-4 bg-sky-400 rounded-sm hover:-translate-y-2 transition-transform duration-300 animate-[bounce_2.8s_infinite_1.5s] shadow-[0_0_15px_rgba(56,189,248,0.6)]"></div>
            <div className="absolute bottom-[25%] left-[30%] w-7 h-7 bg-rose-400 rounded-sm hover:-translate-y-2 transition-transform duration-300 animate-[bounce_5s_infinite_0.2s] shadow-[0_0_15px_rgba(251,113,133,0.6)]"></div>

            {/* Contenu principal */}
            <div className="z-10 flex flex-col items-center w-full px-4 relative">

                {/* Titre au style arrondi, coloré et brillant avec Fredoka */}
                <div className="text-center group cursor-default relative">
                    {/* Pixels et petits personnages qui gravitent autour du titre */}
                    <div className="absolute -top-12 -left-16 text-yellow-500 animate-[spin_6s_linear_infinite] opacity-80">
                        <Smile size={40} className="drop-shadow-md" />
                    </div>
                    <div className="absolute -bottom-8 -right-12 text-pink-500 animate-[bounce_3s_infinite_0.5s]">
                        <Brush size={36} className="drop-shadow-md" />
                    </div>
                    <div className="absolute top-2 -right-20 text-blue-500 animate-[pulse_4s_infinite]">
                        <Users size={48} className="drop-shadow-md" />
                    </div>
                    <div className="absolute -top-8 right-16 text-purple-500 animate-[bounce_4s_infinite_1s]">
                        <Palette size={32} className="drop-shadow-md" />
                    </div>

                    {/* Dizaine de pixels autour du titre */}
                    <div className="absolute -top-4 -left-4 w-3 h-3 bg-red-400 rounded-sm animate-ping"></div>
                    <div className="absolute top-1/2 -left-10 w-4 h-4 bg-green-400 rounded-sm animate-[bounce_2s_infinite]"></div>
                    <div className="absolute -bottom-2 lg:-bottom-6 left-10 w-5 h-5 bg-blue-400 rounded-sm animate-[spin_3s_linear_infinite]"></div>
                    <div className="absolute -top-6 right-1/4 w-3 h-3 bg-yellow-400 rounded-sm animate-pulse"></div>
                    <div className="absolute top-10 -right-8 w-4 h-4 bg-purple-400 rounded-sm animate-[bounce_2.5s_infinite]"></div>
                    <div className="absolute bottom-4 -right-16 w-3 h-3 bg-orange-400 rounded-sm animate-ping" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute -bottom-10 right-1/4 w-4 h-4 bg-pink-400 rounded-sm animate-[bounce_3s_infinite]"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 bg-teal-400 rounded-sm animate-pulse"></div>

                    {/* Arc-en-ciel Titre en SVG : Beaucoup plus grand et coloré ! */}
                    {/* On ajoute une marge négative en bas (-mb-16 etc.) pour remonter le formulaire de connexion */}
                    <div className="relative z-10 w-full max-w-[350px] aspect-[350/180] sm:max-w-none sm:w-[500px] sm:h-[220px] md:w-[650px] md:h-[280px] lg:w-[800px] lg:h-[350px] mx-auto transform transition-transform group-hover:scale-105 duration-300 drop-shadow-[0_15px_15px_rgba(0,0,0,0.3)] -mb-8 sm:-mb-12 md:-mb-16 lg:-mb-24">
                        <svg viewBox="0 0 800 350" className="w-full h-full overflow-visible">
                            {/* Définition du chemin en arc arrondi ajusté pour l'espacement */}
                            <path id="curve" d="M 50 300 Q 400 -50 750 300" fill="transparent" />
                            {/* Dégradé arc-en-ciel ultra vif plus contrasté  */}
                            <defs>
                                <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#ff0000" /> {/* Rouge pur */}
                                    <stop offset="16%" stopColor="#ff7f00" /> {/* Orange vif */}
                                    <stop offset="33%" stopColor="#ffff00" /> {/* Jaune pur */}
                                    <stop offset="50%" stopColor="#00ff00" /> {/* Vert pur */}
                                    <stop offset="66%" stopColor="#0000ff" /> {/* Bleu pur */}
                                    <stop offset="83%" stopColor="#4b0082" /> {/* Indigo */}
                                    <stop offset="100%" stopColor="#9400d3" /> {/* Violet foncé */}
                                </linearGradient>
                            </defs>
                            <text
                                className="font-extrabold uppercase tracking-widest fill-[url(#rainbowGradient)]"
                                style={{
                                    fontFamily: "'Baloo 2', sans-serif",
                                    fontSize: '95px', // Très grand
                                    dominantBaseline: 'baseline',
                                    strokeWidth: '8px', // On peut même l'épaissir un peu maintenant
                                    stroke: 'white', // Contour blanc épais pour détacher
                                    strokeLinejoin: 'round',
                                    paintOrder: 'stroke fill', // TRÈS IMPORTANT : Dessine le contour *derrière* le remplissage
                                    filter: 'drop-shadow(0px 0px 20px rgba(10, 211, 10, 0.8))' // Aura légère dorée (yellow-400 opacity 80%)
                                }}
                            >
                                <textPath href="#curve" startOffset="50%" textAnchor="middle">
                                    Pixel Together
                                </textPath>
                            </text>
                        </svg>
                    </div>
                </div>

                {/* Formulaire de connexion restylisé */}
                <div className="w-full mt-5 flex justify-center">
                    <LoginForm />
                </div>

            </div>

        </div>
    );
}

export default LandingView;
