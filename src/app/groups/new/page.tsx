"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

function generateJoinCode() {
  // Generate a random 6-character alphanumeric code
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function NewGroupPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!name.trim()) return;
    if (!user) {
      toast({
        title: "You must be logged in to create a group",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const joinCode = generateJoinCode();

      // 1. Create Group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: name.trim(),
          created_by_user_id: user.id,
          join_code: joinCode,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Add Creator as Admin Member
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          role: "admin",
          member_name: user.fullName || user.firstName || "Unknown",
          member_email: user.primaryEmailAddress?.emailAddress || "",
        });

      if (memberError) throw memberError;

      toast({ title: "Group created successfully!" });
      router.push("/groups");
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({
        title: "Failed to create group",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/groups">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Group</h1>
          <p className="text-muted-foreground">
            Start a new shared budget or expense group.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
          <CardDescription>
            Give your group a name and invite members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="e.g. Home, Vacation, Roommates"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleCreateGroup}
            disabled={!name.trim() || loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Group
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
