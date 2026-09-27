import { PrismaClient } from "../../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { ShardId } from "../types/shared-types.js";
import {
  DATABASE_SHARD1_URL,
  DATABASE_SHARD2_URL,
  NODE_ENV,
} from "../config/env.js";
import { internalServerError } from "../utils/api-error.js";

// Create separate prisma client for each shard
let shard1Client: PrismaClient | null = null;
let shard2Client: PrismaClient | null = null;

function getShard1DatabaseUrl(): string {
  const url = DATABASE_SHARD1_URL;
  if (!url) {
    throw internalServerError("DATABASE_SHARD1_URL is not defined");
  }
  return url;
}

function getShard2DatabaseUrl(): string {
  const url = DATABASE_SHARD2_URL;
  if (!url) {
    throw internalServerError("DATABASE_SHARD2_URL is not defined");
  }
  return url;
}

export function getShard1Client(): PrismaClient {
  if (!shard1Client) {
    const adapter = new PrismaPg({
      connectionString: getShard1DatabaseUrl(),
      max: 5,
    });
    shard1Client = new PrismaClient({
      adapter,
      log: NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    });
  }

  return shard1Client;
}

export function getShard2Client(): PrismaClient {
  if (!shard2Client) {
    const adapter = new PrismaPg({
      connectionString: getShard2DatabaseUrl(),
      max: 5,
    });
    shard2Client = new PrismaClient({
      adapter,
      log: NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    });
  }

  return shard2Client;
}

export function getShardClient(shardId: ShardId): PrismaClient {
  return shardId === ShardId.SHARD_1 ? getShard1Client() : getShard2Client();
}

export async function closePrismaClients(): Promise<void> {
  if (shard1Client) {
    await shard1Client.$disconnect();
    shard1Client = null;
    console.log("Shard 1 Prisma client disconnected");
  }
  if (shard2Client) {
    await shard2Client.$disconnect();
    shard2Client = null;
    console.log("Shard 2 Prisma client disconnected");
  }
}
