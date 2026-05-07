const BASE = process.env.NEXT_PUBLIC_API_URL || '';
const TOKEN_KEY = 'pos-jwt';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (typeof window === 'undefined') return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data as T;
}

export const api = {
  auth: {
    login: (id: string, password: string) =>
      req<{ token: string; user: { id: string; name: string; role: string; avatar: string; color: string; can_dashboard: number } }>(
        'POST', '/api/auth/login', { id, password }
      ),
  },
  products: {
    list: () => req<any[]>('GET', '/api/products'),
    add: (p: unknown) => req<{ id: number }>('POST', '/api/products', p),
    update: (id: number, p: unknown) => req<{ ok: boolean }>('PUT', `/api/products/${id}`, p),
    delete: (id: number) => req<{ ok: boolean }>('DELETE', `/api/products/${id}`),
    stock: (id: number, qty: number) => req<{ ok: boolean }>('POST', `/api/products/${id}/stock`, { qty }),
  },
  transactions: {
    list: (params?: Record<string, string>) =>
      req<any[]>('GET', '/api/transactions' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data: unknown) =>
      req<{ id: string; subtotal: number; tax: number; total: number; change_amount: number }>(
        'POST', '/api/transactions', data
      ),
  },
  orders: {
    list: () => req<any[]>('GET', '/api/orders'),
    create: (data: unknown) =>
      req<{ id: string; subtotal: number; tax: number; total: number }>(
        'POST', '/api/orders', data
      ),
    updateStatus: (id: string, status: string) =>
      req<{ ok: boolean }>('PUT', `/api/orders/${id}/status`, { status }),
  },
  expenses: {
    list: () => req<any[]>('GET', '/api/expenses'),
    add: (e: unknown) => req<{ id: string }>('POST', '/api/expenses', e),
    update: (id: string, e: unknown) => req<{ ok: boolean }>('PUT', `/api/expenses/${id}`, e),
    delete: (id: string) => req<{ ok: boolean }>('DELETE', `/api/expenses/${id}`),
  },
  drivers: {
    list: () => req<any[]>('GET', '/api/drivers'),
  },
  users: {
    list: () => req<any[]>('GET', '/api/users'),
    add: (u: unknown) => req<{ ok: boolean }>('POST', '/api/users', u),
    update: (id: string, u: unknown) => req<{ ok: boolean }>('PUT', `/api/users/${id}`, u),
    delete: (id: string) => req<{ ok: boolean }>('DELETE', `/api/users/${id}`),
  },
  dashboard: (params?: Record<string, string>) =>
    req<any>('GET', '/api/dashboard' + (params ? '?' + new URLSearchParams(params) : '')),
};
