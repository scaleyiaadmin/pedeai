import { useState } from 'react';
import { Check, Trash2, Edit2, X, Loader2, Printer } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
} from '@/components/ui/alert-dialog';

const OrderQueue: React.FC = () => {
  const { pedidos, updatePedidoStatus, deletePedido, loadingPedidos: loading, reprintOrder } = useApp();

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Filter pedidos based on status (pending only) and exclude system items
  const pendingPedidos = pedidos.filter(p =>
    (p.status === 'pendente' || p.status === 'preparando') &&
    !p.itens.some(item => item.nome === 'Atendimento Iniciado')
  );

  const handleDeliver = async (pedidoId: number) => {
    setUpdatingId(pedidoId);
    const result = await updatePedidoStatus(pedidoId, 'entregue');
    setUpdatingId(null);

    if (result.error) {
      toast.error('Erro ao marcar como entregue');
    } else {
      toast.success('Pedido marcado como entregue!');
    }
  };

  const handleDelete = async (pedidoId: number) => {
    setDeletingId(pedidoId);
    const result = await deletePedido(pedidoId);
    setDeletingId(null);

    if (result.error) {
      toast.error('Erro ao excluir pedido');
    } else {
      toast.success('Pedido excluído!');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="h-full bg-card border-l border-border p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full bg-card border-l border-border p-4 overflow-y-auto">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning"></span>
          Pedidos ({pendingPedidos.length})
        </h2>

        {pendingPedidos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum pedido pendente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPedidos.map((pedido) => (
              <div
                key={pedido.id}
                className="bg-secondary/50 rounded-xl p-4 animate-fade-in"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-foreground text-lg">Mesa {pedido.mesa}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatTime(pedido.created_at)}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${pedido.status === 'preparando'
                    ? 'bg-warning/20 text-warning'
                    : 'bg-info/20 text-info'
                    }`}>
                    {pedido.status === 'preparando' ? '🔥 Preparando' : '⏳ Pendente'}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1 mb-3">
                  {pedido.itens.map((item, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground flex justify-between">
                      <span>{item.quantidade}x {item.nome}</span>
                      <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Descrição / Observação */}
                {pedido.descricao && (
                  <div className="mb-3 rounded-lg bg-secondary/70 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Obs:</span>{' '}
                    <span className="text-foreground">{pedido.descricao}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2 mb-3">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">R$ {pedido.total.toFixed(2)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDeliver(pedido.id)}
                    disabled={updatingId === pedido.id}
                    className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground"
                  >
                    {updatingId === pedido.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Entregue
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => reprintOrder(pedido.id.toString())}
                    className="h-10 w-10 rounded-lg text-info hover:text-info hover:bg-info/10"
                    title="Re-imprimir pedido"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(pedido.id)}
                    disabled={deletingId === pedido.id}
                    className="h-10 w-10 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {deletingId === pedido.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
};

export default OrderQueue;