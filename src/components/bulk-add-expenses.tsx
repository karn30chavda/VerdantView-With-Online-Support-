"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, Plus, Save, Loader2, ArrowLeft } from "lucide-react";
import { useExpenses } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@/lib/types";

type QuickExpense = Omit<Expense, "id">;

const defaultExpense = (): QuickExpense => ({
  title: "",
  amount: 0,
  date: new Date().toISOString(),
  category: "",
  paymentMode: "Cash" as const,
});

export function BulkExpenseForm() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<QuickExpense[]>([defaultExpense()]);
  const { categories, addMultipleExpenses } = useExpenses();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = () => {
    setExpenses([...expenses, defaultExpense()]);
  };

  const handleRemove = (index: number) => {
    if (expenses.length === 1) return;
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: keyof QuickExpense,
    value: string | number
  ) => {
    const newExpenses = [...expenses];
    newExpenses[index] = { ...newExpenses[index], [field]: value };
    setExpenses(newExpenses);
  };

  const handleSave = async () => {
    // Validate
    const validExpenses = expenses.filter(
      (e) => e.title.trim() && e.amount > 0 && e.category
    );

    if (validExpenses.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in at least one complete expense.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await addMultipleExpenses(validExpenses);
      toast({
        title: "Success!",
        description: `${validExpenses.length} expense(s) added successfully.`,
      });
      router.push("/expenses");
      router.refresh(); // Refresh data on navigation
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add expenses. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="-ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <CardTitle>Bulk Add Expenses</CardTitle>
            <CardDescription className="mt-1">
              Quickly add multiple transactions at once.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {expenses.map((expense, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-xl border border-border/50 transition-all bg-background"
            >
              {/* Header with Title and Delete */}
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`title-${index}`} className="sr-only">
                    Title
                  </Label>
                  <Input
                    id={`title-${index}`}
                    placeholder="e.g. Lunch at cafe"
                    value={expense.title}
                    onChange={(e) =>
                      handleChange(index, "title", e.target.value)
                    }
                    className="h-11 text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/50 bg-transparent"
                  />
                </div>
                {expenses.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0 -mt-1 -mr-2 opacity-50 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`amount-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id={`amount-${index}`}
                      type="number"
                      placeholder="0.00"
                      value={expense.amount || ""}
                      onChange={(e) =>
                        handleChange(
                          index,
                          "amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-11 pl-7"
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`date-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    Date
                  </Label>
                  <Input
                    id={`date-${index}`}
                    type="date"
                    value={expense.date.split("T")[0]}
                    onChange={(e) =>
                      handleChange(
                        index,
                        "date",
                        new Date(e.target.value).toISOString()
                      )
                    }
                    className="h-11"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Category
                  </Label>
                  <Select
                    value={expense.category}
                    onValueChange={(value) =>
                      handleChange(index, "category", value)
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Mode</Label>
                  <Select
                    value={expense.paymentMode}
                    onValueChange={(value: any) =>
                      handleChange(index, "paymentMode", value)
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            className="w-full h-12 border-dashed border-2 hover:border-solid hover:bg-muted/50"
            onClick={handleAdd}
            type="button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Expense
          </Button>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-11"
            size="lg"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All ({expenses.length})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
