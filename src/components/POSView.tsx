'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { CATEGORIES, CAT_COLORS, CAT_ICONS, DRIVERS, type Driver } from '@/lib/data';
import { fmt, round2, calcTax, getStockStatus } from '@/lib/utils';

export default function POSView() {
  const { products, cart, saleType, setSaleType, posCategory, setPosCategory, posSearch, setPosSearch,
    addToCart, updateCartQty, removeFromCart, clearCart, processPayment, processDelivery, currentUser } = useStore();
  const [showPayment, setShowPayment] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [showReceipt, setShowReceipt] = useState<any>(null);
  const [payMethod, setPayMethod] = useState('Efectivo');
  const [cashIn, setCashIn] = useState('');
  const [mixtoCash, setMixtoCash] = useState(0);
  const [dlTransport, setDlTransport] = useState<'incluido' | 'pago_entrega'>('incluido');
  const [dlDriver, setDlDriver] = useState<string | null>(null);
  const [dlClient, setDlClient] = useState({ name: '', phone: '', zone: '', addr: '', notes: '' });
  const [dlCost, setDlCost] = useState(15);
  const scannerRef = useRef({ buffer: '', timer: null as any });

  const filtered = products.filter(p => {
    const mc = posCategory === 'Todos' || p.category === posCategory;
    const ms = p.name.toLowerCase().includes(posSearch.toLowerCase()) || (p.barcode && p.barcode.includes(posSearch));
    return mc && ms;
  });

  const cartSubtotal = round2(cart.reduce((s, c) => s + c.price * c.qty, 0));
  const cartTax = calcTax(cartSubtotal);
  const cartTotal = round2(cartSubtotal + cartTax);

  const handleBarcode = useCallback((e: KeyboardEvent) => {
    if (showPayment || showDelivery || showReceipt) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Enter' && scannerRef.current.buffer.length >= 4) {
      const code = scannerRef.current.buffer.trim();
      scannerRef.current.buffer = '';
      clearTimeout(scannerRef.current.timer);
      const p = products.find(x => x.barcode === code);
      if (p) addToCart(p.id);
      return;
    }
    if (e.key.length === 1) {
      scannerRef.current.buffer += e.key;
      clearTimeout(scannerRef.current.timer);
      scannerRef.current.timer = setTimeout(() => { scannerRef.current.buffer = ''; }, 200);
    }
  }, [products, addToCart, showPayment, showDelivery, showReceipt]);

  useEffect(() => {
    window.addEventListener('keydown', handleBarcode);
    return () => window.removeEventListener('keydown', handleBarcode);
  }, [handleBarcode]);

  const doPayment = () => {
    const total = cartTotal;
    let cr = total, ca = 0, qa = 0;
    if (payMethod === 'Efectivo') {
      cr = parseFloat(cashIn) || 0;
      if (cr < total) return;
      ca = total;
    } else if (payMethod === 'QR') { qa = total; }
    else {
      ca = mixtoCash; qa = round2(total - mixtoCash);
      if (Math.abs(ca + qa - total) > 0.01) return;
      cr = total;
    }
    const tx = processPayment(payMethod, cr, ca, qa);
    setShowPayment(false);
    setShowReceipt(tx);
    setCashIn(''); setMixtoCash(0); setPayMethod('Efectivo');
  };

  const doDelivery = () => {
    if (!dlClient.name) return;
    if (!dlClient.addr) return;
    if (!dlDriver) return;
    processDelivery(dlClient, dlTransport, dlCost, dlDriver);
    setShowDelivery(false);
    setDlClient({ name: '', phone: '', zone: '', addr: '', notes: '' });
    setDlDriver(null); setDlCost(15); setDlTransport('incluido');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 h-[calc(100vh-48px)]">
      <div className="flex flex-col overflow-hidden">
        <div className="mb-4">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
            <input value={posSearch} onChange={e => setPosSearch(e.target.value)}
              placeholder="Buscar producto o escanear codigo..."
              className="w-full pl-12 pr-4 py-4 text-2xl font-semibold rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all bg-white" />
          </div>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setPosCategory('Todos')}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${posCategory === 'Todos' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
            Todos</button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setPosCategory(c)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${posCategory === c ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
              {c}</button>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 overflow-y-auto flex-1 pb-2">
          {filtered.map(p => {
            const s = getStockStatus(p.stock);
            return (
              <div key={p.id} onClick={() => p.stock > 0 && addToCart(p.id)}
                className={`bg-white border rounded-lg p-3 flex flex-col items-center text-center transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${p.stock === 0 ? 'opacity-40 pointer-events-none' : 'hover:border-indigo-400'}`}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base mb-2"
                  style={{ background: CAT_COLORS[p.category] + '22', color: CAT_COLORS[p.category] }}>
                  <i className={`fas ${CAT_ICONS[p.category]}`} />
                </div>
                <div className="text-xs font-semibold leading-tight mb-1 line-clamp-2">{p.name}</div>
                <div className="text-lg font-extrabold text-indigo-500">{fmt(p.price)}</div>
                <div className={`text-[10px] mt-1 ${s.barCls.replace('bg-', 'text-').replace('-500', '-500')}`}>{p.stock} {p.unit}s</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <i className="fas fa-shopping-cart" /> Carrito
            <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{cart.reduce((s, c) => s + c.qty, 0)}</span>
          </h3>
          {cart.length > 0 && <button onClick={clearCart} className="text-slate-400 hover:text-red-500 transition-colors"><i className="fas fa-trash text-sm" /></button>}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <i className="fas fa-shopping-basket text-5xl opacity-30 mb-3" />
              <p className="text-sm">Carrito vacio</p>
            </div>
          ) : cart.map((c, i) => (
            <div key={i} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-indigo-50/50 transition-colors">
              <span className="flex-1 text-sm font-medium truncate">{c.name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => updateCartQty(i, -1)} className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all text-xs">-</button>
                <span className="w-7 text-center font-bold text-sm">{c.qty}</span>
                <button onClick={() => updateCartQty(i, 1)} className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all text-xs">+</button>
              </div>
              <span className="text-sm font-bold min-w-[60px] text-right">{fmt(c.price * c.qty)}</span>
              <button onClick={() => removeFromCart(i)} className="text-slate-300 hover:text-red-500 transition-colors ml-1"><i className="fas fa-times text-xs" /></button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t bg-slate-50">
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <button onClick={() => setSaleType('site')}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${saleType !== 'delivery' ? 'bg-indigo-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
              <i className="fas fa-store mr-1" /> En Sitio</button>
            <button onClick={() => setSaleType('delivery')}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${saleType === 'delivery' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
              <i className="fas fa-truck mr-1" /> Entrega</button>
          </div>
          {saleType === 'delivery' && (
            <div className="bg-amber-50 rounded-lg px-3 py-1.5 mb-2 text-[11px] font-semibold text-amber-600 text-center">
              <i className="fas fa-truck mr-1" /> MODO ENTREGA</div>
          )}
          <div className="mb-3 text-sm">
            <div className="flex justify-between py-0.5 text-slate-500"><span>Subtotal</span><span>{fmt(cartSubtotal)}</span></div>
            <div className="flex justify-between py-0.5 text-slate-500"><span>IVA (13%)</span><span>{fmt(cartTax)}</span></div>
            <div className="flex justify-between pt-2 mt-1 border-t-2 border-slate-200 text-lg font-extrabold"><span>Total</span><span>{fmt(cartTotal)}</span></div>
          </div>
          <button disabled={cart.length === 0}
            onClick={() => saleType === 'delivery' ? setShowDelivery(true) : setShowPayment(true)}
            className="w-full py-3.5 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-500 hover:bg-indigo-600 text-white">
            <i className={`fas ${saleType === 'delivery' ? 'fa-truck' : 'fa-credit-card'} mr-2`} />
            {saleType === 'delivery' ? 'Pedido Entrega' : 'Cobrar'} {fmt(cartTotal)}
          </button>
        </div>
      </div>

      {showPayment && (
        <Modal onClose={() => setShowPayment(false)} title="Procesar Pago" icon="fa-credit-card">
          <div className="text-center mb-5">
            <div className="text-xs text-slate-500">Total a pagar</div>
            <div className="text-4xl font-extrabold text-indigo-500">{fmt(cartTotal)}</div>
          </div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Metodo de pago</label>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {['Efectivo', 'QR', 'Mixto'].map(m => (
              <button key={m} onClick={() => setPayMethod(m)}
                className={`p-4 border-2 rounded-lg text-center transition-all ${payMethod === m ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:border-indigo-300'}`}>
                <i className={`fas ${m === 'Efectivo' ? 'fa-money-bill-wave' : m === 'QR' ? 'fa-qrcode' : 'fa-money-check-dollar'} text-2xl block mb-1`} />
                <span className="text-xs font-semibold">{m}</span>
              </button>
            ))}
          </div>
          {payMethod === 'Efectivo' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Efectivo recibido</label>
              <input type="number" value={cashIn} onChange={e => setCashIn(e.target.value)} placeholder="0.00"
                className="w-full p-3 text-2xl font-bold text-center border rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none" autoFocus />
              <div className="flex gap-2 flex-wrap mt-3">
                {[Math.ceil(cartTotal), 50, 100, 200].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                  <button key={v} onClick={() => setCashIn(String(v))} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-indigo-50">{fmt(v)}</button>
                ))}
              </div>
              {parseFloat(cashIn) >= cartTotal && (
                <div className="text-center p-3 mt-3 bg-slate-50 rounded-lg">
                  <div className="text-[11px] text-slate-500">Cambio</div>
                  <div className="text-2xl font-extrabold text-emerald-600">{fmt(round2(parseFloat(cashIn) - cartTotal))}</div>
                </div>
              )}
            </div>
          )}
          {payMethod === 'QR' && (
            <div className="text-center py-5">
              <div className="w-40 h-40 bg-slate-50 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <i className="fas fa-qrcode text-7xl text-indigo-300" />
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 font-semibold text-sm"><i className="fas fa-check-circle mr-1" /> QR simulado - Confirmar para continuar</div>
            </div>
          )}
          {payMethod === 'Mixto' && (
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between font-bold mb-3"><span>Total:</span><span className="text-xl">{fmt(cartTotal)}</span></div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Efectivo</label>
              <input type="number" value={mixtoCash} onChange={e => setMixtoCash(parseFloat(e.target.value) || 0)} min={0} max={cartTotal}
                className="w-full p-2 text-lg font-bold text-center border rounded-lg mb-3" />
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">QR</label>
              <input type="number" value={round2(cartTotal - mixtoCash).toFixed(2)} readOnly
                className="w-full p-2 text-lg font-bold text-center border rounded-lg bg-white" />
            </div>
          )}
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowPayment(false)} className="px-5 py-2.5 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
            <button onClick={doPayment} className="px-6 py-2.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"><i className="fas fa-check mr-1" /> Confirmar</button>
          </div>
        </Modal>
      )}

      {showDelivery && (
        <Modal onClose={() => setShowDelivery(false)} title="Pedido con Entrega" icon="fa-truck">
          <div className="text-center mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">Total productos</div>
            <div className="text-3xl font-extrabold text-indigo-500">{fmt(cartTotal)}</div>
          </div>
          <Field label="Nombre del Cliente" value={dlClient.name} onChange={v => setDlClient({ ...dlClient, name: v })} placeholder="Nombre completo" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefono" value={dlClient.phone} onChange={v => setDlClient({ ...dlClient, phone: v })} placeholder="591..." />
            <Field label="Zona" value={dlClient.zone} onChange={v => setDlClient({ ...dlClient, zone: v })} placeholder="Zona Norte" />
          </div>
          <Field label="Direccion" value={dlClient.addr} onChange={v => setDlClient({ ...dlClient, addr: v })} placeholder="Calle, numero" />
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4">Transporte</label>
          {[{ k: 'incluido' as const, i: 'fa-receipt', t: 'Incluir Transporte', d: 'Se agrega al total' },
            { k: 'pago_entrega' as const, i: 'fa-hand-holding-dollar', t: 'Pago en Entrega', d: 'Paga directo al chofer' }].map(o => (
            <div key={o.k} onClick={() => setDlTransport(o.k)}
              className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer mb-2 transition-all ${dlTransport === o.k ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
              <i className={`fas ${o.i} text-xl text-indigo-500`} />
              <div><div className="font-bold text-sm">{o.t}</div><div className="text-[11px] text-slate-500">{o.d}</div></div>
            </div>
          ))}
          <Field label="Costo Transporte (Bs)" value={String(dlCost)} onChange={v => setDlCost(parseFloat(v) || 0)} type="number" />
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-3">Chofer</label>
          {DRIVERS.map(d => (
            <div key={d.id} onClick={() => setDlDriver(d.id)}
              className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer mb-2 transition-all ${dlDriver === d.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center font-bold"><i className="fas fa-user" /></div>
              <div className="flex-1"><div className="font-bold text-sm">{d.name}</div><div className="text-[11px] text-slate-500">{d.phone}</div></div>
              <span className="text-emerald-500 text-xs"><i className="fab fa-whatsapp" /></span>
            </div>
          ))}
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowDelivery(false)} className="px-5 py-2.5 text-sm font-semibold border border-slate-200 rounded-lg">Cancelar</button>
            <button onClick={doDelivery} className="px-6 py-2.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"><i className="fas fa-check mr-1" /> Confirmar Pedido</button>
          </div>
        </Modal>
      )}

      {showReceipt && (
        <Modal onClose={() => { setShowReceipt(null); }} title="Ticket de Venta" icon="fa-receipt">
          <div className="bg-white border border-dashed border-slate-300 p-6 font-mono text-sm max-w-xs mx-auto">
            <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
              <div className="font-sans font-extrabold text-base">PAOLITA&apos;S MARKET</div>
              <div className="font-sans text-[10px] text-slate-500">Av. Principal #123</div>
              <div className="font-sans text-[10px] text-slate-500">NIT: 0102XXXXXXXX</div>
            </div>
            <div className="text-[10px] mb-2 space-y-0.5">
              <div>Ticket: {showReceipt.id}</div>
              <div>Fecha: {new Date(showReceipt.date).toLocaleString('es-BO')}</div>
              <div>Atiende: {showReceipt.attendedBy}</div>
            </div>
            <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
              {showReceipt.items.map((i: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[11px]"><span>{i.qty}x {i.name}</span><span>{fmt(i.price * i.qty)}</span></div>
              ))}
            </div>
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(showReceipt.subtotal)}</span></div>
              <div className="flex justify-between"><span>IVA (13%):</span><span>{fmt(showReceipt.tax)}</span></div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-dashed border-slate-300 mt-1"><span>TOTAL:</span><span>{fmt(showReceipt.total)}</span></div>
            </div>
            <div className="border-t border-dashed border-slate-300 mt-2 pt-2 text-[11px] space-y-0.5">
              <div className="flex justify-between"><span>Metodo:</span><span>{showReceipt.method}</span></div>
              {showReceipt.method === 'Efectivo' && <div className="flex justify-between"><span>Cambio:</span><span>{fmt(showReceipt.change)}</span></div>}
              {showReceipt.method === 'Mixto' && <><div className="flex justify-between"><span>Efectivo:</span><span>{fmt(showReceipt.cashAmount)}</span></div><div className="flex justify-between"><span>QR:</span><span>{fmt(showReceipt.qrAmount)}</span></div></>}
            </div>
            <div className="text-center border-t border-dashed border-slate-300 mt-2 pt-2 text-[10px] text-slate-500">Gracias por su compra!</div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => window.print()} className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg"><i className="fas fa-print mr-1" /> Imprimir</button>
            <button onClick={() => setShowReceipt(null)} className="px-5 py-2 text-sm font-bold bg-indigo-500 text-white rounded-lg"><i className="fas fa-check mr-1" /> Nueva Venta</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title, icon }: { children: React.ReactNode; onClose: () => void; title: string; icon: string }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-[90%] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-base"><i className={`fas ${icon} mr-2 text-indigo-500`} />{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><i className="fas fa-times" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
    </div>
  );
}
