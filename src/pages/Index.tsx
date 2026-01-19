import React from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import AuthScreen from '@/components/auth/AuthScreen';
import Dashboard from '@/components/dashboard/Dashboard';

const AppContent: React.FC = () => {
  const { isAuthenticated, loadingData } = useApp();
  
  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <Dashboard /> : <AuthScreen />;
};

const Index: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default Index;
