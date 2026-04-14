/**
 * REAL-TIME PRINTER STREAMING
 *
 * Two protocols:
 * 1. SSE (Server-Sent Events) — for dashboard progress monitoring
 *    Works with Next.js App Router natively. Vercel-compatible.
 *
 * 2. Redis Pub/Sub — for streaming codes to factory printers
 *    Printer connects via WebSocket (requires custom server, not Vercel).
 *    BullMQ worker publishes codes to Redis channel.
 *    WebSocket server subscribes and forwards to connected printer.
 *
 * For MVP (pre-factory deployment): use SSE for batch progress.
 * For factory deployment: add WebSocket server on Railway/Fly.io.
 */

import IORedis from "ioredis";
import type { PrinterStreamItem } from "./types";

// ============================================================
// REDIS PUB/SUB FOR PRINTER STREAMING
// ============================================================

let pub: IORedis | null = null;

function getPub(): IORedis {
  if (!pub) {
    pub = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return pub;
}

/**
 * Publish a QR code to a printer's Redis channel.
 * Called from the BullMQ batch worker for each generated code.
 *
 * Channel format: printer:{printer_id}
 * Message: JSON { type: 'print', serial, gs1_url, human_readable, sequence_number }
 */
export async function publishToPrinter(printerId: string, item: PrinterStreamItem) {
  const redis = getPub();
  await redis.publish(
    `printer:${printerId}`,
    JSON.stringify({
      type: "print",
      serial: item.serial,
      gs1_url: item.gs1_url,
      human_readable: item.human_readable,
      sequence_number: item.sequence_number,
    })
  );
}

/**
 * Publish batch completion to a printer's channel.
 */
export async function publishBatchComplete(printerId: string, batchId: string, totalCount: number) {
  const redis = getPub();
  await redis.publish(
    `printer:${printerId}`,
    JSON.stringify({
      type: "batch_complete",
      batch_id: batchId,
      total_count: totalCount,
    })
  );
}

/**
 * Subscribe to a printer's channel.
 * Used by the WebSocket server to forward messages to connected printers.
 *
 * Usage (in custom server):
 *   subscribeToPrinter('PRINTER_001', (message) => {
 *     ws.send(message); // Forward to WebSocket client
 *   });
 */
export function subscribeToPrinter(
  printerId: string,
  onMessage: (message: string) => void
): { unsubscribe: () => void } {
  const sub = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  sub.subscribe(`printer:${printerId}`);
  sub.on("message", (_channel: string, message: string) => {
    onMessage(message);
  });

  return {
    unsubscribe: () => {
      sub.unsubscribe(`printer:${printerId}`);
      sub.quit();
    },
  };
}

// ============================================================
// SSE FOR BATCH PROGRESS (Next.js App Router compatible)
// ============================================================

/**
 * Create a ReadableStream for SSE batch progress.
 * Used in app/api/qr/batch/stream/route.ts
 */
export function createBatchProgressStream(
  getStatus: () => Promise<{ state: string; progress: number; result?: unknown } | null>,
  signal: AbortSignal
): ReadableStream {
  const encoder = new TextEncoder();
  let lastProgress = -1;

  return new ReadableStream({
    async start(controller) {
      const interval = setInterval(async () => {
        try {
          const status = await getStatus();
          if (!status) {
            clearInterval(interval);
            controller.close();
            return;
          }

          if (status.progress !== lastProgress) {
            lastProgress = status.progress;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(status)}\n\n`)
            );
          }

          if (status.state === "completed" || status.state === "failed") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(status)}\n\n`)
            );
            clearInterval(interval);
            controller.close();
          }
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 500);

      signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });
}
