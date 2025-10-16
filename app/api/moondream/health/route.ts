import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.MOONDREAM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "Moondream API key not configured",
          hasApiKey: false,
        },
        { status: 500 }
      );
    }

    // Test the Moondream API with a simple request using the correct approach
    const testResponse = await fetch("https://api.moondream.ai/v1/query", {
      method: "POST",
      headers: {
        "X-Moondream-Auth": apiKey,
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
      });
    } else {
      const errorText = await testResponse.text();
      return NextResponse.json(
        {
          status: "error",
          message: `Moondream API error: ${testResponse.status}`,
          hasApiKey: true,
          apiStatus: testResponse.status,
          error: errorText,
        },
        { status: 500 }
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
