'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PRODUCTS, DRIVERS, type Product, type User, type Driver } from './data';
import { round2, calcTax, calcTotal, rand } from './utils';

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
  cart: CartItem[];
  transactions: Transaction[];
  expenses: Expense[];
  orders: Order[];
  currentUser: User | null;
  currentView: string;
  saleType: 'site' | 'delivery';
  posCategory: string;
  posSearch: string;
  nextTicket: number;
  nextOrder: number;
  initialized: boolean;

  login: (user: User) => void;
  logout: () => void;
  setView: (view: string) => void;
  setSaleType: (type: 'site' | 'delivery') => void;
  setPosCategory: (cat: string) => void;
  setPosSearch: (s: string) => void;

  addToCart: (productId: number) => void;
  updateCartQty: (idx: number, delta: number) => void;
  removeFromCart: (idx: number) => void;
  clearCart: () => void;

  processPayment: (method: string, cashReceived: number, cashAmount: number, qrAmount: number) => Transaction;
  processDelivery: (client: { name: string; phone: string; zone: string; addr: string; notes: string }, transportType: 'incluido' | 'pago_entrega' | 'sin_envio', transportCost: number, driverId: string) => Order;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;

  updateProduct: (id: number, updates: Partial<Product>) => void;
  addProduct: (p: Omit<Product, 'id'>) => void;
  deleteProduct: (id: number) => void;
  addStock: (id: number, qty: number) => void;

  addExpense: (e: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  initHistoricalData: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: JSON.parse(JSON.stringify(PRODUCTS)),
      cart: [],
      transactions: [],
      expenses: [],
      orders: [],
      currentUser: null,
      currentView: 'pos',
      saleType: 'site',
      posCategory: 'Todos',
      posSearch: '',
      nextTicket: 1001,
      nextOrder: 5001,
      initialized: false,

      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
      setView: (view) => set({ currentView: view }),
      setSaleType: (type) => set({ saleType: type }),
      setPosCategory: (cat) => set({ posCategory: cat }),
      setPosSearch: (s) => set({ posSearch: s }),

      addToCart: (productId) => {
        const { products, cart } = get();
        const p = products.find(x => x.id === productId);
        if (!p || p.stock === 0) return;
        const existing = cart.find(c => c.productId === productId);
        let newCart;
        if (existing) {
          if (existing.qty >= p.stock) return;
          newCart = cart.map(c => c.productId === productId ? { ...c, qty: c.qty + 1 } : c);
        } else {
          newCart = [...cart, { productId: p.id, name: p.name, price: p.price, cost: p.cost, qty: 1 }];
        }
        set({ cart: newCart });
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

      processPayment: (method, cashReceived, cashAmount, qrAmount) => {
        const { cart, nextTicket, products, currentUser } = get();
        const subtotal = round2(cart.reduce((s, c) => s + c.price * c.qty, 0));
        const tax = calcTax(subtotal);
        const total = round2(subtotal + tax);
        const change = method === 'Efectivo' ? round2(cashReceived - total) : 0;
        const tx: Transaction = {
          id: 'T-' + nextTicket, date: new Date().toISOString(),
          items: cart.map(c => ({ ...c })), subtotal, tax, total, method,
          cashReceived, cashAmount, qrAmount, change,
          attendedBy: currentUser?.name || '', userId: currentUser?.id || ''
        };
        const newProducts = products.map(p => {
          const ci = cart.find(c => c.productId === p.id);
          return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p;
        });
        set({ transactions: [tx, ...get().transactions], cart: [], saleType: 'site', nextTicket: nextTicket + 1, products: newProducts });
        return tx;
      },

      processDelivery: (client, transportType, transportCost, driverId) => {
        const { cart, nextOrder, products, currentUser } = get();
        const subtotal = round2(cart.reduce((s, c) => s + c.price * c.qty, 0));
        const tax = calcTax(subtotal);
        const showTransport = transportType === 'incluido';
        const total = round2(subtotal + tax + (showTransport ? transportCost : 0));
        const order: Order = {
          id: 'PED-' + nextOrder, date: new Date().toISOString(),
          clientName: client.name, clientPhone: client.phone, clientZone: client.zone,
          clientAddr: client.addr, notes: client.notes,
          items: cart.map(c => ({ ...c })), subtotal, tax, total,
          deliveryType: 'delivery', transportType, transportCost,
          driverId, status: 'pendiente',
          attendedBy: currentUser?.name || '', userId: currentUser?.id || ''
        };
        const newProducts = products.map(p => {
          const ci = cart.find(c => c.productId === p.id);
          return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p;
        });
        set({ orders: [order, ...get().orders], cart: [], saleType: 'site', nextOrder: nextOrder + 1, products: newProducts });
        return order;
      },

      updateOrderStatus: (orderId, status) => {
        const { orders, nextTicket } = get();
        const newOrders = orders.map(o => o.id === orderId ? { ...o, status } : o);
        let newTransactions = [...get().transactions];
        if (status === 'entregado') {
          const o = orders.find(x => x.id === orderId);
          if (o) {
            const tx: Transaction = {
              id: 'T-' + nextTicket, date: new Date().toISOString(),
              items: o.items.map(c => ({ ...c })), subtotal: o.subtotal, tax: o.tax, total: o.total,
              method: 'QR', cashReceived: o.total, cashAmount: 0, qrAmount: o.total, change: 0,
              attendedBy: o.attendedBy, userId: o.userId, orderId: o.id
            };
            newTransactions = [tx, ...newTransactions];
            set({ orders: newOrders, transactions: newTransactions, nextTicket: nextTicket + 1 });
            return;
          }
        }
        set({ orders: newOrders });
      },

      updateProduct: (id, updates) => {
        set({ products: get().products.map(p => p.id === id ? { ...p, ...updates } : p) });
      },
      addProduct: (p) => {
        const maxId = Math.max(...get().products.map(x => x.id), 0) + 1;
        set({ products: [...get().products, { ...p, id: maxId }] });
      },
      deleteProduct: (id) => set({ products: get().products.filter(p => p.id !== id) }),
      addStock: (id, qty) => {
        set({ products: get().products.map(p => p.id === id ? { ...p, stock: p.stock + qty } : p) });
      },

      addExpense: (e) => {
        const id = 'E-' + (1000 + get().expenses.length);
        set({ expenses: [...get().expenses, { ...e, id }] });
      },
      updateExpense: (id, updates) => {
        set({ expenses: get().expenses.map(e => e.id === id ? { ...e, ...updates } : e) });
      },
      deleteExpense: (id) => set({ expenses: get().expenses.filter(e => e.id !== id) }),

      initHistoricalData: () => {
        if (get().initialized) return;
        const txs: Transaction[] = [];
        const exps: Expense[] = [];
        const now = new Date();
        for (let d = 90; d >= 1; d--) {
          const date = new Date(now);
          date.setDate(date.getDate() - d);
          date.setHours(rand(8, 21), rand(0, 59), rand(0, 59));
          const numTx = rand(3, 10);
          for (let t = 0; t < numTx; t++) {
            const numItems = rand(1, 5);
            const items: CartItem[] = [];
            const usedIds = new Set<number>();
            for (let i = 0; i < numItems; i++) {
              let p;
              do { p = PRODUCTS[rand(0, PRODUCTS.length - 1)]; } while (usedIds.has(p.id));
              usedIds.add(p.id);
              const qty = rand(1, 3);
              items.push({ productId: p.id, name: p.name, price: p.price, cost: p.cost, qty });
            }
            const subtotal = round2(items.reduce((s, i) => s + i.price * i.qty, 0));
            const tax = round2(subtotal * 0.13);
            const total = round2(subtotal + tax);
            const methods = ['Efectivo', 'QR', 'Mixto'];
            const method = methods[rand(0, 2)];
            const cashReceived = method === 'Efectivo' ? Math.ceil(total / 10) * 10 : total;
            const userId = rand(0, 1) === 0 ? 'paola' : 'esperancita';
            const userName = userId === 'paola' ? 'Sra. Paola' : 'Esperancita';
            txs.push({
              id: 'T-' + (1000 + txs.length), date: new Date(date).toISOString(),
              items, subtotal, tax, total, method,
              cashReceived, cashAmount: method === 'Efectivo' ? total : 0,
              qrAmount: method === 'QR' ? total : 0,
              change: method === 'Efectivo' ? round2(cashReceived - total) : 0,
              attendedBy: userName, userId
            });
          }
          if (date.getDate() === 1 || d === 90) {
            const rd = new Date(date); rd.setDate(1);
            exps.push({ id: 'E-' + (1000 + exps.length), date: rd.toISOString(), category: 'Renta', description: 'Renta del local', amount: 3500 });
            exps.push({ id: 'E-' + (1000 + exps.length), date: rd.toISOString(), category: 'Servicios', description: 'Electricidad, agua, gas', amount: rand(1200, 2000) });
            exps.push({ id: 'E-' + (1000 + exps.length), date: rd.toISOString(), category: 'Nomina', description: 'Salarios empleados', amount: 5000 });
            exps.push({ id: 'E-' + (1000 + exps.length), date: rd.toISOString(), category: 'Mercancia', description: 'Reabastecimiento', amount: rand(6000, 10000) });
            exps.push({ id: 'E-' + (1000 + exps.length), date: rd.toISOString(), category: 'Mantenimiento', description: 'Mantenimiento general', amount: rand(200, 800) });
          }
        }
        set({ transactions: txs, expenses: exps, nextTicket: 1000 + txs.length, initialized: true });
      }
    }),
    { name: 'pos-paolitas-store' }
  )
);
