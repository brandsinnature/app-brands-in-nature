import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { frame } = await request.json();

    if (!frame) {
      return NextResponse.json(
        { success: false, error: "No image data provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.MOONDREAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Moondream API key not configured" },
        { status: 500 }
      );
    }

    // Prepare the prompt for product information extraction
    const prompt = `Analyze this product image and extract the following information in JSON format:
- brand: the brand name
- name: the product name  
- material: the packaging material (plastic, glass, metal, paper, etc.)
- description: brief product description
- net_weight: numeric weight value
- measurement_unit: unit of measurement (g, kg, ml, l, etc.)

Return only valid JSON with these exact keys. If you cannot determine a value, use null.`;

    // Call Moondream API
    const moondreamResponse = await fetch("https://api.moondream.ai/v1/query", {
      method: "POST",
      headers: {
        "X-Moondream-Auth": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: frame,
        question: prompt,
        reasoning: true,
      }),
    });

    if (!moondreamResponse.ok) {
      const errorText = await moondreamResponse.text();
      console.error("Moondream API error:", errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Moondream API error: ${moondreamResponse.status}`,
        },
        { status: 500 }
      );
    }

    const moondreamResult = await moondreamResponse.json();

    if (!moondreamResult.answer) {
      return NextResponse.json(
        { success: false, error: "No response from Moondream API" },
        { status: 500 }
      );
    }

    // Parse the JSON response from Moondream
    let productData;
    try {
      // Clean the response - remove any markdown formatting or extra text
      const cleanResponse = moondreamResult.answer
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      productData = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error(
        "Failed to parse Moondream response:",
        moondreamResult.answer
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse product data from Moondream",
        },
        { status: 500 }
      );
    }

    // Validate and format the response to match expected structure
    const formattedProduct = {
      brand: productData.brand || "Unknown",
      name: productData.name || "Unknown Product",
      material: productData.material || "Unknown",
      description: productData.description || "No description available",
      net_weight: productData.net_weight || 0,
      measurement_unit: productData.measurement_unit || "g",
      confidence: 0.85, // Default confidence for Moondream results
    };

    // Return in the expected format matching the current scanner service
    return NextResponse.json({
      success: true,
      data: JSON.stringify({
        detections: [formattedProduct],
      }),
      error: null,
    });
  } catch (error) {
    console.error("Moondream scan error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
