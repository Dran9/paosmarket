'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { type User } from '@/lib/data';

const TIMEZONES = [
  { value: 'America/La_Paz', label: 'La Paz / Sucre (BOT UTC-4)' },
  { value: 'America/Lima', label: 'Lima / Bogotá (PET UTC-5)' },
  { value: 'America/Santiago', label: 'Santiago (CLT UTC-3/-4)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART UTC-3)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT UTC-3)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (CST UTC-6)' },
  { value: 'America/Bogota', label: 'Bogotá (COT UTC-5)' },
  { value: 'America/Caracas', label: 'Caracas (VET UTC-4)' },
  { value: 'America/Asuncion', label: 'Asunción (PYT UTC-4)' },
  { value: 'America/Montevideo', label: 'Montevideo (UYT UTC-3)' },
];

const CURRENCIES = [
  { code: 'BOB', symbol: 'Bs.', name: 'Boliviano' },
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño' },
];

const AVATAR_COLORS = [
  '#ec4899','#f59e0b','#6366f1','#22c55e','#ef4444',
  '#3b82f6','#a855f7','#14b8a6','#f97316','#64748b',
];

type Tab = 'negocio' | 'general' | 'empleados';

const emptyEmployee: Omit<User, 'id'> = {
  name: '', firstName: '', lastName: '', phone: '', documentNumber: '',
  address: '', role: 'vendedora', avatar: '', color: '#6366f1',
  canDashboard: false, active: true,
};

