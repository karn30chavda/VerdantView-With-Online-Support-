export interface Expense {
  id?: number;
  title: string;
  amount: number;
  date: string; // ISO string format
  category: string;
  paymentMode: 'Cash' | 'Card' | 'Online' | 'Other';
}

export interface Category {
  id?: number;
  name: string;
}

export interface Reminder {
  id?: number;
  title: string;
  date: string; // ISO string format
}

export interface AppSettings {
  id?: number;
  monthlyBudget: number;
}
