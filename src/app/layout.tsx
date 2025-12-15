
'use client';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';
import { useEffect } from 'react';
import { clearOldReminders } from '@/lib/db';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

// Metadata can't be dynamically generated in a client component,
// so we'll define it statically here. For dynamic metadata,
// you would need a different approach.
// export const metadata: Metadata = {
//   title: 'VerdantView',
//   description: 'Your personal expense tracker, offline-first and AI-powered.',
//   manifest: '/manifest.json',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(async (registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
          // Clean up old reminders on app load
          await clearOldReminders();
        })
        .catch((error) => console.error('Service Worker registration failed:', error));
    }

    // Request persistent storage
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((persistent) => {
        if (persistent) {
          console.log('Storage will not be cleared except by explicit user action.');
        } else {
          console.log('Storage may be cleared by the browser under storage pressure.');
        }
      });
    }

  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <link rel="manifest" href="/manifest.json" />
        <title>VerdantView</title>
        <meta name="description" content="Your personal expense tracker, offline-first and AI-powered." />
      </head>
      <body className={`font-body antialiased ${inter.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="relative flex min-h-screen w-full flex-col">
            <Header />
            <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
