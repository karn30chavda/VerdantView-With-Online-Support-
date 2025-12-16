import { ExpenseForm } from "@/components/expense-form";

export default function NewExpensePage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-lg">
        <ExpenseForm />
      </div>
    </div>
  );
}
