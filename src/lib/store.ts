'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SETTINGS, type Product, type User, type Driver, type AppSettings } from './data';
import { round2, calcTax } from './utils';
import { api, setToken, getToken } from './api';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  cost: number;
  qty: number;
}

export interface Transaction {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  method: string;
  cashReceived: number;
  cashAmount: number;
  qrAmount: number;
  change: number;
  attendedBy: string;
  userId: string;
  orderId?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export interface Order {
  id: string;
  date: string;
  clientName: string;
  clientPhone: string;
  clientZone: string;
  clientAddr: string;
  notes: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  deliveryType: 'delivery' | 'pickup';
  transportType: 'incluido' | 'pago_entrega' | 'sin_envio';
  transportCost: number;
  driverId: string | null;
  status: 'pendiente' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';
  attendedBy: string;
  userId: string;
}

interface StoreState {
  products: Product[];
  drivers: Driver[];
  cart: CartItem[];
  transactions: Transaction[];
  expenses: Expense[];
  orders: Order[];
  employees: User[];
  settings: AppSettings;
  currentUser: User | null;
  currentView: string;
  saleType: 'site' | 'delivery';
  posCategory: string;
  posSearch: string;
  loading: boolean;
  apiError: string | null;

  loginWithPassword: (id: string, password: string) => Promise<void>;
  logout: () => void;
  loadData: () => Promise<void>;
  setView: (view: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  addEmployee: (e: Omit<User, 'id'> & { password?: string }) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<User> & { password?: string }) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  setSaleType: (type: 'site' | 'delivery') => void;
  setPosCategory: (cat: string) => void;
  setPosSearch: (s: string) => void;
  clearApiError: () => void;

  addToCart: (productId: number) => void;
  updateCartQty: (idx: number, delta: number) => void;
  removeFromCart: (idx: number) => void;
  clearCart: () => void;

  processPayment: (method: string, cashReceived: number, cashAmount: number, qrAmount: number) => Promise<Transaction>;
  processDelivery: (
    client: { name: string; phone: string; zone: string; addr: string; notes: string },
    transportType: 'incluido' | 'pago_entrega' | 'sin_envio',
    transportCost: number,
    driverId: string
  ) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;

