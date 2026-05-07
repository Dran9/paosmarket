'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { USERS } from '@/lib/data';
import { Store } from 'lucide-react';

export default function LoginScreen() {
  const { loginWithPassword, employees, settings, loading } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const fromStore = employees.filter(e => e.active !== false);
  // Mientras la API no ha cargado, mostrar usuarios hardcodeados como fallback
  const activeUsers = fromStore.length > 0 ? fromStore : USERS.filter(u => u.active !== false);

  const handleUserClick = (id: string) => {
    setSelected(id);
    setPassword('');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    try {
      await loginWithPassword(selected, password);
    } catch {
      setError('Contraseña incorrecta');
      setPassword('');
    }
  };

  const selectedUser = activeUsers.find(u => u.id === selected);

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
      <div className="text-center text-white w-full max-w-lg px-4">
        <div className="w-20 h-20 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <Store size={36} />
        </div>
        <h2 className="text-3xl font-extrabold mb-1">{settings.businessName}</h2>
        <p className="text-white/50 mb-2 text-sm">{settings.businessTagline}</p>
        <p className="text-amber-400 mb-6 text-xs font-mono">v2.1 · DB MODE</p>

        {!selected ? (
          <>
            <p className="text-white/50 mb-5 text-sm">Selecciona tu usuario</p>
            <div className="flex gap-4 justify-center flex-wrap">
              {activeUsers.map(u => (
                <button key={u.id} onClick={() => handleUserClick(u.id)}
                  className="w-44 p-6 bg-slate-800 rounded-xl cursor-pointer border-2 border-transparent hover:border-indigo-400 transition-all hover:-translate-y-1 text-left">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-3"
                    style={{ background: u.color + '22', color: u.color }}>{u.avatar || u.name[0]}</div>
                  <div className="font-bold text-base mb-0.5 text-center">{u.name}</div>
                  <div className="text-xs text-white/50 text-center">{u.role === 'owner' ? 'Propietaria' : 'Vendedora'}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-8 max-w-xs mx-auto">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-3"
              style={{ background: (selectedUser?.color || '#6366f1') + '22', color: selectedUser?.color || '#6366f1' }}>
              {selectedUser?.avatar || selectedUser?.name[0]}
            </div>
            <div className="font-bold text-lg mb-5">{selectedUser?.name}</div>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder-white/30 border-2 border-transparent focus:border-indigo-500 outline-none mb-3 text-center text-lg tracking-widest"
              />
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <button type="submit" disabled={loading || !password}
                className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 font-bold transition-all mb-3">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              <button type="button" onClick={() => setSelected(null)}
                className="w-full py-2 text-sm text-white/40 hover:text-white/70 transition-all">
                ← Cambiar usuario
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
