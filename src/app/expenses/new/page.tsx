import { ExpenseForm } from '@/components/expense-form';

export default function NewExpensePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add New Expense</h1>
        <p className="text-muted-foreground">
          Fill in the details below to add a new expense to your records.
        </p>
      </div>
      <ExpenseForm />
    </div>
  );
}
