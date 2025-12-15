import { ai } from "./genkit";
import { z } from "zod";

// Schema for extracted expense
const ExpenseSchema = z.object({
  title: z.string().describe("Name or description of the expense"),
  amount: z.number().describe("Amount in INR"),
  date: z
    .string()
    .optional()
    .describe("Date if mentioned in the image (YYYY-MM-DD format)"),
  category: z
    .string()
    .optional()
    .describe("Category like Food, Transportation, Shopping, etc."),
  paymentMode: z
    .enum(["Cash", "Card", "Online", "Other"])
    .optional()
    .describe("Payment method if mentioned"),
});

const ExpensesResponseSchema = z.object({
  expenses: z.array(ExpenseSchema),
  rawText: z.string().optional().describe("Any additional text found"),
});

// Genkit flow to extract expenses from an image
export const extractExpensesFlow = ai.defineFlow(
  {
    name: "extractExpenses",
    inputSchema: z.object({
      imageData: z.string().describe("Base64 encoded image data URL"),
    }),
    outputSchema: ExpensesResponseSchema,
  },
  async (input) => {
    const prompt = `You are an expert at reading and extracting expense information from ANY type of financial document, including:
- Printed receipts and bills
- HANDWRITTEN receipts and notes
- Restaurant bills (handwritten or printed)
- Shopping receipts
- Invoices
- Bank statements
- Screenshots of payment apps

🔥 CRITICAL: You MUST be able to read HANDWRITTEN text accurately. Many receipts have handwritten amounts and descriptions. Pay special attention to handwritten numbers.

Your task:
1. Carefully read ALL text in the image (BOTH printed AND handwritten)
2. Extract EVERY expense/item with its amount
3. Be EXTRA careful with handwritten numbers and amounts

For each expense found, provide:
- title: Clear description of the item/expense (extract exactly what you read)
- amount: Numerical amount in INR (convert from any currency if needed, default to INR)
- date: If any date is visible in the image (format: YYYY-MM-DD)
- category: Best matching category (Food, Transportation, Shopping, Entertainment, Utilities, Healthcare, Groceries, or Other)
- paymentMode: Payment method if visible (Cash, Card, Online, or Other)

Rules:
✓ Read BOTH handwritten AND printed text carefully
✓ Extract ALL items, even if handwritten is messy
✓ Be accurate with amounts - double check handwritten numbers
✓ If amount has decimals like .50 or .00, include them
✓ If no clear date is found, omit the date field
✓ Use "Other" category only if truly unclear
✓ Look for totals at the bottom of receipts
✓ For unclear handwriting, make your best effort but be accurate
✓ Return empty array only if truly no expenses exist

Examples:
- "Coffee - 45" → {title: "Coffee", amount: 45}
- Handwritten "Milk ₹60" → {title: "Milk", amount: 60}
- "Total: Rs. 150.50" → Extract individual items if visible, not just total
- Multiple items in a list → Extract each one separately`;

    const result = await ai.generate({
      model: "googleai/gemini-2.5-flash", // Model that worked in previous project
      prompt: [{ text: prompt }, { media: { url: input.imageData } }],
      output: {
        format: "json",
        schema: ExpensesResponseSchema,
      },
      config: {
        temperature: 0.1, // Lower temperature for more accurate results
      },
    });

    return result.output!;
  }
);
