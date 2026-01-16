import { useState } from 'react';
import { X, Plus, CreditCard, MessageCircle, Search } from 'lucide-react';
import { useApp, Table, OrderItem } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TableDetailModalProps {
  table: Table;
  onClose: () => void;
}

const TableDetailModal: React.FC<TableDetailModalProps> = ({ table, onClose }) => {
  const { products, addItemToTable, closeTable, updateTableAlert } = useApp();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const consumption = table.consumption || [];
  const total = consumption.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = (product: typeof products[0]) => {
    const item: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: product.price,
    };
    addItemToTable(table.id, item);
    setIsAddingItem(false);
    setSearchQuery('');
  };

  const handleCloseTable = () => {
    closeTable(table.id);
    onClose();
  };

  const handleResolveAlert = () => {
    updateTableAlert(table.id, null);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center justify-between">
            <span>Mesa {table.id}</span>
            <span className={`text-sm px-2 py-1 rounded-full ${
              table.status === 'occupied' 
                ? 'bg-occupied/20 text-occupied' 
                : 'bg-free/20 text-free'
            }`}>
              {table.status === 'occupied' ? 'Ocupada' : 'Livre'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Alert Banner */}
        {table.alert && (
          <div className={`p-3 rounded-lg flex items-center justify-between ${
            table.alert === 'waiter' ? 'bg-warning/20 text-warning-foreground' : 'bg-info/20 text-info-foreground'
          }`}>
            <span className="font-medium">
              {table.alert === 'waiter' ? '🔔 Garçom chamado' : '💳 Conta solicitada'}
            </span>
            <Button size="sm" variant="outline" onClick={handleResolveAlert}>
              Resolver
            </Button>
          </div>
        )}

        {/* Consumption List */}
        <div className="flex-1 overflow-y-auto max-h-60 mt-4">
          <h3 className="font-semibold text-foreground mb-3">Consumo</h3>
          {consumption.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum item consumido</p>
          ) : (
            <div className="space-y-2">
              {consumption.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                  <div>
                    <span className="font-medium text-foreground">{item.productName}</span>
                    <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Add Item Section */}
        {isAddingItem ? (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-lg"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAddItem(product)}
                  className="w-full flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                >
                  <span className="font-medium text-foreground">{product.name}</span>
                  <span className="text-muted-foreground">R$ {product.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={() => setIsAddingItem(false)} className="w-full rounded-lg">
              Cancelar
            </Button>
          </div>
        ) : showPayment ? (
          <div className="mt-4 space-y-3">
            <h3 className="font-semibold text-foreground">Forma de Pagamento</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-16 rounded-lg flex flex-col items-center gap-1"
                onClick={() => { setShowPayment(false); }}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-sm">PIX</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 rounded-lg flex flex-col items-center gap-1"
                onClick={() => { setShowPayment(false); }}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">WhatsApp</span>
              </Button>
            </div>
            <Button variant="outline" onClick={() => setShowPayment(false)} className="w-full rounded-lg">
              Voltar
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Button 
              onClick={() => setIsAddingItem(true)}
              className="h-12 rounded-lg bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-1" />
              Item
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowPayment(true)}
              className="h-12 rounded-lg"
            >
              <CreditCard className="w-4 h-4 mr-1" />
              Pagar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCloseTable}
              className="h-12 rounded-lg"
            >
              <X className="w-4 h-4 mr-1" />
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TableDetailModal;
