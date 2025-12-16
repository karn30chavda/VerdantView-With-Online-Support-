"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PiggyBank,
  Target,
  TrendingUp,
  AlertCircle,
  Plus,
  History,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  getSettings,
  updateSettings,
  getSavingsTransactions,
  addSavingsTransaction,
} from "@/lib/db";
import { AppSettings, SavingsTransaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function SavingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [amountToAdd, setAmountToAdd] = useState("");
  const [isEditGoalOpen, setIsEditGoalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState("");

  const fetchData = async () => {
    try {
      const [data, txs] = await Promise.all([
        getSettings(),
        getSavingsTransactions(),
      ]);
      setSettings(data);
      // Sort transactions by date descending
      setTransactions(
        txs.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );

      // Initialize if missing
      if (
        data &&
        (data.emergencyFundGoal === undefined ||
          data.emergencyFundCurrent === undefined)
      ) {
        const updated = {
          ...data,
          emergencyFundGoal: data.emergencyFundGoal ?? 50000,
          emergencyFundCurrent: data.emergencyFundCurrent ?? 0,
        };
        await updateSettings(updated);
        setSettings(updated);
      }
    } catch (error) {
      console.error("Failed to load settings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddFunds = async () => {
    if (!settings || !amountToAdd || isNaN(Number(amountToAdd))) return;

    const amount = Number(amountToAdd);
    const newCurrent = (settings.emergencyFundCurrent || 0) + amount;

    try {
      await updateSettings({ emergencyFundCurrent: newCurrent });
      await addSavingsTransaction({
        amount,
        date: new Date().toISOString(),
        type: "deposit",
        note: "Added manually",
      });

      setSettings({ ...settings, emergencyFundCurrent: newCurrent });
      toast({ title: "Funds added successfully!" });
      setIsAddOpen(false);
      setAmountToAdd("");
      fetchData(); // Reload transactions
    } catch (e) {
      toast({ title: "Failed to update funds", variant: "destructive" });
    }
  };

  const handleUpdateGoal = async () => {
    if (!settings || !newGoal || isNaN(Number(newGoal))) return;

    const goal = Number(newGoal);
    try {
      await updateSettings({ emergencyFundGoal: goal });
      setSettings({ ...settings, emergencyFundGoal: goal });
      toast({ title: "Goal updated successfully!" });
      setIsEditGoalOpen(false);
      setNewGoal("");
    } catch (e) {
      toast({ title: "Failed to update goal", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const current = settings?.emergencyFundCurrent || 0;
  const goal = settings?.emergencyFundGoal || 50000;
  const progress = Math.min((current / goal) * 100, 100);

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold">Savings & Goals</h1>
        <p className="text-muted-foreground">
          Track your emergency fund and goals
        </p>
      </div>

      <div className="grid gap-6">
        {/* Emergency Fund Card */}
        <Card className="bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-emerald-800 dark:text-emerald-300">
                  Emergency Fund
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewGoal(String(goal));
                  setIsEditGoalOpen(true);
                }}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/50 h-8 px-2"
              >
                Edit Goal
              </Button>
            </div>
            <CardDescription className="text-emerald-600/80 dark:text-emerald-400/80">
              Your safety net for unexpected events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-400">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(current)}
                  </p>
                  <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    of{" "}
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(goal)}{" "}
                    goal
                  </p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-200/50 dark:shadow-none"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Funds
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add to Emergency Fund</DialogTitle>
                      <DialogDescription>
                        Enter the amount you want to save.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                      <Input
                        type="number"
                        placeholder="Amount (e.g. 500)"
                        value={amountToAdd}
                        onChange={(e) => setAmountToAdd(e.target.value)}
                      />
                    </div>
                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddFunds}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <span>{progress.toFixed(0)}% Saved</span>
                  <span>
                    {progress >= 100
                      ? "Goal Reached! 🎉"
                      : `${new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(goal - current)} more to go`}
                  </span>
                </div>
                <Progress
                  value={progress}
                  className="h-3 bg-emerald-200 dark:bg-emerald-900"
                  indicatorClassName="bg-emerald-500 dark:bg-emerald-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Goal Dialog */}
        <Dialog open={isEditGoalOpen} onOpenChange={setIsEditGoalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Savings Goal</DialogTitle>
              <DialogDescription>
                How much do you want to save for your emergency fund?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <Input
                type="number"
                placeholder="Goal Amount (e.g. 50000)"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditGoalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateGoal}>Update Goal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Recent Activity Card instead of Goals Placeholder */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Recent Contributions</CardTitle>
            </div>
            <CardDescription>
              History of funds added to your emergency savings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {tx.type === "deposit" ? "Added Funds" : "Transaction"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.date), "PPP")}
                      </p>
                    </div>
                    <span className="font-bold text-emerald-600">
                      +
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No contributions yet. Start saving today!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
