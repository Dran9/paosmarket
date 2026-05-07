'use client';
import { useStore } from '@/lib/store';
import POSView from './POSView';
import DashboardView from './DashboardView';
import AccountingView from './AccountingView';
import InventoryView from './InventoryView';
import OrdersView from './OrdersView';
import SettingsView from './SettingsView';

const NAV = [
  { key: 'pos', icon: 'fa-cash-register', label: 'Punto de Venta' },
  { key: 'orders', icon: 'fa-truck-ramp-box', label: 'Pedidos' },
  { key: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
  { key: 'accounting', icon: 'fa-calculator', label: 'Contabilidad' },
  { key: 'inventory', icon: 'fa-boxes-stacked', label: 'Inventario' },
];

export default function AppShell() {
  const { currentView, setView, currentUser, logout, orders, settings } = useStore();
  const u = currentUser!;
  const pendingOrders = orders.filter(o => ['pendiente', 'preparando', 'en_camino'].includes(o.status)).length;

  const canNav = (key: string) => {
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
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm flex-shrink-0">
              <i className="fas fa-store" />
            </div>
            <div className="min-w-0">
              <strong className="block text-sm font-extrabold truncate">{settings.businessName}</strong>
              <span className="text-[10px] text-white/50 truncate block">{settings.businessTagline}</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 flex flex-col gap-0.5">
          {NAV.map(n => !canNav(n.key) ? null : (
            <button key={n.key} onClick={() => setView(n.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all relative ${
                currentView === n.key ? 'bg-indigo-500/25 text-white' : 'text-white/60 hover:text-white hover:bg-slate-800'
              }`}>
              {currentView === n.key && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r" />}
              <i className={`fas ${n.icon} w-4 text-center flex-shrink-0`} />
              <span className="truncate">{n.label}</span>
              {n.key === 'orders' && pendingOrders > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">{pendingOrders}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-white/10">
          {u.role === 'owner' && (
            <button onClick={() => setView('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all mb-1 ${
                currentView === 'settings' ? 'bg-indigo-500/25 text-white' : 'text-white/40 hover:text-white hover:bg-slate-800'
              }`}>
              <i className="fas fa-gear w-4 text-center flex-shrink-0" />
              <span>Ajustes</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-white px-1">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: u.color, color: '#fff' }}>{u.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{u.name}</div>
              <div className="text-[9px] text-white/40">{u.role === 'owner' ? 'Propietaria' : 'Vendedora'}</div>
            </div>
            <button onClick={logout} className="text-white/30 hover:text-white/70 text-xs flex-shrink-0" title="Cambiar usuario">
              <i className="fas fa-right-left" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {views[currentView] || views.pos}
      </main>
    </div>
  );
}
