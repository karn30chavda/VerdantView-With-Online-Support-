'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { IndianRupee, ArrowRight, PlusCircle, ScanLine, AlertCircle } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useExpenses } from '@/hooks/use-expenses';

const SummaryCard = ({
  title,
  icon: Icon,
  amount,
  loading,
}: {
  title: string;
  icon: React.ElementType;
  amount: number;
  loading: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-2/3" />
      ) : (
        <div className="text-2xl font-bold">
          {new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
          }).format(amount)}
        </div>
      )}
    </CardContent>
  </Card>
);

const Last7DaysChart = ({ loading, chartData }: { loading: boolean; chartData: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Last 7 Days</CardTitle>
      <CardDescription>Your spending over the past week.</CardDescription>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-[250px] w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { expenses, summaries, settings, reminders, loading, error } = useExpenses();

  const budgetProgress = useMemo(() => {
    if (!settings?.monthlyBudget || settings.monthlyBudget === 0) return 0;
    const progress = (summaries.month / settings.monthlyBudget) * 100;
    return Math.min(progress, 100);
  }, [summaries.month, settings]);

  const recentExpenses = useMemo(() => expenses.slice(0, 3), [expenses]);
  
  const upcomingReminder = useMemo(() => {
    const now = new Date();
    return reminders
      .filter(r => new Date(r.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [reminders]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const total = expenses
        .filter(e => {
          const expenseDate = new Date(e.date);
          return expenseDate >= dayStart && expenseDate <= dayEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        date: format(day, 'MMM d'),
        total: total,
      };
    });
  }, [expenses]);
  
  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <h2 className="text-2xl font-bold">Error Loading Data</h2>
        <p className="text-muted-foreground">{error}</p>
        <p className="text-sm text-muted-foreground">
          Could not load financial data from the browser database. <br />
          Please ensure you are not in private browsing mode and that browser data is not being cleared.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold shrink-0">Dashboard</h1>
        <div className="flex items-center gap-2">
            <Button asChild size="sm" className="relative">
                <Link href="/expenses/new">
                    <PlusCircle className="h-4 w-4" />
                    <span className="hidden sm:inline-block sm:ml-2">New Expense</span>
                </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="relative">
                <Link href="/scan">
                    <ScanLine className="h-4 w-4" />
                    <span className="hidden sm:inline-block sm:ml-2">Scan</span>
                </Link>
            </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Today's Expenses" icon={IndianRupee} amount={summaries.today} loading={loading} />
        <SummaryCard title="This Week's Expenses" icon={IndianRupee} amount={summaries.week} loading={loading} />
        <SummaryCard title="This Month's Expenses" icon={IndianRupee} amount={summaries.month} loading={loading} />
        <SummaryCard title="This Year's Expenses" icon={IndianRupee} amount={summaries.year} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="grid gap-8 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Your last 3 transactions.</CardDescription>
              </div>
              <Button asChild variant="link" className="text-primary">
                <Link href="/expenses">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : recentExpenses.length > 0 ? (
                    recentExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.title}</TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge variant="outline">{expense.category}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right font-mono">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No expenses recorded yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Last7DaysChart loading={loading} chartData={chartData} />
        </div>
        
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Budget</CardTitle>
              <CardDescription>
                {loading ? <Skeleton className="h-5 w-3/4" /> :
                  `You've spent ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summaries.month)} of your ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(settings?.monthlyBudget || 0)} budget.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-4 w-full" /> : 
                <Progress 
                  value={budgetProgress} 
                  className={budgetProgress > 80 ? '[&>div]:bg-destructive' : ''}
                />
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Reminder</CardTitle>
              <CardDescription>Your next upcoming bill.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                    </div>
                ) : upcomingReminder ? (
                    <div>
                      <p className="font-medium">{upcomingReminder.title}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(upcomingReminder.date), 'MMM d, yyyy')}</p>
                    </div>
                ) : (
                  <p className="text-sm text-center text-muted-foreground">No upcoming reminders.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
