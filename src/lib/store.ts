// Data access for Cosmos Fast Pass, backed by Postgres via Prisma.
// All methods are async. Users are keyed by lowercased EVM address.

import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

export type { User };

export const store = {
  async setNonce(evmAddress: string, nonce: string) {
    const evm = evmAddress.toLowerCase();
    await prisma.nonce.upsert({
      where: { evmAddress: evm },
      update: { value: nonce },
      create: { evmAddress: evm, value: nonce },
    });
  },

  async getNonce(evmAddress: string) {
    const n = await prisma.nonce.findUnique({
      where: { evmAddress: evmAddress.toLowerCase() },
    });
    return n?.value;
  },

  async clearNonce(evmAddress: string) {
    await prisma.nonce.deleteMany({
      where: { evmAddress: evmAddress.toLowerCase() },
    });
  },

  async upsertUser(evmAddress: string): Promise<User> {
    const evm = evmAddress.toLowerCase();
    return prisma.user.upsert({
      where: { evmAddress: evm },
      update: {},
      create: { evmAddress: evm },
    });
  },

  async getUser(evmAddress: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { evmAddress: evmAddress.toLowerCase() },
    });
  },

  async setCosmosAddress(evmAddress: string, cosmosAddress: string): Promise<User> {
    const evm = evmAddress.toLowerCase();
    return prisma.user.upsert({
      where: { evmAddress: evm },
      update: { cosmosAddress },
      create: { evmAddress: evm, cosmosAddress },
    });
  },

  async setXProfile(
    evmAddress: string,
    x: { xUserId: string; xUsername: string; xAvatarUrl?: string }
  ): Promise<User> {
    const evm = evmAddress.toLowerCase();
    return prisma.user.upsert({
      where: { evmAddress: evm },
      update: { xUserId: x.xUserId, xUsername: x.xUsername, xAvatarUrl: x.xAvatarUrl },
      create: { evmAddress: evm, ...x },
    });
  },

  async clearCosmosAddress(evmAddress: string): Promise<User> {
    return prisma.user.update({
      where: { evmAddress: evmAddress.toLowerCase() },
      data: { cosmosAddress: null },
    });
  },

  async clearXProfile(evmAddress: string): Promise<User> {
    return prisma.user.update({
      where: { evmAddress: evmAddress.toLowerCase() },
      data: { xUserId: null, xUsername: null, xAvatarUrl: null },
    });
  },

  async allUsers(): Promise<User[]> {
    return prisma.user.findMany();
  },

  async stakeEventExists(txHash: string) {
    const e = await prisma.stakeEvent.findUnique({ where: { txHash } });
    return !!e;
  },

  async recordStakeEvent(
    userId: string,
    e: { cosmosAddress: string; validatorAddress: string; amount: number; txHash: string }
  ) {
    return prisma.stakeEvent.create({
      data: {
        userId,
        cosmosAddress: e.cosmosAddress,
        validatorAddress: e.validatorAddress,
        amount: e.amount,
        txHash: e.txHash,
      },
    });
  },
};
