'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { fmt, fmtDate, fmtDateTime, round2 } from '@/lib/utils';

export default function AccountingView() {
  const { transactions, expenses, addExpense, updateExpense, deleteExpense } = useStore();
  const [tab, setTab] = useState('resumen');
  const [apiTx, setApiTx] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  useEffect(() => {
    // Load monthly stats and recent transactions from API
    api.dashboard({ from: thisMonth.toISOString(), to: now.toISOString() })
      .then(setStats)
      .catch(() => {});
    api.transactions.list({ from: thisMonth.toISOString(), limit: '200' })
      .then(setApiTx)
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge session transactions (have items for COGS) with API transactions
  const allTx: any[] = [
    ...transactions.filter(t => new Date(t.date) >= thisMonth),
    ...apiTx.filter(at => !transactions.find(st => st.id === at.id)),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const mExp = expenses.filter(e => new Date(e.date) >= thisMonth);

  // Prefer API stats when available (accurate COGS), fallback to session data
  const totalIncome = stats ? +stats.totalRevenue : round2(allTx.reduce((s, t) => s + +t.total, 0));
  const totalCOGS = stats ? +stats.totalCOGS : round2(transactions.filter(t => new Date(t.date) >= thisMonth).reduce((s, t) => s + t.items.reduce((ss, i) => ss + i.cost * i.qty, 0), 0));
  const grossProfit = stats ? +stats.grossProfit : round2(totalIncome - totalCOGS);
  const totalExpenses = round2(mExp.reduce((s, e) => s + e.amount, 0));
  const netProfit = round2(grossProfit - totalExpenses);
  const ivaCollected = round2(allTx.reduce((s, t) => s + +t.tax, 0));

  const [newExp, setNewExp] = useState({ category: 'Renta', description: '', amount: '' });
  const [showNewExp, setShowNewExp] = useState(false);

  const handleExport = () => window.open(
    (process.env.NEXT_PUBLIC_API_URL || '') + '/api/export/excel',
    '_blank'
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold">Contabilidad</h2>
        <button onClick={handleExport} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-all">
          <i className="fas fa-file-excel mr-2" />Exportar a Excel
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { l: 'Ingresos', v: fmt(totalIncome), c: 'text-emerald-600' },
          { l: 'Costo Ventas', v: fmt(totalCOGS), c: 'text-orange-600' },
          { l: 'Ganancia Bruta', v: fmt(grossProfit), c: grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
          { l: 'Gastos Operativos', v: fmt(totalExpenses), c: 'text-red-600' },
          { l: 'Ganancia Neta', v: fmt(netProfit), c: netProfit >= 0 ? 'text-emerald-600' : 'text-red-600' },
          { l: 'IVA Cobrado', v: fmt(ivaCollected), c: 'text-blue-600' },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">{m.l}</div>
            <div className={`text-xl font-extrabold ${m.c}`}>{m.v}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-5 mb-5">
        <h3 className="font-bold text-sm mb-3">Desglose Matemático (Mes Actual)</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between py-1"><span className="text-slate-500">Ventas Totales (con IVA)</span><span className="font-bold">{fmt(totalIncome)}</span></div>
          <div className="flex justify-between py-1"><span className="text-slate-500">(-) IVA 13% cobrado</span><span className="font-bold text-blue-600">{fmt(ivaCollected)}</span></div>
          <div className="flex justify-between py-1"><span className="text-slate-500">Ventas Netas (sin IVA)</span><span className="font-bold">{fmt(round2(totalIncome - ivaCollected))}</span></div>
          <div className="flex justify-between py-1 border-t border-slate-200 pt-1"><span className="text-slate-500">(-) Costo de bienes vendidos</span><span className="font-bold text-orange-600">{fmt(totalCOGS)}</span></div>
          <div className="flex justify-between py-1"><span className="text-slate-500 font-semibold">Ganancia Bruta</span><span className={`font-extrabold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(grossProfit)}</span></div>
          <div className="flex justify-between py-1 border-t border-slate-200 pt-1"><span className="text-slate-500">(-) Gastos Operativos</span><span className="font-bold text-red-600">{fmt(totalExpenses)}</span></div>
          <div className="flex justify-between py-2 border-t-2 border-slate-300 mt-1"><span className="font-bold">GANANCIA NETA</span><span className={`text-2xl font-extrabold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(netProfit)}</span></div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b-2 border-slate-200">
        {[['resumen','Resumen'],['ingresos','Ingresos'],['egresos','Egresos']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-5 py-2.5 text-sm font-semibold relative transition-all ${tab === k ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>
            {l}{tab === k && <span className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-indigo-500 rounded" />}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border p-5"><h3 className="font-bold text-sm mb-3">Ingresos Recientes</h3>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-bold uppercase text-slate-500 sticky top-0 bg-white"><th className="text-left pb-2">Ticket</th><th className="text-left pb-2">Fecha</th><th className="text-left pb-2">Atiende</th><th className="text-right pb-2">Total</th></tr></thead>
                <tbody>{allTx.slice(0, 15).map(t => (
                  <tr key={t.id} className="border-t border-slate-100"><td className="py-2 font-bold">{t.id}</td><td className="py-2 text-xs">{fmtDateTime(t.date)}</td><td className="py-2 text-xs">{t.attendedBy || t.attended_by}</td><td className="py-2 text-right font-bold text-emerald-600">+{fmt(+t.total)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-5"><h3 className="font-bold text-sm mb-3">Gastos Recientes</h3>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-bold uppercase text-slate-500 sticky top-0 bg-white"><th className="text-left pb-2">Fecha</th><th className="text-left pb-2">Categoria</th><th className="text-left pb-2">Descripcion</th><th className="text-right pb-2">Monto</th></tr></thead>
                <tbody>{mExp.slice(0, 15).map(e => (
                  <tr key={e.id} className="border-t border-slate-100"><td className="py-2 text-xs">{fmtDate(e.date)}</td><td className="py-2"><span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">{e.category}</span></td><td className="py-2 text-xs">{e.description}</td><td className="py-2 text-right font-bold text-red-600">-{fmt(e.amount)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'ingresos' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-bold">Historial de Ingresos (mes actual)</h3></div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50 sticky top-0"><th className="px-4 py-3 text-left">Ticket</th><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Atiende</th><th className="px-4 py-3 text-left">Metodo</th><th className="px-4 py-3 text-right">Subtotal</th><th className="px-4 py-3 text-right">IVA</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
              <tbody>{allTx.map(t => (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-indigo-50/30"><td className="px-4 py-3 font-bold">{t.id}</td><td className="px-4 py-3 text-xs">{fmtDateTime(t.date)}</td><td className="px-4 py-3 text-xs">{t.attendedBy || t.attended_by}</td><td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">{t.method}</span></td><td className="px-4 py-3 text-right">{fmt(+t.subtotal)}</td><td className="px-4 py-3 text-right">{fmt(+t.tax)}</td><td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(+t.total)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'egresos' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowNewExp(true)} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-lg"><i className="fas fa-plus mr-1" />Nuevo Gasto</button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50 sticky top-0"><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Categoria</th><th className="px-4 py-3 text-left">Descripcion</th><th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3 w-10"></th></tr></thead>
                <tbody>{[...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-indigo-50/30">
                    <td className="px-4 py-3 text-xs"><EditableCell value={fmtDate(e.date)} onSave={v => updateExpense(e.id, { date: new Date(v).toISOString() })} /></td>
                    <td className="px-4 py-3"><EditableCell value={e.category} onSave={v => updateExpense(e.id, { category: v })} /></td>
                    <td className="px-4 py-3 text-xs"><EditableCell value={e.description} onSave={v => updateExpense(e.id, { description: v })} /></td>
                    <td className="px-4 py-3 text-right"><EditableCell value={String(e.amount)} onSave={v => updateExpense(e.id, { amount: parseFloat(v) || 0 })} isNumber /><span className="text-red-600 font-bold ml-1">{fmt(e.amount)}</span></td>
                    <td className="px-4 py-3"><button onClick={() => deleteExpense(e.id)} className="text-slate-300 hover:text-red-500"><i className="fas fa-trash text-xs" /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showNewExp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowNewExp(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-[90%] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-4"><i className="fas fa-plus-circle text-indigo-500 mr-2" />Nuevo Gasto</h3>
            <div className="mb-3"><label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Categoria</label>
              <select value={newExp.category} onChange={e => setNewExp({ ...newExp, category: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg text-sm">
                {['Renta','Servicios','Nomina','Mercancia','Mantenimiento','Otros'].map(c => <option key={c}>{c}</option>)}
              </select></div>
            <div className="mb-3"><label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Descripcion</label>
              <input value={newExp.description} onChange={e => setNewExp({ ...newExp, description: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
            <div className="mb-4"><label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Monto (Bs)</label>
              <input type="number" value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg text-sm" /></div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewExp(false)} className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg">Cancelar</button>
              <button onClick={() => {
                if (!newExp.description || !newExp.amount) return;
                addExpense({ date: new Date().toISOString(), category: newExp.category, description: newExp.description, amount: parseFloat(newExp.amount) || 0 });
                setShowNewExp(false);
                setNewExp({ category: 'Renta', description: '', amount: '' });
              }} className="px-5 py-2 text-sm font-bold bg-indigo-500 text-white rounded-lg"><i className="fas fa-save mr-1" />Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableCell({ value, onSave, isNumber }: { value: string; onSave: (v: string) => void; isNumber?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  if (editing) return (
    <input type={isNumber ? 'number' : 'text'} value={val} onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); if (val !== value) onSave(val); }}
      onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onSave(val); } if (e.key === 'Escape') setEditing(false); }}
      className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200" autoFocus />
  );
  return <span onDoubleClick={() => setEditing(true)} className="editable-cell cursor-pointer">{value}</span>;
}
