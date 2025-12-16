import Link from "next/link";
import { Leaf, User } from "lucide-react";
import { MainNav } from "@/components/layout/main-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/db";
import { getInitial } from "@/lib/user-utils";

export function Header() {
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    getSettings().then((settings) => {
      if (settings?.userName) {
        setUserName(settings.userName);
      }
    });
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/70 backdrop-blur-xl border-b border-white/10 dark:border-black/10 shadow-sm supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6 max-w-7xl mx-auto">
        <Link href="/" className="mr-8 flex items-center gap-2 group">
          <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary/20 transition-colors">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
            VerdantView
          </span>
        </Link>

        <div className="hidden md:flex">
          <MainNav />
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <ThemeToggle />
          <Link href="/settings">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-secondary/50 border border-border hover:bg-secondary/50"
            >
              <span className="font-semibold text-primary">
                {getInitial(userName)}
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
