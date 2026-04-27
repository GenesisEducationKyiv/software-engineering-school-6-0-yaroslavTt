import Redis from "ioredis";
import { runMigrations } from "./db/index.js";
import * as redisService from "./utils/redis/redisService.js";
import { start as startScanner } from "./services/scannerService.js";
import app from "./app.js";
import { environmentConfig } from "./config/environment.js";

async function main(): Promise<void> {
  // 1. Run DB migrations
  await runMigrations();

  // 2. Connect Redis (soft dependency)
  try {
    const redis = new Redis(environmentConfig.redisUrl);
    redis.on("error", (err) =>
      console.warn("[redis] connection error:", err.message),
    );
    redisService.setRedisClient(redis);
    console.log("[redis] connected");
  } catch (err) {
    console.warn("[redis] failed to connect, caching disabled:", err);
  }

  // 3. Start scanner cron
  startScanner();

  // 4. Start HTTP server
  app.listen(environmentConfig.port, () => {
    console.log(`[server] Listening on port ${environmentConfig.port}`);
  });
}

main().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
