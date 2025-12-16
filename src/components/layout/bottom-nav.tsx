"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PieChart, ScanLine, PiggyBank, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
    },
    {
      href: "/statistics",
      label: "Stats",
      icon: PieChart,
    },
    {
      href: "/scan",
      label: "Scan",
      icon: ScanLine,
    },
    {
      href: "/savings",
      label: "Savings",
      icon: PiggyBank,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-between px-4 pb-safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-6 w-6 transition-transform duration-200",
                  isActive && "scale-105"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
