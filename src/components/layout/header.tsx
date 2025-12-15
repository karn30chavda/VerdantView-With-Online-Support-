import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { MainNav } from '@/components/layout/main-nav';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Leaf className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">VerdantView</span>
        </Link>
        <MainNav />
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
