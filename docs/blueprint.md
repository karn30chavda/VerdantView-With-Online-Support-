# **App Name**: VerdantView

## Core Features:

- Dashboard: An overview page with summary cards, expenses list, budget tracker and upcoming reminders.
- Expense Management: A page to manage (view, filter, sort, edit, delete) all expenses.
- Add/Edit Expense: A form to add new expenses with fields for title, amount, date, category, and payment mode.
- AI Expense Scanner: A tool allowing users to upload an image of a receipt, using generative AI to prefill new expense data. Results will be editable.
- Reminders: Set, view, and delete reminders for upcoming bills, with browser notifications.
- Settings: A page to manage the monthly budget, create expense categories, and handle data operations (import/export/clear).
- Offline First Persistence: Store all data locally in the browser using IndexedDB, for complete offline functionality.

## Style Guidelines:

- Primary color: Vibrant green (#259b37) for buttons, links, and key elements.
- Background color: Light green (#f0f7f1) a soft muted shade of the primary.
- Accent color: Teal (#2ba8a0) for backgrounds and hover states to complement green.
- Body and headline font: 'Inter', a grotesque-style sans-serif, with a modern look suitable for body text or headlines.
- Sticky top Navbar with links to all major pages and a theme toggle.
- Consistent padding around main content area.
- Responsive layout using components from ShadCN/UI and icons from lucide-react.