  updateProduct: (id: number, updates: Partial<Product>) => Promise<void>;
  addProduct: (p: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  addStock: (id: number, qty: number) => Promise<void>;

  addExpense: (e: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: [],
      drivers: [],
      cart: [],
      transactions: [],
      expenses: [],
      orders: [],
      employees: [],
      settings: { ...DEFAULT_SETTINGS },
      currentUser: null,
      currentView: 'pos',
      saleType: 'site',
      posCategory: 'Todos',
      posSearch: '',
      loading: false,
      apiError: null,

      loginWithPassword: async (id, password) => {
        set({ loading: true, apiError: null });
        try {
          const { token, user } = await api.auth.login(id, password);
          setToken(token);
          const u: User = {
            id: user.id, name: user.name,
            role: user.role as 'owner' | 'vendedora',
            avatar: user.avatar, color: user.color,
            canDashboard: !!user.can_dashboard,
          };
          set({ currentUser: u, loading: false });
          await get().loadData();
        } catch (err: any) {
          set({ loading: false, apiError: err.message || 'Error de autenticacion' });
          throw err;
        }
      },

      logout: () => {
        setToken(null);
        set({
          currentUser: null, products: [], drivers: [], cart: [],
          transactions: [], expenses: [], orders: [], employees: [],
          currentView: 'pos', saleType: 'site', posCategory: 'Todos', posSearch: '',
        });
      },

      loadData: async () => {
        set({ loading: true });
        try {
          const [products, drivers, orders, expenses, employees, transactions] = await Promise.all([
            api.products.list(),
            api.drivers.list(),
            api.orders.list(),
            api.expenses.list(),
            api.users.list(),
            api.transactions.list({ limit: '200' }),
          ]);
          set({
            products: products.map((p: any) => ({ ...p, id: Number(p.id), price: +p.price, cost: +p.cost, stock: +p.stock })),
            drivers,
            orders: orders.map(mapOrder),
            expenses: expenses.map((e: any) => ({ ...e, amount: +e.amount })),
            employees: employees.map(mapUser),
            transactions: transactions.map((t: any) => ({
              id: t.id, date: String(t.date), items: [],
              subtotal: +t.subtotal, tax: +t.tax, total: +t.total,
              method: t.method, cashReceived: +t.cash_received || 0,
              cashAmount: +t.cash_amount || 0, qrAmount: +t.qr_amount || 0,
              change: +t.change_amount || 0,
              attendedBy: t.attended_by || '', userId: t.user_id || '',
              orderId: t.order_id || undefined,
            })),
            loading: false,
          });
        } catch (err: any) {
          set({ loading: false, apiError: err.message });
        }
      },

      setView: (view) => set({ currentView: view }),
      updateSettings: (updates) => set({ settings: { ...get().settings, ...updates } }),
      clearApiError: () => set({ apiError: null }),

      addEmployee: async (e) => {
        const id = (e.firstName || 'emp').toLowerCase().replace(/\s+/g, '') + Date.now().toString(36);
        await api.users.add({ ...e, id, name: e.name || `${e.firstName} ${e.lastName}`.trim() });
        const users = await api.users.list();
        set({ employees: users.map(mapUser) });
      },
      updateEmployee: async (id, updates) => {
        await api.users.update(id, updates);
        const users = await api.users.list();
        set({ employees: users.map(mapUser) });
        if (get().currentUser?.id === id) {
          const updated = users.map(mapUser).find(u => u.id === id);
          if (updated) set({ currentUser: updated });
        }
      },
      deleteEmployee: async (id) => {
        await api.users.delete(id);
        set({ employees: get().employees.map(e => e.id === id ? { ...e, active: false } : e) });
      },

      setSaleType: (type) => set({ saleType: type }),
      setPosCategory: (cat) => set({ posCategory: cat }),
      setPosSearch: (s) => set({ posSearch: s }),

      addToCart: (productId) => {
        const { products, cart } = get();
        const p = products.find(x => x.id === productId);
        if (!p || p.stock === 0) return;
        const existing = cart.find(c => c.productId === productId);
        if (existing) {
          if (existing.qty >= p.stock) return;
          set({ cart: cart.map(c => c.productId === productId ? { ...c, qty: c.qty + 1 } : c) });
        } else {
          set({ cart: [...cart, { productId: p.id, name: p.name, price: p.price, cost: p.cost, qty: 1 }] });
        }
      },
      updateCartQty: (idx, delta) => {
        const { cart, products } = get();
        const item = cart[idx];
        if (!item) return;
        const newQty = item.qty + delta;
        if (newQty <= 0) {
          set({ cart: cart.filter((_, i) => i !== idx) });
        } else {
          const p = products.find(x => x.id === item.productId);
          if (p && newQty > p.stock) return;
          set({ cart: cart.map((c, i) => i === idx ? { ...c, qty: newQty } : c) });
        }
      },
      removeFromCart: (idx) => set({ cart: get().cart.filter((_, i) => i !== idx) }),
      clearCart: () => set({ cart: [], saleType: 'site' }),

      processPayment: async (method, cashReceived, cashAmount, qrAmount) => {
        const { cart, currentUser } = get();
        const subtotal = round2(cart.reduce((s, c) => s + c.price * c.qty, 0));
        const tax = calcTax(subtotal);
        const total = round2(subtotal + tax);
        const items = cart.map(c => ({ product_id: c.productId, product_name: c.name, price: c.price, cost: c.cost, qty: c.qty }));
        const result = await api.transactions.create({
          items, method, cash_received: cashReceived, cash_amount: cashAmount,
          qr_amount: qrAmount, attended_by: currentUser?.name || '',
        });
        const tx: Transaction = {
          id: result.id, date: new Date().toISOString(),
          items: cart.map(c => ({ ...c })),
          subtotal: result.subtotal, tax: result.tax, total: result.total,
          method, cashReceived, cashAmount, qrAmount,
          change: result.change_amount, attendedBy: currentUser?.name || '', userId: currentUser?.id || '',
        };
        // Optimistically update local stock
        const newProducts = get().products.map(p => {
          const ci = cart.find(c => c.productId === p.id);
          return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p;
        });
        set({ transactions: [tx, ...get().transactions], cart: [], saleType: 'site', products: newProducts });
        return tx;
      },

      processDelivery: async (client, transportType, transportCost, driverId) => {
        const { cart, currentUser } = get();
        const subtotal = round2(cart.reduce((s, c) => s + c.price * c.qty, 0));
        const tax = calcTax(subtotal);
        const showTransport = transportType === 'incluido';
        const total = round2(subtotal + tax + (showTransport ? transportCost : 0));
        const items = cart.map(c => ({ product_id: c.productId, product_name: c.name, price: c.price, cost: c.cost, qty: c.qty }));
        const result = await api.orders.create({
          items, client_name: client.name, client_phone: client.phone,
          client_zone: client.zone, client_addr: client.addr, notes: client.notes,
          transport_type: transportType, transport_cost: transportCost,
          driver_id: driverId, attended_by: currentUser?.name || '',
        });
        const order: Order = {
          id: result.id, date: new Date().toISOString(),
          clientName: client.name, clientPhone: client.phone, clientZone: client.zone,
          clientAddr: client.addr, notes: client.notes,
          items: cart.map(c => ({ ...c })), subtotal, tax, total,
          deliveryType: 'delivery', transportType, transportCost,
          driverId, status: 'pendiente',
          attendedBy: currentUser?.name || '', userId: currentUser?.id || '',
        };
        const newProducts = get().products.map(p => {
          const ci = cart.find(c => c.productId === p.id);
          return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p;
        });
        set({ orders: [order, ...get().orders], cart: [], saleType: 'site', products: newProducts });
        return order;
      },

      updateOrderStatus: async (orderId, status) => {
        await api.orders.updateStatus(orderId, status);
        const newOrders = get().orders.map(o => o.id === orderId ? { ...o, status } : o);
        if (status === 'entregado') {
          const o = get().orders.find(x => x.id === orderId);
          if (o) {
            const tx: Transaction = {
              id: `T-${Date.now()}`, date: new Date().toISOString(),
              items: o.items.map(c => ({ ...c })), subtotal: o.subtotal, tax: o.tax, total: o.total,
              method: 'QR', cashReceived: o.total, cashAmount: 0, qrAmount: o.total, change: 0,
              attendedBy: o.attendedBy, userId: o.userId, orderId: o.id,
            };
            set({ orders: newOrders, transactions: [tx, ...get().transactions] });
            return;
          }
        }
        set({ orders: newOrders });
      },

      updateProduct: async (id, updates) => {
        await api.products.update(id, updates);
        set({ products: get().products.map(p => p.id === id ? { ...p, ...updates } : p) });
      },
      addProduct: async (p) => {
        const result = await api.products.add(p);
        set({ products: [...get().products, { ...p, id: result.id }] });
      },
      deleteProduct: async (id) => {
        await api.products.delete(id);
        set({ products: get().products.filter(p => p.id !== id) });
      },
      addStock: async (id, qty) => {
        await api.products.stock(id, qty);
        set({ products: get().products.map(p => p.id === id ? { ...p, stock: p.stock + qty } : p) });
      },

      addExpense: async (e) => {
        const result = await api.expenses.add(e);
        set({ expenses: [{ ...e, id: result.id }, ...get().expenses] });
      },
      updateExpense: async (id, updates) => {
        await api.expenses.update(id, updates);
        set({ expenses: get().expenses.map(e => e.id === id ? { ...e, ...updates } : e) });
      },
      deleteExpense: async (id) => {
        await api.expenses.delete(id);
        set({ expenses: get().expenses.filter(e => e.id !== id) });
      },
    }),
    {
      name: 'pos-paolitas-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        settings: state.settings,
        currentView: state.currentView,
      }),
    }
  )
);

function mapUser(u: any): User {
  return {
    id: u.id, name: u.name,
    role: u.role as 'owner' | 'vendedora',
    avatar: u.avatar, color: u.color,
    canDashboard: !!u.canDashboard,
    active: u.active !== false,
    firstName: u.firstName || '', lastName: u.lastName || '',
    phone: u.phone || '', documentNumber: u.documentNumber || '', address: u.address || '',
  };
}

function mapOrder(o: any): Order {
  return {
    id: o.id, date: String(o.date),
    clientName: o.client_name || '', clientPhone: o.client_phone || '',
    clientZone: o.client_zone || '', clientAddr: o.client_addr || '', notes: o.notes || '',
    items: (o.items || []).map((i: any) => ({ productId: i.productId, name: i.name, price: +i.price, cost: +i.cost, qty: i.qty })),
    subtotal: +o.subtotal, tax: +o.tax, total: +o.total,
    deliveryType: 'delivery',
    transportType: o.transport_type || 'incluido',
    transportCost: +o.transport_cost || 0,
    driverId: o.driver_id || null,
    status: o.status || 'pendiente',
    attendedBy: o.attended_by || '', userId: o.user_id || '',
  };
}
