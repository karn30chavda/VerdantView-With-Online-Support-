"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { getSettings, updateSettings } from "@/lib/db";

export function UserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    async function syncUserData() {
      if (!isLoaded || !user) return;

      const currentName = user.fullName || user.firstName || "User";

      // Get current settings to compare (avoid unnecessary writes)
      const settings = await getSettings();

      if (settings?.userName !== currentName) {
        console.log("Syncing Clerk name to local DB for offline support...");
        await updateSettings({ userName: currentName });
      }
    }

    syncUserData();
  }, [user, isLoaded]);

  return null; // This component renders nothing
}
