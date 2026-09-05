import { ethers } from 'ethers';
import { env } from '../config/env';
import { logger, logBlockchainError } from '../utils/logger';

let _provider: ethers.JsonRpcProvider | null = null;

/**
 * Get (or create) the ethers.js JSON-RPC provider.
 * Uses Ethereum Sepolia testnet by default.
 */
export const getProvider = (): ethers.JsonRpcProvider => {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(env.RPC_URL, {
      chainId: env.CHAIN_ID,
      name: 'sepolia',
    });

    _provider.on('error', (err) => {
      logBlockchainError('Provider error', { message: err.message });
    });

    logger.info(`[Blockchain] Provider connected to chain ${env.CHAIN_ID}`);
  }
  return _provider;
};

/**
 * Get the current block number from the chain.
 */
export const getBlockNumber = async (): Promise<bigint> => {
  const provider = getProvider();
  return BigInt(await provider.getBlockNumber());
};

/**
 * Get a block timestamp by block number.
 */
export const getBlockTimestamp = async (blockNumber: bigint): Promise<Date> => {
  const provider = getProvider();
  const block = await provider.getBlock(Number(blockNumber));
  if (!block) throw new Error(`Block ${blockNumber} not found`);
  return new Date(block.timestamp * 1000);
};

/**
 * Get transaction receipt and determine confirmation status.
 */
export const getTransactionStatus = async (
  txHash: string,
): Promise<{ confirmed: boolean; blockNumber: bigint | null }> => {
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return { confirmed: false, blockNumber: null };
  return {
    confirmed: receipt.status === 1,
    blockNumber: BigInt(receipt.blockNumber),
  };
};
