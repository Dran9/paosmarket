'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import LoginScreen from '@/components/LoginScreen';
import AppShell from '@/components/AppShell';

export default function Home() {
  const { currentUser, login, initHistoricalData, initialized, employees } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !initialized) initHistoricalData(); }, [mounted, initialized, initHistoricalData]);

  if (!mounted) return <div className="flex items-center justify-center h-screen bg-slate-900 text-white"><i className="fas fa-spinner fa-spin mr-3" /> Cargando...</div>;
  if (!currentUser) return <LoginScreen users={employees.filter(e => e.active !== false)} onLogin={login} />;
  return <AppShell />;
}
