'use client';
import { useStore } from '@/lib/store';
import { DRIVERS } from '@/lib/data';
import { fmt, fmtDateTime } from '@/lib/utils';

const STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700', icon: 'fa-clock' },
  preparando: { label: 'Preparando', cls: 'bg-blue-100 text-blue-700', icon: 'fa-box' },
  en_camino: { label: 'En Camino', cls: 'bg-indigo-100 text-indigo-700', icon: 'fa-truck' },
  entregado: { label: 'Entregado', cls: 'bg-green-100 text-green-700', icon: 'fa-check' },
  cancelado: { label: 'Cancelado', cls: 'bg-red-100 text-red-700', icon: 'fa-times' },
};

export default function OrdersView() {
  const { orders, updateOrderStatus } = useStore();
  const pending = orders.filter(o => o.status === 'pendiente').length;
  const inProgress = orders.filter(o => ['preparando', 'en_camino'].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'entregado').length;
  const rev = orders.filter(o => o.status === 'entregado').reduce((s, o) => s + o.total, 0);
  const transportRev = orders.filter(o => o.status === 'entregado' && o.transportType === 'incluido').reduce((s, o) => s + o.transportCost, 0);

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-5">Pedidos con Entrega</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { icon: 'fa-clock', color: 'bg-amber-100 text-amber-600', label: 'Pendientes', val: pending },
          { icon: 'fa-boxes-packing', color: 'bg-blue-100 text-blue-600', label: 'En Proceso', val: inProgress },
          { icon: 'fa-circle-check', color: 'bg-green-100 text-green-600', label: 'Entregados', val: delivered },
          { icon: 'fa-coins', color: 'bg-indigo-100 text-indigo-600', label: 'Ventas Delivery', val: fmt(rev) },
          { icon: 'fa-truck', color: 'bg-emerald-100 text-emerald-600', label: 'Ingreso Transp.', val: fmt(transportRev) },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-base mb-2 ${m.color}`}><i className={`fas ${m.icon}`} /></div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase">{m.label}</div>
            <div className="text-xl font-extrabold">{m.val}</div>
          </div>
        ))}
      </div>
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
          <i className="fas fa-truck-ramp-box text-5xl opacity-30 mb-3 block" />
          <p>No hay pedidos aun</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50">
                  <th className="px-4 py-3 text-left">Pedido</th><th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Total</th><th className="px-4 py-3 text-left">Transporte</th>
                  <th className="px-4 py-3 text-left">Chofer</th><th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Atiende</th><th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const st = STATUS[o.status] || STATUS.pendiente;
                  const driver = o.driverId ? DRIVERS.find(d => d.id === o.driverId) : null;
                  const tLabel = o.transportType === 'incluido' ? `Incluido Bs ${o.transportCost}` : o.transportType === 'pago_entrega' ? 'Pago entrega' : '-';
                  return (
                    <tr key={o.id} className="border-t border-slate-100 hover:bg-indigo-50/30">
                      <td className="px-4 py-3 font-bold text-sm">{o.id}</td>
                      <td className="px-4 py-3"><div className="font-semibold text-sm">{o.clientName}</div><div className="text-[11px] text-slate-500">{o.clientPhone}</div></td>
                      <td className="px-4 py-3 text-sm">{fmtDateTime(o.date)}</td>
                      <td className="px-4 py-3 text-sm">{o.items.length} productos</td>
                      <td className="px-4 py-3 font-bold text-sm">{fmt(o.total)}</td>
                      <td className="px-4 py-3 text-xs">{tLabel}</td>
                      <td className="px-4 py-3 text-sm">{driver?.name || '-'}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${st.cls}`}><i className={`fas ${st.icon}`} />{st.label}</span></td>
                      <td className="px-4 py-3 text-xs">{o.attendedBy}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {o.status === 'pendiente' && <button onClick={() => updateOrderStatus(o.id, 'preparando')} className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300" title="Preparar"><i className="fas fa-box text-xs" /></button>}
                          {o.status === 'preparando' && <button onClick={() => updateOrderStatus(o.id, 'en_camino')} className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-300" title="Enviar"><i className="fas fa-truck text-xs" /></button>}
                          {o.status === 'en_camino' && <button onClick={() => updateOrderStatus(o.id, 'entregado')} className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-300" title="Entregado"><i className="fas fa-check text-xs" /></button>}
                          {!['entregado', 'cancelado'].includes(o.status) && (
                            <button onClick={() => updateOrderStatus(o.id, 'cancelado')} className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-300" title="Cancelar"><i className="fas fa-times text-xs" /></button>
                          )}
                          {o.status === 'en_camino' && driver && (
                            <button onClick={() => {
                              const msg = encodeURIComponent(`Hola ${driver.name}, pedido ${o.id} de Paolita's Market.\nCliente: ${o.clientName}\nDir: ${o.clientAddr}\nTel: ${o.clientPhone}\nTotal: ${fmt(o.total)}`);
                              window.open(`https://wa.me/${driver.phone}?text=${msg}`, '_blank');
                            }} className="w-7 h-7 rounded border border-emerald-200 flex items-center justify-center text-emerald-500 hover:bg-emerald-50" title="WhatsApp"><i className="fab fa-whatsapp text-xs" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
