import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { SUPPORTED_CHAINS } from "@/config/chains";
import { WALLETCONNECT_PROJECT_ID } from "@/config/app";

export const wagmiConfig = getDefaultConfig({
  appName: "Decentralized Identity & Asset Platform",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: SUPPORTED_CHAINS,
  ssr: true,
});
