'use client';
import { useStore } from '@/lib/store';
import { fmt, fmtN, fmtDateTime, round2 } from '@/lib/utils';
import { USERS } from '@/lib/data';
import { useState } from 'react';

export default function DashboardView() {
  const { transactions, products } = useStore();
  const [period, setPeriod] = useState('month');
  const now = new Date();
  let start: Date;
  switch (period) {
    case 'today': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case 'week': start = new Date(now); start.setDate(start.getDate() - 7); break;
    case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'quarter': start = new Date(now); start.setMonth(start.getMonth() - 3); break;
    default: start = new Date(now.getFullYear(), 0, 1);
  }
  const filtered = transactions.filter(t => new Date(t.date) >= start);
  const totalRevenue = round2(filtered.reduce((s, t) => s + t.total, 0));
  const totalCost = round2(filtered.reduce((s, t) => s + t.items.reduce((ss, i) => ss + i.cost * i.qty, 0), 0));
  const profit = round2(totalRevenue - totalCost);
  const totalTx = filtered.length;
  const avgTicket = totalTx ? round2(totalRevenue / totalTx) : 0;
  const lowStock = products.filter(p => p.stock <= 10).length;

  const byUser: Record<string, { name: string; tx: number; revenue: number }> = {};
  filtered.forEach(t => {
    if (!byUser[t.userId]) byUser[t.userId] = { name: t.attendedBy, tx: 0, revenue: 0 };
    byUser[t.userId].tx++;
    byUser[t.userId].revenue += t.total;
  });

  const byMethod: Record<string, number> = {};
  filtered.forEach(t => { byMethod[t.method] = (byMethod[t.method] || 0) + t.total; });

  const topProducts: Record<string, { qty: number; rev: number }> = {};
  filtered.forEach(t => t.items.forEach(i => {
    if (!topProducts[i.name]) topProducts[i.name] = { qty: 0, rev: 0 };
    topProducts[i.name].qty += i.qty;
    topProducts[i.name].rev += i.price * i.qty;
  }));
  const top5 = Object.entries(topProducts).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold">Dashboard</h2>
        <div className="flex gap-1">
          {[['today','Hoy'],['week','Semana'],['month','Mes'],['quarter','Trimestre'],['year','Ano']].map(([k,l]) => (
            <button key={k} onClick={() => setPeriod(k)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${period===k?'bg-indigo-500 text-white':'bg-white text-slate-500 border border-slate-200 hover:bg-indigo-50'}`}>
              {l}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { icon:'fa-coins', color:'bg-blue-100 text-blue-600', label:'Ventas Totales', val: fmt(totalRevenue) },
          { icon:'fa-chart-pie', color:'bg-green-100 text-green-600', label:'Ganancia Neta', val: fmt(profit), sub: `${totalRevenue ? round2(profit/totalRevenue*100) : 0}% margen` },
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
            <thead><tr className="text-[10px] font-bold uppercase text-slate-500"><th className="text-left pb-2">Empleado</th><th className="text-right pb-2">Transacciones</th><th className="text-right pb-2">Ventas</th></tr></thead>
            <tbody>
              {Object.entries(byUser).map(([id, d]) => (
                <tr key={id} className="border-t border-slate-100"><td className="py-2 font-semibold">{d.name}</td><td className="py-2 text-right">{d.tx}</td><td className="py-2 text-right font-bold text-emerald-600">{fmt(d.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-sm mb-3">Ventas por Metodo</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] font-bold uppercase text-slate-500"><th className="text-left pb-2">Metodo</th><th className="text-right pb-2">Total</th></tr></thead>
            <tbody>
              {Object.entries(byMethod).map(([m, v]) => (
                <tr key={m} className="border-t border-slate-100"><td className="py-2"><span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">{m}</span></td><td className="py-2 text-right font-bold">{fmt(v)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-sm mb-3">Top 5 Productos</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] font-bold uppercase text-slate-500"><th className="text-left pb-2">#</th><th className="text-left pb-2">Producto</th><th className="text-right pb-2">Unid.</th><th className="text-right pb-2">Ingresos</th></tr></thead>
            <tbody>
              {top5.map(([name, d], i) => (
                <tr key={name} className="border-t border-slate-100"><td className="py-2 font-bold">{i+1}</td><td className="py-2">{name}</td><td className="py-2 text-right">{d.qty}</td><td className="py-2 text-right font-bold">{fmt(d.rev)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-sm mb-3">Transacciones Recientes</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] font-bold uppercase text-slate-500"><th className="text-left pb-2">Ticket</th><th className="text-left pb-2">Fecha</th><th className="text-left pb-2">Atiende</th><th className="text-right pb-2">Total</th></tr></thead>
            <tbody>
              {filtered.slice(0, 8).map(t => (
                <tr key={t.id} className="border-t border-slate-100"><td className="py-2 font-bold">{t.id}</td><td className="py-2 text-xs">{fmtDateTime(t.date)}</td><td className="py-2 text-xs">{t.attendedBy}</td><td className="py-2 text-right font-bold">{fmt(t.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
