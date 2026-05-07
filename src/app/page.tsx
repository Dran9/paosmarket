'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getToken } from '@/lib/api';
import LoginScreen from '@/components/LoginScreen';
import AppShell from '@/components/AppShell';

export default function Home() {
  const { currentUser, loadData, logout } = useStore();
  const [mounted, setMounted] = useState(false);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    setMounted(true);
    // If we have a persisted user but no JWT, force logout
    if (!getToken()) {
      logout();
    } else if (currentUser) {
      // Valid token + user: reload fresh data
      loadData().finally(() => setRestoring(false));
      return;
    }
    setRestoring(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted || restoring) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <LoginScreen />;
  return <AppShell />;
}
