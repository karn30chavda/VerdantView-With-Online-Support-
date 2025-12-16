"use client";

import { useExpenses } from "@/hooks/use-expenses";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  CartesianGrid,
} from "recharts";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  startOfYear,
  endOfYear,
  format,
  subMonths,
  eachDayOfInterval,
  getDate,
  isSameMonth,
} from "date-fns";
import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  PiggyBank,
  AlertCircle,
} from "lucide-react";

export default function StatisticsPage() {
  const { expenses, loading, error } = useExpenses();

  const COLORS = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#6366f1", // Indigo
  ];

  const currentMonth = useMemo(() => new Date(), []);

  // --- Data Processing Hooks ---

  // 1. KPI Data (Current Month)
  const kpiData = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const monthlyItems = expenses.filter((e) =>
      isWithinInterval(new Date(e.date), { start, end })
    );

    const income = monthlyItems
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0);

    const expense = monthlyItems
      .filter((e) => !e.type || e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0);

    const savings = income - expense;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    return { income, expense, savings, savingsRate };
  }, [expenses, currentMonth]);

  // 2. Spending Trend (Daily Area Chart for Current Month)
  const spendingTrendData = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Pre-fill all days with 0
    const dailyMap = new Map<number, number>();
    days.forEach((day) => dailyMap.set(getDate(day), 0));

    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (isSameMonth(d, currentMonth) && (!e.type || e.type === "expense")) {
        const dayOfMonth = getDate(d);
        dailyMap.set(dayOfMonth, (dailyMap.get(dayOfMonth) || 0) + e.amount);
      }
    });

    return Array.from(dailyMap.entries()).map(([day, amount]) => ({
      day: `Day ${day}`,
      amount,
    }));
  }, [expenses, currentMonth]);

  // 3. Category Breakdown (Donut Chart - Current Month)
  const categoryData = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const filteredExpenses = expenses.filter(
      (e) =>
        (e.type === "expense" || !e.type) &&
        isWithinInterval(new Date(e.date), { start, end })
    );

    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by highest spend
  }, [expenses, currentMonth]);

  // 4. Payment Mode Preferences (Radar Chart - All Time)
  const paymentModeData = useMemo(() => {
    const map = new Map<string, number>();
    const validModes = ["Cash", "Card", "Online", "Other"];

    // Initialize
    validModes.forEach((mode) => map.set(mode, 0));

    expenses.forEach((e) => {
      if (!e.type || e.type === "expense") {
        const mode = e.paymentMode || "Other";
        map.set(mode, (map.get(mode) || 0) + 1); // Count occurrences
      }
    });

    return Array.from(map.entries()).map(([subject, A]) => ({ subject, A }));
  }, [expenses]);

  // 5. Monthly History (Bar Chart - Last 6 Months)
  const monthlyHistoryData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(currentMonth, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const items = expenses.filter((e) =>
        isWithinInterval(new Date(e.date), { start, end })
      );

      const income = items
        .filter((e) => e.type === "income")
        .reduce((s, e) => s + e.amount, 0);
      const expense = items
        .filter((e) => !e.type || e.type === "expense")
        .reduce((s, e) => s + e.amount, 0);

      data.push({
        name: format(date, "MMM"),
        income,
        expense,
      });
    }
    return data;
  }, [expenses, currentMonth]);

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <h2 className="text-2xl font-bold">Error Loading Data</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <div className="h-32 bg-muted/40 animate-pulse rounded-xl" />
        <div className="h-32 bg-muted/40 animate-pulse rounded-xl" />
        <div className="h-32 bg-muted/40 animate-pulse rounded-xl" />
        <div className="h-96 md:col-span-3 bg-muted/40 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Financial Overview
        </h1>
        <p className="text-muted-foreground">
          A deeper look into your spending habits and financial health.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-200/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{kpiData.income.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For {format(currentMonth, "MMMM")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-200/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{kpiData.expense.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For {format(currentMonth, "MMMM")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-200/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <PiggyBank className="h-4 w-4" /> Net Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{kpiData.savings.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">Savings Rate:</p>
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  kpiData.savingsRate > 20
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {kpiData.savingsRate.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending Trend (Area Chart) */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Spending Trend
            </CardTitle>
            <CardDescription>
              Daily spending curve for {format(currentMonth, "MMMM")}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={spendingTrendData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" hide />
                <Tooltip
                  formatter={(value) => [`₹${value}`, "Spent"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown (Donut) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Category Breakdown
            </CardTitle>
            <CardDescription>
              Top spending categories this month
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: "20px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No expenses yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Modes (Radar) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Payment
              Preferences
            </CardTitle>
            <CardDescription>
              Usage frequency of different payment modes
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="70%"
                data={paymentModeData}
              >
                <PolarGrid strokeOpacity={0.2} />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "currentColor", fontSize: 12 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, "auto"]} hide />
                <Radar
                  name="Usage"
                  dataKey="A"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="#10b981"
                  fillOpacity={0.4}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly History (Bar) */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>History & Comparison</CardTitle>
            <CardDescription>
              Income vs Expense over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyHistoryData} barGap={4}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  strokeOpacity={0.2}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  fontSize={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
