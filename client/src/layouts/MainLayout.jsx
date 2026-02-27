import { useUI } from '../context/UIProvider';
import Navbar from '../components/features/Navbar';
import Footer from '../components/features/Footer';
import GridCreation from '../components/features/GridCreation';
import GameView from '../views/GameView';
import LobbyView from '../views/LobbyView';
import LandingView from '../views/LandingView';

const MainLayout = ({ }) => {
    const { gameMode, currentRoomID, gridCreate, user, isAuthLoading } = useUI();

    // On attends la verif du token, eviter le flash de la landing view
    if (isAuthLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-base-200">
                <h1 className="text-2xl font-bold text-primary">Chargement...</h1>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">

            {user && (
                <header className="flex-none z-50">
                    <Navbar />
                </header>
            )}

            {!user ? (
                <>
                    <main>
                        <LandingView />
                    </main>
                </>
            ) : (
                <>
                    <div className="flex flex-1 overflow-hidden relative">
                        <main className="flex-1 relative flex justify-center items-center bg-gray-50">
                            {gridCreate.isOpen && (
                                <GridCreation />
                            )}
                            {/* En jeu, ou sur le lobby*/}
                            {gameMode
                                ? <GameView roomID={currentRoomID} />
                                : <LobbyView />
                            }
                        </main>
                    </div>
                </>
            )}



            <footer className="flex-none z-40">
                <Footer />
            </footer>

        </div>
    );
};

export default MainLayout;