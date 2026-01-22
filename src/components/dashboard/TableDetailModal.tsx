import { useState } from 'react';
import { X, Plus, CreditCard, Search, Minus, Edit2, Trash2, Receipt } from 'lucide-react';
import { useApp, Table, OrderItem } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface TableDetailModalProps {
  table: Table;
  onClose: () => void;
}

const TableDetailModal: React.FC<TableDetailModalProps> = ({ table, onClose }) => {
  const { products, addItemToTable, closeTable, updateTableAlert, tables, settings } = useApp();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false);
  const [itemDescription, setItemDescription] = useState('');

  // Get fresh table data
  const currentTable = tables.find(t => t.id === table.id) || table;
  const consumption = currentTable.consumption || [];
  const subtotal = consumption.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const serviceFee = settings.serviceFee > 0 ? subtotal * (settings.serviceFee / 100) : 0;
  const total = subtotal + serviceFee;

  const filteredProducts = products.filter(p => 
    p.isActive && (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleAddItem = (product: typeof products[0]) => {
    const item: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: product.price,
      description: itemDescription.trim() || undefined,
    };
    addItemToTable(currentTable.id, item);
    setIsAddingItem(false);
    setSearchQuery('');
    setItemDescription('');
  };

  const handleRequestBill = () => {
    // Set alert to bill (payment pending status)
    updateTableAlert(currentTable.id, 'bill');
  };

  const handleCloseTable = () => {
    setConfirmPaidOpen(true);
  };

  const confirmPaid = () => {
    closeTable(currentTable.id);
    setConfirmPaidOpen(false);
    onClose();
  };

  const handleResolveAlert = () => {
    updateTableAlert(currentTable.id, null);
  };

  const startEditItem = (index: number, currentQuantity: number) => {
    setEditingItem(index);
    setEditQuantity(currentQuantity);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditQuantity(1);
  };

  // Group consumption items by product
  const groupedConsumption = consumption.reduce((acc, item) => {
    const existing = acc.find(i => i.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, [] as OrderItem[]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden bg-card flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center justify-between">
            <span>Mesa {currentTable.id}</span>
            <span className={`text-sm px-3 py-1 rounded-full ${
              currentTable.status === 'occupied' 
                ? 'bg-occupied/20 text-occupied' 
                : 'bg-free/20 text-free'
            }`}>
              {currentTable.alert === 'bill' 
                ? '💳 Pagamento Pendente'
                : currentTable.status === 'occupied' ? 'Ocupada' : 'Livre'
              }
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Alert Banner */}
        {currentTable.alert && (
          <div className={`p-3 rounded-lg flex items-center justify-between ${
            currentTable.alert === 'waiter' ? 'bg-warning/20 text-warning-foreground' : 'bg-info/20 text-info-foreground'
          }`}>
            <span className="font-medium">
              {currentTable.alert === 'waiter' ? '🔔 Garçom chamado' : '💳 Conta solicitada'}
            </span>
            <Button size="sm" variant="outline" onClick={handleResolveAlert}>
              Resolver
            </Button>
          </div>
        )}

        {/* Consumption List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="pr-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center justify-between">
              <span>Consumo</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingItem(true)}
                className="text-primary hover:text-primary gap-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </h3>
            {groupedConsumption.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum item consumido</p>
            ) : (
              <div className="space-y-2">
                {groupedConsumption.map((item, idx) => (
                  <div 
                    key={`${item.productId}-${idx}`} 
                    className="flex items-center justify-between bg-secondary/50 rounded-lg p-3"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-foreground">{item.productName}</span>
                      <div className="flex items-center gap-2 mt-1">
                        {editingItem === idx ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{editQuantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={() => setEditQuantity(editQuantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm text-muted-foreground">
                              {item.quantity}x R$ {item.price.toFixed(2)}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => startEditItem(idx, item.quantity)}
                            >
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold text-foreground">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Total Section */}
        <div className="border-t border-border pt-4 mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">R$ {subtotal.toFixed(2)}</span>
          </div>
          {settings.serviceFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxa de serviço ({settings.serviceFee}%)</span>
              <span className="text-foreground">R$ {serviceFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-border">
            <span>Total</span>
            <span className="text-primary">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Add Item Section */}
        {isAddingItem ? (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
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
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddItem(product)}
                    className="w-full flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="text-left">
                      <span className="font-medium text-foreground block">{product.name}</span>
                      <span className="text-xs text-muted-foreground">{product.category}</span>
                    </div>
                    <span className="font-semibold text-foreground">R$ {product.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Observação (opcional)</span>
              <Input
                placeholder="Ex.: copo sujo com bebida"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="rounded-lg"
              />
            </div>

            <Button variant="outline" onClick={() => setIsAddingItem(false)} className="w-full rounded-lg">
              Cancelar
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
              onClick={handleRequestBill}
              disabled={currentTable.alert === 'bill' || groupedConsumption.length === 0}
              className="h-12 rounded-lg"
            >
              <Receipt className="w-4 h-4 mr-1" />
              Conta
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

      {/* Confirmação: conta paga */}
      <AlertDialog open={confirmPaidOpen} onOpenChange={setConfirmPaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conta foi paga?</AlertDialogTitle>
            <AlertDialogDescription>
              Se confirmar, a mesa será liberada e os pedidos dessa mesa serão removidos do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPaid}>
              Sim, liberar mesa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default TableDetailModal;
