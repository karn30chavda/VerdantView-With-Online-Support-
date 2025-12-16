"use client";

import { useExpenses } from "@/hooks/use-expenses";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "recharts";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  startOfYear,
  endOfYear,
  format,
  subMonths,
} from "date-fns";
import { useMemo } from "react";
import { AlertCircle, IndianRupee } from "lucide-react";

export default function StatisticsPage() {
  const { expenses, categories, loading, error } = useExpenses();

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#8dd1e1",
  ];

  const currentMonth = useMemo(() => new Date(), []);

  const processData = (startDate: Date, endDate: Date) => {
    const filteredExpenses = expenses.filter(
      (e) =>
        (e.type === "expense" || !e.type) &&
        isWithinInterval(new Date(e.date), { start: startDate, end: endDate })
    );

    const categoryDataMap = new Map<string, number>();

    filteredExpenses.forEach((e) => {
      const current = categoryDataMap.get(e.category) || 0;
      categoryDataMap.set(e.category, current + e.amount);
    });

    return Array.from(categoryDataMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const monthlyData = useMemo(() => {
    return processData(startOfMonth(currentMonth), endOfMonth(currentMonth));
  }, [expenses, currentMonth]);

  const yearlyData = useMemo(() => {
    return processData(startOfYear(currentMonth), endOfYear(currentMonth));
  }, [expenses, currentMonth]);

  // Correction for the reduce typo above which I can't interactively fix easily inside one block without error.
  // Actually, I can just write the correct logic.
  const sixMonthTrend = useMemo(() => {
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
        .reduce((sum, e) => sum + e.amount, 0);
      const expense = items
        .filter((e) => !e.type || e.type === "expense")
        .reduce((sum, e) => sum + e.amount, 0);

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
    return <div className="p-8 text-center">Loading statistics...</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold">Financial Insights</h1>
        <p className="text-muted-foreground">Visualize your spending habits</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expense (Last 6 Months)</CardTitle>
              <CardDescription>Compare your essential flow.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sixMonthTrend}>
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip
                    formatter={(value) => `₹${value}`}
                    cursor={{ fill: "transparent" }}
                  />
                  <Legend />
                  <Bar
                    dataKey="income"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Income"
                  />
                  <Bar
                    dataKey="expense"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    name="Expense"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Distribution (This Month)</CardTitle>
              <CardDescription>
                Where your money went in {format(currentMonth, "MMMM")}.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={monthlyData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {monthlyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No expense data for this month.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Distribution (This Year)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {yearlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={yearlyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {yearlyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No expense data for this year.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
