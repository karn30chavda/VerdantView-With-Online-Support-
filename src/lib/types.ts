export interface Expense {
  id?: number;
  title: string;
  amount: number;
  date: string; // ISO string format
  category: string;
  paymentMode: "Cash" | "Card" | "Online" | "Other";
  type?: "income" | "expense";
}

export interface Category {
  id?: number;
  name: string;
}

export interface Reminder {
  id?: number;
  title: string;
  date: string; // ISO string format
  isRecurring?: boolean; // Whether this reminder repeats
  repeatInterval?: number; // Number of days between repetitions (e.g., 30 for monthly)
  lastTriggered?: string; // ISO string - when it was last triggered/shown
}

export interface AppSettings {
  id?: number;
  monthlyBudget: number;
  emergencyFundGoal?: number;
  emergencyFundCurrent?: number;
  userName?: string;
}

export interface SavingsTransaction {
  id?: number;
  amount: number;
  date: string; // ISO string
  type: "deposit" | "withdrawal" | "goal_update";
  note?: string;
}
