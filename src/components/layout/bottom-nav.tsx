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
    <div className="fixed bottom-5 left-4 right-4 z-50 md:hidden">
      <div className="flex h-16 items-center justify-between rounded-full border border-white/20 bg-background/80 px-2 shadow-2xl shadow-black/10 backdrop-blur-xl transition-all supports-[backdrop-filter]:bg-background/60 dark:border-white/10 dark:bg-black/60 dark:shadow-black/20">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-300",
                "hover:text-primary"
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm scale-100"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground bg-transparent"
                )}
              >
                <item.icon
                  className={cn(
                    "h-6 w-6 transition-transform duration-300",
                    isActive && "scale-110 stroke-[2.5px]"
                  )}
                />
              </div>

              {/* Optional: Add a subtle indicator dot for inactive items that have notifications? 
                  For now, we keep it clean. */}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
