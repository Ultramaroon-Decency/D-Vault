/**
 * MOCK_MODE controls whether the app uses in-memory mock data
 * or real blockchain contracts.
 *
 * Set NEXT_PUBLIC_USE_MOCK_DATA=false to switch to real contracts.
 */
export const MOCK_MODE =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo-project-id";
