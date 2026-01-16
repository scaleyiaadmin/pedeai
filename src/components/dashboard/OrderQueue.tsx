import { Check, Printer, AlertTriangle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';

const OrderQueue: React.FC = () => {
  const { orders, deliverOrder, reprintOrder, filter } = useApp();

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.station === filter;
  });

  const pendingOrders = filteredOrders.filter(o => o.status !== 'delivered');

  return (
    <div className="w-80 bg-card border-l border-border p-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-warning"></span>
        Pedidos ({pendingOrders.length})
      </h2>

      {pendingOrders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Nenhum pedido pendente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingOrders.map((order) => (
            <div 
              key={order.id}
              className="bg-secondary/50 rounded-xl p-4 animate-fade-in"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-foreground text-lg">Mesa {order.tableId}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  order.station === 'bar' 
                    ? 'bg-info/20 text-info' 
                    : 'bg-warning/20 text-warning'
                }`}>
                  {order.station === 'bar' ? '🍺 Bar' : '🍽️ Cozinha'}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1 mb-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">
                    {item.quantity}x {item.productName}
                  </div>
                ))}
              </div>

              {/* Print Status (Kitchen Only) */}
              {order.station === 'kitchen' && (
                <div className="flex items-center gap-2 mb-3">
                  {order.printStatus === 'printed' ? (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <Printer className="w-3 h-3" />
                      Impresso
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        Erro de impressão
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => reprintOrder(order.id)}
                        className="h-6 text-xs rounded-md"
                      >
                        Reimprimir
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Deliver Button */}
              <Button
                onClick={() => deliverOrder(order.id)}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground"
              >
                <Check className="w-4 h-4 mr-2" />
                Entregue
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderQueue;
