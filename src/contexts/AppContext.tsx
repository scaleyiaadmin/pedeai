import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant, Restaurant } from '@/hooks/useRestaurant';
import { usePedidos, ParsedPedido } from '@/hooks/usePedidos';
import { useProdutos, ProdutoSupabase } from '@/hooks/useProdutos';
import { useUsuarios, UsuarioSupabase } from '@/hooks/useUsuarios';
import { useMensagens } from '@/hooks/useMensagens';
import { validateLoginInput } from '@/lib/auth-validation';
import { toast } from 'sonner';
import { printOrder } from '@/lib/print-utils';
import { printViaWebBluetooth } from '@/services/printerService';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  station: 'bar' | 'kitchen';
  stock: number;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  minStock?: number;
  costPrice?: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  description?: string;
}

export interface Order {
  id: string;
  tableId: number;
  items: OrderItem[];
  station: 'bar' | 'kitchen';
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  printStatus?: 'printed' | 'error';
  createdAt: Date;
}

export interface Table {
  id: number;
  status: 'free' | 'occupied';
  alert?: 'waiter' | 'bill' | null;
  orders: Order[];
  consumption: OrderItem[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  visits: number;
  lastVisit: Date;
  totalSpent: number;
  tags: string[];
  notes?: string;
  birthday?: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  date: Date;
}

export interface Printer {
  id: string;
  name: string;
  type: 'bar' | 'kitchen' | 'receipt';
  ipAddress: string;
  isActive: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  message: string;
  targetTags: string[];
  scheduledDate?: Date;
  status: 'draft' | 'scheduled' | 'sent';
  sentCount?: number;
}

interface UndoAction {
  type: 'deliver_order' | 'close_table' | 'resolve_alert';
  data: any;
  timestamp: number;
}

interface AppSettings {
  totalTables: number;
  flashingEnabled: boolean;
  restaurantName: string;
  openingTime: string;
  closingTime: string;
  kitchenClosingTime?: string;
  autoCloseTable: boolean;
  soundEnabled: boolean;
  lowStockAlert: number;
  criticalStockAlert: number;
  acceptPix: boolean;
  acceptCard: boolean;
  acceptCash: boolean;
  serviceFee: number;
  whatsappNumber: string;
  printers: Printer[];
  autoPrintEnabled: boolean;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AppContextType {
  isAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  restaurantId: string | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  adminLogin: (email: string, password: string) => Promise<AuthResult>;
  adminLogout: () => void;
  tables: Table[];
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  saveSettingsToSupabase: () => Promise<boolean>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<void>;
  updateAndSaveSetting: (updates: Partial<Restaurant>) => Promise<boolean>;
  orders: Order[];
  addOrder: (tableId: number, items: OrderItem[], station: 'bar' | 'kitchen') => Promise<void>;
  deliverOrder: (orderId: string) => void;
  reprintOrder: (orderId: string) => void;
  updateTableAlert: (tableId: number, alert: 'waiter' | 'bill' | null) => void;
  closeTable: (tableId: number) => void;
  addItemToTable: (tableId: number, item: OrderItem) => Promise<void>;
  customers: Customer[];
  restaurant: any; // Exposed to allow access to max_mesas and other DB raw data
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  stockMovements: StockMovement[];
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'date'>) => void;
  campaigns: Campaign[];
  addCampaign: (campaign: Omit<Campaign, 'id'>) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  undoAction: UndoAction | null;
  performUndo: () => void;
  clearUndo: () => void;
  filter: 'all' | 'bar' | 'kitchen';
  setFilter: (filter: 'all' | 'bar' | 'kitchen') => void;
  loadingData: boolean;
  pedidos: ParsedPedido[];
  updatePedidoStatus: (pedidoId: number, status: string) => Promise<{ error: string | null }>;
  deletePedido: (pedidoId: number) => Promise<{ error: string | null }>;
  dailyMetrics: () => { totalSales: number; pendingOrders: number; topProducts: any[]; totalOrders: number };
  loadingPedidos: boolean;
  requestBill: (tableId: number) => Promise<void>;
  mensagens: any;
  refetchUsuarios: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialPrinters: Printer[] = [];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [restaurantId, setRestaurantId] = useState<string | null>(() => {
    // Check localStorage for existing session
    return localStorage.getItem('pedeai_restaurant_id');
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('pedeai_admin_auth') === 'true';
  });
  const [loadingData, setLoadingData] = useState(true);

