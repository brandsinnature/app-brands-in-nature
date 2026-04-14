import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { generateQRCode, generateQRSVG } from "./generator";
import { insertQRCodes } from "@/data-access/qr";
import type { ProductRegistration } from "./types";

// --- Redis Connection ---
// Uses REDIS_URL env var. Defaults to localhost for development.
// In production: use Upstash (serverless Redis), Railway, or self-hosted.
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// --- Queue Definition ---
// Named "qr-batch" — processes batch QR generation requests asynchronously.
// Factory requests 100K codes → job queued → worker generates in chunks → result stored.
export const qrBatchQueue = new Queue("qr-batch", { connection });

// --- Job Data ---
export interface BatchJobData {
  brand_id: string;
  product: ProductRegistration;
  batch_id: string;
  count: number;
  deposit_override?: number;
  created_by: string;
  // Output paths (set by worker on completion)
  manifest_url?: string;
}

export interface BatchJobResult {
  batch_id: string;
  count: number;
  serials: string[];
  generated_at: string;
}

// --- Add Batch Job ---
// Called from the /api/qr/batch endpoint.
// Returns immediately with a job ID. Client polls for status.
export async function addBatchJob(data: BatchJobData): Promise<string> {
  const job = await qrBatchQueue.add("generate-batch", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 86400 }, // Keep completed jobs for 24h
    removeOnFail: { age: 604800 },    // Keep failed jobs for 7 days
  });
  return job.id!;
}

// --- Get Job Status ---
export async function getBatchJobStatus(jobId: string) {
  const job = await Job.fromId(qrBatchQueue, jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress as number;

  return {
    id: job.id,
    state, // waiting | active | completed | failed | delayed
    progress, // 0-100
    data: job.data as BatchJobData,
    result: state === "completed" ? (job.returnvalue as BatchJobResult) : null,
    failedReason: state === "failed" ? job.failedReason : null,
  };
}

// --- Worker ---
// Processes batch generation jobs. Generates QR codes in chunks of 100
// to avoid memory pressure. Reports progress as percentage.
//
// At ~2ms per QR code:
//   1,000 codes  → ~2 seconds
//   10,000 codes → ~20 seconds
//   100,000 codes → ~200 seconds (~3.3 minutes)
//
// For factory-scale (1M+ codes), scale horizontally with multiple workers.

const CHUNK_SIZE = 100;

export function startBatchWorker() {
  const worker = new Worker(
    "qr-batch",
    async (job: Job<BatchJobData>) => {
      const { brand_id, product, batch_id, count, deposit_override, created_by } = job.data;
      const allSerials: string[] = [];
      const totalChunks = Math.ceil(count / CHUNK_SIZE);

      for (let chunk = 0; chunk < totalChunks; chunk++) {
        const chunkSize = Math.min(CHUNK_SIZE, count - chunk * CHUNK_SIZE);
        const codes = [];

        for (let i = 0; i < chunkSize; i++) {
          const qr = await generateQRCode({
            product,
            batch_id,
            deposit_override,
          });
          codes.push(qr);
          allSerials.push(qr.serial);
        }

        // Bulk insert this chunk into Supabase
        const { error } = await insertQRCodes(
          codes.map((qr) => ({
            serial: qr.serial,
            gs1_url: qr.gs1_url,
            payload: qr.payload,
            deposit_paisa: qr.payload.deposit_paisa,
            brand_id,
            product_gtin: product.gtin,
            batch_id,
            plastic_category: product.plastic_type,
            material: product.material,
            thickness_microns: product.thickness_microns,
            cpcb_registration: product.cpcb_registration,
            created_by,
          }))
        );

        if (error) {
          throw new Error(`DB insert failed at chunk ${chunk}: ${error}`);
        }

        // Report progress
        const progress = Math.round(((chunk + 1) / totalChunks) * 100);
        await job.updateProgress(progress);
      }

      const result: BatchJobResult = {
        batch_id,
        count: allSerials.length,
        serials: allSerials,
        generated_at: new Date().toISOString(),
      };

      return result;
    },
    {
      connection,
      concurrency: 4,           // 4 parallel jobs
      limiter: {
        max: 50,                // Max 50 codes generated per second (across all jobs)
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`Batch job ${job.id} completed: ${job.data.count} codes for ${job.data.brand_id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Batch job ${job?.id} failed:`, err.message);
  });

  return worker;
}