export default function SettingsView() {
  const { settings, updateSettings, employees, addEmployee, updateEmployee, deleteEmployee } = useStore();
  const [tab, setTab] = useState<Tab>('negocio');

  // --- Negocio form ---
  const [biz, setBiz] = useState({ ...settings });
  const [bizSaved, setBizSaved] = useState(false);

  const saveBiz = () => {
    updateSettings(biz);
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 2000);
  };

  // --- General form ---
  const [gen, setGen] = useState({ ...settings });
  const [genSaved, setGenSaved] = useState(false);

  const saveGen = () => {
    updateSettings(gen);
    setGenSaved(true);
    setTimeout(() => setGenSaved(false), 2000);
  };

  // --- Empleados ---
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<User, 'id'>>({ ...emptyEmployee });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openNew = () => {
    setForm({ ...emptyEmployee });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (emp: User) => {
    setForm({
      name: emp.name, firstName: emp.firstName || '', lastName: emp.lastName || '',
      phone: emp.phone || '', documentNumber: emp.documentNumber || '',
      address: emp.address || '', role: emp.role, avatar: emp.avatar,
      color: emp.color, canDashboard: emp.canDashboard, active: emp.active ?? true,
    });
    setEditingId(emp.id);
    setShowModal(true);
  };

  const handleFormChange = (key: keyof typeof form, val: unknown) => {
    setForm(f => {
      const updated = { ...f, [key]: val };
      if (key === 'firstName' || key === 'lastName') {
        const fn = key === 'firstName' ? String(val) : (f.firstName || '');
        const ln = key === 'lastName' ? String(val) : (f.lastName || '');
        updated.name = [fn, ln].filter(Boolean).join(' ') || fn || ln;
        updated.avatar = (String(fn)[0] || '').toUpperCase();
      }
      return updated;
    });
  };

  const saveEmployee = () => {
    if (!form.firstName?.trim()) return;
    if (editingId) {
      updateEmployee(editingId, form);
    } else {
      addEmployee(form);
    }
    setShowModal(false);
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'negocio', label: 'Datos del Negocio', icon: 'fa-store' },
    { key: 'general', label: 'General', icon: 'fa-sliders' },
    { key: 'empleados', label: 'Empleados', icon: 'fa-users' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Ajustes</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configura tu negocio, preferencias y equipo</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <i className={`fas ${t.icon} text-xs`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── NEGOCIO ── */}
      {tab === 'negocio' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
            <i className="fas fa-store text-indigo-400" /> Información del Negocio
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre del negocio" span>
              <input value={biz.businessName} onChange={e => setBiz(b => ({ ...b, businessName: e.target.value }))}
                className={input} placeholder="Paolita's Market" />
            </Field>
            <Field label="Eslogan">
              <input value={biz.businessTagline} onChange={e => setBiz(b => ({ ...b, businessTagline: e.target.value }))}
                className={input} placeholder="Tu tienda de confianza" />
            </Field>
            <Field label="NIT / Número tributario">
              <input value={biz.businessNIT} onChange={e => setBiz(b => ({ ...b, businessNIT: e.target.value }))}
                className={input} placeholder="0102XXXXXXXX" />
            </Field>
            <Field label="Teléfono">
              <input value={biz.businessPhone} onChange={e => setBiz(b => ({ ...b, businessPhone: e.target.value }))}
                className={input} placeholder="+591 7X XXX XXX" />
            </Field>
            <Field label="Correo electrónico">
              <input type="email" value={biz.businessEmail} onChange={e => setBiz(b => ({ ...b, businessEmail: e.target.value }))}
                className={input} placeholder="contacto@paolitasmarket.com" />
            </Field>
            <Field label="Ciudad">
              <input value={biz.businessCity} onChange={e => setBiz(b => ({ ...b, businessCity: e.target.value }))}
                className={input} placeholder="La Paz" />
            </Field>
            <Field label="Dirección" span>
              <input value={biz.businessAddress} onChange={e => setBiz(b => ({ ...b, businessAddress: e.target.value }))}
                className={input} placeholder="Av. Ejemplo 123, Zona Centro" />
            </Field>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={saveBiz}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                bizSaved ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}>
              <i className={`fas ${bizSaved ? 'fa-check' : 'fa-floppy-disk'}`} />
              {bizSaved ? 'Guardado' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* ── GENERAL ── */}
      {tab === 'general' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
              <i className="fas fa-coins text-amber-400" /> Moneda
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Moneda" span>
                <select value={gen.currency} onChange={e => {
                  const c = CURRENCIES.find(x => x.code === e.target.value);
                  setGen(g => ({ ...g, currency: e.target.value, currencySymbol: c?.symbol || g.currencySymbol }));
                }} className={input}>
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
                  ))}
                </select>
              </Field>
              <Field label="Símbolo personalizado">
                <input value={gen.currencySymbol} onChange={e => setGen(g => ({ ...g, currencySymbol: e.target.value }))}
                  className={input} placeholder="Bs." maxLength={5} />
              </Field>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
              <i className="fas fa-clock text-blue-400" /> Zona Horaria
            </h2>
            <Field label="Zona horaria del sistema" span>
              <select value={gen.timezone} onChange={e => setGen(g => ({ ...g, timezone: e.target.value }))} className={input}>
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </Field>
            <p className="text-xs text-slate-400">
              <i className="fas fa-info-circle mr-1" />
              Todas las fechas y horas de transacciones se registran con esta zona horaria.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
              <i className="fas fa-percent text-green-400" /> Impuestos y Numeración
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tasa de IVA (%)">
                <input type="number" min={0} max={100} step={0.1}
                  value={gen.taxRate} onChange={e => setGen(g => ({ ...g, taxRate: parseFloat(e.target.value) || 0 }))}
                  className={input} />
              </Field>
              <Field label="Stock mínimo de alerta">
                <input type="number" min={1} value={gen.lowStockThreshold}
                  onChange={e => setGen(g => ({ ...g, lowStockThreshold: parseInt(e.target.value) || 1 }))}
                  className={input} />
              </Field>
              <Field label="Prefijo de tickets">
                <input value={gen.ticketPrefix} onChange={e => setGen(g => ({ ...g, ticketPrefix: e.target.value }))}
                  className={input} placeholder="T-" maxLength={6} />
              </Field>
              <Field label="Prefijo de pedidos">
                <input value={gen.orderPrefix} onChange={e => setGen(g => ({ ...g, orderPrefix: e.target.value }))}
                  className={input} placeholder="PED-" maxLength={6} />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveGen}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                genSaved ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}>
              <i className={`fas ${genSaved ? 'fa-check' : 'fa-floppy-disk'}`} />
              {genSaved ? 'Guardado' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* ── EMPLEADOS ── */}
      {tab === 'empleados' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{employees.length} empleado{employees.length !== 1 ? 's' : ''} registrado{employees.length !== 1 ? 's' : ''}</p>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all">
              <i className="fas fa-plus" /> Agregar empleado
            </button>
          </div>

          <div className="space-y-2">
            {employees.map(emp => (
              <div key={emp.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-extrabold flex-shrink-0"
                  style={{ background: emp.color + '22', color: emp.color }}>
                  {emp.avatar || (emp.firstName?.[0] || emp.name[0]).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm">{emp.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      emp.role === 'owner' ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-500'
                    }`}>{emp.role === 'owner' ? 'Propietaria' : 'Vendedora'}</span>
                    {emp.phone && <span><i className="fas fa-phone mr-1 opacity-50" />{emp.phone}</span>}
                    {emp.documentNumber && <span><i className="fas fa-id-card mr-1 opacity-50" />{emp.documentNumber}</span>}
                    {emp.canDashboard && (
                      <span className="text-indigo-500"><i className="fas fa-chart-line mr-1" />Dashboard</span>
                    )}
                  </div>
                  {emp.address && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      <i className="fas fa-location-dot mr-1 opacity-50" />{emp.address}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(emp)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-xs">
                    <i className="fas fa-pen" />
                  </button>
                  {confirmDelete === emp.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { deleteEmployee(emp.id); setConfirmDelete(null); }}
                        className="px-2 py-1 bg-red-500 text-white text-[10px] rounded-md font-semibold">Sí, eliminar</button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] rounded-md font-semibold">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(emp.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all text-xs">
                      <i className="fas fa-trash" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL EMPLEADO ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {editingId ? 'Editar empleado' : 'Nuevo empleado'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Completa los datos del colaborador</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <i className="fas fa-xmark" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Avatar preview */}
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-extrabold flex-shrink-0"
                  style={{ background: (form.color || '#6366f1') + '22', color: form.color || '#6366f1' }}>
                  {form.avatar || '?'}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Color del avatar</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {AVATAR_COLORS.map(c => (
                      <button key={c} onClick={() => handleFormChange('color', c)}
                        className={`w-6 h-6 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre *">
                  <input value={form.firstName || ''} onChange={e => handleFormChange('firstName', e.target.value)}
                    className={input} placeholder="Esperanza" />
                </Field>
                <Field label="Apellido">
                  <input value={form.lastName || ''} onChange={e => handleFormChange('lastName', e.target.value)}
                    className={input} placeholder="Mamani" />
                </Field>
                <Field label="Teléfono">
                  <input value={form.phone || ''} onChange={e => handleFormChange('phone', e.target.value)}
                    className={input} placeholder="+591 7X XXX XXX" />
                </Field>
                <Field label="Número de documento (CI)">
                  <input value={form.documentNumber || ''} onChange={e => handleFormChange('documentNumber', e.target.value)}
                    className={input} placeholder="1234567 LP" />
                </Field>
                <Field label="Dirección de vivienda" span>
                  <input value={form.address || ''} onChange={e => handleFormChange('address', e.target.value)}
                    className={input} placeholder="Av. Mariscal Santa Cruz, El Alto" />
                </Field>
                <Field label="Rol">
                  <select value={form.role} onChange={e => handleFormChange('role', e.target.value)} className={input}>
                    <option value="vendedora">Vendedora</option>
                    <option value="owner">Propietaria</option>
                  </select>
                </Field>
                <Field label="Permisos">
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" checked={form.canDashboard}
                      onChange={e => handleFormChange('canDashboard', e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-500" />
                    <span className="text-sm text-slate-600">Acceso al Dashboard</span>
                  </label>
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-6 pt-0">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all">
                Cancelar
              </button>
              <button onClick={saveEmployee} disabled={!form.firstName?.trim()}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                <i className="fas fa-floppy-disk" />
                {editingId ? 'Guardar cambios' : 'Agregar empleado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── helpers ──
const input = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50 transition-all';

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
