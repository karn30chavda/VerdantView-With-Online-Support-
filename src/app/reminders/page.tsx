
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addReminder, getReminders, deleteReminder } from '@/lib/db';
import type { Reminder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Trash2, Bell, BellOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const reminderSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  date: z.date({ required_error: 'A date is required.' }),
});

async function scheduleReminderNotifications(title: string, date: Date) {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        // Immediate notification for testing
        registration.active?.postMessage({
            type: 'SCHEDULE_REMINDER',
            payload: {
                title: `Reminder Added: ${title}`,
                options: {
                    body: `Due: ${format(date, 'PPP')}`,
                },
                schedule: { at: Date.now() + 1000 } // Schedule for 1 second in the future for "instant" feel
            }
        });

        // Schedule for one day before
        const oneDayBefore = new Date(date.getTime() - 24 * 60 * 60 * 1000);
        if (oneDayBefore > new Date()) {
          registration.active?.postMessage({
              type: 'SCHEDULE_REMINDER',
              payload: {
                  title: `Upcoming: ${title}`,
                  options: {
                      body: `Due tomorrow.`,
                  },
                  schedule: { at: oneDayBefore.getTime() }
              }
          });
        }
        
        // Schedule for the due date
        registration.active?.postMessage({
            type: 'SCHEDULE_REMINDER',
            payload: {
                title: `Due Today: ${title}`,
                options: {
                    body: `Payment is due today.`,
                },
                schedule: { at: date.getTime() }
            }
        });
    }
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reminderSchema>>({
    resolver: zodResolver(reminderSchema),
    defaultValues: { title: '' },
  });

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    const fetchedReminders = await getReminders();
    setReminders(fetchedReminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    fetchReminders();
  }, [fetchReminders]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({ title: 'This browser does not support desktop notification', variant: 'destructive' });
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      toast({ title: 'Notifications enabled!' });
    } else {
      toast({ title: 'Notifications were not enabled.', variant: 'destructive' });
    }
  };

  const handleAddReminder = async (values: z.infer<typeof reminderSchema>) => {
    try {
      const newReminder: Omit<Reminder, 'id'> = {
        title: values.title,
        date: values.date.toISOString(),
      };
      await addReminder(newReminder);
      toast({ title: 'Reminder added and scheduled!' });
      
      if (notificationPermission === 'granted') {
        await scheduleReminderNotifications(values.title, values.date);
      }
      
      form.reset({ title: '', date: undefined });
      fetchReminders();
    } catch (error) {
      toast({ title: 'Failed to add reminder.', variant: 'destructive' });
    }
  };

  const handleDeleteReminder = async (id: number) => {
    try {
      await deleteReminder(id);
      toast({ title: 'Reminder deleted.' });
      fetchReminders();
    } catch (error) {
      toast({ title: 'Failed to delete reminder.', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted-foreground">Set and manage your upcoming bill reminders.</p>
        </div>
        {notificationPermission !== 'granted' && (
          <Button onClick={requestNotificationPermission} variant="outline" className="mt-4 md:mt-0">
             <Bell className="mr-2 h-4 w-4" /> Enable Notifications
          </Button>
        )}
         {notificationPermission === 'granted' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 md:mt-0">
             <BellOff className="h-4 w-4" /> Notifications are enabled
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8">
        <Card>
            <CardHeader>
              <CardTitle>Add New Reminder</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddReminder)} className="flex flex-col sm:flex-row items-end gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="flex-grow w-full">
                          <FormLabel>Title</FormLabel>
                          <FormControl><Input placeholder="e.g., Electricity Bill" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                        <FormItem className="flex-grow w-full sm:w-auto">
                            <FormLabel>Due Date</FormLabel>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button variant={'outline'} className={cn('w-full sm:w-[240px] pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                    {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
                  <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Reminder
                  </Button>
                </form>
              </Form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <CardTitle>Upcoming Reminders</CardTitle>
              <CardDescription>A list of your scheduled reminders.</CardDescription>
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
                    <li key={reminder.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Bell className="h-5 w-5"/>
                        </div>
                        <div>
                            <p className="font-medium">{reminder.title}</p>
                            <p className="text-sm text-muted-foreground">Due: {format(new Date(reminder.date), 'PPP')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => reminder.id && handleDeleteReminder(reminder.id)}>
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
