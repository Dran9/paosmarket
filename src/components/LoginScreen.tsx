'use client';
import { User } from '@/lib/data';

export default function LoginScreen({ users, onLogin }: { users: User[]; onLogin: (u: User) => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
      <div className="text-center text-white">
        <div className="w-20 h-20 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl mx-auto mb-4">
          <i className="fas fa-store" />
        </div>
        <h2 className="text-3xl font-extrabold mb-2">Paolita&apos;s Market</h2>
        <p className="text-white/50 mb-8">Selecciona tu usuario para continuar</p>
        <div className="flex gap-5 justify-center">
          {users.map(u => (
            <div key={u.id} onClick={() => onLogin(u)}
              className="w-52 p-8 bg-slate-800 rounded-xl cursor-pointer border-2 border-transparent hover:border-indigo-400 transition-all hover:-translate-y-1">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-4"
                style={{ background: u.color + '22', color: u.color }}>{u.avatar}</div>
              <div className="font-bold text-lg mb-1">{u.name}</div>
              <div className="text-xs text-white/50">{u.role === 'owner' ? 'Propietaria' : 'Vendedora'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
