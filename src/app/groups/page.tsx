"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Users,
  AlertTriangle,
  WifiOff,
  Loader2,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/lib/supabase";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { prefetchMultipleGroups } from "@/lib/cache-utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent, // Fixed import
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

function JoinGroupForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const handleJoin = async () => {
    if (!code || !user) return;
    setLoading(true);

    try {
      // 1. Find group by code
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("id, name")
        .eq("join_code", code.toUpperCase())
        .single();

      if (groupError || !group) {
        toast({
          title: "Invalid code",
          description: "Group not found.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 2. Add member
      const { error: joinError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "member",
        member_name: user.fullName || user.firstName || "Unknown",
        member_email: user.primaryEmailAddress?.emailAddress || "",
      });

      // If already member (unique constraint), specific message?
      if (joinError) {
        if (joinError.code === "23505") {
          // Unique violation
          toast({
            title: "Already a member",
            description: "You are already in this group.",
          });
        } else {
          throw joinError;
        }
      } else {
        toast({
          title: "Joined group!",
          description: `You are now a member of ${group.name}`,
        });
        window.location.reload(); // Simple reload to refresh list
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error joining group",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="code">Join Code</Label>
        <Input
          id="code"
          placeholder="e.g. 8X922B"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="uppercase font-mono tracking-wider"
        />
      </div>
      <Button
        onClick={handleJoin}
        disabled={loading || code.length < 6}
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Join Group
      </Button>
    </div>
  );
}

function GroupsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card
          key={i}
          className="overflow-hidden border-none shadow-sm bg-muted/20"
        >
          <CardHeader className="pb-4">
            <Skeleton className="h-6 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function GroupsPage() {
  const [isConfigured, setIsConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const { user, isLoaded } = useUser();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  useEffect(() => {
    async function fetchGroups() {
      if (!user) {
        setLoading(false);
        return;
      }

      // Try to load from cache first
      const cachedGroups = localStorage.getItem(`groups_${user.id}`);
      if (cachedGroups) {
        setGroups(JSON.parse(cachedGroups));
      }

      if (!isOnline) {
        setLoading(false);
        return;
      }

      try {
        // Fetch groups where the user is a member
        const { data: memberData, error: memberError } = await supabase
          .from("group_members")
          .select(
            "group_id, groups (id, name, created_at, created_by_user_id, join_code)"
          )
          .eq("user_id", user.id);

        if (memberError) throw memberError;

        // Transform data
        const fetchedGroups = memberData.map((item: any) => item.groups);
        setGroups(fetchedGroups);

        // Cache for offline use
        localStorage.setItem(
          `groups_${user.id}`,
          JSON.stringify(fetchedGroups)
        );

        // 🔥 Proactively cache all group details in the background
        if (fetchedGroups.length > 0) {
          const groupIds = fetchedGroups.map((g: any) => g.id);
          // Fire and forget - don't wait for this
          prefetchMultipleGroups(groupIds, user.id).catch((err) =>
            console.error("Background prefetch error:", err)
          );
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded && user) {
      fetchGroups();
    } else if (isLoaded && !user) {
      setLoading(false);
    }
  }, [user, isLoaded, isOnline]);

  if (!isConfigured) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuration Missing</AlertTitle>
          <AlertDescription>
            You need to set up Supabase and Clerk to use the Groups feature.
            Please add <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and{" "}
            <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> to your .env.local
            file.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      {!isOnline && (
        <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">
            Offline Mode
          </AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            You're currently offline. Showing cached data. Some features may be
            limited.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">
            Manage shared expenses with friends and family.
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={!isOnline}>
                Join Group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Join a Group</DialogTitle>
                <DialogDescription>
                  Enter the 6-character code shared by the group admin.
                </DialogDescription>
              </DialogHeader>
              <JoinGroupForm />
            </DialogContent>
          </Dialog>

          <Button
            asChild
            className="gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md transition-all hover:shadow-lg"
            disabled={!isOnline}
          >
            <Link href="/groups/new">
              <PlusCircle className="h-4 w-4" />
              Create Group
            </Link>
          </Button>
        </div>
      </div>

      {loading || !isLoaded ? (
        <GroupsSkeleton />
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted p-8 text-center md:p-16 bg-muted/10 hover:bg-muted/20 transition-colors">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Users className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="mt-6 text-xl font-semibold">No groups yet</h3>
          <p className="mb-6 mt-2 text-muted-foreground max-w-sm">
            Create a group to start sharing expenses with others. Track balances
            and settle up easily.
          </p>
          <Button asChild variant="outline">
            <Link href="/groups/new">Create your first group</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="group relative block"
            >
              <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-emerald-500/50 group-hover:-translate-y-1">
                {/* Decorative top strip */}
                <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-green-400 opacity-80" />

                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl group-hover:text-emerald-600 transition-colors">
                      {group.name}
                    </CardTitle>
                    <div className="bg-muted px-2 py-1 rounded text-xs font-mono text-muted-foreground">
                      {group.join_code}
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    Created {new Date(group.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                    <Users className="h-4 w-4 text-emerald-500" />
                    <span>View Dashboard</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
