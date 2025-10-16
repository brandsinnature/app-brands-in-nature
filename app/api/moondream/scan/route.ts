import { NextRequest, NextResponse } from "next/server";

// Fallback function to try other APIs when Moondream fails
async function tryFallbackAPIs(frame: string, geminiApiKey?: string, geminiApiKey2?: string, geminiApiKey3?: string, openaiApiKey?: string) {
  const apis = [
    { name: "Gemini", key: geminiApiKey, endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent" },
    { name: "Gemini2", key: geminiApiKey2, endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent" },
    { name: "Gemini3", key: geminiApiKey3, endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent" },
    { name: "OpenAI", key: openaiApiKey, endpoint: "https://api.openai.com/v1/chat/completions" }
  ];

  for (const api of apis) {
    if (!api.key) continue;
    
    try {
      console.log(`Trying ${api.name} API...`);
      
      if (api.name.startsWith("Gemini")) {
        const response = await fetch(`${api.endpoint}?key=${api.key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "Analyze this image and identify any consumer products, food items, beverages, or packaged goods. Return a JSON object with: brand, name, material, description, net_weight, measurement_unit. If no products found, return null values.",
                inline_data: { mime_type: "image/jpeg", data: frame.split(',')[1] }
              }]
            }]
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            console.log(`${api.name} API success`);
            return NextResponse.json({
              success: true,
              data: JSON.stringify({
                detections: [JSON.parse(content)]
              }),
              error: null,
            });
          }
        }
      } else if (api.name === "OpenAI") {
        const response = await fetch(api.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${api.key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4-vision-preview",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: "Analyze this image and identify any consumer products, food items, beverages, or packaged goods. Return a JSON object with: brand, name, material, description, net_weight, measurement_unit. If no products found, return null values." },
                { type: "image_url", image_url: { url: frame } }
              ]
            }]
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          const content = result.choices?.[0]?.message?.content;
          if (content) {
            console.log(`${api.name} API success`);
            return NextResponse.json({
              success: true,
              data: JSON.stringify({
                detections: [JSON.parse(content)]
              }),
              error: null,
            });
          }
        }
      }
    } catch (error) {
      console.error(`${api.name} API error:`, error);
      continue;
    }
  }
  
  // If all APIs fail, return error
  return NextResponse.json(
    { success: false, error: "All AI APIs failed" },
    { status: 500 }
  );
}

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

    // Try Moondream first, then fallback to other APIs
    const moondreamApiKey = process.env.MOONDREAM_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiApiKey2 = process.env.GEMINI_API_KEY2;
    const geminiApiKey3 = process.env.GEMINI_API_KEY3;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!moondreamApiKey && !geminiApiKey && !geminiApiKey2 && !geminiApiKey3 && !openaiApiKey) {
      console.error("Moondream API: No API keys configured");
      return NextResponse.json(
        { success: false, error: "No API keys configured" },
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
        "X-Moondream-Auth": moondreamApiKey,
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
      
      // Try fallback APIs if Moondream fails
      console.log("Moondream failed, trying fallback APIs...");
      return await tryFallbackAPIs(frame, geminiApiKey, geminiApiKey2, geminiApiKey3, openaiApiKey);
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
        "X-Moondream-Auth": moondreamApiKey,
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
        "X-Moondream-Auth": moondreamApiKey,
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
