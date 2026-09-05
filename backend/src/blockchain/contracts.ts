import { ethers } from 'ethers';
import { getProvider } from './provider';
import { CONTRACT_CONFIG } from '../config/contracts';
import { env } from '../config/env';

// Import mock ABIs (swap with real ones from blockchain team)
import DIDRegistryABI from '../../abis/DIDRegistry.json';
import RBACContractABI from '../../abis/RBACContract.json';
import NFTAssetABI from '../../abis/NFTAsset.json';

// =============================================
// Contract instances (lazy initialized)
// =============================================
let _didRegistry: ethers.Contract | null = null;
let _rbacContract: ethers.Contract | null = null;
let _nftAsset: ethers.Contract | null = null;

export const getDIDRegistry = (): ethers.Contract => {
  if (!_didRegistry) {
    _didRegistry = new ethers.Contract(
      CONTRACT_CONFIG.DID_REGISTRY.address,
      DIDRegistryABI,
      getProvider(),
    );
  }
  return _didRegistry;
};

export const getRBACContract = (): ethers.Contract => {
  if (!_rbacContract) {
    _rbacContract = new ethers.Contract(
      CONTRACT_CONFIG.RBAC_CONTRACT.address,
      RBACContractABI,
      getProvider(),
    );
  }
  return _rbacContract;
};

export const getNFTAssetContract = (): ethers.Contract => {
  if (!_nftAsset) {
    _nftAsset = new ethers.Contract(
      CONTRACT_CONFIG.NFT_ASSET.address,
      NFTAssetABI,
      getProvider(),
    );
  }
  return _nftAsset;
};

/**
 * Reset contract instances (useful when addresses change after re-deploy)
 */
export const resetContracts = (): void => {
  _didRegistry = null;
  _rbacContract = null;
  _nftAsset = null;
};
