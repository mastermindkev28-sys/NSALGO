#!/usr/bin/env node
/**
 * Triggers a scheduled job against a running NSALGO instance.
 * Usage: npm run jobs:run -- atlas-swing [--url http://localhost:3000]
 */
const job = process.argv[2];
const i = process.argv.indexOf("--url");
const base = i > 0 ? process.argv[i + 1] : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
if (!job) {
  console.error("Usage: npm run jobs:run -- <job-name>");
  process.exit(1);
}
const res = await fetch(`${base}/api/cron/${job}`, { headers: process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {} });
console.log(res.status, JSON.stringify(await res.json(), null, 2));
process.exit(res.ok ? 0 : 1);
