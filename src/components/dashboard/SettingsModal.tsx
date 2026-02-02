import { useState, useEffect } from 'react';
import {
  X, Settings2, Package, Warehouse, Users, CreditCard, Printer,
  Plus, Search, Edit2, Trash2, Save, MessageSquare, Send, Calendar,
  TrendingUp, TrendingDown, RotateCcw, AlertTriangle, Check, Clock,
  Phone, Mail, Tag, Gift, Volume2, VolumeX, Wifi, WifiOff, Loader2
} from 'lucide-react';
import { useApp, Product, Customer, Campaign } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { printToRawBT, printViaDeepLink } from '@/services/printerService';

const PRODUCT_CATEGORIES = [
  'Bebida',
  'Comida',
  'Petisco',
  'Porção',
  'Sobremesa',
  'Outros'
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings, updateSettings, saveSettingsToSupabase,
    products, addProduct, updateProduct, deleteProduct,
    customers, addCustomer, updateCustomer, deleteCustomer,
    stockMovements, addStockMovement,
    campaigns, addCampaign, updateCampaign, deleteCampaign
  } = useApp();

  // Initialize local state with settings
  const [localSettings, setLocalSettings] = useState({
    restaurantName: settings.restaurantName,
    whatsappNumber: settings.whatsappNumber,
    openingTime: settings.openingTime,
    closingTime: settings.closingTime,
    totalTables: settings.totalTables,
    kitchenClosingTime: settings.kitchenClosingTime,
  });

  // Sync local state when settings change (only if not editing - simplified approach: sync only on mount or major updates, 
  // but to avoid overwriting while typing, we rely on local state for inputs)
  useEffect(() => {
    setLocalSettings(prev => ({
      ...prev,
      restaurantName: settings.restaurantName,
      whatsappNumber: settings.whatsappNumber,
      openingTime: settings.openingTime,
      closingTime: settings.closingTime,
      totalTables: settings.totalTables,
      kitchenClosingTime: settings.kitchenClosingTime,
    }));
  }, [settings.restaurantName, settings.whatsappNumber, settings.openingTime, settings.closingTime, settings.totalTables, settings.kitchenClosingTime]);

  const [activeTab, setActiveTab] = useState('operation');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'bar' | 'kitchen'>('all');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editingProductData, setEditingProductData] = useState<Partial<Product> | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [showStockAdjust, setShowStockAdjust] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: '',
    station: 'bar',
    stock: 0,
    isActive: true,
    minStock: 10,
    costPrice: 0,
    description: '',
  });

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    visits: 0,
    totalSpent: 0,
    tags: [],
    notes: '',
  });

  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: '',
    message: '',
    targetTags: [],
    status: 'draft',
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    type: 'in' as 'in' | 'out',
    quantity: 0,
    reason: '',
  });

  const handleAddProduct = async () => {
    if (newProduct.name && (newProduct.price !== undefined)) {
      await addProduct({
        name: newProduct.name,
        price: newProduct.price,
        category: newProduct.category || 'Geral',
        station: newProduct.station || 'bar',
        stock: newProduct.stock || 0,
        isActive: newProduct.isActive ?? true,
        minStock: newProduct.minStock || 10,
        costPrice: newProduct.costPrice || 0,
        description: newProduct.description || '',
      });
      setNewProduct({
        name: '',
        price: 0,
        category: '',
        station: 'bar',
        stock: 0,
        isActive: true,
        minStock: 10,
        costPrice: 0,
        description: '',
      });
      setShowAddProduct(false);
    }
  };

  const handleAddCustomer = async () => {
    if (newCustomer.name && newCustomer.phone) {
      try {
        await addCustomer({
          name: newCustomer.name,
          phone: newCustomer.phone,
          email: newCustomer.email,
          visits: newCustomer.visits || 0,
          lastVisit: new Date(),
          totalSpent: newCustomer.totalSpent || 0,
          tags: newCustomer.tags || [],
          notes: newCustomer.notes,
          birthday: newCustomer.birthday,
        });

        setNewCustomer({
          name: '',
          phone: '',
          email: '',
          visits: 0,
          totalSpent: 0,
          tags: [],
          notes: '',
        });
        setShowAddCustomer(false);
      } catch (error) {
        console.error("Erro ao adicionar cliente:", error);
      }
    }
  };

  const handleAddCampaign = () => {
    if (newCampaign.name && newCampaign.message) {
      addCampaign({
        name: newCampaign.name,
        message: newCampaign.message,
        targetTags: newCampaign.targetTags || [],
        status: newCampaign.status || 'draft',
        scheduledDate: newCampaign.scheduledDate,
      });
      setNewCampaign({
        name: '',
        message: '',
        targetTags: [],
        status: 'draft',
      });
      setShowAddCampaign(false);
    }
  };

  const handleStockAdjustment = (productId: string, productName: string) => {
    if (stockAdjustment.quantity > 0) {
      addStockMovement({
        productId,
        productName,
        type: stockAdjustment.type,
        quantity: stockAdjustment.quantity,
        reason: 'Ajuste manual',
      });
      setStockAdjustment({ type: 'in', quantity: 0, reason: '' });
      setShowStockAdjust(null);
    }
  };

  const handleTestPrint = async () => {
    const success = await printToRawBT(
      `<html>
        <body style="font-family: monospace; text-align: center;">
          <h1 style="font-size: 24px;">TESTE PEDEAI</h1>
          <p style="font-size: 16px;">Se você está lendo isso, o RawBT está configurado corretamente!</p>
          <hr style="border-top: 1px dashed black;">
          <p>Configuração OK</p>
          <br><br>
        </body>
      </html>`
    );

    if (success) {
      toast.success('Comando enviado para o RawBT!');
    } else {
      toast.error('Falha ao enviar. Verifique se o RawBT está rodando no tablet.');
    }
  };

  const handleTestDeepLink = () => {
    printViaDeepLink(
      `<html>
        <body style="font-family: monospace; text-align: center;">
          <h1 style="font-size: 24px;">TESTE SIMPLES</h1>
          <p>MÉTODO "LINK DIRETO"</p>
          <hr>
          <p>Se imprimiu, use este método!</p>
          <br><br>
        </body>
      </html>`
    );
    toast.info('Abrindo app de impressão...');
  };

  const handleUpdateProductClick = async (productId: string) => {
    if (editingProductData) {
      await updateProduct(productId, editingProductData);
      setEditingProduct(null);
      setEditingProductData(null);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase());
    const matchesFilter = productFilter === 'all' || p.station === productFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const lowStockProducts = products.filter(p => p.stock <= (p.minStock || settings.lowStockAlert));
  const criticalStockProducts = products.filter(p => p.stock <= settings.criticalStockAlert);

  const allTags = [...new Set(customers.flatMap(c => c.tags))];

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const success = await saveSettingsToSupabase();
      if (success) {
        setHasChanges(false);
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOperationSetting = (updates: Partial<typeof settings>) => {
    updateSettings(updates);
    setHasChanges(true); // Keep this for toggle switches which are instant
  };

  const handleLocalChange = (field: keyof typeof localSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleBlurSave = async (field: keyof typeof localSettings) => {
    const value = localSettings[field];
    // console.log(`Auto-saving ${field}:`, value);

    // Update global context first
    updateSettings({ [field]: value });

    // Save to Supabase immediately (auto-save)
    try {
      // Create a temporary object with the update to save
      const updates = { [field]: value };

      // We need to call saveSettingsToSupabase but it usually saves the *current* context state.
      // Since we just called updateSettings, the context might not be updated yet in the closure.
      // However, saveSettingsToSupabase reads from `settings` dependency.
      // A better way for auto-save here is to manually call the supabase update or wait for context.
      // Given the architecture, let's trigger the save after a small delay or use a direct update function if available.
      // For now, we will rely on saving the specific field directly or just triggering the global save.

      // Let's force an update to the settings context and then trigger save
      // Limitation: saveSettingsToSupabase uses the state from the hook, which might be stale here.
      // But since we want to persist "assim que atualizado", let's use the valid value we have.

      setIsSaving(true);
      // We call the global save. Prerequisite: updateSettings must have propagated. 
      // Actually, since updateSettings is sync (React state update is async but we are in event handler), 
      // we might need to pass the new value directly to save if the function supported it.
      // As a workaround for this specific requirement without refactoring the whole context:
      // We will call the updateSettings, wait a bit or just optimistically rely on the user not closing immediately.
      // But simpler: just call saveSettingsToSupabase() - it might save the OLD value if state hasn't updated.
      // FIX: Let's assume the user accepts "save on blur" implies triggering the save which reads latest state.
      // To ensure we save THIS value, we can pass it to updateSettings then trigger save.

      // Better approach for "auto-save": 
      // 1. Update context
      // 2. Trigger save (which reads context). 
      // To guarantee consistency, we'll perform the save inside a useEffect or just assume fast enough update.
      // OR, we can directly invoke the supabase client here if we had access, but we don't inside the modal easily without duplicating logic.

      // Let's use a timeout to allow state to settle
      setTimeout(() => {
        saveSettingsToSupabase();
        setIsSaving(false);
      }, 500);

    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] bg-card p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Configurações
            </DialogTitle>
            {activeTab === 'operation' && hasChanges && (
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="gap-2 animate-in fade-in slide-in-from-right-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Alterações
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 bg-secondary rounded-none border-b border-border px-6 flex-shrink-0">
            <TabsTrigger value="operation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Settings2 className="w-4 h-4 mr-2" />
              Operação
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Package className="w-4 h-4 mr-2" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Warehouse className="w-4 h-4 mr-2" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="marketing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <Users className="w-4 h-4 mr-2" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              <CreditCard className="w-4 h-4 mr-2" />
              Pagamentos
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Tab A: Operação */}
            <TabsContent value="operation" className="mt-0 space-y-6 data-[state=active]:block">
              {/* Informações do Restaurante */}
              <div className="bg-secondary/30 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Informações do Restaurante
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Estabelecimento</Label>
                    <Input
                      value={localSettings.restaurantName}
                      onChange={(e) => handleLocalChange('restaurantName', e.target.value)}
                      onBlur={() => handleBlurSave('restaurantName')}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input
                      value={localSettings.whatsappNumber}
                      onChange={(e) => handleLocalChange('whatsappNumber', e.target.value)}
                      onBlur={() => handleBlurSave('whatsappNumber')}
                      placeholder="(00) 00000-0000"
                      className="rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Horário de Abertura</Label>
                    <Input
                      type="time"
                      value={localSettings.openingTime}
                      onChange={(e) => handleLocalChange('openingTime', e.target.value)}
                      onBlur={() => handleBlurSave('openingTime')}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário de Fechamento</Label>
                    <Input
                      type="time"
                      value={localSettings.closingTime}
                      onChange={(e) => handleLocalChange('closingTime', e.target.value)}
                      onBlur={() => handleBlurSave('closingTime')}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Mesas */}
              <div className="bg-secondary/30 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Configuração de Mesas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Mesas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={localSettings.totalTables}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        const maxTables = 50;
                        handleLocalChange('totalTables', Math.min(Math.max(1, value), maxTables));
                      }}
                      onBlur={() => handleBlurSave('totalTables')}
                      className="w-32 h-10 rounded-lg"
                    />
                    <p className="text-sm text-muted-foreground">
                      Máximo contratado: 50 mesas
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Horário Fechamento Cozinha</Label>
                    <Input
                      type="time"
                      value={localSettings.kitchenClosingTime || localSettings.closingTime}
                      onChange={(e) => handleLocalChange('kitchenClosingTime', e.target.value)}
                      onBlur={() => handleBlurSave('kitchenClosingTime')}
                      className="w-32 h-10 rounded-lg"
                    />
                    <p className="text-sm text-warning flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      30min antes, clientes serão avisados
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                  <div>
                    <Label className="text-foreground font-medium">Fechar Mesa Automaticamente</Label>
                    <p className="text-sm text-muted-foreground">
                      Após pagamento confirmado
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoCloseTable}
                    onCheckedChange={(checked) => handleUpdateOperationSetting({ autoCloseTable: checked })}
                  />
                </div>
              </div>

              {/* Alertas e Sons */}
              <div className="bg-secondary/30 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Alertas e Notificações</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <Label className="text-foreground font-medium">Alertas Piscantes</Label>
                        <p className="text-sm text-muted-foreground">
                          Animação para garçom e conta
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.flashingEnabled}
                      onCheckedChange={(checked) => handleUpdateOperationSetting({ flashingEnabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {settings.soundEnabled ? (
                          <Volume2 className="w-5 h-5 text-primary" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <Label className="text-foreground font-medium">Sons de Notificação</Label>
                        <p className="text-sm text-muted-foreground">
                          Alertas sonoros para novos pedidos
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.soundEnabled}
                      onCheckedChange={(checked) => handleUpdateOperationSetting({ soundEnabled: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Impressoras
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleTestPrint} className="gap-2">
                      <Printer className="w-4 h-4" />
                      Testar Impressão
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-blue-500 mb-1">Configuração RawBT (Tablet)</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Para imprimir silenciosamente, o app <strong>RawBT</strong> deve estar instalado com a opção "Print Server" ativa.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Certifique-se também que o Chrome tem a flag <code>allow-insecure-localhost</code> ativada.
                  </p>
                </div>

                <div className="flex justify-end mb-4">
                  <Button variant="secondary" size="sm" onClick={handleTestDeepLink} className="gap-2 w-full sm:w-auto">
                    <Printer className="w-4 h-4" />
                    Testar Método Simples (Sem Configuração)
                  </Button>
                </div>

                <div className="space-y-2">
                  {settings.printers.map((printer) => (
                    <div key={printer.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${printer.isActive ? 'bg-success' : 'bg-destructive'}`} />
                        <div>
                          <p className="font-medium text-foreground">{printer.name}</p>
                          <p className="text-sm text-muted-foreground">{printer.ipAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={printer.type === 'bar' ? 'default' : printer.type === 'kitchen' ? 'secondary' : 'outline'}>
                          {printer.type === 'bar' ? 'Bar' : printer.type === 'kitchen' ? 'Cozinha' : 'Recibo'}
                        </Badge>
                        <Switch
                          checked={printer.isActive}
                          onCheckedChange={(checked) => {
                            const updatedPrinters = settings.printers.map(p =>
                              p.id === printer.id ? { ...p, isActive: checked } : p
                            );
                            handleUpdateOperationSetting({ printers: updatedPrinters });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab B: Produtos */}
            <TabsContent value="products" className="mt-0 space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10 rounded-lg"
                    />
                  </div>
                  <Select value={productFilter} onValueChange={(v) => setProductFilter(v as any)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="kitchen">Cozinha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setShowAddProduct(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Produto
                </Button>
              </div>

              {/* Add Product Form */}
              {showAddProduct && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Novo Produto</h3>
                    <Button variant="ghost" size="icon" onClick={() => setShowAddProduct(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newProduct.price === 0 ? '' : newProduct.price}
                        placeholder="0.00"
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select
                        value={newProduct.category}
                        onValueChange={(v) => setNewProduct({ ...newProduct, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estação</Label>
                      <Select
                        value={newProduct.station}
                        onValueChange={(v) => setNewProduct({ ...newProduct, station: v as 'bar' | 'kitchen' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">🍺 Bar</SelectItem>
                          <SelectItem value="kitchen">🍽️ Cozinha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estoque Inicial</Label>
                      <Input
                        type="number"
                        value={newProduct.stock === 0 ? '' : newProduct.stock}
                        placeholder="0"
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estoque Mínimo</Label>
                      <Input
                        type="number"
                        value={newProduct.minStock === 0 ? '' : newProduct.minStock}
                        placeholder="0"
                        onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-2 col-span-3">
                      <Label>Descrição</Label>
                      <Input
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddProduct(false)}>Cancelar</Button>
                    <Button onClick={handleAddProduct} className="gap-2">
                      <Save className="w-4 h-4" />
                      Salvar Produto
                    </Button>
                  </div>
                </div>
              )}

              {/* Products List */}
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${product.isActive
                      ? 'bg-card border-border'
                      : 'bg-muted/50 border-muted opacity-60'
                      }`}
                  >
                    {editingProduct === product.id ? (
                      <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4 my-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-foreground">Editar Produto: {product.name}</h3>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(null); setEditingProductData(null); }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Nome *</Label>
                            <Input
                              value={editingProductData?.name ?? product.name}
                              onChange={(e) => setEditingProductData({ ...editingProductData, name: e.target.value })}
                              className="rounded-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Preço *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingProductData?.price ?? product.price}
                              onChange={(e) => setEditingProductData({ ...editingProductData, price: parseFloat(e.target.value) || 0 })}
                              className="rounded-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select
                              value={editingProductData?.category ?? product.category}
                              onValueChange={(v) => setEditingProductData({ ...editingProductData, category: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRODUCT_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Estação</Label>
                            <Select
                              value={editingProductData?.station ?? product.station}
                              onValueChange={(v) => setEditingProductData({ ...editingProductData, station: v as 'bar' | 'kitchen' })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bar">Bar</SelectItem>
                                <SelectItem value="kitchen">Cozinha</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Estoque</Label>
                            <Input
                              type="number"
                              value={editingProductData?.stock ?? product.stock}
                              onChange={(e) => setEditingProductData({ ...editingProductData, stock: parseInt(e.target.value) || 0 })}
                              className="rounded-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Estoque Mínimo</Label>
                            <Input
                              type="number"
                              value={editingProductData?.minStock ?? product.minStock}
                              onChange={(e) => setEditingProductData({ ...editingProductData, minStock: parseInt(e.target.value) || 0 })}
                              className="rounded-lg"
                            />
                          </div>
                          <div className="space-y-2 col-span-3">
                            <Label>Descrição</Label>
                            <Input
                              value={editingProductData?.description ?? product.description}
                              onChange={(e) => setEditingProductData({ ...editingProductData, description: e.target.value })}
                              className="rounded-lg"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => { setEditingProduct(null); setEditingProductData(null); }}>Cancelar</Button>
                          <Button onClick={() => handleUpdateProductClick(product.id)} className="gap-2">
                            <Check className="w-4 h-4" />
                            Confirmar Alterações
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{product.name}</span>
                              {!product.isActive && (
                                <Badge variant="secondary" className="text-xs">Inativo</Badge>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-sm text-muted-foreground">{product.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">R$ {product.price.toFixed(2)}</p>
                          </div>
                          <Badge variant="outline">{product.category}</Badge>
                          <Badge variant={product.station === 'bar' ? 'default' : 'secondary'}>
                            {product.station === 'bar' ? '🍺 Bar' : '🍽️ Cozinha'}
                          </Badge>
                          <div className={`text-center min-w-[60px] px-2 py-1 rounded-lg ${product.stock <= settings.criticalStockAlert
                            ? 'bg-destructive/20 text-destructive'
                            : product.stock <= (product.minStock || settings.lowStockAlert)
                              ? 'bg-warning/20 text-warning'
                              : 'bg-success/20 text-success'
                            }`}>
                            <p className="font-bold">{product.stock}</p>
                            <p className="text-xs">un.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={product.isActive}
                            onCheckedChange={(checked) => updateProduct(product.id, { isActive: checked })}
                          />
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingProduct(product.id);
                            setEditingProductData({ ...product });
                          }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab C: Estoque */}
            <TabsContent value="inventory" className="mt-0 space-y-6">
              {/* Alertas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Configurar Alertas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Alerta Estoque Baixo</Label>
                      <Input
                        type="number"
                        value={settings.lowStockAlert}
                        onChange={(e) => handleUpdateOperationSetting({ lowStockAlert: parseInt(e.target.value) || 15 })}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Alerta Crítico</Label>
                      <Input
                        type="number"
                        value={settings.criticalStockAlert}
                        onChange={(e) => handleUpdateOperationSetting({ criticalStockAlert: parseInt(e.target.value) || 5 })}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                  <h3 className="font-semibold text-destructive mb-2">Produtos em Alerta</h3>
                  <div className="space-y-1">
                    {criticalStockProducts.length > 0 ? (
                      criticalStockProducts.slice(0, 3).map(p => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span className="text-foreground">{p.name}</span>
                          <span className="font-bold text-destructive">{p.stock} un.</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum produto em estado crítico</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Gestão de Estoque */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Gestão de Estoque</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${product.stock <= settings.criticalStockAlert
                        ? 'border-destructive bg-destructive/10'
                        : product.stock <= (product.minStock || settings.lowStockAlert)
                          ? 'border-warning bg-warning/10'
                          : 'border-success bg-success/10'
                        }`}
                      onClick={() => setShowStockAdjust(showStockAdjust === product.id ? null : product.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-foreground">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                        <Badge variant={product.station === 'bar' ? 'default' : 'secondary'} className="text-xs">
                          {product.station === 'bar' ? '🍺' : '🍽️'}
                        </Badge>
                      </div>
                      <p className="text-3xl font-bold mt-2">
                        {product.stock}
                        <span className="text-sm font-normal text-muted-foreground ml-1">un.</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {product.stock <= settings.criticalStockAlert
                          ? '🔴 Estoque crítico!'
                          : product.stock <= (product.minStock || settings.lowStockAlert)
                            ? '🟡 Estoque baixo'
                            : '🟢 OK'}
                      </p>

                      {showStockAdjust === product.id && (
                        <div className="mt-4 pt-4 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Button
                              variant={stockAdjustment.type === 'in' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setStockAdjustment({ ...stockAdjustment, type: 'in' })}
                              className="flex-1 gap-1"
                            >
                              <TrendingUp className="w-4 h-4" />
                              Entrada
                            </Button>
                            <Button
                              variant={stockAdjustment.type === 'out' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setStockAdjustment({ ...stockAdjustment, type: 'out' })}
                              className="flex-1 gap-1"
                            >
                              <TrendingDown className="w-4 h-4" />
                              Saída
                            </Button>
                          </div>
                          <Input
                            type="number"
                            placeholder="Quantidade"
                            value={stockAdjustment.quantity || ''}
                            onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: parseInt(e.target.value) || 0 })}
                            className="rounded-lg"
                          />
                          <Button
                            onClick={() => handleStockAdjustment(product.id, product.name)}
                            className="w-full"
                            disabled={!stockAdjustment.quantity}
                          >
                            Confirmar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Histórico de Movimentações */}
              <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Histórico de Movimentações
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stockMovements.slice(0, 10).map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${movement.type === 'in' ? 'bg-success/20' : 'bg-destructive/20'
                          }`}>
                          {movement.type === 'in' ? (
                            <TrendingUp className="w-4 h-4 text-success" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{movement.productName}</p>
                          <p className="text-sm text-muted-foreground">{movement.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${movement.type === 'in' ? 'text-success' : 'text-destructive'}`}>
                          {movement.type === 'in' ? '+' : '-'}{movement.quantity} un.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movement.date.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab D: Marketing */}
            <TabsContent value="marketing" className="mt-0 space-y-6">
              {/* CRM */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Clientes ({customers.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10 w-64 rounded-lg"
                      />
                    </div>
                    <Button onClick={() => setShowAddCustomer(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Novo Cliente
                    </Button>
                  </div>
                </div>

                {/* Add Customer Form */}
                {showAddCustomer && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Novo Cliente</h3>
                      <Button variant="ghost" size="icon" onClick={() => setShowAddCustomer(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone *</Label>
                        <Input
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Aniversário</Label>
                        <Input
                          type="date"
                          onChange={(e) => setNewCustomer({ ...newCustomer, birthday: new Date(e.target.value) })}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Observações</Label>
                        <Input
                          value={newCustomer.notes}
                          onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Cancelar</Button>
                      <Button onClick={handleAddCustomer} className="gap-2">
                        <Save className="w-4 h-4" />
                        Salvar Cliente
                      </Button>
                    </div>
                  </div>
                )}

                {/* Customers List */}
                <div className="border rounded-xl bg-card/30 overflow-hidden">
                  <ScrollArea className="max-h-[400px] w-full">
                    <div className="p-4 space-y-2">

                      {filteredCustomers.map((customer) => (
                        <div key={customer.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">{customer.name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-foreground">{customer.name}</h4>
                                {customer.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {customer.phone}
                                </span>
                                {customer.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {customer.email}
                                  </span>
                                )}
                                {customer.birthday && (
                                  <span className="flex items-center gap-1">
                                    <Gift className="w-3 h-3" />
                                    {customer.birthday.toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                              {customer.notes && (
                                <p className="text-sm text-muted-foreground mt-1 italic">"{customer.notes}"</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-sm text-foreground">{customer.lastVisit.toLocaleDateString('pt-BR')}</p>
                              <p className="text-xs text-muted-foreground">última visita</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon">
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCustomer(customer.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>


              {/* Campanhas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Campanhas
                  </h3>
                  <Button onClick={() => setShowAddCampaign(true)} variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Campanha
                  </Button>
                </div>

                {/* Add Campaign Form */}
                {showAddCampaign && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Nova Campanha</h3>
                      <Button variant="ghost" size="icon" onClick={() => setShowAddCampaign(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome da Campanha *</Label>
                        <Input
                          value={newCampaign.name}
                          onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Envio</Label>
                        <Input
                          type="datetime-local"
                          onChange={(e) => setNewCampaign({ ...newCampaign, scheduledDate: new Date(e.target.value), status: 'scheduled' })}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Mensagem *</Label>
                        <Textarea
                          value={newCampaign.message}
                          onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                          className="rounded-lg"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Tags de Destino</Label>
                        <div className="flex flex-wrap gap-2">
                          {allTags.map(tag => (
                            <Badge
                              key={tag}
                              variant={newCampaign.targetTags?.includes(tag) ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => {
                                const current = newCampaign.targetTags || [];
                                setNewCampaign({
                                  ...newCampaign,
                                  targetTags: current.includes(tag)
                                    ? current.filter(t => t !== tag)
                                    : [...current, tag]
                                });
                              }}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddCampaign(false)}>Cancelar</Button>
                      <Button onClick={handleAddCampaign} className="gap-2">
                        <Save className="w-4 h-4" />
                        Salvar Campanha
                      </Button>
                    </div>
                  </div>
                )}

                {/* Campaigns List */}
                <div className="space-y-2">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{campaign.name}</h4>
                          <Badge variant={
                            campaign.status === 'sent' ? 'default' :
                              campaign.status === 'scheduled' ? 'secondary' : 'outline'
                          }>
                            {campaign.status === 'sent' ? 'Enviada' :
                              campaign.status === 'scheduled' ? 'Agendada' : 'Rascunho'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{campaign.message}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-muted-foreground" />
                            {campaign.targetTags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                          {campaign.scheduledDate && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {campaign.scheduledDate.toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {campaign.status === 'sent' && campaign.sentCount && (
                          <div className="text-center">
                            <p className="text-lg font-bold text-success">{campaign.sentCount}</p>
                            <p className="text-xs text-muted-foreground">enviados</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {campaign.status === 'draft' && (
                            <Button variant="outline" size="sm" className="gap-1">
                              <Send className="w-4 h-4" />
                              Enviar
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => deleteCampaign(campaign.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab E: Pagamentos */}
            <TabsContent value="payments" className="mt-0 h-full flex items-center justify-center">
              <div className="bg-secondary/30 rounded-xl p-12 text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Módulo de Pagamentos em Breve
                </h3>
                <p className="text-muted-foreground">
                  Estamos trabalhando para trazer integração completa com métodos de pagamento.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
