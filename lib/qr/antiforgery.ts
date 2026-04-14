/**
 * COPY DETECTION + SCAN ANOMALY DETECTION
 *
 * Two layers:
 * 1. Scan telemetry anomaly detection (no hardware needed)
 *    - Velocity check (same code scanned from far-apart locations)
 *    - Excessive scan count for single-use codes
 *    - Multiple distinct devices scanning same code
 *
 * 2. Camera metadata analysis (EXIF)
 *    - Distinguish real camera scans from screenshots/photos-of-photos
 *    - No EXIF = likely screenshot
 *    - EXIF with camera model + exposure = likely real scan
 *
 * 3. Perceptual image hashing (future: detect photo copies)
 */

import exifr from "exifr";

// ============================================================
// 1. SCAN ANOMALY DETECTION
// ============================================================

interface ScanEvent {
  serial: string;
  device_fingerprint: string;
  ip_address: string;
  geo_lat: number;
  geo_lng: number;
  scanned_at: Date;
}

export interface AnomalyResult {
  suspicious: boolean;
  reasons: string[];
  risk_score: number; // 0-100
}

export function detectAnomalies(
  currentScan: ScanEvent,
  recentScans: ScanEvent[]
): AnomalyResult {
  const reasons: string[] = [];
  let score = 0;

  // Rule 1: Velocity — same code from distant locations in short time
  if (recentScans.length > 0) {
    const lastScan = recentScans[0];
    const timeDiffMs = currentScan.scanned_at.getTime() - lastScan.scanned_at.getTime();
    if (timeDiffMs > 0) {
      const distKm = haversine(
        currentScan.geo_lat, currentScan.geo_lng,
        lastScan.geo_lat, lastScan.geo_lng
      );
      const speedKmH = distKm / (timeDiffMs / 3600000);
      if (speedKmH > 500) {
        reasons.push(`Impossible velocity: ${Math.round(speedKmH)} km/h between scans`);
        score += 40;
      } else if (speedKmH > 200) {
        reasons.push(`High velocity: ${Math.round(speedKmH)} km/h between scans`);
        score += 20;
      }
    }
  }

  // Rule 2: Excessive scans for a single-use code
  const scanCount = recentScans.length + 1;
  if (scanCount > 5) {
    reasons.push(`Scanned ${scanCount} times (expected 1-2 for single-use)`);
    score += 30;
  } else if (scanCount > 3) {
    reasons.push(`Scanned ${scanCount} times`);
    score += 15;
  }

  // Rule 3: Multiple distinct devices
  const uniqueDevices = new Set(recentScans.map((s) => s.device_fingerprint));
  uniqueDevices.add(currentScan.device_fingerprint);
  if (uniqueDevices.size > 3) {
    reasons.push(`${uniqueDevices.size} different devices scanned this code`);
    score += 30;
  } else if (uniqueDevices.size > 2) {
    reasons.push(`${uniqueDevices.size} devices scanned this code`);
    score += 15;
  }

  // Rule 4: Multiple distinct IPs with same device fingerprint (VPN/proxy)
  const uniqueIPs = new Set(recentScans.map((s) => s.ip_address));
  uniqueIPs.add(currentScan.ip_address);
  if (uniqueIPs.size > 5 && uniqueDevices.size <= 2) {
    reasons.push(`${uniqueIPs.size} IPs from ${uniqueDevices.size} devices — possible proxy/VPN abuse`);
    score += 20;
  }

  return {
    suspicious: score >= 40,
    reasons,
    risk_score: Math.min(score, 100),
  };
}

// ============================================================
// 2. CAMERA METADATA ANALYSIS (EXIF)
// ============================================================

export interface ExifAuthResult {
  isLikelyRealCamera: boolean;
  isLikelyScreenshot: boolean;
  confidence: number; // 0-1
  cameraModel: string | null;
  reasons: string[];
}

export async function checkExifAuthenticity(imageBuffer: Buffer): Promise<ExifAuthResult> {
  const reasons: string[] = [];
  let cameraScore = 0;

  try {
    const exif = await exifr.parse(imageBuffer, {
      pick: [
        "Make", "Model", "ExposureTime", "FNumber", "FocalLength",
        "GPSLatitude", "GPSLongitude", "Software", "ImageWidth", "ImageHeight",
      ],
    });

    if (!exif) {
      reasons.push("No EXIF data — likely screenshot or edited image");
      return { isLikelyRealCamera: false, isLikelyScreenshot: true, confidence: 0.7, cameraModel: null, reasons };
    }

    if (exif.Make && exif.Model) {
      cameraScore += 30;
      reasons.push(`Camera: ${exif.Make} ${exif.Model}`);
    } else {
      reasons.push("No camera Make/Model in EXIF");
    }

    if (exif.ExposureTime) { cameraScore += 20; reasons.push(`Exposure: ${exif.ExposureTime}s`); }
    if (exif.FNumber) { cameraScore += 15; }
    if (exif.FocalLength) { cameraScore += 15; }
    if (exif.GPSLatitude) { cameraScore += 20; reasons.push("GPS coordinates present"); }

    return {
      isLikelyRealCamera: cameraScore >= 50,
      isLikelyScreenshot: cameraScore < 20,
      confidence: cameraScore / 100,
      cameraModel: exif.Model || null,
      reasons,
    };
  } catch {
    return {
      isLikelyRealCamera: false,
      isLikelyScreenshot: true,
      confidence: 0.5,
      cameraModel: null,
      reasons: ["EXIF parse failed"],
    };
  }
}

// ============================================================
// 3. PERCEPTUAL IMAGE HASH (dHash via sharp)
// ============================================================

import sharp from "sharp";

/**
 * Compute dHash (difference hash) of an image.
 * Two scans of the same physical QR from the same photo will have
 * nearly identical dHashes (hamming distance < 10).
 * Two scans of different physical prints will diverge (distance > 20).
 */
export async function computeImageHash(imageBuffer: Buffer): Promise<string> {
  const { data } = await sharp(imageBuffer)
    .resize(33, 32, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = "";
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const idx = y * 33 + x;
      hash += data[idx] < data[idx + 1] ? "1" : "0";
    }
  }
  return hash;
}

export function hammingDistance(h1: string, h2: string): number {
  let dist = 0;
  for (let i = 0; i < Math.min(h1.length, h2.length); i++) {
    if (h1[i] !== h2[i]) dist++;
  }
  return dist;
}

/**
 * Check if two scan images are likely from the same physical photo
 * (copy/screenshot detection via perceptual similarity).
 */
export function isSamePhoto(hash1: string, hash2: string): boolean {
  return hammingDistance(hash1, hash2) < 10;
}

// ============================================================
// UTILITIES
// ============================================================

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
