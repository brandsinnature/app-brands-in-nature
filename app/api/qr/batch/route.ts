import { NextRequest, NextResponse } from "next/server";
import { GenerateSchema } from "@/lib/qr/schema";
import { getProductRegistration } from "@/data-access/qr";
import { addBatchJob, getBatchJobStatus } from "@/lib/qr/queue";

/**
 * POST /api/qr/batch
 *
 * Submit a batch QR generation job. Processes asynchronously via BullMQ + Redis.
 * Returns a job_id immediately. Client polls GET /api/qr/batch?job_id=xxx for status.
 *
 * For factory-scale generation (100K+ codes):
 *   - Job queued in Redis
 *   - Worker generates in chunks of 100 (avoids memory pressure)
 *   - Each chunk bulk-inserted into Supabase
 *   - Progress reported as percentage
 *
 * Input: { brand_id, product_gtin, batch_id, count: 10000 }
 * Output: { job_id, status: "queued" }
 *
 * At ~2ms per code: 10K codes ≈ 20s, 100K codes ≈ 3.3min
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GenerateSchema.safeParse({ ...body, count: body.count || 1 });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { brand_id, product_gtin, batch_id, count, deposit_paisa } = parsed.data;
    const created_by = request.headers.get("x-api-key") || "anonymous";

    // Look up product registration
    const product = await getProductRegistration(product_gtin);
    if (!product) {
      return NextResponse.json(
        { error: "Product not registered. Use POST /api/qr/register first." },
        { status: 404 }
      );
    }

    // Submit to batch queue
    const jobId = await addBatchJob({
      brand_id,
      product,
      batch_id,
      count,
      deposit_override: deposit_paisa,
      created_by,
    });

    return NextResponse.json({
      job_id: jobId,
      status: "queued",
      batch_id,
      count,
      message: `Batch generation queued. Poll GET /api/qr/batch?job_id=${jobId} for progress.`,
    });
  } catch (error) {
    console.error("Batch submit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/qr/batch?job_id=xxx
 *
 * Poll batch job status. Returns:
 *   - state: waiting | active | completed | failed
 *   - progress: 0-100
 *   - result (if completed): { batch_id, count, serials[] }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json({ error: "Provide job_id query parameter" }, { status: 400 });
    }

    const status = await getBatchJobStatus(jobId);
    if (!status) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Batch status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
