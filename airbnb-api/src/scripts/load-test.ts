import 'dotenv/config';
import { env } from '../config/env';

const url = process.argv[2] ?? `${env.APP_URL}/health`;
const totalRequests = Number(process.argv[3] ?? 200);
const concurrency = Number(process.argv[4] ?? 20);

const durations: number[] = [];
let failures = 0;

const runOne = async () => {
  const started = performance.now();
  try {
    const response = await fetch(url);
    if (!response.ok) failures += 1;
  } catch {
    failures += 1;
  } finally {
    durations.push(performance.now() - started);
  }
};

const run = async () => {
  let next = 0;

  await Promise.all(
    Array.from({ length: concurrency }).map(async () => {
      while (next < totalRequests) {
        next += 1;
        await runOne();
      }
    })
  );

  durations.sort((a, b) => a - b);
  const percentile = (p: number) =>
    durations[Math.min(durations.length - 1, Math.floor(durations.length * p))] ?? 0;

  console.table({
    url,
    totalRequests,
    concurrency,
    failures,
    p50Ms: Math.round(percentile(0.5)),
    p95Ms: Math.round(percentile(0.95)),
    p99Ms: Math.round(percentile(0.99)),
  });
};

run();
