import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

interface AppContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;
  register: (restaurantName: string, email: string, password: string) => void;
  logout: () => void;
  tables: Table[];
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialProducts: Product[] = [
  { id: '1', name: 'Cerveja Pilsen', price: 12.00, category: 'Bebidas', station: 'bar', stock: 100, isActive: true, minStock: 20, costPrice: 5.00, description: 'Cerveja gelada 600ml' },
  { id: '2', name: 'Caipirinha', price: 18.00, category: 'Bebidas', station: 'bar', stock: 50, isActive: true, minStock: 10, costPrice: 6.00, description: 'Caipirinha de limão tradicional' },
  { id: '3', name: 'Água Mineral', price: 5.00, category: 'Bebidas', station: 'bar', stock: 80, isActive: true, minStock: 30, costPrice: 1.50 },
  { id: '4', name: 'Picanha Grelhada', price: 89.00, category: 'Pratos', station: 'kitchen', stock: 20, isActive: true, minStock: 5, costPrice: 45.00, description: 'Picanha 400g com acompanhamentos' },
  { id: '5', name: 'Fritas Especiais', price: 28.00, category: 'Porções', station: 'kitchen', stock: 30, isActive: true, minStock: 10, costPrice: 8.00 },
  { id: '6', name: 'Salada Caesar', price: 35.00, category: 'Saladas', station: 'kitchen', stock: 25, isActive: true, minStock: 8, costPrice: 12.00 },
];

const initialCustomers: Customer[] = [
  { id: '1', name: 'João Silva', phone: '(11) 99999-1234', email: 'joao@email.com', visits: 12, lastVisit: new Date('2024-01-10'), totalSpent: 890.00, tags: ['VIP', 'Frequente'], notes: 'Prefere mesa próxima à janela' },
  { id: '2', name: 'Maria Santos', phone: '(11) 98888-5678', email: 'maria@email.com', visits: 8, lastVisit: new Date('2024-01-12'), totalSpent: 520.00, tags: ['Frequente'], birthday: new Date('1990-05-15') },
  { id: '3', name: 'Carlos Oliveira', phone: '(11) 97777-9012', visits: 5, lastVisit: new Date('2024-01-08'), totalSpent: 280.00, tags: ['Novo'] },
];

const initialCampaigns: Campaign[] = [
  { id: '1', name: 'Promoção Happy Hour', message: 'Aproveite 50% de desconto em drinks das 17h às 19h!', targetTags: ['Frequente'], status: 'sent', sentCount: 45 },
  { id: '2', name: 'Aniversariantes do Mês', message: 'Parabéns! Ganhe uma sobremesa grátis no seu aniversário!', targetTags: ['VIP'], status: 'scheduled', scheduledDate: new Date('2024-02-01') },
];

const initialStockMovements: StockMovement[] = [
  { id: '1', productId: '1', productName: 'Cerveja Pilsen', type: 'in', quantity: 50, reason: 'Reposição de estoque', date: new Date('2024-01-10') },
  { id: '2', productId: '4', productName: 'Picanha Grelhada', type: 'out', quantity: 5, reason: 'Vendas do dia', date: new Date('2024-01-11') },
];

const initialPrinters: Printer[] = [
  { id: '1', name: 'Impressora Bar', type: 'bar', ipAddress: '192.168.1.100', isActive: true },
  { id: '2', name: 'Impressora Cozinha', type: 'kitchen', ipAddress: '192.168.1.101', isActive: true },
  { id: '3', name: 'Impressora Caixa', type: 'receipt', ipAddress: '192.168.1.102', isActive: true },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(initialStockMovements);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [filter, setFilter] = useState<'all' | 'bar' | 'kitchen'>('all');

  const generateTables = useCallback((count: number): Table[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      status: Math.random() > 0.6 ? 'occupied' : 'free',
      alert: Math.random() > 0.85 ? (Math.random() > 0.5 ? 'waiter' : 'bill') : null,
      orders: [],
      consumption: [],
    }));
  }, []);

  const [tables, setTables] = useState<Table[]>(() => generateTables(settings.totalTables));

  const [orders, setOrders] = useState<Order[]>(() => {
    const sampleOrders: Order[] = [
      {
        id: '1',
        tableId: 3,
        items: [{ productId: '1', productName: 'Cerveja Pilsen', quantity: 3, price: 12.00 }],
        station: 'bar',
        status: 'pending',
        printStatus: 'printed',
        createdAt: new Date(),
      },
      {
        id: '2',
        tableId: 5,
        items: [
          { productId: '4', productName: 'Picanha Grelhada', quantity: 2, price: 89.00 },
          { productId: '5', productName: 'Fritas Especiais', quantity: 1, price: 28.00 },
        ],
        station: 'kitchen',
        status: 'pending',
        printStatus: 'printed',
        createdAt: new Date(),
      },
      {
        id: '3',
        tableId: 7,
        items: [{ productId: '2', productName: 'Caipirinha', quantity: 2, price: 18.00 }],
        station: 'bar',
        status: 'pending',
        printStatus: 'printed',
        createdAt: new Date(),
      },
      {
        id: '4',
        tableId: 2,
        items: [{ productId: '6', productName: 'Salada Caesar', quantity: 1, price: 35.00 }],
        station: 'kitchen',
        status: 'pending',
        printStatus: 'error',
        createdAt: new Date(),
      },
    ];
    return sampleOrders;
  });

  const login = useCallback((email: string, password: string) => {
    if (email && password) {
      setIsAuthenticated(true);
    }
  }, []);

  const register = useCallback((restaurantName: string, email: string, password: string) => {
    if (restaurantName && email && password) {
      setSettings(prev => ({ ...prev, restaurantName }));
      setIsAuthenticated(true);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.totalTables && newSettings.totalTables !== prev.totalTables) {
        setTables(currentTables => {
          if (newSettings.totalTables! > currentTables.length) {
            return [
              ...currentTables,
              ...Array.from({ length: newSettings.totalTables! - currentTables.length }, (_, i) => ({
                id: currentTables.length + i + 1,
                status: 'free' as const,
                alert: null,
                orders: [],
                consumption: [],
              })),
            ];
          }
          return currentTables.slice(0, newSettings.totalTables);
        });
      }
      return updated;
    });
  }, []);

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
    
    // Update product stock
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
      printStatus: Math.random() > 0.2 ? 'printed' : 'error',
      createdAt: new Date(),
    };
    
    setOrders(prev => [...prev, newOrder]);
    setTables(prev => prev.map(t => 
      t.id === tableId 
        ? { ...t, status: 'occupied', orders: [...t.orders, newOrder], consumption: [...t.consumption, ...items] }
        : t
    ));

    // Deduct stock and record movement
    items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        setProducts(prev => prev.map(p => 
          p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
        ));
        setStockMovements(prev => [{
          id: Date.now().toString() + item.productId,
          productId: item.productId,
          productName: item.productName,
          type: 'out',
          quantity: item.quantity,
          reason: `Pedido Mesa ${tableId}`,
          date: new Date(),
        }, ...prev]);
      }
    });
  }, [products]);

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
      login,
      register,
      logout,
      tables,
      settings,
      updateSettings,
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
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
