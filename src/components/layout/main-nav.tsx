"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Wallet,
  PieChart,
  ScanLine,
  PiggyBank,
  Bell,
  Settings,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/statistics", label: "Stats", icon: PieChart },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden lg:flex items-center gap-1">
      {navLinks.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-in-out",
              isActive
                ? "text-primary-foreground bg-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive && "stroke-[2.5px]")} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
