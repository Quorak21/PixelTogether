import { AuthProvider } from './context/AuthProvider';
import { UIProvider } from './context/UIProvider';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <MainLayout>

          <div className="text-gray-400">
            Futur Canvas
          </div>

        </MainLayout>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;