  const isAuthenticated = !!restaurantId;

  const [settings, setSettings] = useState<AppSettings>({
    totalTables: 12,
    flashingEnabled: true,
    restaurantName: 'Meu Restaurante',
    openingTime: '11:00',
    closingTime: '23:00',
    autoCloseTable: true,
    soundEnabled: true,
    lowStockAlert: 15,
    criticalStockAlert: 5,
    acceptPix: true,
    acceptCard: true,
    acceptCash: true,
    serviceFee: 10,
    whatsappNumber: '',
    printers: initialPrinters,
    autoPrintEnabled: false,
  });

  // Empty initial states - no mock data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [filter, setFilter] = useState<'all' | 'bar' | 'kitchen'>('all');
  const isSavingRef = React.useRef(false); // Proteção contra polling
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Use Supabase hooks
  const { restaurant, updateRestaurant, refetch: refetchRestaurant } = useRestaurant(restaurantId);
  const {
    pedidos,
    dailyMetrics,
    loading: loadingPedidos,
    updatePedidoStatus,
    deletePedido,
    updateTablePedidosStatus,
    refetch: refetchPedidos
  } = usePedidos(restaurantId);
  const {
    produtos: produtosDb,
    addProduto,
    updateProduto,
    deleteProduto,
    refetch: refetchProdutos
  } = useProdutos(restaurantId);
  const {
    usuarios,
    addUsuario,
    updateUsuario,
    deleteUsuario,
    refetch: refetchUsuarios
  } = useUsuarios(restaurantId);

  const allowedContacts = useMemo(() => customers.map(c => ({ phone: c.phone, name: c.name })), [customers]);
  const mensagensData = useMensagens(allowedContacts);
  console.log('[AppContext] authorized contacts phones:', allowedContacts.slice(0, 2).map(c => c.phone));

  // Check for existing session on mount
  useEffect(() => {
    const storedId = localStorage.getItem('pedeai_restaurant_id');
    if (storedId) {
      setRestaurantId(storedId);
    }
    const adminAuth = localStorage.getItem('pedeai_admin_auth');
    if (adminAuth === 'true') {
      setIsAdminAuthenticated(true);
    }
    setLoadingData(false);
  }, []);

