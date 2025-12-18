"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import {
  getSettings,
  updateSettings,
  getCategories,
  addCategory,
  deleteCategory,
  exportData,
  clearAllData,
  getExpenses,
  getSavingsTransactions,
} from "@/lib/db";
import type { AppSettings, Category } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  Loader2,
  Trash2,
  X,
  User,
  Wallet,
  Tags,
  Database,
  Download,
  FileJson,
  FileText,
  AlertTriangle,
  Save,
  Plus,
} from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Extend jsPDF with autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const budgetSchema = z.object({
  monthlyBudget: z.coerce
    .number()
    .min(0, { message: "Budget must be a positive number." }),
});

const categorySchema = z.object({
  name: z
    .string()
    .min(2, { message: "Category name must be at least 2 characters." }),
});

const defaultCategories = [
  "Groceries",
  "Dining",
  "Travel",
  "Utilities",
  "Shopping",
  "Food",
  "Medicine",
  "Other",
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  const budgetForm = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      monthlyBudget: 0,
    },
  });

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });

  const fetchData = async () => {
    const [fetchedSettings, fetchedCategories] = await Promise.all([
      getSettings(),
      getCategories(),
    ]);
    setSettings(fetchedSettings);
    setCategories(fetchedCategories);
    if (fetchedSettings) {
      budgetForm.reset({ monthlyBudget: fetchedSettings.monthlyBudget });
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateBudget = async (values: z.infer<typeof budgetSchema>) => {
    try {
      await updateSettings(values);
      toast({ title: "Budget updated successfully!" });
      fetchData();
    } catch (error) {
      toast({ title: "Failed to update budget.", variant: "destructive" });
    }
  };

  const handleAddCategory = async (values: z.infer<typeof categorySchema>) => {
    try {
      // Check for duplicates locally first to give better feedback
      if (
        categories.some(
          (c) => c.name.toLowerCase() === values.name.toLowerCase()
        )
      ) {
        toast({ title: "Category already exists.", variant: "destructive" });
        return;
      }
      await addCategory({ name: values.name });
      toast({ title: "Category added successfully!" });
      categoryForm.reset({ name: "" });
      fetchData();
    } catch (error) {
      toast({
        title: "Failed to add category.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (defaultCategories.includes(name)) {
      toast({
        title: "Cannot delete default category.",
        variant: "destructive",
      });
      return;
    }
    try {
      await deleteCategory(id);
      toast({ title: "Category deleted." });
      fetchData();
    } catch (error) {
      toast({ title: "Failed to delete category.", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `verdantview-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      link.click();
      toast({ title: "Data exported successfully!" });
    } catch (error) {
      toast({ title: "Failed to export data.", variant: "destructive" });
    }
  };

  const handleExportPdf = async () => {
    try {
      const [expenses, savingsTransactions] = await Promise.all([
        getExpenses(),
        getSavingsTransactions(),
      ]);

      const incomeList = expenses.filter((e) => e.type === "income");
      const expenseList = expenses.filter((e) => e.type !== "income");

      if (
        incomeList.length === 0 &&
        expenseList.length === 0 &&
        savingsTransactions.length === 0
      ) {
        toast({ title: "No data to export.", variant: "destructive" });
        return;
      }

      const doc = new jsPDF();
      let lastY = 35;

      // Title
      doc.setFontSize(22);
      doc.setTextColor(34, 197, 94); // Green color
      doc.text("VerdantView Financial Report", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, 28);
      doc.setTextColor(0); // Reset color

      const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(amount);

      // --- SECTION 1: INCOME ---
      if (incomeList.length > 0) {
        doc.setFontSize(14);
        doc.text("Income", 14, lastY);
        lastY += 5;

        const tableColumn = ["Date", "Title", "Category", "Mode", "Amount"];
        const tableRows = incomeList.map((item) => [
          format(new Date(item.date), "yyyy-MM-dd"),
          item.title,
          item.category,
          item.paymentMode,
          formatCurrency(item.amount),
        ]);

        const totalIncome = incomeList.reduce(
          (sum, item) => sum + item.amount,
          0
        );

        doc.autoTable({
          startY: lastY,
          head: [tableColumn],
          body: tableRows,
          foot: [["", "", "", "Total Income", formatCurrency(totalIncome)]],
          theme: "striped",
          headStyles: { fillColor: [40, 167, 69] }, // Green header
          footStyles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            textColor: 0,
          },
        });

        lastY = (doc as any).lastAutoTable.finalY + 15;
      }

      // --- SECTION 2: EXPENSES ---
      if (expenseList.length > 0) {
        doc.setFontSize(14);
        doc.text("Expenses", 14, lastY);
        lastY += 5;

        const tableColumn = ["Date", "Title", "Category", "Mode", "Amount"];
        const tableRows = expenseList.map((item) => [
          format(new Date(item.date), "yyyy-MM-dd"),
          item.title,
          item.category,
          item.paymentMode,
          formatCurrency(item.amount),
        ]);

        const totalExpenses = expenseList.reduce(
          (sum, item) => sum + item.amount,
          0
        );

        doc.autoTable({
          startY: lastY,
          head: [tableColumn],
          body: tableRows,
          foot: [["", "", "", "Total Expenses", formatCurrency(totalExpenses)]],
          theme: "striped",
          headStyles: { fillColor: [220, 53, 69] }, // Red header
          footStyles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            textColor: 0,
          },
        });

        lastY = (doc as any).lastAutoTable.finalY + 15;
      }

      // --- SECTION 3: SAVINGS TRANSACTIONS ---
      if (savingsTransactions.length > 0) {
        doc.setFontSize(14);
        doc.text("Savings History", 14, lastY);
        lastY += 5;

        const tableColumn = ["Date", "Type", "Note", "Amount"];
        const tableRows = savingsTransactions.map((item) => [
          format(new Date(item.date), "yyyy-MM-dd"),
          item.type.replace("_", " ").toUpperCase(),
          item.note || "-",
          formatCurrency(item.amount),
        ]);

        doc.autoTable({
          startY: lastY,
          head: [tableColumn],
          body: tableRows,
          theme: "striped",
          headStyles: { fillColor: [0, 123, 255] }, // Blue header
        });

        lastY = (doc as any).lastAutoTable.finalY + 15;
      }

      // --- SUMMARY ---
      // Optional: Add a small summary section if needed, but the totals in tables might be enough.

      doc.save(
        `verdantview-report-${new Date().toISOString().split("T")[0]}.pdf`
      );
      toast({ title: "PDF exported successfully!" });
    } catch (error) {
      toast({ title: "Failed to export PDF.", variant: "destructive" });
      console.error("PDF Export Error: ", error);
    }
  };

  const handleClearData = async () => {
    try {
      await clearAllData();
      toast({ title: "All data has been cleared." });
      fetchData(); // Refresh UI
    } catch (error) {
      toast({ title: "Failed to clear data.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your preferences and application data.
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        {/* SECTION: ACCOUNT LINK */}
        {isOnline && (
          <Link href="/account">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer border-indigo-500/50">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="bg-indigo-100 p-3 rounded-full dark:bg-indigo-900/30">
                  <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Manage Account</CardTitle>
                  <CardDescription>
                    Update your email, password, and security settings.
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* SECTION: GENERAL PREFERENCES */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" /> General Preferences
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly Budget */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Monthly Budget</CardTitle>
                <CardDescription>
                  Set your monthly spending limit target.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...budgetForm}>
                  <form
                    onSubmit={budgetForm.handleSubmit(handleUpdateBudget)}
                    className="flex gap-3"
                  >
                    <FormField
                      control={budgetForm.control}
                      name="monthlyBudget"
                      render={({ field }) => (
                        <FormItem className="flex-grow space-y-0">
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50000"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={budgetForm.formState.isSubmitting}
                      size="icon"
                      variant="default"
                    >
                      {budgetForm.formState.isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* SECTION: CATEGORIES */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Tags className="h-5 w-5" /> Categories
          </h2>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Manage Categories</CardTitle>
              <CardDescription>
                Customize your expense categories to better track your spending
                habits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Add New Category */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <Form {...categoryForm}>
                  <form
                    onSubmit={categoryForm.handleSubmit(handleAddCategory)}
                    className="flex flex-col sm:flex-row gap-3 items-end sm:items-center"
                  >
                    <FormField
                      control={categoryForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="flex-grow space-y-1.5 w-full">
                          <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Add New Category
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="e.g. Subscriptions, Hobbies"
                                className="bg-background"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={categoryForm.formState.isSubmitting}
                      className="w-full sm:w-auto shrink-0"
                    >
                      {categoryForm.formState.isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Add
                    </Button>
                  </form>
                </Form>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Default Categories Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="h-2 w-2 rounded-full bg-primary/50" />
                    <h4 className="text-sm font-medium">System Categories</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories
                      .filter((cat) => defaultCategories.includes(cat.name))
                      .map((cat) => (
                        <Badge
                          key={cat.id || cat.name}
                          variant="outline"
                          className="px-3 py-1.5 text-sm font-normal bg-background/50 hover:bg-background cursor-default text-muted-foreground"
                        >
                          {cat.name}
                        </Badge>
                      ))}
                  </div>
                </div>

                {/* Custom Categories Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    <h4 className="text-sm font-medium">Your Categories</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.filter(
                      (cat) => !defaultCategories.includes(cat.name)
                    ).length > 0 ? (
                      categories
                        .filter((cat) => !defaultCategories.includes(cat.name))
                        .map((cat) => (
                          <Badge
                            key={cat.id}
                            variant="secondary"
                            className="pl-3 pr-1 py-1 text-sm font-medium gap-1 hover:bg-secondary/80 transition-all group"
                          >
                            {cat.name}
                            {cat.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="ml-1 rounded-full p-1 text-muted-foreground/50 hover:bg-destructive hover:text-destructive-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    <X className="h-3 w-3" />
                                    <span className="sr-only">Delete</span>
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete &quot;{cat.name}&quot;?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure? This category will be
                                      removed from selection options, but
                                      existing expenses will remain.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        cat.id &&
                                        handleDeleteCategory(cat.id, cat.name)
                                      }
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </Badge>
                        ))
                    ) : (
                      <div className="text-sm text-muted-foreground italic py-2">
                        No custom categories added yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* SECTION: DATA & BACKUP */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" /> Data & Backup
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <FileJson className="h-4 w-4" /> JSON Backup
                </CardTitle>
                <CardDescription>
                  Export all your data as a JSON file for backup.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExport}
                >
                  <Download className="mr-2 h-4 w-4" /> Download Backup
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> PDF Report
                </CardTitle>
                <CardDescription>
                  Generate a printable PDF report of your expenses.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExportPdf}
                >
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Danger Zone */}
          <Card className="border-destructive/30 bg-destructive/5 mt-4">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <CardTitle className="text-base">Danger Zone</CardTitle>
              </div>
              <CardDescription>
                Permanently delete all data from this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="w-4 h-4 mr-2" /> Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      all your:
                      <ul className="list-disc list-inside mt-2 ml-2">
                        <li>Expenses and Income records</li>
                        <li>Custom Categories</li>
                        <li>Budget and Savings settings</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearData}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Yes, Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-muted-foreground pb-8">
        VerdantView v1.0.0 • Offline-First Personal Finance • Online Group
        Finance
      </div>
    </div>
  );
}
