"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addExpense, getCategories, updateExpense } from "@/lib/db";
import type { Expense, Category } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  amount: z.coerce
    .number()
    .positive({ message: "Amount must be a positive number." }),
  date: z.date(),
  category: z.string().min(1, { message: "Please select a category." }),
  paymentMode: z.enum(["Cash", "Card", "Online", "Other"]),
});

type ExpenseFormProps = {
  expense?: Expense;
  onSave?: () => void; // Optional callback for when save is successful
};

export function ExpenseForm({ expense, onSave }: ExpenseFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPredictingCategory, setIsPredictingCategory] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: expense?.title || "",
      amount: expense?.amount || undefined,
      date: expense ? new Date(expense.date) : new Date(),
      category: expense?.category || "",
      paymentMode: expense?.paymentMode || "Card",
    },
  });

  useEffect(() => {
    // Reset form values when the expense prop changes
    form.reset({
      title: expense?.title || "",
      amount: expense?.amount || undefined,
      date: expense ? new Date(expense.date) : new Date(),
      category: expense?.category || "",
      paymentMode: expense?.paymentMode || "Card",
    });
  }, [expense, form]);

  useEffect(() => {
    async function fetchCategories() {
      const fetchedCategories = await getCategories();
      setCategories(fetchedCategories);
      if (!form.getValues("category") && fetchedCategories.length > 0) {
        form.setValue("category", fetchedCategories[0].name);
      }
    }
    fetchCategories();
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (expense) {
        const expenseData: Expense = {
          ...values,
          id: expense.id,
          date: values.date.toISOString(),
        };
        await updateExpense(expenseData);
        toast({ title: "Expense updated successfully!" });
      } else {
        const { ...rest } = values;
        const expenseData: Omit<Expense, "id"> = {
          ...rest,
          date: values.date.toISOString(),
        };
        await addExpense(expenseData);
        toast({ title: "Expense added successfully!" });
      }

      if (onSave) {
        onSave();
      } else {
        router.push("/expenses");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to save expense:", error);
      toast({
        title: "Error",
        description: "Failed to save the expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // NEW Function to predict category
  const predictCategory = async (title: string) => {
    // Don't predict if title is short or categories aren't loaded
    if (title.length < 3 || categories.length === 0) return;

    // Don't predict if a category is already manually selected (unless it's the default/empty)
    const currentCategory = form.getValues("category");
    if (
      currentCategory &&
      currentCategory !== "" &&
      currentCategory !== categories[0]?.name
    ) {
      // Optional: Decide if we want to overwrite even if selected.
      // For now, let's only predict if it seems unset or user is just starting.
      // Actually, user might want correction. Let's just do it but maybe less aggressively?
      // Let's stick to predicting always on title blur for now, as requested.
    }

    setIsPredictingCategory(true);
    try {
      const response = await fetch("/api/predict-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          categories: categories.map((c) => c.name),
        }),
      });

      if (!response.ok) throw new Error("Prediction failed");

      const result = await response.json();
      if (result.category) {
        // Check if returned category actually exists in our list (double safety)
        const exists = categories.some((c) => c.name === result.category);
        if (exists) {
          form.setValue("category", result.category);
          toast({
            title: "category selected",
            description: `AI selected: ${result.category}`,
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error("AI Category prediction failed:", error);
      // Fail silently, don't annoy user
    } finally {
      setIsPredictingCategory(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Title
                {isPredictingCategory && (
                  <Sparkles className="h-3 w-3 text-blue-500 animate-pulse" />
                )}
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="e.g., Groceries from Walmart"
                    {...field}
                    onBlur={(e) => {
                      field.onBlur(); // Call original onBlur
                      predictCategory(e.target.value); // Trigger AI
                    }}
                  />
                  {isPredictingCategory && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover
                  open={isDatePickerOpen}
                  onOpenChange={setIsDatePickerOpen}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date || new Date());
                        setIsDatePickerOpen(false);
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Mode</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a payment mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {expense ? "Save Changes" : "Add Expense"}
        </Button>
      </form>
    </Form>
  );
}
