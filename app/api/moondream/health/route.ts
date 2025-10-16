import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const moondreamApiKey = process.env.MOONDREAM_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiApiKey2 = process.env.GEMINI_API_KEY2;
    const geminiApiKey3 = process.env.GEMINI_API_KEY3;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    const availableApis = [];
    if (moondreamApiKey) availableApis.push("Moondream");
    if (geminiApiKey) availableApis.push("Gemini");
    if (geminiApiKey2) availableApis.push("Gemini2");
    if (geminiApiKey3) availableApis.push("Gemini3");
    if (openaiApiKey) availableApis.push("OpenAI");

    if (availableApis.length === 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "No API keys configured",
          hasApiKey: false,
          availableApis: [],
        },
        { status: 500 }
      );
    }

    // Test the Moondream API with a simple request using the correct approach
    if (!moondreamApiKey) {
      return NextResponse.json({
        status: "warning",
        message:
          "Moondream API key not configured, but fallback APIs available",
        hasApiKey: false,
        availableApis: availableApis,
      });
    }

    const testResponse = await fetch("https://api.moondream.ai/v1/query", {
      method: "POST",
      headers: {
        "X-Moondream-Auth": moondreamApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url:
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=", // 1x1 pixel JPEG
        question: "What objects do you see in this image?",
        reasoning: true,
      }),
    });

    if (testResponse.ok) {
      return NextResponse.json({
        status: "healthy",
        message: "Moondream API is working",
        hasApiKey: true,
        apiStatus: testResponse.status,
        availableApis: availableApis,
      });
    } else {
      const errorText = await testResponse.text();
      return NextResponse.json(
        {
          status: "warning",
          message: `Moondream API error: ${testResponse.status}, but fallback APIs available`,
          hasApiKey: true,
          apiStatus: testResponse.status,
          error: errorText,
          availableApis: availableApis,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
