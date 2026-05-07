export const IVA_RATE = 0.13;

export function fmt(n: number): string {
  return 'Bs ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function fmtN(n: number): string {
  return n.toLocaleString('es-BO');
}

export function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' });
}

export function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString('es-BO', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcTax(subtotal: number): number {
  return round2(subtotal * IVA_RATE);
}

export function calcTotal(subtotal: number): number {
  return round2(subtotal + calcTax(subtotal));
}

export function getStockStatus(stock: number) {
  if (stock === 0) return { label:'Agotado', cls:'bg-red-100 text-red-700', barCls:'bg-red-500', bar:0 };
  if (stock <= 10) return { label:'Critico', cls:'bg-red-100 text-red-700', barCls:'bg-red-500', bar:Math.max(5,stock) };
  if (stock <= 20) return { label:'Bajo', cls:'bg-yellow-100 text-yellow-700', barCls:'bg-yellow-500', bar:stock };
  return { label:'Bueno', cls:'bg-green-100 text-green-700', barCls:'bg-green-500', bar:Math.min(100,stock) };
}

export function rand(a: number, b: number): number {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
