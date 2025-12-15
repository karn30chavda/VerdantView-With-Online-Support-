'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Leaf } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/scan', label: 'Scan' },
  { href: '/reminders', label: 'Reminders' },
  { href: '/settings', label: 'Settings' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
            <SheetTitle asChild>
                <Link href="/" className="mb-6 flex items-center" onClick={() => setOpen(false)}>
                <Leaf className="mr-2 h-6 w-6 text-primary" />
                <span className="font-bold">VerdantView</span>
                </Link>
            </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col space-y-3 mt-6">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`text-lg ${pathname === href ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
