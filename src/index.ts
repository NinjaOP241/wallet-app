import { createApp } from "./app.js";
import { PORT } from "./shared/config/env.js";
import {
  closePrismaClients,
  getShard1Client,
  getShard2Client,
} from "./shared/database/prisma-clients.js";

const app = createApp();

// Initialize prisma clients for both shards
async function initializePrismaClients() {
  try {
    await getShard1Client().$connect();
    await getShard2Client().$connect();
  } catch (error) {
    console.error("Error initializing Prisma clients:", error);
    process.exit(1);
  }
}

initializePrismaClients().then(() =>
  app.listen(PORT, () => {
    console.log(`[server]: Running on port ${PORT}`);
  }),
);

process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received");
  await closePrismaClients();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received");
  await closePrismaClients();
  process.exit(0);
});
