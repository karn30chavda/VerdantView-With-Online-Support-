'use client';

import { useState, useEffect } from 'react';
import { ExpenseForm } from '@/components/expense-form';
import { getExpenses } from '@/lib/db';
import type { Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditExpensePage({ params }: { params: { id: string } }) {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExpense() {
      try {
        const allExpenses = await getExpenses();
        const foundExpense = allExpenses.find(e => e.id === Number(params.id));
        if (foundExpense) {
          setExpense(foundExpense);
        } else {
          setError('Expense not found.');
        }
      } catch (err) {
        setError('Failed to fetch expense data.');
      } finally {
        setLoading(false);
      }
    }
    fetchExpense();
  }, [params.id]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Expense</h1>
        <p className="text-muted-foreground">
          Modify the details of your expense below.
        </p>
      </div>
      {loading && (
        <div className="space-y-8">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      )}
      {error && <p className="text-destructive">{error}</p>}
      {!loading && !error && expense && <ExpenseForm expense={expense} />}
    </div>
  );
}
