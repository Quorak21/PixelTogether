import { useUI } from '../context/UIProvider';
import Navbar from '../components/features/Navbar';
import Footer from '../components/features/Footer';
import GridCreation from '../components/features/GridCreation';
import LoginForm from '../components/features/LoginForm';
import GameView from '../views/GameView';
import LobbyView from '../views/LobbyView';
import Sidebar from '../components/features/Sidebar';

const MainLayout = ({ }) => {
    const { gameMode, login, gridCreate } = useUI();

    return (
        <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">

            <header className="flex-none z-50">
                <Navbar />
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {gameMode
                    ? <Sidebar />
                    : null
                }

                <main className="flex-1 relative flex justify-center items-center bg-gray-50">

                    {/* Les fenetres dynamiques */}
                    {login.isOpen && (
                        <LoginForm />
                    )}
                    {gridCreate.isOpen && (
                        <GridCreation />
                    )}
                    {/* En jeu, ou sur le lobby*/}
                    {gameMode
                        ? <GameView />
                        : <LobbyView />
                    }

                </main>

            </div>


            <footer className="flex-none z-40">
                <Footer />
            </footer>

        </div>
    );
};

export default MainLayout;