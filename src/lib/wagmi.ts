import { http, createConfig } from "wagmi";
import { mainnet, arbitrum, optimism, base } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Injected connector picks up MetaMask AND Rabby (both inject window.ethereum).
// No WalletConnect projectId required, so this runs with zero external config.
export const wagmiConfig = createConfig({
  chains: [mainnet, arbitrum, optimism, base],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
});
