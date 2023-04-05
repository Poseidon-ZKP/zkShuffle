import type { Wallet as RainbowWallet } from "@rainbow-me/rainbowkit";
import { foundry } from "@wagmi/core/chains";
import { MockConnector } from "@wagmi/core/connectors/mock";
import { providers, Wallet } from "ethers";
import { TESTNET_URL, TESTNET_WALLET_KEY } from "./const";

const signer = TESTNET_WALLET_KEY
  ? new Wallet(TESTNET_WALLET_KEY, new providers.JsonRpcProvider(TESTNET_URL))
  : Wallet.createRandom();

export const mockWallet = (): RainbowWallet => ({
  createConnector: () => ({
    connector: new MockConnector({
      chains: [foundry],
      options: {
        flags: {
          failConnect: false,
          failSwitchChain: false,
          isAuthorized: true,
          noSwitchChain: false,
        },
        signer, // ✅
      },
    }),
  }),
  id: "mock",
  iconBackground: "tomato",
  iconUrl: async () => "<http://placekitten.com/100/100>",
  name: "Mock Wallet",
});
