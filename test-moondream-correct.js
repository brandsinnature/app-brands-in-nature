// Test script using the correct Moondream API approach
// Based on: https://github.com/conwayanderson/moondream-auto-labeler

const testMoondreamCorrect = async () => {
  try {
    console.log("Testing Moondream API with correct implementation...");

    // Using a simple 1x1 pixel image for testing
    const testImage =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

    // Step 1: Query for objects (like the working example)
    const objectPrompt =
      "List all the objects you can see in this image. Return your answer as a simple comma-separated list of object names.";

    console.log("Step 1: Querying for objects...");
    const queryResponse = await fetch("https://api.moondream.ai/v1/query", {
      method: "POST",
      headers: {
        "X-Moondream-Auth":
          process.env.MOONDREAM_API_KEY || "your_api_key_here",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: testImage,
        question: objectPrompt,
        reasoning: true,
      }),
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error("Query API error:", queryResponse.status, errorText);
      return false;
    }

    const queryResult = await queryResponse.json();
    console.log("Query result:", queryResult);

    if (!queryResult.answer) {
      console.error("No answer in query response");
      return false;
    }

    // Parse the comma-separated response
    const objectList = queryResult.answer || "";
    const objects = objectList
      .split(",")
      .map((obj) => obj.trim())
      .filter((obj) => obj.length > 0);

    console.log("Detected objects:", objects);

    if (objects.length === 0) {
      console.log("No objects detected (expected for 1x1 pixel image)");
      return true; // This is actually expected for a 1x1 pixel
    }

    // Step 2: Test detect endpoint for first object
    const firstObject = objects[0];
    console.log("Step 2: Testing detect for:", firstObject);

    const detectResponse = await fetch("https://api.moondream.ai/v1/detect", {
      method: "POST",
      headers: {
        "X-Moondream-Auth":
          process.env.MOONDREAM_API_KEY || "your_api_key_here",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: testImage,
        object: firstObject,
        reasoning: true,
      }),
    });

    if (!detectResponse.ok) {
      const errorText = await detectResponse.text();
      console.error("Detect API error:", detectResponse.status, errorText);
      return false;
    }

    const detectResult = await detectResponse.json();
    console.log("Detect result:", detectResult);

    return true;
  } catch (error) {
    console.error("Test failed:", error);
    return false;
  }
};

const runCorrectTest = async () => {
  console.log("=== Moondream Correct Implementation Test ===\n");

  if (!process.env.MOONDREAM_API_KEY) {
    console.log("⚠️  MOONDREAM_API_KEY not set. Using placeholder.");
    console.log("Set your API key: export MOONDREAM_API_KEY='your_key_here'\n");
  }

  const success = await testMoondreamCorrect();
  console.log(`\nTest result: ${success ? "✅ PASS" : "❌ FAIL"}`);
  console.log("\n=== Test Complete ===");
};

runCorrectTest();
