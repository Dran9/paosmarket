'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { fmt, fmtN, fmtDateTime } from '@/lib/utils';
import { api } from '@/lib/api';

export default function DashboardView() {
  const { products } = useStore();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    let from: Date;
    switch (period) {
      case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': from = new Date(now); from.setDate(from.getDate() - 7); break;
      case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'quarter': from = new Date(now); from.setMonth(from.getMonth() - 3); break;
      default: from = new Date(now.getFullYear(), 0, 1);
    }
    setLoading(true);
    api.dashboard({ from: from.toISOString(), to: now.toISOString() })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const totalRevenue = +(data?.totalRevenue || 0);
  const grossProfit = +(data?.grossProfit || 0);
  const netProfit = +(data?.netProfit || 0);
  const totalTx = +(data?.totalTx || 0);
  const avgTicket = totalTx ? Math.round(totalRevenue / totalTx * 100) / 100 : 0;
  const lowStock = data?.lowStock ?? products.filter(p => p.stock <= 10).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold">Dashboard</h2>
        <div className="flex gap-1">
          {[['today','Hoy'],['week','Semana'],['month','Mes'],['quarter','Trimestre'],['year','Año']].map(([k,l]) => (
            <button key={k} onClick={() => setPeriod(k)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${period===k?'bg-indigo-500 text-white':'bg-white text-slate-500 border border-slate-200 hover:bg-indigo-50'}`}>
              {l}</button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center text-slate-400 py-8 text-sm">Cargando estadísticas...</div>}

      {!loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { icon:'fa-coins', color:'bg-blue-100 text-blue-600', label:'Ventas Totales', val: fmt(totalRevenue) },
              { icon:'fa-chart-pie', color:'bg-green-100 text-green-600', label:'Ganancia Neta', val: fmt(netProfit), sub: `${totalRevenue ? Math.round(netProfit/totalRevenue*100) : 0}% margen` },
              { icon:'fa-receipt', color:'bg-indigo-100 text-indigo-600', label:'Transacciones', val: fmtN(totalTx), sub: `Ticket: ${fmt(avgTicket)}` },
              { icon:'fa-exclamation-triangle', color:'bg-amber-100 text-amber-600', label:'Stock Bajo', val: lowStock, sub: `${products.length} productos` },
            ].map((m,i) => (
              <div key={i} className="bg-white rounded-xl p-5 border shadow-sm hover:-translate-y-0.5 transition-all">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-base mb-2 ${m.color}`}><i className={`fas ${m.icon}`} /></div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase">{m.label}</div>
                <div className="text-2xl font-extrabold">{m.val}</div>
                {m.sub && <div className="text-[11px] font-semibold text-emerald-600 mt-1">{m.sub}</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-bold text-sm mb-3">Ventas por Empleado</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-bold uppercase text-slate-500"><th className="text-left pb-2">Empleado</th><th className="text-right pb-2">Tx</th><th className="text-right pb-2">Ventas</th></tr></thead>
                <tbody>
                  {(data?.byUser || []).map((d: any) => (
                    <tr key={d.user_id} className="border-t border-slate-100">
                      <td className="py-2 font-semibold">{d.name}</td>
                      <td className="py-2 text-right">{d.tx}</td>
                      <td className="py-2 text-right font-bold text-emerald-600">{fmt(+d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-bold text-sm mb-3">Ventas por Método</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-bold uppercase text-slate-500"><th className="text-left pb-2">Método</th><th className="text-right pb-2">Total</th></tr></thead>
                <tbody>
                  {(data?.byMethod || []).map((m: any) => (
                    <tr key={m.method} className="border-t border-slate-100">
                      <td className="py-2"><span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">{m.method}</span></td>
                      <td className="py-2 text-right font-bold">{fmt(+m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-bold text-sm mb-3">Top Productos</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-bold uppercase text-slate-500"><th className="text-left pb-2">#</th><th className="text-left pb-2">Producto</th><th className="text-right pb-2">Unid.</th><th className="text-right pb-2">Ingresos</th></tr></thead>
                <tbody>
                  {(data?.topProducts || []).map((p: any, i: number) => (
                    <tr key={p.product_name} className="border-t border-slate-100">
                      <td className="py-2 font-bold">{i+1}</td>
                      <td className="py-2 text-xs">{p.product_name}</td>
                      <td className="py-2 text-right">{p.qty}</td>
                      <td className="py-2 text-right font-bold">{fmt(+p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-bold text-sm mb-3">Resumen Financiero</h3>
              <div className="space-y-2 text-sm">
                {[
                  { l: 'Ingresos Totales', v: fmt(totalRevenue), c: 'text-emerald-600' },
                  { l: 'Costo Bienes Vendidos', v: fmt(+(data?.totalCOGS || 0)), c: 'text-orange-600' },
                  { l: 'Ganancia Bruta', v: fmt(grossProfit), c: grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
                  { l: 'Gastos Operativos', v: fmt(+(data?.totalExpenses || 0)), c: 'text-red-600' },
                  { l: 'Ganancia Neta', v: fmt(netProfit), c: netProfit >= 0 ? 'text-emerald-700' : 'text-red-600' },
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between py-1.5 ${i === 4 ? 'border-t-2 border-slate-300 font-bold' : 'border-t border-slate-100'}`}>
                    <span className="text-slate-500">{row.l}</span>
                    <span className={`font-bold ${row.c}`}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
