import "dotenv/config";

export const PORT = process.env.PORT || 3000;
export const DATABASE_SHARD1_URL = process.env.DATABASE_SHARD1_URL || "";
export const DATABASE_SHARD2_URL = process.env.DATABASE_SHARD2_URL || "";
export const NODE_ENV = process.env.NODE_ENV || "development";
