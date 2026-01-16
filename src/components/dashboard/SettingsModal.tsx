import { useState } from 'react';
import { X, Settings2, Package, Warehouse, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, products, addProduct, updateProduct, deleteProduct, customers } = useApp();
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: '',
    station: 'bar' as 'bar' | 'kitchen',
    stock: '',
  });

  const handleAddProduct = () => {
    if (newProduct.name && newProduct.price && newProduct.category) {
      addProduct({
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        category: newProduct.category,
        station: newProduct.station,
        stock: parseInt(newProduct.stock) || 0,
      });
      setNewProduct({ name: '', price: '', category: '', station: 'bar', stock: '' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Configurações
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="operation" className="mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-secondary rounded-xl p-1">
            <TabsTrigger value="operation" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Settings2 className="w-4 h-4 mr-2" />
              Operação
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Package className="w-4 h-4 mr-2" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Warehouse className="w-4 h-4 mr-2" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="marketing" className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Users className="w-4 h-4 mr-2" />
              Marketing
            </TabsTrigger>
          </TabsList>

          {/* Tab A: Operação */}
          <TabsContent value="operation" className="mt-4 space-y-6">
            <div className="bg-secondary/50 rounded-xl p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Número de Mesas</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.totalTables}
                  onChange={(e) => updateSettings({ totalTables: parseInt(e.target.value) || 1 })}
                  className="w-32 h-10 rounded-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Altere para adicionar ou remover mesas do painel
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground font-medium">Alertas Piscantes</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativar animação para alertas de garçom e conta
                  </p>
                </div>
                <Switch
                  checked={settings.flashingEnabled}
                  onCheckedChange={(checked) => updateSettings({ flashingEnabled: checked })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab B: Produtos */}
          <TabsContent value="products" className="mt-4 space-y-4 max-h-[50vh] overflow-y-auto">
            {/* Add Product Form */}
            <div className="bg-secondary/50 rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-4">Adicionar Novo Produto</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Input
                  placeholder="Nome"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="rounded-lg"
                />
                <Input
                  placeholder="Preço"
                  type="number"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="rounded-lg"
                />
                <Input
                  placeholder="Categoria"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="rounded-lg"
                />
                <Select
                  value={newProduct.station}
                  onValueChange={(value) => setNewProduct({ ...newProduct, station: value as 'bar' | 'kitchen' })}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Estação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="kitchen">Cozinha</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    placeholder="Estoque"
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="rounded-lg"
                  />
                  <Button onClick={handleAddProduct} className="bg-primary text-primary-foreground rounded-lg">
                    +
                  </Button>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
                  <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                    <span className="font-medium text-foreground">{product.name}</span>
                    <span className="text-muted-foreground">R$ {product.price.toFixed(2)}</span>
                    <span className="text-muted-foreground">{product.category}</span>
                    <span className={`text-sm font-medium ${product.station === 'bar' ? 'text-info' : 'text-warning'}`}>
                      {product.station === 'bar' ? '🍺 Bar' : '🍽️ Cozinha'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={product.stock}
                        onChange={(e) => updateProduct(product.id, { stock: parseInt(e.target.value) || 0 })}
                        className="w-20 h-8 rounded-lg text-center"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteProduct(product.id)}
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab C: Estoque */}
          <TabsContent value="inventory" className="mt-4 max-h-[50vh] overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className={`p-4 rounded-xl border-2 ${
                    product.stock <= 5 
                      ? 'border-destructive bg-destructive/10' 
                      : product.stock <= 15 
                        ? 'border-warning bg-warning/10' 
                        : 'border-success bg-success/10'
                  }`}
                >
                  <h4 className="font-semibold text-foreground">{product.name}</h4>
                  <p className="text-2xl font-bold mt-2">
                    {product.stock}
                    <span className="text-sm font-normal text-muted-foreground ml-1">unidades</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.stock <= 5 ? 'Estoque crítico!' : product.stock <= 15 ? 'Estoque baixo' : 'OK'}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab D: Marketing */}
          <TabsContent value="marketing" className="mt-4 max-h-[50vh] overflow-y-auto">
            <div className="space-y-3">
              {customers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between bg-secondary/50 rounded-xl p-4">
                  <div>
                    <h4 className="font-semibold text-foreground">{customer.name}</h4>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{customer.visits} visitas</p>
                    <p className="text-sm text-muted-foreground">
                      Última: {customer.lastVisit.toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
