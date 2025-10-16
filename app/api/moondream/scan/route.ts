import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { frame } = await request.json();

    if (!frame) {
      console.error("Moondream API: No image data provided");
      return NextResponse.json(
        { success: false, error: "No image data provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.MOONDREAM_API_KEY;
    if (!apiKey) {
      console.error("Moondream API: API key not configured");
      return NextResponse.json(
        { success: false, error: "Moondream API key not configured" },
        { status: 500 }
      );
    }

    console.log("Moondream API: Starting scan request");

    // Step 1: Query for product objects using the two-step process
    const objectPrompt = `List all consumer products, food items, beverages, or packaged goods you can see in this image. Return your answer as a simple comma-separated list of product names.`;

    console.log("Moondream API: Step 1 - Querying for products");
    const queryResponse = await fetch("https://api.moondream.ai/v1/query", {
      method: "POST",
      headers: {
        "X-Moondream-Auth": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: frame,
        question: objectPrompt,
        reasoning: true,
      }),
    });

    console.log("Moondream API: Query response status:", queryResponse.status);

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error(
        "Moondream Query API error:",
        queryResponse.status,
        errorText
      );
      return NextResponse.json(
        {
          success: false,
          error: `Moondream Query API error: ${queryResponse.status} - ${errorText}`,
        },
        { status: 500 }
      );
    }

    const queryResult = await queryResponse.json();
    console.log("Moondream API: Query result:", queryResult);

    if (!queryResult.answer) {
      console.error("Moondream API: No answer in query response");
      return NextResponse.json(
        { success: false, error: "No response from Moondream Query API" },
        { status: 500 }
      );
    }

    // Parse the comma-separated product list
    const objectList = queryResult.answer || "";
    const products = objectList
      .split(",")
      .map((obj: string) => obj.trim())
      .filter((obj: string) => obj.length > 0);

    console.log("Moondream API: Detected products:", products);

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: "No products detected in image" },
        { status: 400 }
      );
    }

    // Step 2: Get detailed information for the first product using detect
    const primaryProduct = products[0];
    console.log("Moondream API: Step 2 - Getting details for:", primaryProduct);

    const detectResponse = await fetch("https://api.moondream.ai/v1/detect", {
      method: "POST",
      headers: {
        "X-Moondream-Auth": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: frame,
        object: primaryProduct,
        reasoning: true,
      }),
    });

    if (!detectResponse.ok) {
      const errorText = await detectResponse.text();
      console.error(
        "Moondream Detect API error:",
        detectResponse.status,
        errorText
      );
      // Fallback to basic product info if detect fails
      const formattedProduct = {
        brand: "Unknown",
        name: primaryProduct,
        material: "Unknown",
        description: `Detected product: ${primaryProduct}`,
        net_weight: 0,
        measurement_unit: "g",
        confidence: 0.7,
      };

      return NextResponse.json({
        success: true,
        data: JSON.stringify({
          detections: [formattedProduct],
        }),
        error: null,
      });
    }

    const detectResult = await detectResponse.json();
    console.log("Moondream API: Detect result:", detectResult);

    // Step 3: Get additional product details using a detailed query
    const detailPrompt = `Analyze this ${primaryProduct} and provide the following information in JSON format:
- brand: the brand name
- material: the packaging material (plastic, glass, metal, paper, etc.)
- description: brief product description
- net_weight: numeric weight value if visible
- measurement_unit: unit of measurement (g, kg, ml, l, etc.) if visible

Return only valid JSON with these exact keys. If you cannot determine a value, use null.`;

    const detailResponse = await fetch("https://api.moondream.ai/v1/query", {
      method: "POST",
      headers: {
        "X-Moondream-Auth": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: frame,
        question: detailPrompt,
        reasoning: true,
      }),
    });

    let productDetails = {
      brand: "Unknown",
      material: "Unknown",
      description: `Detected product: ${primaryProduct}`,
      net_weight: 0,
      measurement_unit: "g",
    };

    if (detailResponse.ok) {
      const detailResult = await detailResponse.json();
      console.log("Moondream API: Detail result:", detailResult);

      if (detailResult.answer) {
        try {
          const cleanResponse = detailResult.answer
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

          const parsedDetails = JSON.parse(cleanResponse);
          productDetails = {
            brand: parsedDetails.brand || "Unknown",
            material: parsedDetails.material || "Unknown",
            description:
              parsedDetails.description ||
              `Detected product: ${primaryProduct}`,
            net_weight: parsedDetails.net_weight || 0,
            measurement_unit: parsedDetails.measurement_unit || "g",
          };
        } catch (parseError) {
          console.error("Failed to parse product details:", parseError);
        }
      }
    }

    // Format the final product data
    const formattedProduct = {
      brand: productDetails.brand,
      name: primaryProduct,
      material: productDetails.material,
      description: productDetails.description,
      net_weight: productDetails.net_weight,
      measurement_unit: productDetails.measurement_unit,
      confidence: 0.85, // High confidence for Moondream results
    };

    // Return in the expected format matching the current scanner service
    console.log("Moondream API: Returning successful response");
    return NextResponse.json({
      success: true,
      data: JSON.stringify({
        detections: [formattedProduct],
      }),
      error: null,
    });
  } catch (error) {
    console.error("Moondream API: Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
