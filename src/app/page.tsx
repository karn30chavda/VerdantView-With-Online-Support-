"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { getSettings, getReminders } from "@/lib/db";
import { Reminder } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Wallet,
  AlertCircle,
  Bell,
  Calendar,
} from "lucide-react";
import {
  format,
  isToday,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { useExpenses } from "@/hooks/use-expenses";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export default function DashboardPage() {
  const { expenses, summaries, loading, error } = useExpenses();
  const [timeRange, setTimeRange] = useState("all"); // Default to all
  const [userName, setUserName] = useState<string>("User");
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settings, fetchedReminders] = await Promise.all([
          getSettings(),
          getReminders(),
        ]);

        if (settings?.userName) {
          setUserName(settings.userName);
        }
        if (settings?.monthlyBudget) {
          setMonthlyBudget(settings.monthlyBudget);
        }

        // Filter for upcoming reminders and sort
        const now = new Date();
        const upcoming = fetchedReminders
          .filter(
            (r) => new Date(r.date) >= new Date(new Date().setHours(0, 0, 0, 0))
          )
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .slice(0, 3); // Take top 3

        setReminders(upcoming);
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    fetchData();
  }, []);

  const currentSummary = useMemo(() => {
    switch (timeRange) {
      case "today":
        return {
          income: summaries.income?.today || 0,
          expense: summaries.expense?.today || 0,
        };
      case "week":
        return {
          income: summaries.income?.week || 0,
          expense: summaries.expense?.week || 0,
        };
      case "month":
        return {
          income: summaries.income?.month || 0,
          expense: summaries.expense?.month || 0,
        };
      case "all":
        // Approximate for all time or just show year?
        return {
          income: summaries.income?.year || 0,
          expense: summaries.expense?.year || 0,
        };
      default:
        return {
          income: summaries.income?.week || 0,
          expense: summaries.expense?.week || 0,
        };
    }
  }, [summaries, timeRange]);

  const recentTransactions = useMemo(() => {
    const now = new Date();
    let filtered = expenses;

    // Filter by time range
    if (timeRange === "today") {
      filtered = expenses.filter((e) => isToday(new Date(e.date)));
    } else if (timeRange === "week") {
      filtered = expenses.filter((e) =>
        isWithinInterval(new Date(e.date), {
          start: startOfWeek(now),
          end: endOfWeek(now),
        })
      );
    } else if (timeRange === "month") {
      filtered = expenses.filter((e) =>
        isWithinInterval(new Date(e.date), {
          start: startOfMonth(now),
          end: endOfMonth(now),
        })
      );
    } else if (timeRange === "all") {
      filtered = expenses.filter((e) =>
        isWithinInterval(new Date(e.date), {
          start: startOfYear(now),
          end: endOfYear(now),
        })
      );
    }

    // Sort by date desc (already sorted in hook but good guarantee) and take top 5
    return filtered
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [expenses, timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <h2 className="text-2xl font-bold">Error Loading Data</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  console.log("Rendering Dashboard"); // Debug log

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Header Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Hello, {userName}!</h1>
        <p className="text-muted-foreground">Track your transactions today</p>
      </div>

      {/* Time Range Filter */}
      <Tabs
        defaultValue="week"
        value={timeRange}
        onValueChange={setTimeRange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">7 Days</TabsTrigger>
          <TabsTrigger value="month">30 Days</TabsTrigger>
          <TabsTrigger value="all">Year</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Income Card */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1.5 bg-emerald-100 rounded-full">
                <TrendingDown className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-xs font-medium">Total Income</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(currentSummary.income)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Card */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1.5 bg-red-100 rounded-full">
                <TrendingUp className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-xs font-medium">Total Expense</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(currentSummary.expense)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Budget Progress */}
      {monthlyBudget > 0 && (
        <Card className="shadow-sm border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Monthly Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency(summaries.expense?.month || 0)}
                </span>
                <span className="text-sm text-blue-600/80 dark:text-blue-400/80 ml-1">
                  spent
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  of {formatCurrency(monthlyBudget)}
                </span>
              </div>
            </div>
            <Progress
              value={Math.min(
                ((summaries.expense?.month || 0) / monthlyBudget) * 100,
                100
              )}
              className="h-2.5 bg-blue-200 dark:bg-blue-800"
              indicatorClassName={`${
                (summaries.expense?.month || 0) > monthlyBudget
                  ? "bg-red-500"
                  : "bg-blue-500"
              }`}
            />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {(summaries.expense?.month || 0) > monthlyBudget
                ? "You have exceeded your monthly budget!"
                : `${(
                    ((summaries.expense?.month || 0) / monthlyBudget) *
                    100
                  ).toFixed(0)}% used`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <Button
            asChild
            className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Link href="/expenses/new?type=income">
              <Plus className="mr-2 h-5 w-5" /> Add Income
            </Link>
          </Button>
          <Button
            asChild
            className="h-12 bg-red-500 hover:bg-red-600 text-white"
          >
            <Link href="/expenses/new?type=expense">
              <Minus className="mr-2 h-5 w-5" /> Add Expense
            </Link>
          </Button>
        </div>
      </div>

      {/* Upcoming Reminders */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming Reminders</h2>
          <Link href="/reminders" className="text-sm font-medium text-primary">
            Manage
          </Link>
        </div>
        {reminders.length > 0 ? (
          <div className="grid gap-3">
            {reminders.map((reminder) => (
              <Card key={reminder.id} className="border-l-4 border-l-amber-400">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-full text-amber-600 dark:bg-amber-900/30">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{reminder.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(reminder.date), "MMM d, yyyy")}
                        {reminder.isRecurring && " (Recurring)"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No upcoming reminders</p>
              <Button variant="link" asChild className="px-0 h-auto">
                <Link href="/reminders">Set a reminder</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <Link
            href="/expenses"
            className="text-sm font-medium text-primary flex items-center"
          >
            See All <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : recentTransactions.length > 0 ? (
          <div className="space-y-4">
            {recentTransactions.map((t) => {
              const isIncome = t.type === "income";
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-full",
                        isIncome ? "bg-emerald-100" : "bg-red-100"
                      )}
                    >
                      {isIncome ? (
                        <Wallet className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Wallet className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.date), "MMM d, h:mm a")} •{" "}
                        {t.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-semibold",
                        isIncome ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.paymentMode}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Wallet className="h-12 w-12 mb-3 opacity-20" />
            <p>No transactions yet</p>
            <p className="text-xs mt-1">
              Add your first income or expense to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
