"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Plus,
  Users,
  Trash2,
  Send,
  MessageCircle,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  IndianRupee,
  ChevronLeft,
  Copy,
  Receipt,
  MoreVertical,
  Edit,
  Eye,
  WifiOff,
  Check,
  Target,
  Calendar,
  Video,
  Phone,
  Smile,
  Paperclip,
  Camera,
  Mic,
  SendIcon,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import { supabase } from "@/lib/supabase";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { getCachedGroupDetails } from "@/lib/cache-utils";
import {
  ExpenseCardSkeleton,
  ChatMessageSkeleton,
  MemberCardSkeleton,
  StatsCardSkeleton,
} from "@/components/skeletons/group-skeletons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// --- Types ---
type GroupExpense = {
  id: string;
  title: string;
  amount: number;
  paid_by: string;
  user_id: string;
  created_at: string;
  category: string;
  expense_reactions?: Array<{
    user_id: string;
    reaction_type: string;
  }>;
};

type GroupMember = {
  id: string;
  user_id: string;
  role: "admin" | "member";
  member_name: string;
  member_email: string;
  joined_at: string;
};

type ChatMessage = {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
};

type GroupGoal = {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  created_by: string;
  created_by_name: string;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  goal_contributions?: GoalContribution[];
};

type GoalContribution = {
  id: string;
  goal_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  note?: string;
  contributed_at: string;
};

