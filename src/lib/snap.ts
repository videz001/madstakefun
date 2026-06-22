// Back-compat shim. The Cosmos wallet logic now lives in cosmosWallet.ts and
// supports MetaMask Snap, Keplr, and Leap. Kept so older imports don't break.
export {
  getCosmosAddress,
  getOfflineSigner,
  type CosmosProvider,
} from "@/lib/cosmosWallet";