  // Poll for updates every 2 seconds
  useEffect(() => {
    if (!restaurantId) return;

    const interval = setInterval(() => {
      refetchPedidos({ silent: true });
      refetchProdutos({ silent: true });
      refetchUsuarios({ silent: true });

      // Só busca restaurante se não estiver salvando no momento
      if (!isSavingRef.current) {
        refetchRestaurant({ silent: true });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [restaurantId, refetchPedidos, refetchProdutos, refetchRestaurant]);

  // Sync restaurant data with settings
  useEffect(() => {
    if (restaurant) {
      setSettings(prev => ({
        ...prev,
        restaurantName: restaurant.nome || 'Meu Restaurante',
        totalTables: parseInt(restaurant.quantidade_mesas || '12', 10),
        kitchenClosingTime: restaurant.horario_fecha_cozinha || undefined,
        whatsappNumber: restaurant.telefone || '',
        openingTime: restaurant.horario_abertura || '11:00',
        closingTime: restaurant.horario_fechamento || '23:00',
        autoCloseTable: restaurant.fechar_mesa_auto ?? true,
        flashingEnabled: restaurant.alertas_piscantes ?? true,
        soundEnabled: restaurant.sons_habilitados ?? true,
        lowStockAlert: restaurant.alerta_estoque_baixo ?? 15,
        criticalStockAlert: restaurant.alerta_estoque_critico ?? 5,
        autoPrintEnabled: restaurant.impressao_auto ?? false,
      }));
    }
  }, [restaurant]);

  // Convert active pedidos to orders format for compatibility
  useEffect(() => {
    const activePedidos = pedidos.filter(p => p.status !== 'fechado');
    const convertedOrders: Order[] = activePedidos.map(p => ({
      id: p.id.toString(),
      tableId: p.mesa,
      items: p.itens.map((item, idx) => ({
        productId: `db-${p.id}-${idx}`,
        productName: item.nome,
        quantity: item.quantidade,
        price: item.preco,
        description: p.descricao,
      })),
      station: 'kitchen' as const,
      status: p.status === 'pendente' ? 'pending' as const :
        p.status === 'preparando' ? 'preparing' as const :
          p.status === 'pronto' ? 'ready' as const : 'delivered' as const,
      printStatus: 'printed' as const,
      createdAt: p.created_at,
    }));
    setOrders(convertedOrders);

    // Keep tables in sync with orders coming from the DB (e.g. WhatsApp bot)
    // Rule: table becomes occupied if there is at least one active (non-closed) pedido for it.
    const mesasComPedidos = new Set(activePedidos.map(p => p.mesa));
    const mesasComContaPedida = new Set(activePedidos.filter(p => p.status === 'pagamento_pendente').map(p => p.mesa));

    // Also sync table consumption from DB active pedidos (source of truth).
    const consumoPorMesa = new Map<number, OrderItem[]>();
    for (const pedido of activePedidos) {
      const tableId = pedido.mesa;
      const items = pedido.itens.map((it, idx) => ({
        productId: `db-${pedido.id}-${idx}`,
        productName: it.nome,
        quantity: it.quantidade,
        price: it.preco,
        description: pedido.descricao,
      }));
      consumoPorMesa.set(tableId, [...(consumoPorMesa.get(tableId) ?? []), ...items]);
    }

    setTables(prev =>
      prev.map(t => {
        const consumo = consumoPorMesa.get(t.id) ?? [];
        const shouldBeOccupied = mesasComPedidos.has(t.id) || consumo.length > 0;
        const hasBillRequested = mesasComContaPedida.has(t.id);

        // Check for waiter call in active pedidos (using status 'garcom_chamado' or 'garçom_chamado')
        const hasWaiterCall = activePedidos.some(p =>
          p.mesa === t.id &&
          (p.status === 'garcom_chamado' || p.status === 'garçom_chamado')
        );

        return {
          ...t,
          status: shouldBeOccupied ? 'occupied' : 'free',
          alert: hasWaiterCall ? 'waiter' : (hasBillRequested ? 'bill' : t.alert === 'bill' ? null : t.alert),
          consumption: consumo,
        };
      })
    );
  }, [pedidos]);

  // --- LOGICA DE IMPRESSÃO AUTOMÁTICA ---
  const printedOrdersRef = React.useRef<Set<number>>(new Set());
  const initialSyncDone = React.useRef(false);

  // Sincroniza o Ref inicial para evitar imprimir pedidos antigos ao carregar ou ligar o interruptor
  useEffect(() => {
    if (!initialSyncDone.current && pedidos.length > 0) {
      pedidos.forEach(p => {
        if (p.status === 'pendente' || p.status === 'preparando') {
          printedOrdersRef.current.add(p.id);
        }
      });
      initialSyncDone.current = true;
      console.log(`[AutoPrint] Ref inicial sincronizado com ${printedOrdersRef.current.size} pedidos existentes.`);
    }
  }, [pedidos]);

  useEffect(() => {
    if (!settings.autoPrintEnabled) return;

    // Filtra pedidos pendentes que ainda não foram impressos nesta sessão
    const newPendingOrders = pedidos.filter(p => {
      const isPending = p.status === 'pendente';
      const notPrintedYet = !printedOrdersRef.current.has(p.id);

      // Filtra pedidos que são apenas marcadores de abertura de mesa
      const isNotOnlyAtendimento = !p.itens.every(item =>
        item.nome.includes('Atendimento Iniciado') ||
        item.nome.includes('Mesa aberta')
      );

      return isPending && notPrintedYet && isNotOnlyAtendimento;
    });

    if (newPendingOrders.length > 0) {
      console.log(`[AutoPrint] Detectados ${newPendingOrders.length} novos pedidos.`);

      newPendingOrders.forEach(async (pedido) => {
        // Marcamos como impresso ANTES para evitar duplicidade em re-renders rápidos
        printedOrdersRef.current.add(pedido.id);

        console.log(`[AutoPrint] Imprimindo pedido #${pedido.id}...`);
        const success = await printViaWebBluetooth(pedido, settings.restaurantName);

        if (success) {
          toast.success(`Pedido #${pedido.id} impresso automaticamente!`);
        } else {
          console.warn(`[AutoPrint] Falha ao imprimir pedido #${pedido.id}. Certifique-se que a impressora está conectada.`);
        }
      });
    }
  }, [pedidos, settings.autoPrintEnabled, settings.restaurantName]);
  // --------------------------------------
  // --------------------------------------

  const generateTables = useCallback((count: number): Table[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      status: 'free' as const,
      alert: null,
      orders: [],
      consumption: [],
    }));
  }, []);

  const [tables, setTables] = useState<Table[]>(() => generateTables(settings.totalTables));

  // Update tables when settings change
  useEffect(() => {
    setTables(currentTables => {
      if (settings.totalTables > currentTables.length) {
        return [
          ...currentTables,
          ...Array.from({ length: settings.totalTables - currentTables.length }, (_, i) => ({
            id: currentTables.length + i + 1,
            status: 'free' as const,
            alert: null,
            orders: [],
            consumption: [],
          })),
        ];
      }
      return currentTables.slice(0, settings.totalTables);
    });
  }, [settings.totalTables]);

  // Login directly against Restaurantes table
  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    // Validate input
    const validation = validateLoginInput(email, password);
    if (!validation.isValid) {
      const errorMessage = validation.errors.email || validation.errors.password || 'Dados inválidos';
      return { success: false, error: errorMessage };
    }

    try {
      const { data, error } = await supabase
        .from('Restaurantes')
        .select('id, email, senha')
        .eq('email', email.trim())
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: 'Email ou senha inválidos' };
      }

