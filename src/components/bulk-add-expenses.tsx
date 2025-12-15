"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, ListPlus, Save } from "lucide-react";
import { useExpenses } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@/lib/types";
import { Card } from "@/components/ui/card";

type QuickExpense = Omit<Expense, "id">;

const defaultExpense = (): QuickExpense => ({
  title: "",
  amount: 0,
  date: new Date().toISOString(),
  category: "",
  paymentMode: "Cash" as const,
});

export function BulkAddExpenses({ onSuccess }: { onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
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
      setExpenses([defaultExpense()]);
      setIsOpen(false);
      onSuccess();
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset on close
      setExpenses([defaultExpense()]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ListPlus className="h-4 w-4" />
          <span className="hidden sm:inline-block sm:ml-2">
            Quick Add Multiple
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Add Multiple Expenses</DialogTitle>
          <DialogDescription>
            Add all your expenses from the day at once. Perfect for when you
            forget to track in real-time!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {expenses.map((expense, index) => (
            <Card key={index} className="p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Expense #{index + 1}
                </span>
                {expenses.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`title-${index}`}>
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`title-${index}`}
                    placeholder="e.g., Lunch at cafe"
                    value={expense.title}
                    onChange={(e) =>
                      handleChange(index, "title", e.target.value)
                    }
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor={`amount-${index}`}>
                    Amount (₹) <span className="text-destructive">*</span>
                  </Label>
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
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor={`date-${index}`}>Date</Label>
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
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={expense.category}
                    onValueChange={(value) =>
                      handleChange(index, "category", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select
                    value={expense.paymentMode}
                    onValueChange={(value: any) =>
                      handleChange(index, "paymentMode", value)
                    }
                  >
                    <SelectTrigger>
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
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleAdd}
            type="button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Expense
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All ({expenses.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
