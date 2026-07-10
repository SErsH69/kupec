import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'kupec — аналитика маркета',
  description: 'Цены рынка, выгода крафта и перекупа, движения цен для GTA RP.',
};

export const viewport: Viewport = {
  themeColor: '#0a0e14',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
