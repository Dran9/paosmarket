'use client';
import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { CATEGORIES, CAT_COLORS, CAT_ICONS } from '@/lib/data';
import { fmt, getStockStatus, round2 } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function InventoryView() {
  const { products, updateProduct, addProduct, deleteProduct, addStock } = useStore();
  const [catFilter, setCatFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newP, setNewP] = useState({ name: '', category: 'Abarrotes', barcode: '', price: '', cost: '', stock: '', unit: 'pza' });
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = products.filter(p => {
    const mc = catFilter === 'Todos' || p.category === catFilter;
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    return mc && ms;
  });
  const totalValue = round2(products.reduce((s, p) => s + p.price * p.stock, 0));
  const totalCost = round2(products.reduce((s, p) => s + p.cost * p.stock, 0));
  const lowStock = products.filter(p => p.stock <= 10).length;

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws) as any[];
      let imported = 0;
      data.forEach(row => {
        const name = row['Producto'] || row['producto'] || row['Nombre'] || '';
        if (!name) return;
        const barcode = String(row['Codigo de Barras'] || row['barcode'] || row['Barcode'] || '');
        const price = parseFloat(row['Precio'] || row['precio'] || row['Price'] || 0);
        const cost = parseFloat(row['Costo'] || row['costo'] || row['Cost'] || 0);
        const stock = parseInt(row['Stock'] || row['stock'] || 0);
        const category = row['Categoria'] || row['categoria'] || 'Abarrotes';
        const unit = row['Unidad'] || row['unidad'] || 'pza';
        if (!price) return;
        const existing = barcode ? products.find(p => p.barcode === barcode) : null;
        if (existing) { updateProduct(existing.id, { name, price, cost, stock, category, unit }); }
        else { addProduct({ name, category, barcode, price, cost, stock, unit }); }
        imported++;
      });
      alert(`${imported} productos importados`);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold">Inventario</h2>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg"><i className="fas fa-file-excel mr-2" />Importar Excel</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          <button onClick={() => setShowNew(true)} className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-lg"><i className="fas fa-plus mr-2" />Nuevo Producto</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { l: 'Total Productos', v: products.length, c: 'bg-blue-100 text-blue-600' },
          { l: 'Valor Inventario', v: fmt(totalValue), c: 'bg-green-100 text-green-600' },
          { l: 'Costo Inventario', v: fmt(totalCost), c: 'bg-indigo-100 text-indigo-600' },
          { l: 'Stock Bajo', v: lowStock, c: 'bg-amber-100 text-amber-600' },
          { l: 'Agotados', v: products.filter(p => p.stock === 0).length, c: 'bg-red-100 text-red-600' },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">{m.l}</div>
            <div className="text-xl font-extrabold">{m.v}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:border-indigo-500 outline-none" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2.5 border rounded-lg text-sm w-44 focus:border-indigo-500 outline-none">
          <option value="Todos">Todas las Categorias</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-380px)] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50 sticky top-0 z-10">
                <th className="px-4 py-3 text-left">Producto</th><th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-left">Cod. Barras</th><th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Costo</th><th className="px-4 py-3 text-right">Margen</th>
                <th className="px-4 py-3 text-left">Stock</th><th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const s = getStockStatus(p.stock);
                const margin = p.price > 0 ? round2((p.price - p.cost) / p.price * 100) : 0;
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-indigo-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded flex items-center justify-center text-xs"
                          style={{ background: CAT_COLORS[p.category] + '22', color: CAT_COLORS[p.category] }}>
                          <i className={`fas ${CAT_ICONS[p.category]}`} />
                        </div>
                        <EditableCell value={p.name} onSave={v => updateProduct(p.id, { name: v })} bold />
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: CAT_COLORS[p.category] + '22', color: CAT_COLORS[p.category] }}>{p.category}</span></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500"><EditableCell value={p.barcode} onSave={v => updateProduct(p.id, { barcode: v })} /></td>
                    <td className="px-4 py-3 text-right"><EditableCell value={String(p.price)} onSave={v => updateProduct(p.id, { price: parseFloat(v) || 0 })} isNumber bold /></td>
                    <td className="px-4 py-3 text-right text-slate-500"><EditableCell value={String(p.cost)} onSave={v => updateProduct(p.id, { cost: parseFloat(v) || 0 })} isNumber /></td>
                    <td className="px-4 py-3 text-right"><span className={`font-semibold ${margin >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>{margin}%</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{p.stock}</span>
                        <span className="text-slate-400">{p.unit}</span>
                        <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.barCls}`} style={{ width: Math.min(100, p.stock) + '%' }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => { const qty = prompt('Cantidad a agregar:'); if (qty) addStock(p.id, parseInt(qty) || 0); }}
                          className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-300" title="Stock"><i className="fas fa-plus text-xs" /></button>
                        <button onClick={() => { if (confirm(`Eliminar ${p.name}?`)) deleteProduct(p.id); }}
                          className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-300" title="Eliminar"><i className="fas fa-trash text-xs" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-[90%] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-4"><i className="fas fa-plus-circle text-indigo-500 mr-2" />Nuevo Producto</h3>
            <Field label="Nombre" value={newP.name} onChange={v => setNewP({ ...newP, name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <div className="mb-3"><label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Categoria</label>
                <select value={newP.category} onChange={e => setNewP({ ...newP, category: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg text-sm">{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <Field label="Codigo de Barras" value={newP.barcode} onChange={v => setNewP({ ...newP, barcode: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Precio (Bs)" value={newP.price} onChange={v => setNewP({ ...newP, price: v })} type="number" />
              <Field label="Costo (Bs)" value={newP.cost} onChange={v => setNewP({ ...newP, cost: v })} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock" value={newP.stock} onChange={v => setNewP({ ...newP, stock: v })} type="number" />
              <div className="mb-3"><label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Unidad</label>
                <select value={newP.unit} onChange={e => setNewP({ ...newP, unit: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg text-sm">
                  <option value="pza">Pieza</option><option value="kg">Kilogramo</option><option value="lt">Litro</option></select></div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg">Cancelar</button>
              <button onClick={() => { if (!newP.name || !newP.price) return; addProduct({ name: newP.name, category: newP.category, barcode: newP.barcode, price: parseFloat(newP.price) || 0, cost: parseFloat(newP.cost) || 0, stock: parseInt(newP.stock) || 0, unit: newP.unit }); setShowNew(false); setNewP({ name: '', category: 'Abarrotes', barcode: '', price: '', cost: '', stock: '', unit: 'pza' }); }}
                className="px-5 py-2 text-sm font-bold bg-indigo-500 text-white rounded-lg"><i className="fas fa-save mr-1" />Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableCell({ value, onSave, isNumber, bold }: { value: string; onSave: (v: string) => void; isNumber?: boolean; bold?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  if (editing) return (
    <input type={isNumber ? 'number' : 'text'} value={val} onChange={e => setVal(e.target.value)} step="any"
      onBlur={() => { setEditing(false); if (val !== value) onSave(val); }}
      onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onSave(val); } if (e.key === 'Escape') setEditing(false); }}
      className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200" autoFocus />
  );
  return <span onDoubleClick={() => setEditing(true)} className={`editable-cell ${bold ? 'font-bold' : ''}`}>{value}</span>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border rounded-lg text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
    </div>
  );
}
