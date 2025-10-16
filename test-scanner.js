// Simple test script to verify scanner functionality
// Run with: node test-scanner.js

const testMoondreamHealth = async () => {
  try {
    console.log("Testing Moondream API health...");
    const response = await fetch(
      "https://mybins.vercel.app/api/moondream/health"
    );
    const data = await response.json();
    console.log("Health check result:", data);
    return data.status === "healthy";
  } catch (error) {
    console.error("Health check failed:", error);
    return false;
  }
};

const testMoondreamScan = async () => {
  try {
    console.log("Testing Moondream scan endpoint...");
    // Using a simple 1x1 pixel image for testing
    const testImage =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

    const response = await fetch(
      "https://mybins.vercel.app/api/moondream/scan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          frame: testImage,
        }),
      }
    );

    const data = await response.json();
    console.log("Scan test result:", data);
    return response.ok && data.success;
  } catch (error) {
    console.error("Scan test failed:", error);
    return false;
  }
};

const runTests = async () => {
  console.log("=== Scanner API Tests ===\n");

  const healthOk = await testMoondreamHealth();
  console.log(`Health check: ${healthOk ? "✅ PASS" : "❌ FAIL"}\n`);

  if (healthOk) {
    const scanOk = await testMoondreamScan();
    console.log(`Scan test: ${scanOk ? "✅ PASS" : "❌ FAIL"}\n`);
  }

  console.log("=== Test Complete ===");
};

runTests();
