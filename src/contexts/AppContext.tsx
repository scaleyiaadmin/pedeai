import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { usePedidos } from '@/hooks/usePedidos';
import { validateLoginInput } from '@/lib/auth-validation';

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
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AppContextType {
  isAuthenticated: boolean;
  restaurantId: string | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  tables: Table[];
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  saveSettingsToSupabase: () => Promise<void>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  orders: Order[];
  addOrder: (tableId: number, items: OrderItem[], station: 'bar' | 'kitchen') => void;
  deliverOrder: (orderId: string) => void;
  reprintOrder: (orderId: string) => void;
  updateTableAlert: (tableId: number, alert: 'waiter' | 'bill' | null) => void;
  closeTable: (tableId: number) => void;
  addItemToTable: (tableId: number, item: OrderItem) => void;
  customers: Customer[];
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialPrinters: Printer[] = [
  { id: '1', name: 'Impressora Bar', type: 'bar', ipAddress: '192.168.1.100', isActive: true },
  { id: '2', name: 'Impressora Cozinha', type: 'kitchen', ipAddress: '192.168.1.101', isActive: true },
  { id: '3', name: 'Impressora Caixa', type: 'receipt', ipAddress: '192.168.1.102', isActive: true },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [restaurantId, setRestaurantId] = useState<string | null>(() => {
    // Check localStorage for existing session
    return localStorage.getItem('pedeai_restaurant_id');
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
  });

  // Empty initial states - no mock data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [filter, setFilter] = useState<'all' | 'bar' | 'kitchen'>('all');

  // Use Supabase hooks
  const { restaurant, updateRestaurant } = useRestaurant(restaurantId);
  const { pedidos, dailyMetrics } = usePedidos(restaurantId);

  // Check for existing session on mount
  useEffect(() => {
    const storedId = localStorage.getItem('pedeai_restaurant_id');
    if (storedId) {
      setRestaurantId(storedId);
    }
    setLoadingData(false);
  }, []);

  // Sync restaurant data with settings
  useEffect(() => {
    if (restaurant) {
      setSettings(prev => ({
        ...prev,
        restaurantName: restaurant.nome || 'Meu Restaurante',
        totalTables: parseInt(restaurant.quantidade_mesas || '12', 10),
        kitchenClosingTime: restaurant.horario_fecha_cozinha || undefined,
        whatsappNumber: restaurant.telefone || '',
      }));
    }
  }, [restaurant]);

  // Convert pedidos to orders format for compatibility
  useEffect(() => {
    const convertedOrders: Order[] = pedidos.map(p => ({
      id: p.id.toString(),
      tableId: p.mesa,
      items: p.itens.map((item, idx) => ({
        productId: `db-${p.id}-${idx}`,
        productName: item.nome,
        quantity: item.quantidade,
        price: item.preco,
      })),
      station: 'kitchen' as const,
      status: p.status === 'pendente' ? 'pending' as const : 
              p.status === 'preparando' ? 'preparing' as const :
              p.status === 'pronto' ? 'ready' as const : 'delivered' as const,
      printStatus: 'printed' as const,
      createdAt: p.created_at,
    }));
    setOrders(convertedOrders);
  }, [pedidos]);

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

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
  }, []);

  const saveSettingsToSupabase = useCallback(async () => {
    if (!restaurantId) return;

    await updateRestaurant({
      nome: settings.restaurantName,
      quantidade_mesas: settings.totalTables.toString(),
      horario_fecha_cozinha: settings.kitchenClosingTime || null,
      telefone: settings.whatsappNumber || null,
    });
  }, [restaurantId, settings, updateRestaurant]);

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: Date.now().toString() };
    setProducts(prev => [...prev, newProduct]);
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const addCustomer = useCallback((customer: Omit<Customer, 'id'>) => {
    const newCustomer = { ...customer, id: Date.now().toString() };
    setCustomers(prev => [...prev, newCustomer]);
  }, []);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  const addStockMovement = useCallback((movement: Omit<StockMovement, 'id' | 'date'>) => {
    const newMovement: StockMovement = {
      ...movement,
      id: Date.now().toString(),
      date: new Date(),
    };
    setStockMovements(prev => [newMovement, ...prev]);
    
    setProducts(prev => prev.map(p => {
      if (p.id === movement.productId) {
        const stockChange = movement.type === 'in' ? movement.quantity : -movement.quantity;
        return { ...p, stock: Math.max(0, p.stock + stockChange) };
      }
      return p;
    }));
  }, []);

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

  const addOrder = useCallback((tableId: number, items: OrderItem[], station: 'bar' | 'kitchen') => {
    const newOrder: Order = {
      id: Date.now().toString(),
      tableId,
      items,
      station,
      status: 'pending',
      printStatus: 'printed',
      createdAt: new Date(),
    };
    
    setOrders(prev => [...prev, newOrder]);
    setTables(prev => prev.map(t => 
      t.id === tableId 
        ? { ...t, status: 'occupied', orders: [...t.orders, newOrder], consumption: [...t.consumption, ...items] }
        : t
    ));
  }, []);

  const deliverOrder = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setUndoAction({ type: 'deliver_order', data: order, timestamp: Date.now() });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
  }, [orders]);

  const reprintOrder = useCallback((orderId: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, printStatus: 'printed' } : o
    ));
  }, []);

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
    }
  }, [tables]);

  const addItemToTable = useCallback((tableId: number, item: OrderItem) => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      addOrder(tableId, [item], product.station);
    } else {
      addOrder(tableId, [item], 'kitchen');
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

  return (
    <AppContext.Provider value={{
      isAuthenticated,
      restaurantId,
      login,
      logout,
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
      undoAction,
      performUndo,
      clearUndo,
      filter,
      setFilter,
      loadingData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