      // Check password
      if (data.senha !== password) {
        return { success: false, error: 'Email ou senha inválidos' };
      }

      // Store session in localStorage
      localStorage.setItem('pedeai_restaurant_id', data.id);
      setRestaurantId(data.id);

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Erro ao realizar login. Tente novamente.' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pedeai_restaurant_id');
    setRestaurantId(null);
  }, []);

  const adminLogin = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase
        .from('Admin_acessos' as any)
        .select('*')
        .eq('email', email.trim())
        .maybeSingle();

      const adminData = data as any;

      if (error || !adminData) {
        return { success: false, error: 'Credenciais de administrador inválidas' };
      }

      if (adminData.senha !== password) {
        return { success: false, error: 'Credenciais de administrador inválidas' };
      }

      localStorage.setItem('pedeai_admin_auth', 'true');
      setIsAdminAuthenticated(true);
      return { success: true };
    } catch (err) {
      console.error('Admin login error:', err);
      return { success: false, error: 'Erro ao realizar login de administrador' };
    }
  }, []);

  const adminLogout = useCallback(() => {
    localStorage.removeItem('pedeai_admin_auth');
    setIsAdminAuthenticated(false);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const saveSettingsToSupabase = useCallback(async () => {
    // Mantido por compatibilidade, mas moveremos para updateAndSaveSetting
    return true;
  }, [restaurantId, settings]);

  const updateAndSaveSetting = useCallback(async (updates: Partial<Restaurant>) => {
    if (!restaurantId) return false;

    // 1. Bloqueia o polling
    isSavingRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    try {
      // 2. Atualiza localmente IMEDIATAMENTE (Otimista)
      setSettings(prev => ({
        ...prev,
        restaurantName: updates.nome !== undefined ? (updates.nome || '') : prev.restaurantName,
        totalTables: updates.quantidade_mesas !== undefined ? parseInt(updates.quantidade_mesas || '0') : prev.totalTables,
        kitchenClosingTime: updates.horario_fecha_cozinha !== undefined ? (updates.horario_fecha_cozinha || undefined) : prev.kitchenClosingTime,
        whatsappNumber: updates.telefone !== undefined ? (updates.telefone || '') : prev.whatsappNumber,
        openingTime: updates.horario_abertura !== undefined ? (updates.horario_abertura || '11:00') : prev.openingTime,
        closingTime: updates.horario_fechamento !== undefined ? (updates.horario_fechamento || '23:00') : prev.closingTime,
        autoCloseTable: updates.fechar_mesa_auto !== undefined ? !!updates.fechar_mesa_auto : prev.autoCloseTable,
        flashingEnabled: updates.alertas_piscantes !== undefined ? !!updates.alertas_piscantes : prev.flashingEnabled,
        soundEnabled: updates.sons_habilitados !== undefined ? !!updates.sons_habilitados : prev.soundEnabled,
        lowStockAlert: updates.alerta_estoque_baixo !== undefined ? (updates.alerta_estoque_baixo ?? 15) : prev.lowStockAlert,
        criticalStockAlert: updates.alerta_estoque_critico !== undefined ? (updates.alerta_estoque_critico ?? 5) : prev.criticalStockAlert,
        autoPrintEnabled: updates.impressao_auto !== undefined ? !!updates.impressao_auto : prev.autoPrintEnabled,
      }));

      // 3. Atualiza o banco
      const { error } = await supabase
        .from('Restaurantes')
        .update(updates)
        .eq('id', restaurantId);

      if (error) {
        console.error('Auto-save error:', error);
        toast.error(`Erro ao salvar: ${error.message}`);
        return false;
      }

      // 4. Atualiza o cache do hook useRestaurant
      await updateRestaurant(updates);

      return true;
    } catch (err) {
      console.error('Failed auto-save:', err);
      return false;
    } finally {
      // 5. Libera o polling após um breve delay para garantir propagação
      saveTimeoutRef.current = setTimeout(() => {
        isSavingRef.current = false;
      }, 3000);
    }
  }, [restaurantId, updateRestaurant]);


  // Sync products from Supabase
  useEffect(() => {
    const convertedProducts: Product[] = produtosDb.map(p => ({
      id: p.id.toString(),
      name: p.nome || '',
      price: parseFloat(p.preco || '0') || 0,
      category: p.categoria || 'Geral',
      station: (p.estacao as 'bar' | 'kitchen') || 'bar',
      stock: p.estoque || 0,
      isActive: p.ativo ?? true,
      minStock: p.estoque_minimo || 10,
      description: p.descricao || '',
    }));
    setProducts(convertedProducts);
  }, [produtosDb]);

  useEffect(() => {
    const convertedCustomers: Customer[] = usuarios.map(u => ({
      id: u.id.toString(),
      name: u.nome || '',
      phone: (u.telefone || '').replace(/\D/g, ''),
      email: '', // Not in Usuários table
      visits: parseInt(u.quantas_vezes_foi || '0', 10),
      lastVisit: new Date(u.created_at),
      totalSpent: 0, // Not in Usuários table
      tags: [], // Not in Usuários table
      notes: '', // Not in Usuários table
    }));
    setCustomers(convertedCustomers);
  }, [usuarios]);


  const addProduct = useCallback(async (product: Omit<Product, 'id'>) => {
    const success = await addProduto({
      nome: product.name,
      preco: product.price,
      categoria: product.category,
      estacao: product.station,
      estoque: product.stock,
      estoque_minimo: product.minStock,
      descricao: product.description,
      ativo: product.isActive,
    });
    if (success) {
      toast.success('Produto adicionado com sucesso!');
      return true;
    } else {
      toast.error('Erro ao adicionar produto');
      return false;
    }
  }, [addProduto]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.nome = updates.name;
    if (updates.price !== undefined) updateData.preco = updates.price;
    if (updates.category !== undefined) updateData.categoria = updates.category;
    if (updates.station !== undefined) updateData.estacao = updates.station;
    if (updates.stock !== undefined) updateData.estoque = updates.stock;
    if (updates.minStock !== undefined) updateData.estoque_minimo = updates.minStock;
    if (updates.description !== undefined) updateData.descricao = updates.description;
    if (updates.isActive !== undefined) updateData.ativo = updates.isActive;

    const success = await updateProduto(parseInt(id, 10), updateData);
    if (success) {
      // toast.success('Produto atualizado!'); // Comentado para não inundar de toasts em pedidos
      return true;
    } else {
      toast.error('Erro ao atualizar produto');
      return false;
    }
  }, [updateProduto]);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const success = await deleteProduto(parseInt(id));
      if (success) {
        toast.success('Produto removido!');
      } else {
        toast.error('Não foi possível excluir o produto. Verifique sua conexão.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao excluir produto.');
    }
  }, [deleteProduto]);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id'>) => {
    const success = await addUsuario({
      nome: customer.name,
      telefone: customer.phone,
    });
    if (success) {
      toast.success('Cliente adicionado com sucesso!');
    }
  }, [addUsuario]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.nome = updates.name;
    if (updates.phone !== undefined) updateData.phone = updates.phone;

    const success = await updateUsuario(parseInt(id, 10), updateData);
    if (success) {
      toast.success('Cliente atualizado!');
    }
  }, [updateUsuario]);

  const deleteCustomer = useCallback(async (id: string) => {
    const success = await deleteUsuario(parseInt(id, 10));
    if (success) {
      toast.success('Cliente removido!');
    }
  }, [deleteUsuario]);

  const addStockMovement = useCallback(async (movement: Omit<StockMovement, 'id' | 'date'>, skipDbUpdate = false) => {
    const product = products.find(p => p.id === movement.productId);
    if (!product) {
      toast.error('Produto não encontrado');
      return;
    }

    const stockChange = movement.type === 'in' ? movement.quantity : -movement.quantity;
    const newStock = Math.max(0, (product.stock || 0) + stockChange);

    try {
      let success = true;
      if (!skipDbUpdate) {
        success = await updateProduct(movement.productId, { stock: newStock });
      }

      if (success) {
        const newMovement: StockMovement = {
          ...movement,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          date: new Date(),
        };
        setStockMovements(prev => [newMovement, ...prev]);
        if (!skipDbUpdate) {
          toast.success(`Estoque atualizado: ${movement.type === 'in' ? '+' : '-'}${movement.quantity}`);
        }
      }
    } catch (error) {
      toast.error('Erro ao atualizar estoque no banco de dados');
    }
  }, [products, updateProduct]);

  const addCampaign = useCallback((campaign: Omit<Campaign, 'id'>) => {
    const newCampaign = { ...campaign, id: Date.now().toString() };
    setCampaigns(prev => [...prev, newCampaign]);
  }, []);

  const updateCampaign = useCallback((id: string, updates: Partial<Campaign>) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  }, []);

  const addOrder = useCallback(async (tableId: number, items: OrderItem[], station: 'bar' | 'kitchen') => {
    if (!restaurantId) {
      console.error('No restaurant ID available');
      return;
    }

    try {
      // Consolidate optional description (DB has a single `descricao` field)
      const descricao = items
        .map(i => i.description?.toString().trim())
        .filter(Boolean)
        .join(' | ')
        .slice(0, 500);

      // Calculate subtotal
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Get product names (comma separated if multiple)
      const productNames = items.map(item => item.productName).join(', ');

      // Get total quantity
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // Format subtotal as R$ X,XX
      const formattedSubtotal = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

      // Insert into Supabase
      const { data, error } = await supabase
        .from('Pedidos')
        .insert({
          mesa: tableId.toString(),
          itens: productNames,
          quantidade: totalQuantity.toString(),
          Subtotal: formattedSubtotal,
          status: 'pendente',
          restaurante_id: restaurantId,
          descricao: descricao || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting order:', error);
        throw error;
      }

      // Update table status locally after successful insert
      setTables(prev => prev.map(t =>
        t.id === tableId
          ? { ...t, status: 'occupied', consumption: [...t.consumption, ...items] }
          : t
      ));

      console.log('Order created successfully:', data);
    } catch (err) {
      console.error('Failed to create order:', err);
    }
  }, [restaurantId, products, updateProduct, addStockMovement]);

  const requestBill = useCallback(async (tableId: number) => {
    if (!restaurantId) return;

    try {
      // Optimistic update
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, alert: 'bill' } : t));

      // Update all orders for this table to 'pagamento_pendente'
      const { error } = await supabase
        .from('Pedidos')
        .update({ status: 'pagamento_pendente' })
        .eq('restaurante_id', restaurantId)
        .eq('mesa', tableId.toString());

      if (error) throw error;

      toast.info(`Imprimindo conta da mesa ${tableId}...`, {
        icon: '🖨️',
      });

      // Silent refetch to sync
      refetchPedidos({ silent: true });
    } catch (err) {
      console.error('Error requesting bill:', err);
      toast.error('Erro ao solicitar conta');
    }
  }, [restaurantId, refetchPedidos]);

  const deliverOrder = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setUndoAction({ type: 'deliver_order', data: order, timestamp: Date.now() });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
  }, [orders]);

  const reprintOrder = useCallback(async (orderId: string) => {
    const pedido = pedidos.find(p => p.id === parseInt(orderId));
    if (pedido) {
      toast.info('Enviando para impressora Bluetooth...');
      const success = await printViaWebBluetooth(pedido, settings.restaurantName);
      if (success) {
        toast.success('Re-imprimindo pedido...');
      } else {
        toast.error('Falha ao imprimir. A impressora está conectada?');
      }
    } else {
      toast.error('Pedido não encontrado para re-impressão');
    }
  }, [pedidos, settings.restaurantName]);

  const updateTableAlert = useCallback((tableId: number, alert: 'waiter' | 'bill' | null) => {
    const table = tables.find(t => t.id === tableId);
    if (table && table.alert && alert === null) {
      setUndoAction({ type: 'resolve_alert', data: { tableId, previousAlert: table.alert }, timestamp: Date.now() });
    }
    setTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, alert } : t
    ));
  }, [tables]);

  const closeTable = useCallback((tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (table) {
      setUndoAction({ type: 'close_table', data: table, timestamp: Date.now() });
      setTables(prev => prev.map(t =>
        t.id === tableId
          ? { ...t, status: 'free', alert: null, orders: [], consumption: [] }
          : t
      ));
      setOrders(prev => prev.filter(o => o.tableId !== tableId));

      // Mudar status para 'fechado' em vez de deletar para manter histórico.
      if (restaurantId) {
        updateTablePedidosStatus(tableId, 'fechado');
      }
    }
  }, [tables, restaurantId]);

  const addItemToTable = useCallback(async (tableId: number, item: OrderItem) => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      await addOrder(tableId, [item], product.station);
    } else {
      await addOrder(tableId, [item], 'kitchen');
    }
  }, [products, addOrder]);

  const performUndo = useCallback(() => {
    if (!undoAction) return;

    switch (undoAction.type) {
      case 'deliver_order':
        setOrders(prev => [...prev, undoAction.data]);
        break;
      case 'close_table':
        setTables(prev => prev.map(t =>
          t.id === undoAction.data.id ? undoAction.data : t
        ));
        break;
      case 'resolve_alert':
        setTables(prev => prev.map(t =>
          t.id === undoAction.data.tableId ? { ...t, alert: undoAction.data.previousAlert } : t
        ));
        break;
    }
    setUndoAction(null);
  }, [undoAction]);

  const clearUndo = useCallback(() => {
    setUndoAction(null);
  }, []);

  const contextValue = useMemo(() => ({
    isAuthenticated,
    isAdminAuthenticated,
    restaurantId,
    login,
    logout,
    adminLogin,
    adminLogout,
    tables,
    settings,
    updateSettings,
    saveSettingsToSupabase,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    addOrder,
    deliverOrder,
    reprintOrder,
    updateTableAlert,
    closeTable,
    addItemToTable,
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    stockMovements,
    addStockMovement,
    campaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    restaurant,
    undoAction,
    performUndo,
    clearUndo,
    filter,
    setFilter,
    loadingData,
    pedidos,
    updatePedidoStatus,
    deletePedido,
    dailyMetrics,
    loadingPedidos,
    requestBill,
    mensagens: mensagensData,
    updateAndSaveSetting,
    refetchUsuarios,
  }), [
    isAuthenticated,
    isAdminAuthenticated,
    restaurantId,
    login,
    logout,
    adminLogin,
    adminLogout,
    tables,
    settings,
    updateSettings,
    saveSettingsToSupabase,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    addOrder,
    deliverOrder,
    reprintOrder,
    updateTableAlert,
    closeTable,
    addItemToTable,
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    stockMovements,
    addStockMovement,
    campaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    restaurant,
    undoAction,
    performUndo,
    clearUndo,
    filter,
    setFilter,
    loadingData,
    pedidos,
    updatePedidoStatus,
    deletePedido,
    dailyMetrics,
    loadingPedidos,
    requestBill,
    mensagensData,
    updateAndSaveSetting,
    refetchUsuarios,
  ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
