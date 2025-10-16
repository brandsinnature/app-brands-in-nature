interface UPIData {
  pa: string; // Payee address (UPI ID) - mandatory
  pn: string; // Payee name - mandatory
  am?: string; // Amount
  cu?: string; // Currency
  tn?: string; // Transaction note
  tr?: string; // Transaction reference
  mc?: string; // Merchant code
}

export function parseUPIString(upiString: string): UPIData | null {
  // Validate UPI string format
  if (!upiString.startsWith("upi://pay")) {
    return null;
  }

  try {
    const url = new URL(upiString);
    const params = new URLSearchParams(url.search);

    const upiData: UPIData = {
      pa: "",
      pn: "",
    };

    // Extract all query parameters
    params.forEach((value, key) => {
      upiData[key as keyof UPIData] = decodeURIComponent(value);
    });

    return upiData;
  } catch (error) {
    console.error("Error parsing UPI string:", error);
    return null;
  }
}

// Validation function
export function validateUPIData(upiData: UPIData): boolean {
  // Required fields
  if (!upiData.pa || !upiData.pn) {
    return false;
  }

  // Validate VPA format (basic pattern)
  const vpaPattern = /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/;
  if (!vpaPattern.test(upiData.pa)) {
    return false;
  }

  // Validate currency if present
  if (upiData.cu && upiData.cu.toUpperCase() !== "INR") {
    return false;
  }

  return true;
}

export type { UPIData };
