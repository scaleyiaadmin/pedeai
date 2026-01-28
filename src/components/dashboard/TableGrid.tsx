import { useState } from 'react';
import { Beer, Utensils, Bell, Receipt } from 'lucide-react';
import { useApp, Table } from '@/contexts/AppContext';
import TableDetailModal from './TableDetailModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TableGrid: React.FC = () => {
  const { tables, settings, filter, orders, closeTable } = useApp();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [confirmPaidTableId, setConfirmPaidTableId] = useState<number | null>(null);

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

  const legendItems = [
    { color: 'bg-free', borderColor: 'border-free', label: 'Mesa Livre' },
    { color: 'bg-occupied', borderColor: 'border-occupied', label: 'Mesa Ocupada' },
    { color: 'bg-warning/50', borderColor: 'border-warning', label: 'Chamar Garçom', icon: Bell },
    { color: 'bg-info/50', borderColor: 'border-info', label: 'Pedir Conta', icon: Receipt },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Mesas ({tables.length})
          </h2>
        </div>

        {/* Responsive Grid - Optimized for tablets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 touch-pan-y">
          {filteredTables.map((table) => (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`
                relative p-4 rounded-xl bg-card border-2 transition-all duration-200 
                hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
                touch-manipulation select-none
                min-h-[100px] flex flex-col items-center justify-center
                ${table.status === 'occupied'
                  ? table.alert === 'bill' ? 'border-info bg-info/10' : 'border-occupied'
                  : 'border-free'}
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
              <div className="text-3xl font-bold text-foreground mb-1">
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

              {/* Quick action: Conta paga (only when bill was requested) */}
              {table.alert === 'bill' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmPaidTableId(table.id);
                  }}
                  className="absolute bottom-2 right-2 rounded-md bg-secondary px-2 py-1 text-xs text-foreground hover:bg-secondary/80"
                >
                  Conta paga
                </button>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Fixed Legend Footer */}
      <div className="flex-shrink-0 bg-card border-t border-border px-4 py-3">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {legendItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-md border-2 ${item.borderColor} ${item.color} flex items-center justify-center shadow-sm`}>
                {item.icon && <item.icon className="w-3 h-3" />}
              </div>
              <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-4 border-l border-border pl-4">
            <div className="flex items-center gap-1">
              <Beer className="w-4 h-4 text-info" />
              <span className="text-xs text-muted-foreground">Bar</span>
            </div>
            <div className="flex items-center gap-1">
              <Utensils className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Cozinha</span>
            </div>
          </div>
        </div>
      </div>

      {selectedTable && (
        <TableDetailModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}

      {/* Confirmação: conta paga (na aba Operação) */}
      <AlertDialog
        open={confirmPaidTableId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmPaidTableId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conta foi paga?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmando, a mesa será liberada e os pedidos dessa mesa serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmPaidTableId) closeTable(confirmPaidTableId);
                setConfirmPaidTableId(null);
              }}
            >
              Sim, liberar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TableGrid;
