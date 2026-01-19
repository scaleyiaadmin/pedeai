import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import Topbar from './Topbar';
import DashboardHome from './DashboardHome';
import TableGrid from './TableGrid';
import OrderQueue from './OrderQueue';
import ConversationsView from './ConversationsView';
import UndoToast from './UndoToast';

const Dashboard: React.FC = () => {
  const { filter, setFilter } = useApp();
  const [activeView, setActiveView] = useState<'dashboard' | 'operation' | 'conversations'>('dashboard');

  return (
    <div className="h-screen flex flex-col bg-background">
      <Topbar activeView={activeView} onViewChange={setActiveView} />
      
      {activeView === 'dashboard' && <DashboardHome />}
      
      {activeView === 'operation' && (
        <div className="flex-1 flex overflow-hidden w-full">
          <div className="flex-1 min-w-0">
            <TableGrid />
          </div>
          <div className="w-80 flex-shrink-0 lg:w-96">
            <OrderQueue />
          </div>
        </div>
      )}

      {activeView === 'conversations' && <ConversationsView />}

      <UndoToast />
    </div>
  );
};

export default Dashboard;
