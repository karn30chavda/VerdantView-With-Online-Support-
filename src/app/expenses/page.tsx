'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  PlusCircle,
  ScanLine,
  Edit,
  Trash2,
  Calendar,
  Tag,
  Wallet,
  CreditCard,
  Laptop,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

import { useExpenses as useExpensesData } from '@/hooks/use-expenses';
import type { Expense, Category } from '@/lib/types';
import { deleteExpense } from '@/lib/db';
import { ExpenseForm } from '@/components/expense-form';
import { useToast } from '@/hooks/use-toast';

const paymentModeIcons = {
  Cash: Wallet,
  Card: CreditCard,
  Online: Laptop,
  Other: MoreHorizontal,
};

function ExpenseDetails({ expense }: { expense: Expense }) {
  const PaymentIcon = paymentModeIcons[expense.paymentMode];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span>{expense.category}</span>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{format(new Date(expense.date), 'PPP')}</span>
      </div>
      <div className="flex items-center gap-2">
        <PaymentIcon className="h-4 w-4 text-muted-foreground" />
        <span>{expense.paymentMode}</span>
      </div>
    </div>
  );
}

function ExpenseListItem({
  expense,
  onDelete,
  onEditSuccess,
}: {
  expense: Expense;
  onDelete: (id: number) => void;
  onEditSuccess: () => void;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    onEditSuccess();
  };
  
  return (
    <AccordionItem value={String(expense.id)}>
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex justify-between w-full items-center">
          <span className="font-medium">{expense.title}</span>
          <span className="font-mono text-base pr-2">
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(expense.amount)}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <ExpenseDetails expense={expense} />
        <div className="flex justify-end gap-2 mt-4">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Expense</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <ExpenseForm expense={expense} onSave={handleEditSuccess} />
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  this expense.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => expense.id && onDelete(expense.id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

const ExpensesSkeleton = () => (
    <Card>
        <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-48" />
          <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-10 sm:w-32" />
              <Skeleton className="h-9 w-10 sm:w-24" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Skeleton className="h-10 w-full sm:w-64" />
            <Skeleton className="h-10 w-full sm:w-48" />
            <Skeleton className="h-10 w-full sm:w-48" />
        </div>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 border-b">
                       <div className="flex justify-between items-center">
                         <Skeleton className="h-6 w-1/3" />
                         <Skeleton className="h-6 w-1/4" />
                       </div>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
)

export default function ExpensesPage() {
  const { expenses, categories, loading, error, refresh } = useExpensesData();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const filteredAndSortedExpenses = useMemo(() => {
    let result = expenses;

    if (searchTerm) {
      result = result.filter((expense) =>
        expense.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(
        (expense) => expense.category === categoryFilter
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [expenses, searchTerm, categoryFilter, sortOrder]);

  const handleDelete = async (id: number) => {
    try {
      await deleteExpense(id);
      toast({ title: 'Expense deleted successfully.' });
      refresh();
    } catch (err) {
      toast({ title: 'Failed to delete expense.', variant: 'destructive' });
    }
  };
  
  const handleEditSuccess = () => {
    refresh();
  }

  if (loading) {
    return <ExpensesSkeleton />;
  }
  
  if (error) {
     return (
      <div className="text-center py-10">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-2xl shrink-0">Expense History</CardTitle>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/expenses/new">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline-block sm:ml-2">New Expense</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/scan">
                <ScanLine className="h-4 w-4" />
                <span className="hidden sm:inline-block sm:ml-2">Scan</span>
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:w-64"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories && categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Sort by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAndSortedExpenses.length > 0 ? (
          <Accordion type="multiple" className="border rounded-md">
            {filteredAndSortedExpenses.map((expense) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                onDelete={handleDelete}
                onEditSuccess={handleEditSuccess}
              />
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-md">
            <p className="text-muted-foreground">No expenses found.</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or add a new expense.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
