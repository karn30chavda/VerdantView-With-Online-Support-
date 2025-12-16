"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addReminder, getReminders, deleteReminder } from "@/lib/db";
import type { Reminder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast, isToday, addDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  Trash2,
  Bell,
  BellOff,
  Loader2,
  Repeat,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const reminderSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  date: z.date({ required_error: "A date is required." }),
  isRecurring: z.boolean().optional(),
  repeatInterval: z.number().optional(),
});

async function scheduleReminderNotifications(title: string, date: Date) {
  if (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    Notification.permission === "granted"
  ) {
    const registration = await navigator.serviceWorker.ready;
    // Schedule for one day before
    const oneDayBefore = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    if (oneDayBefore > new Date()) {
      registration.active?.postMessage({
        type: "SCHEDULE_REMINDER",
        payload: {
          title: `Upcoming: ${title}`,
          options: { body: `Due tomorrow.` },
          schedule: { at: oneDayBefore.getTime() },
        },
      });
    }
    // Schedule for the due date
    registration.active?.postMessage({
      type: "SCHEDULE_REMINDER",
      payload: {
        title: `Due Today: ${title}`,
        options: { body: `Payment is due today.` },
        schedule: { at: date.getTime() },
      },
    });
  }
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reminderSchema>>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: "",
      isRecurring: false,
      repeatInterval: 30,
    },
  });

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    const fetchedReminders = await getReminders();
    setReminders(
      fetchedReminders.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    fetchReminders();
  }, [fetchReminders]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") toast({ title: "Notifications enabled!" });
  };

  const handleAddReminder = async (values: z.infer<typeof reminderSchema>) => {
    try {
      const newReminder: Omit<Reminder, "id"> = {
        title: values.title,
        date: values.date.toISOString(),
        isRecurring: values.isRecurring || false,
        repeatInterval: values.isRecurring ? values.repeatInterval : undefined,
      };
      await addReminder(newReminder);
      toast({ title: "Reminder added successfully!" });

      if (notificationPermission === "granted") {
        await scheduleReminderNotifications(values.title, values.date);
      }

      form.reset({
        title: "",
        date: undefined,
        isRecurring: false,
        repeatInterval: 30,
      });
      setShowRecurring(false);
      setIsDialogOpen(false); // Close dialog
      fetchReminders();
    } catch (error) {
      toast({ title: "Failed to add reminder.", variant: "destructive" });
    }
  };

  const handleDeleteReminder = async (id: number) => {
    try {
      await deleteReminder(id);
      toast({ title: "Reminder deleted." });
      fetchReminders();
    } catch (error) {
      toast({ title: "Failed to delete reminder.", variant: "destructive" });
    }
  };

  const getDaysLeft = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diff = differenceInDays(date, today);
    if (diff < 0)
      return { text: "Overdue", color: "text-red-500", bg: "bg-red-500/10" };
    if (diff === 0)
      return {
        text: "Due Today",
        color: "text-amber-500",
        bg: "bg-amber-500/10",
      };
    if (diff === 1)
      return { text: "Tomorrow", color: "text-blue-500", bg: "bg-blue-500/10" };
    return {
      text: `In ${diff} days`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    };
  };

  return (
    <div className="flex flex-col gap-6 pb-24 min-h-screen">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay on top of your bills & subscriptions.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="h-12 w-12 rounded-full shadow-md">
              <Plus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Reminder</DialogTitle>
              <DialogDescription>
                Set a due date for your upcoming payment.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleAddReminder)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Netflix Subscription"
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
                      <FormLabel>Due Date</FormLabel>
                      <Popover
                        open={isDatePickerOpen}
                        onOpenChange={setIsDatePickerOpen}
                        modal={true}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
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
                              field.onChange(date);
                              setIsDatePickerOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2 rounded-md border p-3 bg-muted/20">
                  <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 w-full">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              setShowRecurring(!!checked);
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Recurring Payment</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {showRecurring && (
                  <FormField
                    control={form.control}
                    name="repeatInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repeat Every (Days)</FormLabel>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="30"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 0)
                              }
                              value={field.value || ""}
                            />
                          </FormControl>
                          <span className="text-sm font-medium text-muted-foreground">
                            Days
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter className="pt-4">
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="w-full"
                  >
                    {form.formState.isSubmitting ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      "Add Reminder"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notification prompt */}
      {notificationPermission !== "granted" && (
        <div
          onClick={requestNotificationPermission}
          className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl cursor-pointer hover:bg-primary/20 transition-colors border border-primary/20"
        >
          <div className="p-2 bg-primary/20 rounded-full text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Enable Notifications</h3>
            <p className="text-xs text-muted-foreground">
              Get alerted when bills are due.
            </p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-muted-foreground/50" />
        </div>
      )}

      {/* Reminders List */}
      <div className="grid gap-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 w-full bg-muted/40 animate-pulse rounded-xl"
            />
          ))
        ) : reminders.length > 0 ? (
          reminders.map((reminder) => {
            const status = getDaysLeft(reminder.date);
            return (
              <Card
                key={reminder.id}
                className="group overflow-hidden border-none shadow-sm bg-card hover:shadow-md transition-all"
              >
                <CardContent className="p-0">
                  <div className="flex items-center p-4 gap-4">
                    {/* Date/Icon Box */}
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center h-14 w-14 rounded-xl font-bold text-xs shrink-0",
                        status.bg,
                        status.color
                      )}
                    >
                      <span className="text-lg leading-none">
                        {format(new Date(reminder.date), "dd")}
                      </span>
                      <span className="uppercase tracking-tighter opacity-80">
                        {format(new Date(reminder.date), "MMM")}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">
                        {reminder.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className={cn("font-medium", status.color)}>
                          {status.text}
                        </span>
                        {reminder.isRecurring && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Repeat className="h-3 w-3" /> Recurring
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                      onClick={() =>
                        reminder.id && handleDeleteReminder(reminder.id)
                      }
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-6 bg-muted/30 rounded-full">
              <BellOff className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No reminders</h3>
              <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">
                Tap the + button to add your first bill reminder.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
