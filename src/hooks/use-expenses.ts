import { useState, useEffect, useMemo, useCallback } from 'react';
import { getExpenses, getReminders, getSettings, getCategories, addExpense, dbEvents } from '@/lib/db';
import type { Expense, Reminder, AppSettings, Category } from '@/lib/types';
import { isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isToday } from 'date-fns';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedExpenses, fetchedCategories, fetchedReminders, fetchedSettings] = await Promise.all([
        getExpenses(),
        getCategories(),
        getReminders(),
        getSettings(),
      ]);
      setExpenses(fetchedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setCategories(fetchedCategories);
      setReminders(fetchedReminders);
      setSettings(fetchedSettings);
    } catch (err: any) {
      console.error('Failed to fetch data from IndexedDB:', err);
      setError(err.message || 'An unknown error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Listen for the custom data changed event
    const handleDataChanged = () => {
      console.log('Data changed event received, refetching data...');
      fetchData();
    };
    
    dbEvents.addEventListener('dataChanged', handleDataChanged);

    // Cleanup listener on component unmount
    return () => {
      dbEvents.removeEventListener('dataChanged', handleDataChanged);
    };

  }, [fetchData]);

  const addMultipleExpenses = useCallback(async (newExpenses: Omit<Expense, 'id'>[]) => {
    // We can't use a single transaction in Dexie without bulkAdd, so we do it one by one
    // This is less efficient but works with the current DB setup.
    for (const expense of newExpenses) {
      await addExpense(expense);
    }
    // Refresh local state after adding
    await fetchData();
  }, [fetchData]);


  const summaries = useMemo(() => {
    const now = new Date();
    
    const todayExpenses = expenses.filter(e => isToday(new Date(e.date)));
    const weekExpenses = expenses.filter(e => isWithinInterval(new Date(e.date), { start: startOfWeek(now), end: endOfWeek(now) }));
    const monthExpenses = expenses.filter(e => isWithinInterval(new Date(e.date), { start: startOfMonth(now), end: endOfMonth(now) }));
    const yearExpenses = expenses.filter(e => isWithinInterval(new Date(e.date), { start: startOfYear(now), end: endOfYear(now) }));

    return {
      today: todayExpenses.reduce((sum, e) => sum + e.amount, 0),
      week: weekExpenses.reduce((sum, e) => sum + e.amount, 0),
      month: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
      year: yearExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  }, [expenses]);

  return { expenses, categories, reminders, settings, summaries, loading, error, refresh: fetchData, addMultipleExpenses };
}
