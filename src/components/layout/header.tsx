"use client";

import Link from "next/link";
import { Leaf, LogIn, Settings, User } from "lucide-react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
  useClerk,
} from "@clerk/nextjs";
import { MainNav } from "@/components/layout/main-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <header className="sticky top-0 z-40 flex w-full justify-center bg-background/80 backdrop-blur-lg border-b">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-green-600 dark:text-green-500" />
            <span className="font-bold">VerdantView</span>
          </Link>
          <MainNav />
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="sm" className="px-3">
                <LogIn className="h-4 w-4 md:hidden" />
                <span className="hidden md:inline">Sign In</span>
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/account">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 hover:bg-transparent"
              >
                <Avatar className="h-8 w-8 border-2 border-emerald-500/50">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white font-semibold text-sm">
                    {user?.firstName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </Link>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
