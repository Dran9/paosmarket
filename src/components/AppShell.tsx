'use client';
import {
  ShoppingCart, Truck, BarChart3, Calculator, Package, Settings,
  Store, LogOut,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import POSView from './POSView';
import DashboardView from './DashboardView';
import AccountingView from './AccountingView';
import InventoryView from './InventoryView';
import OrdersView from './OrdersView';
import SettingsView from './SettingsView';

const NAV = [
  { key: 'pos',        icon: ShoppingCart, label: 'Punto de Venta' },
  { key: 'orders',     icon: Truck,        label: 'Pedidos' },
  { key: 'dashboard',  icon: BarChart3,    label: 'Dashboard' },
  { key: 'accounting', icon: Calculator,   label: 'Contabilidad' },
  { key: 'inventory',  icon: Package,      label: 'Inventario' },
  { key: 'settings',   icon: Settings,     label: 'Ajustes', ownerOnly: true },
];

export default function AppShell() {
  const { currentView, setView, currentUser, logout, orders, settings } = useStore();
  const u = currentUser!;
  const pendingOrders = orders.filter(
    o => ['pendiente', 'preparando', 'en_camino'].includes(o.status)
  ).length;

  const canNav = (key: string, ownerOnly?: boolean) => {
    if (ownerOnly && u.role !== 'owner') return false;
    if (key === 'dashboard' && !u.canDashboard) return false;
    return true;
  };

  const views: Record<string, React.ReactNode> = {
    pos: <POSView />, orders: <OrdersView />, dashboard: <DashboardView />,
    accounting: <AccountingView />, inventory: <InventoryView />,
    settings: <SettingsView />,
  };

  return (
    <div className="flex h-screen">
      <aside className="w-48 min-w-[192px] bg-slate-900 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Store size={15} />
            </div>
            <div className="min-w-0">
              <strong className="block text-sm font-extrabold truncate leading-tight">
                {settings.businessName}
              </strong>
              <span className="text-[10px] text-white/40 truncate block">
                {settings.businessTagline}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(n => {
            if (!canNav(n.key, n.ownerOnly)) return null;
            const Icon = n.icon;
            const active = currentView === n.key;
            return (
              <button key={n.key} onClick={() => setView(n.key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all relative ${
                  active ? 'bg-indigo-500/25 text-white' : 'text-white/60 hover:text-white hover:bg-slate-800'
                }`}>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r" />
                )}
                <Icon size={14} className="flex-shrink-0" />
                <span className="truncate">{n.label}</span>
                {n.key === 'orders' && pendingOrders > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                    {pendingOrders}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-white">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: u.color, color: '#fff' }}>
              {u.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate leading-tight">{u.name}</div>
              <div className="text-[9px] text-white/40">
                {u.role === 'owner' ? 'Propietaria' : 'Vendedora'}
              </div>
            </div>
            <button onClick={logout} title="Cambiar usuario"
              className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {views[currentView] ?? views.pos}
      </main>
    </div>
  );
}
