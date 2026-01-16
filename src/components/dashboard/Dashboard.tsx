import { useApp } from '@/contexts/AppContext';
import Topbar from './Topbar';
import TableGrid from './TableGrid';
import OrderQueue from './OrderQueue';
import UndoToast from './UndoToast';

const Dashboard: React.FC = () => {
  const { logout } = useApp();

  return (
    <div className="h-screen flex flex-col bg-background">
      <Topbar />
      
      <div className="flex-1 flex overflow-hidden">
        <TableGrid />
        <OrderQueue />
      </div>

      <UndoToast />
    </div>
  );
};

export default Dashboard;
