import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "v2.1 DB · Paolita's Market",
  description: 'Sistema de punto de venta para Paolitas Market',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
      </head>
      <body className="bg-slate-100 text-slate-800 overflow-hidden h-screen">{children}</body>
    </html>
  );
}
