import { Suspense } from "react";
import { ExpenseForm } from "@/components/expense-form";
import { Loader2 } from "lucide-react";

export default function NewExpensePage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-lg">
        <Suspense
          fallback={
            <div className="flex h-[50vh] w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <ExpenseForm />
        </Suspense>
      </div>
    </div>
  );
}
