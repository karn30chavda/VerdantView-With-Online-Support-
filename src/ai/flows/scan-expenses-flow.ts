'use server';
/**
 * @fileOverview This file defines a Genkit flow for scanning receipt images to extract multiple expense items.
 *
 * - scanExpenses - A function that takes an image and extracts a list of expenses.
 * - ScanExpensesInput - The input type for the scanExpenses function.
 * - ScanExpensesOutput - The return type for the scanExpenses function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScanExpensesInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt or shopping list, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanExpensesInput = z.infer<typeof ScanExpensesInputSchema>;

const ExpenseItemSchema = z.object({
    title: z.string().describe('The name of the item purchased.'),
    amount: z.number().describe('The price of the item.'),
});

const ScanExpensesOutputSchema = z.object({
    expenses: z.array(ExpenseItemSchema).describe('An array of expenses found in the image.'),
});
export type ScanExpensesOutput = z.infer<typeof ScanExpensesOutputSchema>;


export async function scanExpenses(input: ScanExpensesInput): Promise<ScanExpensesOutput> {
  return scanExpensesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanExpensesPrompt',
  input: { schema: ScanExpensesInputSchema },
  output: { schema: ScanExpensesOutputSchema },
  prompt: `You are an expert AI assistant that extracts line items from a receipt or shopping list image.

  Analyze the provided image and extract all individual items and their prices.

  Return the extracted information as a JSON object with an "expenses" array.

  Image: {{media url=photoDataUri}}
  `,
});

const scanExpensesFlow = ai.defineFlow(
  {
    name: 'scanExpensesFlow',
    inputSchema: ScanExpensesInputSchema,
    outputSchema: ScanExpensesOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output || { expenses: [] };
  }
);
