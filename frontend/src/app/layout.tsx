import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CertiCraft — Certificate Template Editor & PDF Generator',
  description:
    'Visual certificate template designer and precision PDF generator with multi-field overlays, dynamic placeholders, and digital signatures.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
