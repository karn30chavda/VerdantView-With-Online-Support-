"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  ChevronLeft,
  Loader2,
  Shield,
  Mail,
  User,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await user.update({
        firstName,
        lastName,
      });
      toast({ title: "Profile updated successfully!" });
    } catch (error: any) {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container p-2 gap-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account</h1>
          <p className="text-muted-foreground">
            Manage your profile details and security.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-sm bg-background">
        <CardContent className="p-0 space-y-8">
          <Separator />

          {/* Section: Personal Info */}
          <div className="space-y-4 px-1">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5 text-primary" />
              <h3>Personal Information</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                {isUpdating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </div>

          <Separator />

          {/* Section: Security */}
          <div className="space-y-4 px-1">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              <h3>Security & Login</h3>
            </div>
            <div className="bg-muted/30 border p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium">Password & Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Manage your password and 2FA settings.
                </p>
              </div>
              <Button variant="outline" onClick={() => openUserProfile()}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Manage
              </Button>
            </div>
          </div>

          <Separator />

          {/* Section: Actions */}
          <div className="flex justify-start px-1 pt-2">
            <Button
              variant="destructive"
              className="w-full sm:w-auto" // stronger red button
              onClick={() => signOut({ redirectUrl: "/" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
