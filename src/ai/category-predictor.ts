import { ai } from "./genkit";
import { z } from "zod";

const CategoryPredictionSchema = z.object({
  category: z
    .string()
    .describe("The best matching category from the provided list"),
});

export const predictCategoryFlow = ai.defineFlow(
  {
    name: "predictCategory",
    inputSchema: z.object({
      title: z.string().describe("Expense title or description"),
      categories: z.array(z.string()).describe("List of available categories"),
    }),
    outputSchema: CategoryPredictionSchema,
  },
  async (input) => {
    const prompt = `You are a smart expense categorizer.
    
    Task: Given an expense title, select the MOST appropriate category from the provided list.
    
    Input Title: "${input.title}"
    Available Categories: ${input.categories.join(", ")}
    
    Rules:
    1. You MUST select one of the categories from the available list.
    2. If the title is ambiguous, make your best guess based on common spending patterns.
    3. If absolutely no match fits, select "Other" (if available) or the most generic option.
    4. Return ONLY the category name.
    
    Examples:
    - Title: "Uber", Categories: [Transport, Food] -> "Transport"
    - Title: "Starbucks", Categories: [Transport, Food] -> "Food"
    - Title: "Netflix", Categories: [Entertainment, Utilities] -> "Entertainment"
    `;

    const result = await ai.generate({
      // using the same model as expense-extractor to be consistent
      prompt: prompt,
      output: {
        format: "json",
        schema: CategoryPredictionSchema,
      },
      config: {
        temperature: 0.1,
      },
    });

    return result.output!;
  }
);
