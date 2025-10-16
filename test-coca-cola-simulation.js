// Test simulation for Coca-Cola bottle detection
// This simulates what the Moondream API would return for a Coca-Cola bottle

const simulateCocaColaDetection = () => {
  console.log("=== Coca-Cola Bottle Detection Simulation ===\n");

  // Simulate the three-step Moondream process for a Coca-Cola bottle

  console.log("Step 1: Query API - Detecting products...");
  const queryResult = {
    answer: "Coca-Cola bottle, beverage, plastic bottle, soft drink",
    reasoning: {
      text: "I can see a clear plastic bottle with a red label featuring the Coca-Cola logo. The bottle contains a dark brown carbonated beverage.",
      grounding: [],
    },
  };

  console.log("Query result:", queryResult.answer);

  // Parse detected products
  const products = queryResult.answer
    .split(",")
    .map((obj) => obj.trim())
    .filter((obj) => obj.length > 0);

  console.log("Detected products:", products);

  console.log(
    "\nStep 2: Detect API - Getting coordinates for 'Coca-Cola bottle'..."
  );
  const detectResult = {
    objects: [
      {
        x_min: 0.1,
        y_min: 0.05,
        x_max: 0.9,
        y_max: 0.95,
      },
    ],
  };

  console.log("Bounding box coordinates:", detectResult.objects[0]);

  console.log("\nStep 3: Detail Query - Extracting product information...");
  const detailResult = {
    answer: `{
  "brand": "Coca-Cola",
  "material": "plastic",
  "description": "Coca-Cola Original Taste soft drink in plastic bottle",
  "net_weight": 750,
  "measurement_unit": "ml"
}`,
  };

  console.log("Detail result:", detailResult.answer);

  // Parse the final result
  const productDetails = JSON.parse(detailResult.answer);

  console.log("\nFinal formatted product:");
  const formattedProduct = {
    brand: productDetails.brand,
    name: "Coca-Cola bottle",
    material: productDetails.material,
    description: productDetails.description,
    net_weight: productDetails.net_weight,
    measurement_unit: productDetails.measurement_unit,
    confidence: 0.95, // High confidence for clear product detection
  };

  console.log(JSON.stringify(formattedProduct, null, 2));

  // Return in the expected scanner format
  const scannerResponse = {
    success: true,
    data: JSON.stringify({
      detections: [formattedProduct],
    }),
    error: null,
  };

  console.log("\n=== Final Scanner Response ===");
  console.log(JSON.stringify(scannerResponse, null, 2));

  console.log(
    "\n✅ This is what your app would receive when scanning a Coca-Cola bottle!"
  );
  console.log("✅ The product would be automatically added to the cart");
  console.log("✅ All product details would be properly extracted");

  return scannerResponse;
};

simulateCocaColaDetection();
