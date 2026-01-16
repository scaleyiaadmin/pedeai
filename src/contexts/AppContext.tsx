import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  station: 'bar' | 'kitchen';
  stock: number;
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
  visits: number;
  lastVisit: Date;
}

interface UndoAction {
  type: 'deliver_order' | 'close_table' | 'resolve_alert';
  data: any;
  timestamp: number;
}

interface AppSettings {
  totalTables: number;
  flashingEnabled: boolean;
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
  undoAction: UndoAction | null;
  performUndo: () => void;
  clearUndo: () => void;
  filter: 'all' | 'bar' | 'kitchen';
  setFilter: (filter: 'all' | 'bar' | 'kitchen') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialProducts: Product[] = [
  { id: '1', name: 'Cerveja Pilsen', price: 12.00, category: 'Bebidas', station: 'bar', stock: 100 },
  { id: '2', name: 'Caipirinha', price: 18.00, category: 'Bebidas', station: 'bar', stock: 50 },
  { id: '3', name: 'Água Mineral', price: 5.00, category: 'Bebidas', station: 'bar', stock: 80 },
  { id: '4', name: 'Picanha Grelhada', price: 89.00, category: 'Pratos', station: 'kitchen', stock: 20 },
  { id: '5', name: 'Fritas Especiais', price: 28.00, category: 'Porções', station: 'kitchen', stock: 30 },
  { id: '6', name: 'Salada Caesar', price: 35.00, category: 'Saladas', station: 'kitchen', stock: 25 },
];

const initialCustomers: Customer[] = [
  { id: '1', name: 'João Silva', phone: '(11) 99999-1234', visits: 12, lastVisit: new Date('2024-01-10') },
  { id: '2', name: 'Maria Santos', phone: '(11) 98888-5678', visits: 8, lastVisit: new Date('2024-01-12') },
  { id: '3', name: 'Carlos Oliveira', phone: '(11) 97777-9012', visits: 5, lastVisit: new Date('2024-01-08') },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ totalTables: 12, flashingEnabled: true });
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [customers] = useState<Customer[]>(initialCustomers);
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

  // Generate some initial sample orders
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

    // Deduct stock
    items.forEach(item => {
      setProducts(prev => prev.map(p => 
        p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p
      ));
    });
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
