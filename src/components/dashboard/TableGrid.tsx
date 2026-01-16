import { useState } from 'react';
import { Beer, Utensils, Bell, Receipt } from 'lucide-react';
import { useApp, Table } from '@/contexts/AppContext';
import TableDetailModal from './TableDetailModal';

const TableGrid: React.FC = () => {
  const { tables, settings, filter, orders } = useApp();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const getTableOrders = (tableId: number) => {
    return orders.filter(o => o.tableId === tableId);
  };

  const hasBarOrders = (tableId: number) => {
    return getTableOrders(tableId).some(o => o.station === 'bar');
  };

  const hasKitchenOrders = (tableId: number) => {
    return getTableOrders(tableId).some(o => o.station === 'kitchen');
  };

  const filteredTables = tables.filter(table => {
    if (filter === 'all') return true;
    const tableOrders = getTableOrders(table.id);
    if (filter === 'bar') return tableOrders.some(o => o.station === 'bar');
    if (filter === 'kitchen') return tableOrders.some(o => o.station === 'kitchen');
    return true;
  });

  const getAlertClass = (table: Table) => {
    if (!settings.flashingEnabled || !table.alert) return '';
    if (table.alert === 'waiter') return 'animate-flash-yellow';
    if (table.alert === 'bill') return 'animate-flash-blue';
    return '';
  };

  return (
    <>
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          Mesas ({tables.length})
        </h2>
        
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
          {filteredTables.map((table) => (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`
                relative p-4 rounded-xl bg-card border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]
                ${table.status === 'occupied' ? 'border-occupied' : 'border-free'}
                ${getAlertClass(table)}
              `}
            >
              {/* Alert Icons */}
              {table.alert && (
                <div className="absolute top-2 right-2">
                  {table.alert === 'waiter' && (
                    <Bell className="w-4 h-4 text-warning animate-pulse" />
                  )}
                  {table.alert === 'bill' && (
                    <Receipt className="w-4 h-4 text-info animate-pulse" />
                  )}
                </div>
              )}

              {/* Table Number */}
              <div className="text-3xl font-bold text-foreground mb-2">
                {table.id}
              </div>

              {/* Status Text */}
              <p className={`text-xs font-medium ${table.status === 'occupied' ? 'text-occupied' : 'text-free'}`}>
                {table.status === 'occupied' ? 'Ocupada' : 'Livre'}
              </p>

              {/* Station Icons */}
              <div className="flex items-center gap-1 mt-2">
                {hasBarOrders(table.id) && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-info/20">
                    <Beer className="w-3 h-3 text-info" />
                  </div>
                )}
                {hasKitchenOrders(table.id) && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-warning/20">
                    <Utensils className="w-3 h-3 text-warning" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedTable && (
        <TableDetailModal 
          table={selectedTable} 
          onClose={() => setSelectedTable(null)} 
        />
      )}
    </>
  );
};

export default TableGrid;
