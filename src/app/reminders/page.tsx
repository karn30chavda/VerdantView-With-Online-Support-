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
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Trash2,
  Bell,
  BellOff,
  Loader2,
  Repeat,
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
    // Immediate notification for testing
    registration.active?.postMessage({
      type: "SCHEDULE_REMINDER",
      payload: {
        title: `Reminder Added: ${title}`,
        options: {
          body: `Due: ${format(date, "PPP")}`,
        },
        schedule: { at: Date.now() + 1000 }, // Schedule for 1 second in the future for "instant" feel
      },
    });

    // Schedule for one day before
    const oneDayBefore = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    if (oneDayBefore > new Date()) {
      registration.active?.postMessage({
        type: "SCHEDULE_REMINDER",
        payload: {
          title: `Upcoming: ${title}`,
          options: {
            body: `Due tomorrow.`,
          },
          schedule: { at: oneDayBefore.getTime() },
        },
      });
    }

    // Schedule for the due date
    registration.active?.postMessage({
      type: "SCHEDULE_REMINDER",
      payload: {
        title: `Due Today: ${title}`,
        options: {
          body: `Payment is due today.`,
        },
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
    if (!("Notification" in window)) {
      toast({
        title: "This browser does not support desktop notification",
        variant: "destructive",
      });
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      toast({ title: "Notifications enabled!" });
    } else {
      toast({
        title: "Notifications were not enabled.",
        variant: "destructive",
      });
    }
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
      const reminderType = values.isRecurring
        ? `recurring (every ${values.repeatInterval} days)`
        : "one-time";
      toast({ title: `${reminderType} reminder added and scheduled!` });

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

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted-foreground">
            Set and manage your upcoming bill reminders.
          </p>
        </div>
        {notificationPermission !== "granted" && (
          <Button
            onClick={requestNotificationPermission}
            variant="outline"
            className="mt-4 md:mt-0"
          >
            <Bell className="mr-2 h-4 w-4" /> Enable Notifications
          </Button>
        )}
        {notificationPermission === "granted" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 md:mt-0">
            <BellOff className="h-4 w-4" /> Notifications are enabled
          </div>
        )}
      </div>

      <div className="grid gap-8">
        {/* Add New Reminder - Spacious Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Add New Reminder</CardTitle>
            <CardDescription>
              Create a one-time or recurring reminder for your bills and
              expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleAddReminder)}
                className="space-y-6"
              >
                {/* Title Field - Full Width */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">
                        Reminder Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Travel Pass Renewal, Electricity Bill"
                          className="h-12 text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Field - Full Width */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Due Date</FormLabel>
                      <Popover
                        open={isDatePickerOpen}
                        onOpenChange={setIsDatePickerOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full h-12 text-base pl-3 text-left font-normal justify-start",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-3 h-5 w-5 opacity-70" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
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

                {/* Recurring Options - Card Style */}
                <div className="border rounded-lg p-5 bg-muted/30 space-y-4">
                  <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-4 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              setShowRecurring(!!checked);
                            }}
                            className="h-5 w-5"
                          />
                        </FormControl>
                        <div className="flex-1 space-y-1">
                          <FormLabel className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                            <Repeat className="h-5 w-5" />
                            Make this a recurring reminder
                          </FormLabel>
                          <p className="text-sm text-muted-foreground font-normal">
                            Perfect for monthly bills, subscriptions, and
                            regular payments
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Interval Selector - Shows when checked */}
                  {showRecurring && (
                    <FormField
                      control={form.control}
                      name="repeatInterval"
                      render={({ field }) => {
                        const PRESET_INTERVALS = [7, 14, 30, 60, 90, 180, 365];
                        const isCustom = !PRESET_INTERVALS.includes(
                          field.value || 0
                        );

                        return (
                          <FormItem className="pl-9 mt-6">
                            <FormLabel className="text-base mb-3 block">
                              Repeat every
                            </FormLabel>
                            <div className="space-y-3">
                              <Select
                                value={
                                  isCustom ? "custom" : field.value?.toString()
                                }
                                onValueChange={(value) => {
                                  if (value === "custom") {
                                    // Keep current value if possible, else default to 1, but we need to trigger 'custom' state
                                    // Logic: if we switch to custom, we just let the input be editable.
                                    // If the current value is already a preset, we might want to change it to something non-preset or just let the input handle it?
                                    // Actually, if we switch to custom, we can just leave the value as is (even if it matches a preset efficiently)
                                    // BUT my isCustom logic depends on value NOT being in preset.
                                    // So to force 'custom' state, we might need a value that isn't a preset?
                                    // This is tricky.
                                    // Alternative: standard controlled boolean for "isCustomMode".
                                    // Let's stick to the boolean state approach instead of derived state, it's safer for UX.
                                    // But wait, render prop doesn't have local state easily unless I use the component state.
                                    // I can use a local variable if I just depend on the value?

                                    // Let's revise:
                                    // If user selects "custom", I set value to something default like "1" (if 1 is not in presets). 1 IS NOT in presets.
                                    field.onChange(1);
                                  } else {
                                    field.onChange(parseInt(value));
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-12 text-base w-full md:w-[300px]">
                                    <SelectValue placeholder="Select interval" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem
                                    value="7"
                                    className="py-3 cursor-pointer"
                                  >
                                    7 days (Weekly)
                                  </SelectItem>
                                  <SelectItem
                                    value="14"
                                    className="py-3 cursor-pointer"
                                  >
                                    14 days (Bi-weekly)
                                  </SelectItem>
                                  <SelectItem
                                    value="30"
                                    className="py-3 cursor-pointer"
                                  >
                                    30 days (Monthly)
                                  </SelectItem>
                                  <SelectItem
                                    value="60"
                                    className="py-3 cursor-pointer"
                                  >
                                    60 days (2 Months)
                                  </SelectItem>
                                  <SelectItem
                                    value="90"
                                    className="py-3 cursor-pointer"
                                  >
                                    90 days (Quarterly)
                                  </SelectItem>
                                  <SelectItem
                                    value="180"
                                    className="py-3 cursor-pointer"
                                  >
                                    180 days (Half-yearly)
                                  </SelectItem>
                                  <SelectItem
                                    value="365"
                                    className="py-3 cursor-pointer"
                                  >
                                    365 days (Yearly)
                                  </SelectItem>
                                  <SelectItem
                                    value="custom"
                                    className="py-3 cursor-pointer font-semibold"
                                  >
                                    Custom Days
                                  </SelectItem>
                                </SelectContent>
                              </Select>

                              {isCustom && (
                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <Input
                                    type="number"
                                    value={field.value || ""}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="h-12 w-full "
                                    min={1}
                                  />
                                  <span className="text-muted-foreground">
                                    days
                                  </span>
                                </div>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )}
                </div>

                {/* Submit Button - Larger */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  Add Reminder
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Reminders</CardTitle>
            <CardDescription>
              A list of your scheduled reminders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <div className="h-16 w-full animate-pulse bg-muted rounded-md" />
                <div className="h-16 w-full animate-pulse bg-muted rounded-md" />
                <div className="h-16 w-full animate-pulse bg-muted rounded-md" />
              </div>
            ) : reminders.length > 0 ? (
              <ul className="space-y-3">
                {reminders.map((reminder) => (
                  <li
                    key={reminder.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {reminder.isRecurring ? (
                          <Repeat className="h-5 w-5" />
                        ) : (
                          <Bell className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{reminder.title}</p>
                          {reminder.isRecurring && (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30">
                              Every {reminder.repeatInterval} days
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Due: {format(new Date(reminder.date), "PPP")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          reminder.id && handleDeleteReminder(reminder.id)
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No reminders set yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
