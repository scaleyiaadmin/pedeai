import { AppProvider, useApp } from '@/contexts/AppContext';
import AuthScreen from '@/components/auth/AuthScreen';
import Dashboard from '@/components/dashboard/Dashboard';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useApp();
  
  return isAuthenticated ? <Dashboard /> : <AuthScreen />;
};

const Index = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default Index;
