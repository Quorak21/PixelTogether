import { useUI } from '../context/UIProvider';
import Navbar from '../components/features/Navbar';
import Sidebar from '../components/features/Sidebar';
import Footer from '../components/features/Footer';
import LoginForm from '../components/features/LoginForm';

const MainLayout = ({ children }) => {
    const { gameMode } = useUI();
    const { isLoginOpen } = useUI();

    return (
        <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">

            <header className="flex-none z-50">
                <Navbar />
            </header>

            <div className="flex flex-1 overflow-hidden relative">

                <div className="h-full flex-none">
                    <Sidebar />
                </div>

                <main className="flex-1 relative flex justify-center items-center bg-gray-50">
                    {children}
                </main>

            </div>

            {/* Les fenetres dynamiques */}
            {isLoginOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <LoginForm />
                </div>
            )}

            <footer className="flex-none z-40">
                <Footer />
            </footer>

        </div>
    );
};

export default MainLayout;