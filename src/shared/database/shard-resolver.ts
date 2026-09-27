import { ShardId } from "./../types/shared-types.js";

export class ShardResolver {
  // Must be deterministic: the same userId should always map to the same shard.
  static getShardId(userId: bigint): ShardId {
    return userId % 2n === 0n ? ShardId.SHARD_2 : ShardId.SHARD_1;
  }

  static getShardName(userId: bigint): string {
    const shardId = this.getShardId(userId);
    return shardId === ShardId.SHARD_1 ? "shard-1" : "shard-2";
  }

  static areOnSameShard(user1: bigint, user2: bigint): boolean {
    return this.getShardId(user1) === this.getShardId(user2);
  }
}
