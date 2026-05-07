'use client';
import { useStore } from '@/lib/store';
import POSView from './POSView';
import DashboardView from './DashboardView';
import AccountingView from './AccountingView';
import InventoryView from './InventoryView';
import OrdersView from './OrdersView';

const NAV = [
  { key: 'pos', icon: 'fa-cash-register', label: 'Punto de Venta' },
  { key: 'orders', icon: 'fa-truck-ramp-box', label: 'Pedidos' },
  { key: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
  { key: 'accounting', icon: 'fa-calculator', label: 'Contabilidad' },
  { key: 'inventory', icon: 'fa-boxes-stacked', label: 'Inventario' },
];

export default function AppShell() {
  const { currentView, setView, currentUser, logout, orders } = useStore();
  const u = currentUser!;
  const pendingOrders = orders.filter(o => ['pendiente', 'preparando', 'en_camino'].includes(o.status)).length;

  const canNav = (key: string) => {
    if (key === 'dashboard' && !u.canDashboard) return false;
    return true;
  };

  const views: Record<string, React.ReactNode> = {
    pos: <POSView />, orders: <OrdersView />, dashboard: <DashboardView />,
    accounting: <AccountingView />, inventory: <InventoryView />
  };

  return (
    <div className="flex h-screen">
      <aside className="w-60 min-w-[240px] bg-slate-900 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg">
              <i className="fas fa-store" />
            </div>
            <div><strong className="block text-base font-extrabold">Paolita&apos;s</strong><span className="text-xs text-white/50">Market</span></div>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map(n => !canNav(n.key) ? null : (
            <button key={n.key} onClick={() => setView(n.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all relative ${
                currentView === n.key ? 'bg-indigo-500/25 text-white' : 'text-white/60 hover:text-white hover:bg-slate-800'
              }`}>
              {currentView === n.key && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-indigo-400 rounded-r" />}
              <i className={`fas ${n.icon} w-5 text-center`} />
              <span>{n.label}</span>
              {n.key === 'orders' && pendingOrders > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{pendingOrders}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: u.color, color: '#fff' }}>{u.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{u.name}</div>
              <div className="text-[10px] text-white/40">{u.role === 'owner' ? 'Propietaria' : 'Vendedora'}</div>
            </div>
            <button onClick={logout} className="text-white/30 hover:text-white/70 text-xs" title="Cambiar usuario">
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