export default function GroupDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = use(params);
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [goals, setGoals] = useState<GroupGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Goals
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetAmount, setGoalTargetAmount] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [contributingGoalId, setContributingGoalId] = useState<string | null>(
    null
  );
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionNote, setContributionNote] = useState("");

  // Forms
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [newExpenseTitle, setNewExpenseTitle] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");

  const [newMessage, setNewMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Multi-select message deletion
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set()
  );
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Edit expense
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseTitle, setEditExpenseTitle] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");

  // Admin Forms
  const [editGroupName, setEditGroupName] = useState("");
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  async function fetchGroupDetails() {
    if (!user) return;

    // 🔥 Try to load from cache first (works offline!)
    const cached = getCachedGroupDetails(groupId);
    if (cached) {
      setGroup(cached.group);
      setEditGroupName(cached.group.name);
      setMembers(cached.members);
      setExpenses(cached.expenses);
      setMessages(cached.messages);

      const currentUserMember = cached.members.find(
        (m: any) => m.user_id === user.id
      );
      setIsAdmin(currentUserMember?.role === "admin");

      // If offline, stop here
      if (!isOnline) {
        setLoading(false);
        return;
      }
    }

    // If offline and no cache, stop
    if (!isOnline) {
      setLoading(false);
      return;
    }

    try {
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();
      if (groupError) throw groupError;
      setGroup(groupData);
      setEditGroupName(groupData.name);

      fetchMembers();
      fetchExpenses();
      fetchMessages();
      fetchGoals();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error fetching group",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchExpenses() {
    if (!user) return;
    const { data: expensesData, error: expensesError } = await supabase
      .from("expenses")
      .select("*, expense_reactions(reaction_type, user_id)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (!expensesError && expensesData) {
      setExpenses(expensesData as any[]);
    }
  }

  async function fetchMessages() {
    if (!user) return;
    const { data: msgsData, error: msgsError } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (!msgsError) {
      setMessages(msgsData as ChatMessage[]);
    }
  }

  async function fetchMembers() {
    if (!user) return;
    const { data: membersData, error: membersError } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId);
    if (!membersError && membersData) {
      setMembers(membersData);
      const currentUserMember = membersData.find(
        (m: any) => m.user_id === user?.id
      );
      setIsAdmin(currentUserMember?.role === "admin");
    }
  }

  async function fetchGoals() {
    if (!user) return;
    const { data: goalsData, error: goalsError } = await supabase
      .from("group_goals")
      .select("*, goal_contributions(*)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (!goalsError && goalsData) {
      setGoals(goalsData as GroupGoal[]);
    }
  }

  useEffect(() => {
    if (!groupId) return;

    fetchGroupDetails();

    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchMessages()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchExpenses()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchMembers()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_goals",
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchGoals()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_reactions" },
        () => fetchExpenses()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goal_contributions" },
        () => fetchGoals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    setIsSendingMessage(true);

    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId,
      user_id: user.id,
      user_name: user.fullName || "Member",
      content: newMessage.trim(),
    });

    if (error) {
      toast({ title: "Failed to send", variant: "destructive" });
    } else {
      setNewMessage("");
    }
    setIsSendingMessage(false);
  };

  const handleCreateExpense = async () => {
    if (!newExpenseTitle || !newExpenseAmount || !user) return;

    const { error } = await supabase.from("expenses").insert({
      group_id: groupId,
      title: newExpenseTitle,
      amount: parseFloat(newExpenseAmount),
      date: new Date().toISOString(),
      type: "expense",
      category: "Group",
      payment_mode: "Other",
      paid_by: user.id,
      user_id: user.id,
    });

    if (error) {
      toast({
        title: "Error creating expense",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Expense added!" });
      setNewExpenseTitle("");
      setNewExpenseAmount("");
      setIsExpenseDialogOpen(false);
      fetchExpenses(); // Refresh expenses immediately
    }
  };

  const handleUpdateExpense = async (expenseId: string) => {
    if (!editExpenseTitle || !editExpenseAmount) return;

    const { error } = await supabase
      .from("expenses")
      .update({
        title: editExpenseTitle,
        amount: parseFloat(editExpenseAmount),
      })
      .eq("id", expenseId);

    if (error) {
      toast({
        title: "Error updating expense",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Expense updated!" });
      setEditingExpenseId(null);
      fetchExpenses(); // Refresh expenses immediately
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    // Optimistically remove from UI first
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (error) {
      toast({
        title: "Error deleting expense",
        description: error.message,
        variant: "destructive",
      });
      // Revert on error
      fetchExpenses();
    } else {
      toast({ title: "Expense deleted!" });
    }
  };

  const handleReaction = async (expenseId: string, reactionType: string) => {
    if (!user) return;

    const expense = expenses.find((e) => e.id === expenseId);
    const myReaction = expense?.expense_reactions?.find(
      (r) => r.user_id === user.id
    )?.reaction_type;

    // If clicking the same reaction, remove it
    if (myReaction === reactionType) {
      const { error } = await supabase
        .from("expense_reactions")
        .delete()
        .eq("expense_id", expenseId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to remove reaction", error);
      }
      return;
    }

    // Otherwise, add or update the reaction
    const { error } = await supabase.from("expense_reactions").upsert(
      {
        expense_id: expenseId,
        user_id: user.id,
        reaction_type: reactionType,
      },
      { onConflict: "expense_id, user_id" }
    );

    if (error) {
      console.error("Reaction failed", error);
    }
  };

  const handleUpdateGroup = async () => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from("groups")
        .update({ name: editGroupName })
        .eq("id", groupId);

      if (error) throw error;
      toast({ title: "Group name updated" });
      setGroup((prev: any) => ({ ...prev, name: editGroupName })); // Update local state immediately
      fetchGroupDetails();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);
      if (error) throw error;
      toast({ title: "Group deleted" });
      router.push("/groups");
      router.refresh(); // Ensure the groups list is fresh
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // === GOAL MANAGEMENT ===
  const handleCreateGoal = async () => {
    if (!isAdmin || !user) return;
    if (!goalTitle || !goalTargetAmount) {
      toast({
        title: "Missing fields",
        description: "Please fill in title and target amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("group_goals")
        .insert({
          group_id: groupId,
          title: goalTitle,
          description: goalDescription || null,
          target_amount: parseFloat(goalTargetAmount),
          created_by: user.id,
          created_by_name: user.fullName || user.firstName || "User",
        })
        .select()
        .single();

      if (error) throw error;

      setGoals([data, ...goals]);
      toast({ title: "Goal created!" });

      // Reset form
      setGoalTitle("");
      setGoalDescription("");
      setGoalTargetAmount("");
      setIsCreateGoalOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to create goal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleContribute = async () => {
    if (!user || !contributingGoalId) return;
    if (!contributionAmount) {
      toast({
        title: "Missing amount",
        description: "Please enter contribution amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(contributionAmount);

      // Insert contribution
      const { error: contribError } = await supabase
        .from("goal_contributions")
        .insert({
          goal_id: contributingGoalId,
          user_id: user.id,
          user_name: user.fullName || user.firstName || "User",
          amount,
          note: contributionNote || null,
        });

      if (contribError) throw contribError;

      toast({ title: `Contributed ₹${amount}!` });

      // Update local state immediately (Optimistic Update)
      setGoals((prevGoals) =>
        prevGoals.map((g) => {
          if (g.id === contributingGoalId) {
            const newContribution: GoalContribution = {
              id: Math.random().toString(), // Temporary ID
              goal_id: contributingGoalId,
              user_id: user.id,
              user_name: user.fullName || user.firstName || "User",
              amount: amount,
              note: contributionNote || undefined,
              contributed_at: new Date().toISOString(),
            };
            return {
              ...g,
              current_amount: g.current_amount + amount,
              goal_contributions: [
                newContribution,
                ...(g.goal_contributions || []),
              ],
            };
          }
          return g;
        })
      );

      // Reset form
      setContributionAmount("");
      setContributionNote("");
      setContributingGoalId(null);

      // Refresh goals from server to sync with database
      const { data: goalsData } = await supabase
        .from("group_goals")
        .select("*, goal_contributions(*)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (goalsData) {
        setGoals(goalsData as GroupGoal[]);
      }
    } catch (error: any) {
      toast({
        title: "Failed to contribute",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!isAdmin) return;
    if (!confirm("Delete this goal?")) return;

    try {
      const { error } = await supabase
        .from("group_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;

      setGoals(goals.filter((g) => g.id !== goalId));
      toast({ title: "Goal deleted" });
    } catch (error: any) {
      toast({
        title: "Failed to delete goal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async (
    messageId: string,
    messageOwnerId: string
  ) => {
    // Check permission: only message owner
    if (messageOwnerId !== user?.id) {
      toast({
        title: "Permission denied",
        description: "Only message owners can delete their own messages",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("group_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      // Update local state
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      toast({
        title: "Message deleted",
        description: "The message has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessages.size === 0) return;

    try {
      const messagesToDelete = Array.from(selectedMessages);
      const { error } = await supabase
        .from("group_messages")
        .delete()
        .in("id", messagesToDelete);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => !selectedMessages.has(m.id)));
      setSelectedMessages(new Set());
      setIsSelectMode(false);

      toast({
        title: "Messages deleted",
        description: `${messagesToDelete.length} message${
          messagesToDelete.length > 1 ? "s" : ""
        } removed`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete messages",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message?.user_id !== user?.id) {
      return;
    }

    setSelectedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleMessageLongPress = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message?.user_id !== user?.id) return;

    setIsSelectMode(true);
    setSelectedMessages(new Set([messageId]));
  };

  const handleCancelSelection = () => {
    setIsSelectMode(false);
    setSelectedMessages(new Set());
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      toast({ title: "Member removed" });
      setMembers((prev) => prev.filter((m) => m.id !== memberId)); // Update local state immediately
      fetchGroupDetails();
    } catch (error: any) {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getMyReaction = (expense: GroupExpense) => {
    return expense.expense_reactions?.find((r) => r.user_id === user?.id)
      ?.reaction_type;
  };

  const getReactionCount = (expense: GroupExpense, type: string) => {
    return (
      expense.expense_reactions?.filter((r) => r.reaction_type === type)
        .length || 0
    );
  };

  const getReactionUsers = (expense: GroupExpense, type: string) => {
    const reactors =
      expense.expense_reactions?.filter((r) => r.reaction_type === type) || [];
    return reactors.map((r) => {
      const member = members.find((m) => m.user_id === r.user_id);
      return member?.member_name || "Unknown";
    });
  };

  const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberSpending = members
    .map((m) => {
      const spent = expenses
        .filter((e) => e.paid_by === m.user_id)
        .reduce((s, e) => s + e.amount, 0);
      return { ...m, spent };
    })
    .sort((a, b) => b.spent - a.spent);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-24">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>

        {/* Tabs Skeleton */}
        <Card className="shadow-md">
          <div className="border-b">
            <div className="flex gap-1 p-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-md" />
              ))}
            </div>
          </div>

          {/* Content Skeleton */}
          <CardContent className="p-6 space-y-4">
            <ExpenseCardSkeleton />
            <ExpenseCardSkeleton />
            <ExpenseCardSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group) return <div>Group not found</div>;

  return (
    <div className="flex flex-col gap-6 pb-24">
      {!isOnline && (
        <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">
            Offline Mode
          </AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            You're currently offline. You can view cached data but cannot
            create, edit, or react to content.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2 mb-2 text-muted-foreground"
            onClick={() => router.back()}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className="font-mono text-xs tracking-widest"
            >
              {group.join_code}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              onClick={() => {
                navigator.clipboard.writeText(group.join_code);
                toast({ title: "Code copied!" });
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <span className="text-sm text-muted-foreground ml-2">
              • {members.length} members
            </span>
          </div>
        </div>
        <Dialog
          open={isExpenseDialogOpen}
          onOpenChange={setIsExpenseDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              disabled={!isOnline}
            >
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Dinner, Taxi, groceries..."
                  value={newExpenseTitle}
                  onChange={(e) => setNewExpenseTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    className="pl-9"
                    placeholder="0.00"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={handleCreateExpense}
              >
                Add Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-6 space-y-6">
          {/* Group Goals Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Group Goals</h3>
                <p className="text-sm text-muted-foreground">
                  Track collective funding goals
                </p>
              </div>
              {isAdmin && (
                <Dialog
                  open={isCreateGoalOpen}
                  onOpenChange={setIsCreateGoalOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!isOnline} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Group Goal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Goal Title</Label>
                        <Input
                          placeholder="e.g., Trip to Goa"
                          value={goalTitle}
                          onChange={(e) => setGoalTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Description (Optional)</Label>
                        <Textarea
                          placeholder="Add details about this goal..."
                          value={goalDescription}
                          onChange={(e) => setGoalDescription(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Target Amount (₹)</Label>
                        <Input
                          type="number"
                          placeholder="50000"
                          value={goalTargetAmount}
                          onChange={(e) => setGoalTargetAmount(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleCreateGoal} className="w-full">
                        Create Goal
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Goals List */}
            {goals.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {goals.map((goal) => {
                  const progress =
                    (goal.current_amount / goal.target_amount) * 100;
                  const isCompleted = goal.status === "completed";

                  return (
                    <Card
                      key={goal.id}
                      className={cn(
                        "relative overflow-hidden",
                        isCompleted &&
                          "border-green-500/50 bg-green-50/50 dark:bg-green-950/10"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Target className="h-4 w-4 text-blue-600" />
                              {goal.title}
                              {isCompleted && (
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-700 border-green-300"
                                >
                                  Completed
                                </Badge>
                              )}
                            </CardTitle>
                            {goal.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {goal.description}
                              </p>
                            )}
                          </div>
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDeleteGoal(goal.id)}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Goal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-blue-700 dark:text-blue-400">
                              ₹{goal.current_amount.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">
                              of ₹{goal.target_amount.toLocaleString()}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-center text-muted-foreground">
                            {progress.toFixed(1)}% reached
                          </p>
                        </div>

                        {/* Deadline */}

                        {/* Contributors */}
                        {goal.goal_contributions &&
                          goal.goal_contributions.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-2">
                                Contributors ({goal.goal_contributions.length})
                              </p>
                              <div className="space-y-1 max-h-24 overflow-y-auto">
                                {goal.goal_contributions.map((contrib) => (
                                  <TooltipProvider key={contrib.id}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1 cursor-default hover:bg-muted/50 transition-colors">
                                          <span>{contrib.user_name}</span>
                                          <span className="font-semibold text-green-600">
                                            +₹{contrib.amount.toLocaleString()}
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      {contrib.note && (
                                        <TooltipContent>
                                          <p>{contrib.note}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Contribute Button */}
                        <Button
                          onClick={() => setContributingGoalId(goal.id)}
                          className="w-full"
                          size="sm"
                          disabled={!isOnline || isCompleted}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Contribute
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contribute Dialog */}
          <Dialog
            open={!!contributingGoalId}
            onOpenChange={() => setContributingGoalId(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Contribute to Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Note (Optional)</Label>
                  <Input
                    placeholder="Add a note..."
                    value={contributionNote}
                    onChange={(e) => setContributionNote(e.target.value)}
                  />
                </div>
                <Button onClick={handleContribute} className="w-full">
                  Contribute ₹{contributionAmount || "0"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Expenses Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Expenses</h3>
            {expenses.length === 0 ? (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
                  <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
                    <Receipt className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">
                    No shared expenses
                  </h3>
                  <p className="text-sm max-w-xs">
                    Add an expense to start splitting costs with your group.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {expenses.map((expense) => {
                  const payer = members.find(
                    (m) => m.user_id === expense.paid_by
                  );
                  const payerName = payer?.member_name || "Unknown";
                  const isMyExpense = expense.user_id === user?.id;
                  const myReaction = getMyReaction(expense);

                  return (
                    <Card
                      key={expense.id}
                      className="border shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <CardContent className="p-5">
                        {editingExpenseId === expense.id ? (
                          <div className="space-y-3">
                            <Input
                              value={editExpenseTitle}
                              onChange={(e) =>
                                setEditExpenseTitle(e.target.value)
                              }
                              placeholder="Title"
                            />
                            <Input
                              type="number"
                              value={editExpenseAmount}
                              onChange={(e) =>
                                setEditExpenseAmount(e.target.value)
                              }
                              placeholder="Amount"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleUpdateExpense(expense.id)}
                                className="flex-1"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setEditingExpenseId(null)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex gap-4 flex-1">
                                <Avatar className="h-12 w-12 border-2 border-emerald-200">
                                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold text-base">
                                    {payerName[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h3 className="font-bold text-base leading-tight mb-1">
                                    {expense.title}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span
                                      className={cn(
                                        "font-medium",
                                        expense.paid_by === user?.id &&
                                          "text-emerald-600"
                                      )}
                                    >
                                      {expense.paid_by === user?.id
                                        ? "You"
                                        : payerName}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {format(
                                        new Date(expense.created_at),
                                        "MMM d, yyyy"
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="text-right">
                                  <div className="font-bold text-2xl text-emerald-600">
                                    {formatCurrency(expense.amount)}
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className="mt-1 text-xs"
                                  >
                                    {expense.category || "General"}
                                  </Badge>
                                </div>
                                {isMyExpense && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingExpenseId(expense.id);
                                          setEditExpenseTitle(expense.title);
                                          setEditExpenseAmount(
                                            expense.amount.toString()
                                          );
                                        }}
                                      >
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDeleteExpense(expense.id)
                                        }
                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />{" "}
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>

                            {/* Reactions */}
                            <div className="flex items-center gap-2 pt-3 border-t">
                              {/* Like Button */}
                              <div className="relative group">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-9 gap-1.5 rounded-md transition-all hover:bg-emerald-100 dark:hover:bg-emerald-950",
                                    myReaction === "like"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : ""
                                  )}
                                  onClick={() =>
                                    handleReaction(expense.id, "like")
                                  }
                                >
                                  <ThumbsUp
                                    className={cn(
                                      "h-4 w-4 transition-all",
                                      myReaction === "like" &&
                                        "fill-emerald-600"
                                    )}
                                  />
                                  <span className="text-sm font-medium">
                                    {getReactionCount(expense, "like") || ""}
                                  </span>
                                </Button>
                                {getReactionUsers(expense, "like").length >
                                  0 && (
                                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-white dark:bg-gray-800 border rounded-md shadow-lg px-3 py-2 z-50">
                                    <div className="text-xs space-y-1 whitespace-nowrap">
                                      {getReactionUsers(expense, "like").map(
                                        (name, i) => (
                                          <div
                                            key={i}
                                            className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"
                                          >
                                            <ThumbsUp className="h-3 w-3" />
                                            <span>{name}</span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Dislike Button */}
                              <div className="relative group">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-9 gap-1.5 rounded-md transition-all hover:bg-red-100 dark:hover:bg-red-950",
                                    myReaction === "dislike"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : ""
                                  )}
                                  onClick={() =>
                                    handleReaction(expense.id, "dislike")
                                  }
                                >
                                  <ThumbsDown
                                    className={cn(
                                      "h-4 w-4 transition-all",
                                      myReaction === "dislike" && "fill-red-600"
                                    )}
                                  />
                                  <span className="text-sm font-medium">
                                    {getReactionCount(expense, "dislike") || ""}
                                  </span>
                                </Button>
                                {getReactionUsers(expense, "dislike").length >
                                  0 && (
                                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-white dark:bg-gray-800 border rounded-md shadow-lg px-3 py-2 z-50">
                                    <div className="text-xs space-y-1 whitespace-nowrap">
                                      {getReactionUsers(expense, "dislike").map(
                                        (name, i) => (
                                          <div
                                            key={i}
                                            className="flex items-center gap-2 text-red-700 dark:text-red-400"
                                          >
                                            <ThumbsDown className="h-3 w-3" />
                                            <span>{name}</span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Neutral Button */}
                              <div className="relative group">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-9 gap-1.5 rounded-md transition-all hover:bg-gray-100 dark:hover:bg-gray-800",
                                    myReaction === "neutral"
                                      ? "bg-gray-50 text-gray-700 border border-gray-200"
                                      : ""
                                  )}
                                  onClick={() =>
                                    handleReaction(expense.id, "neutral")
                                  }
                                >
                                  <MinusCircle
                                    className={cn(
                                      "h-4 w-4 transition-all",
                                      myReaction === "neutral" &&
                                        "fill-gray-600"
                                    )}
                                  />
                                  <span className="text-sm font-medium">
                                    {getReactionCount(expense, "neutral") || ""}
                                  </span>
                                </Button>
                                {getReactionUsers(expense, "neutral").length >
                                  0 && (
                                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-white dark:bg-gray-800 border rounded-md shadow-lg px-3 py-2 z-50">
                                    <div className="text-xs space-y-1 whitespace-nowrap">
                                      {getReactionUsers(expense, "neutral").map(
                                        (name, i) => (
                                          <div
                                            key={i}
                                            className="flex items-center gap-2 text-gray-700 dark:text-gray-400"
                                          >
                                            <MinusCircle className="h-3 w-3" />
                                            <span>{name}</span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Total Spending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-center py-8 text-emerald-600">
                  {formatCurrency(totalSpending)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Member Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {memberSpending.map((m) => (
                  <div key={m.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{m.member_name}</span>
                      <span className="font-medium">
                        {formatCurrency(m.spent)}
                      </span>
                    </div>
                    <Progress
                      value={
                        totalSpending > 0 ? (m.spent / totalSpending) * 100 : 0
                      }
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <Card className="h-[750px] flex flex-col shadow-2xl overflow-hidden border-none bg-[#0b141a] rounded-xl">
            {/* Chat Header */}
            <CardHeader
              className={cn(
                "py-3 px-4 border-b border-black/5 dark:border-white/5 transition-colors z-10",
                isSelectMode
                  ? "bg-[#005c4b] text-white"
                  : "bg-[#f0f2f5] dark:bg-[#202c33] text-slate-900 dark:text-white"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isSelectMode ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelSelection}
                        className="text-white hover:bg-white/10"
                      >
                        <Plus className="h-5 w-5 rotate-45" />
                      </Button>
                      <div className="flex-1 text-white font-semibold flex items-center gap-2">
                        <span>{selectedMessages.size}</span>
                        <span className="text-sm font-normal text-white/70">
                          selected
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <Avatar className="h-10 w-10 border border-black/10 dark:border-white/10">
                          <AvatarFallback className="bg-[#4a5568] text-white font-bold">
                            {group?.name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white dark:border-[#202c33] rounded-full"></div>
                      </div>
                      <div className="flex flex-col">
                        <CardTitle className="text-base font-semibold">
                          {group?.name}
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500 dark:text-[#8696a0] flex items-center gap-1">
                          {members
                            .map((m) => m.member_name)
                            .join(", ")
                            .substring(0, 30)}
                          ...
                        </CardDescription>
                      </div>
                    </>
                  )}
                </div>

                {!isSelectMode ? (
                  <div className="flex items-center gap-1">
                    <Dialog
                      open={isGroupInfoOpen}
                      onOpenChange={setIsGroupInfoOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-500 dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-background border-none shadow-2xl rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-xl">
                            <Users className="h-6 w-6 text-blue-500" />
                            Group Info
                          </DialogTitle>
                          <DialogDescription className="text-left pt-2">
                            See all members and group details.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className="flex flex-col items-center gap-3">
                            <Avatar className="h-20 w-20 border-4 border-blue-500/20">
                              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                                {group?.name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <h2 className="text-2xl font-bold">
                              {group?.name}
                            </h2>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              Created{" "}
                              {format(
                                new Date(group?.created_at || new Date()),
                                "MMM d, yyyy"
                              )}
                            </p>
                          </div>

                          <Separator />

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Members ({members.length})
                              </h3>
                            </div>
                            <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                              {members.map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-background">
                                      <AvatarFallback className="bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 font-medium">
                                        {member.member_name[0]?.toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-semibold text-sm">
                                        {member.member_name}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                                        {member.role}
                                      </p>
                                    </div>
                                  </div>
                                  {member.user_id === user?.id && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none"
                                    >
                                      You
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Messages?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete{" "}
                          {selectedMessages.size} message
                          {selectedMessages.size > 1 ? "s" : ""}? This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteSelectedMessages}
                          className="bg-red-500 hover:bg-red-600 text-white border-none shadow-none"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>

            {/* Chat Background */}
            <CardContent className="flex-1 p-0 relative overflow-hidden bg-[#e5ddd5] dark:bg-[#0b141a]">
              <div
                ref={scrollRef}
                className="absolute inset-0 overflow-y-auto p-4 space-y-2 scrollbar-hide"
              >
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-[#8696a0]">
                    <div className="bg-[#202c33] rounded-2xl p-8 shadow-xl border border-white/5 text-center max-w-xs">
                      <div className="h-20 w-20 bg-[#00a884]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#00a884]/20">
                        <MessageCircle className="h-10 w-10 text-[#00a884]" />
                      </div>
                      <h3 className="text-[#e9edef] font-semibold mb-2 text-lg">
                        Send a message
                      </h3>
                      <p className="text-sm">
                        Messages are secured with end-to-end encryption in your
                        session.
                      </p>
                    </div>
                  </div>
                )}

                {/* Today Separator */}
                {messages.length > 0 && (
                  <div className="flex justify-center my-4">
                    <span className="bg-[#182229] text-[#8696a0] text-[11px] px-3 py-1 rounded-md shadow-sm border border-white/5 uppercase tracking-wider font-medium">
                      Today
                    </span>
                  </div>
                )}

                {messages.map((msg, index) => {
                  const isMe = msg.user_id === user?.id;
                  const showAvatar =
                    index === 0 || messages[index - 1].user_id !== msg.user_id;
                  const isSelected = selectedMessages.has(msg.id);
                  const isFirstInSequence =
                    index === 0 || messages[index - 1].user_id !== msg.user_id;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex w-full gap-2 items-end group transition-all duration-200",
                        isMe ? "justify-end" : "justify-start",
                        isSelected && "bg-[#005c4b]/20"
                      )}
                      onMouseDown={() => {
                        if (isSelectMode) {
                          toggleMessageSelection(msg.id);
                        } else {
                          longPressTimer.current = setTimeout(() => {
                            handleMessageLongPress(msg.id);
                          }, 500);
                        }
                      }}
                      onMouseUp={() => {
                        if (longPressTimer.current) {
                          clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                        }
                      }}
                      onMouseLeave={() => {
                        if (longPressTimer.current) {
                          clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                        }
                      }}
                      onTouchStart={() => {
                        if (isSelectMode) {
                          toggleMessageSelection(msg.id);
                        } else {
                          longPressTimer.current = setTimeout(() => {
                            handleMessageLongPress(msg.id);
                          }, 500);
                        }
                      }}
                      onTouchEnd={() => {
                        if (longPressTimer.current) {
                          clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                        }
                      }}
                    >
                      <div
                        className={cn(
                          "flex flex-col max-w-[85%] sm:max-w-[70%] relative",
                          isMe ? "items-end" : "items-start"
                        )}
                      >
                        {/* Bubble */}
                        <div
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg shadow-sm relative group",
                            isMe
                              ? "bg-[#dcf8c6] dark:bg-[#005c97] text-slate-900 dark:text-white rounded-tr-none"
                              : "bg-white dark:bg-[#202c33] text-slate-900 dark:text-[#e9edef] rounded-tl-none",
                            isSelected && "ring-2 ring-[#00a884]"
                          )}
                          style={{
                            marginTop: isFirstInSequence ? "8px" : "2px",
                          }}
                        >
                          {/* Triangle Tip */}
                          {isFirstInSequence && (
                            <div
                              className={cn(
                                "absolute top-0 w-3 h-3 overflow-hidden",
                                isMe ? "-right-2" : "-left-2"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-3 h-3 rotate-45 transform origin-top",
                                  isMe
                                    ? "bg-[#dcf8c6] dark:bg-[#005c97] -translate-x-1.5 shadow-sm"
                                    : "bg-white dark:bg-[#202c33] translate-x-1.5 shadow-sm"
                                )}
                              ></div>
                            </div>
                          )}

                          {!isMe && isFirstInSequence && (
                            <p className="text-[11px] font-bold text-blue-400 mb-0.5 px-0.5">
                              {msg.user_name}
                            </p>
                          )}

                          <div className="flex flex-wrap items-end gap-x-2 gap-y-0 min-w-[60px]">
                            <p className="text-[14.5px] leading-[19px] break-words flex-1 px-0.5 py-0.5">
                              {msg.content}
                            </p>
                            <div className="flex items-center gap-1 ml-auto pt-1 pb-0.5">
                              <span className="text-[10px] text-slate-500/80 dark:text-[#8696a0] font-medium uppercase">
                                {format(new Date(msg.created_at), "h:mm a")}
                              </span>
                              {isMe && (
                                <div className="flex -space-x-1">
                                  <Check className="h-3.5 w-3.5 text-[#4fc3f7] dark:text-blue-400" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Selection Badge for me */}
                      {isSelectMode && isMe && (
                        <div className="flex items-center self-center pl-2">
                          <div
                            className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected
                                ? "bg-[#00a884] border-[#00a884]"
                                : "border-[#8696a0]"
                            )}
                          >
                            {isSelected && (
                              <Check
                                className="h-3 w-3 text-white"
                                strokeWidth={4}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>

            {/* Chat Input Area */}
            <div className="p-2 bg-[#f0f2f5] dark:bg-[#0b141a] flex items-center gap-2">
              <div className="flex-1 flex items-center bg-white dark:bg-[#2a3942] rounded-[24px] px-4 py-1 border border-black/5 dark:border-white/5 transition-all shadow-sm">
                <Input
                  placeholder="Message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendMessage()
                  }
                  className="border-none shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 px-0 text-slate-900 dark:text-[#e9edef] text-[16px] placeholder:text-[#8696a0] h-11 flex-1"
                  disabled={!isOnline}
                />
              </div>

              <Button
                onClick={() => handleSendMessage()}
                disabled={
                  !isOnline ||
                  (!newMessage.trim() && !isSendingMessage) ||
                  isSendingMessage
                }
                className={cn(
                  "rounded-full h-12 w-12 flex items-center justify-center shadow-lg transition-all shrink-0",
                  newMessage.trim()
                    ? "bg-[#00a884] hover:bg-[#008f72] text-white"
                    : "bg-[#dee2e6] dark:bg-[#202c33] text-slate-500 dark:text-[#8696a0]"
                )}
              >
                {newMessage.trim() ? (
                  <SendIcon className="h-5 w-5 ml-0.5" />
                ) : (
                  <SendIcon className="h-6 w-6" />
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>People sharing this group.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{member.member_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.member_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  {isAdmin && member.user_id !== user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove User?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {member.member_name}{" "}
                            from the group?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.id)}
                            className="bg-red-500 hover:bg-red-600 text-white border-none shadow-none"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Group Settings</CardTitle>
              <CardDescription>Update group details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <div className="flex gap-2">
                  <Input
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                  />
                  <Button onClick={handleUpdateGroup}>Update</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions. Only admins can delete groups.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Group
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this group?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the group "{group.name}"
                        and all its expenses and members. This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteGroup}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Delete Group
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
