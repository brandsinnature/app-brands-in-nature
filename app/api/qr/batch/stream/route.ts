import { NextRequest } from "next/server";
import { getBatchJobStatus } from "@/lib/qr/queue";
import { createBatchProgressStream } from "@/lib/qr/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/qr/batch/stream?job_id=xxx
 *
 * Server-Sent Events stream for real-time batch progress.
 * Dashboard connects and receives updates every 500ms until job completes.
 *
 * Client usage:
 *   const evtSource = new EventSource('/api/qr/batch/stream?job_id=abc123');
 *   evtSource.onmessage = (e) => { const data = JSON.parse(e.data); setProgress(data.progress); };
 */
export async function GET(request: NextRequest) {
  const jobId = new URL(request.url).searchParams.get("job_id");

  if (!jobId) {
    return new Response("Provide job_id query parameter", { status: 400 });
  }

  const stream = createBatchProgressStream(
    async () => {
      const status = await getBatchJobStatus(jobId);
      if (!status) return null;
      return {
        state: status.state,
        progress: status.progress as number,
        result: status.result,
      };
    },
    request.signal
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
