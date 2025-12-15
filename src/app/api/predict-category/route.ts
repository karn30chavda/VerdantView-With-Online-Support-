import { NextRequest, NextResponse } from "next/server";
import { predictCategoryFlow } from "@/ai/category-predictor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, categories } = body;

    if (!title || !categories || !Array.isArray(categories)) {
      return NextResponse.json(
        {
          error:
            "Invalid input. 'title' and 'categories' (array) are required.",
        },
        { status: 400 }
      );
    }

    // Call the Genkit flow
    const result = await predictCategoryFlow({ title, categories });

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Category prediction error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to predict category",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
