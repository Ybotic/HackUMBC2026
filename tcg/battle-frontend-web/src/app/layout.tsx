import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ember Arena — TCG Battle Prototype',
  description:
    'A browser-based trading card battle interface and animation prototype.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
