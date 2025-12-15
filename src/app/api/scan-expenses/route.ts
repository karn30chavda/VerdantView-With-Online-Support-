import { NextRequest, NextResponse } from "next/server";
import { extractExpensesFlow } from "@/ai/expense-extractor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 }
      );
    }

    console.log("📸 Starting expense extraction with Gemini...");

    // Call the Genkit flow
    const result = await extractExpensesFlow({ imageData });

    console.log(
      "✅ Extraction successful:",
      result.expenses?.length || 0,
      "expenses found"
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Expense extraction error:", error);

    // Return detailed error for debugging
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to extract expenses from image",
        details: errorMessage,
        hint: "Check if GOOGLE_GENAI_API_KEY is set in .env.local",
      },
      { status: 500 }
    );
  }
}
