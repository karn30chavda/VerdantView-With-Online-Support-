'use server';
/**
 * @fileOverview This file defines a Genkit flow for scanning documents (images or PDFs)
 * to extract a list of detailed expense items.
 *
 * - scanDocumentForExpenses - A function that takes a document and extracts a list of expenses.
 * - ScanDocumentForExpensesInput - The input type for the scanDocumentForExpenses function.
 * - ScanDocumentForExpensesOutput - The return type for the scanDocumentForExpenses function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScanDocumentForExpensesInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo or PDF of a document containing a list of expenses, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ScanDocumentForExpensesInput = z.infer<typeof ScanDocumentForExpensesInputSchema>;

const ExpenseDetailSchema = z.object({
    title: z.string().describe('The title or description of the expense item.'),
    amount: z.number().describe('The price or cost of the expense item.'),
    date: z.string().describe("The date of the expense (YYYY-MM-DD). If not found, use today's date."),
    category: z.string().describe('The category of the expense (e.g., Groceries, Dining, Travel). If not clear, use "Other".'),
    paymentMode: z.enum(['Cash', 'Card', 'Online', 'Other']).describe('The payment mode used. If unknown, use "Other".'),
});

const ScanDocumentForExpensesOutputSchema = z.object({
    expenses: z.array(ExpenseDetailSchema).describe('An array of detailed expenses found in the document.'),
});
export type ScanDocumentForExpensesOutput = z.infer<typeof ScanDocumentForExpensesOutputSchema>;


export async function scanDocumentForExpenses(input: ScanDocumentForExpensesInput): Promise<ScanDocumentForExpensesOutput> {
  return scanDocumentForExpensesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanDocumentForExpensesPrompt',
  input: { schema: ScanDocumentForExpensesInputSchema },
  output: { schema: ScanDocumentForExpensesOutputSchema },
  prompt: `You are an expert AI assistant that extracts structured data from documents, such as PDFs or images containing receipts or expense reports.

  Analyze the provided document and extract all individual expense entries. For each entry, extract the following details:
  - Title: The name or description of the item or service.
  - Amount: The total price or cost.
  - Date: The date of the transaction. Format it as YYYY-MM-DD. If a date is not found for an item, use today's date.
  - Category: Infer a likely category (e.g., Groceries, Dining, Travel, Utilities). If unsure, use "Other".
  - Payment Mode: The method of payment (e.g., "Card", "Cash", "Online"). If it's not specified, default to "Other".

  Return the extracted information as a JSON object containing an "expenses" array.

  Document: {{media url=photoDataUri}}
  `,
});

const scanDocumentForExpensesFlow = ai.defineFlow(
  {
    name: 'scanDocumentForExpensesFlow',
    inputSchema: ScanDocumentForExpensesInputSchema,
    outputSchema: ScanDocumentForExpensesOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output || { expenses: [] };
  }
);
